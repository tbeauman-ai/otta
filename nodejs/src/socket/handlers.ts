import { Server, Socket } from 'socket.io'
import type { BfZone } from '../types/zones.ts'
import type { Card } from '../types/card.ts'
import type { GameSession } from '../types/gamesession.ts'
import { instantiateGame } from './gameFactory.ts'
import { launchGame, resolveRound } from './round.ts'
import { getPlayerPerspective, getSpectatorPerspective } from './perspective.ts'
import { waitingPlayers, sessions, addSession, findSession, findSessionByRoomId, addSpectator, removeSpectator, filterWaitingPlayers, removePlayersFromRoom } from './state.ts'
import { playCard } from '../engine/playCard.ts'
import { emitGameOver } from './round.ts'
import { prisma } from '../../prisma/prisma.ts'
import jwt from 'jsonwebtoken'
const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme'


declare module 'socket.io' {
    interface Socket {
        username?: string;
    }
}

const activeUsers = new Map<string, string>();

export function onConnection(io: Server, socket: Socket): void {

    socket.on('join_game', async (data) => {

        let userId: number | null = null
        if (data.token) {
            try {
                const decoded = jwt.verify(data.token, JWT_SECRET) as any
                userId = decoded.userId
            } catch {}
        } else {
            console.log('No token provided for join_game')
            socket.emit('error', { message: 'Authentication required' })
            return
        }

        // Reconnexion à une session existante
        const existingSession = findSessionByRoomId(Number(data.roomId))
        if (existingSession) {
            let user =  await prisma.user.findUnique({
                where: { id: userId }
            });
            const playerIndex = existingSession.game.players.findIndex(
                (p: any) => p.username === user.username // Don't trust user
            )
            if (playerIndex !== -1) {
                existingSession.sockets[playerIndex] = socket
                socket.emit('game_start', {
                    playerIndex,
                    game: getPlayerPerspective(existingSession.game, playerIndex)
                })
                return
            }
        }

        const roomId = Number(data.roomId)

        const room = await prisma.room.findUnique({ where: { id: roomId } })
        if (!room) {
            socket.emit('error', { message: 'Room not found' })
            return
        }

        // Update socket if player reconnects while waiting, otherwise add new entry
        const waitingIdx = waitingPlayers.findIndex(
            p => p.playerData.username === data.username && Number(p.playerData.roomId) === roomId
        )
        if (waitingIdx === -1) {
            waitingPlayers.push({ socket, playerData: { ...data, userId }, debug: data.debug })
        } else {
            waitingPlayers[waitingIdx].socket = socket
        }

        // ✅ Cherche un autre joueur dans la MÊME room, pas n'importe qui
        const playersInRoom = waitingPlayers.filter(
            p => Number(p.playerData.roomId) === roomId
        )
        if (playersInRoom.length === 2) {
            filterWaitingPlayers(Number(data.roomId))
            try {
                const gameInstance = await instantiateGame(playersInRoom)
                const newSession: GameSession = {
                    roomId,
                    game: gameInstance,
                    sockets: playersInRoom.map(p => p.socket),
                    submittedCards: new Map(),
                    readyPlayers: new Set(),
                    timer: null,
                    spectators: [],
                }

                addSession(newSession)
                launchGame(newSession)
            } catch (error) {
                console.error('Erreur lancement game:', error)
                playersInRoom.forEach(p => p.socket.emit('error', { message: 'Impossible de charger les données du héros' }))
            }
        }
    })
    socket.on('play_card', (data) => {
        console.log('Reçu play_card', { data })
        const session = findSession(socket.id)
        if (!session) return

        const playerIndex = session.sockets.findIndex(s => s.id === socket.id)
        const player = session.game.players[playerIndex]
        const card = player.hand.find(c => c.idInGame === data.cardId)
        // console.log('Carte trouvée:', { card })
        if (!card) return
        if (player.curRunes < card.runeCost) return

        const emit = (event: string, data: any) => {
            session.sockets.forEach(s => s.emit(event, data));
        };

        if (card.timing === 'immediate') {
            player.curRunes -= card.runeCost
            playCard(card, { cardId: data.cardId, zone: data.zone, targets: data.targets }, session.game, emit)
        } else {
            const zone = data.zone as BfZone
            if (card.type !== "spell" && (!zone || session.game.players[playerIndex].battlefield[zone])) return
            const existing = session.submittedCards.get(socket.id) ?? []
            if (card.type !== "spell" && existing.some(({ payload }: any) => payload.zone === zone)) return
            player.curRunes -= card.runeCost
            existing.push({ card, payload: data })
            session.submittedCards.set(socket.id, existing)
            card.owner.hand = card.owner.hand.filter((c: Card) => c.idInGame !== card.idInGame)
        }

        socket.emit('game_update', { game: getPlayerPerspective(session.game, playerIndex) })
    })

        socket.on('end_turn', () => {
            console.log('Reçu end_turn de', socket.id)
            const session = findSession(socket.id)
            if (!session) return

            session.readyPlayers.add(socket.id)
            if (session.readyPlayers.size === session.sockets.length) {
                session.readyPlayers.clear()
                resolveRound(session)
                session.sockets.forEach((s, id) => {
                    s.emit('game_update', { game: getPlayerPerspective(session.game, id) })
                })
                session.spectators.forEach(s => {
                    s.emit('game_update', { game: getSpectatorPerspective(session.game) })
            })
        }
    })
    socket.on('delete_room', async (data) => {
        try {
            const roomId = data.roomId
            const username = data.username;
            console.log('Request delete room', { roomId, username })
            if (!roomId || !username)
                return;

            const room = await prisma.room.findUnique({
                where: { id: roomId }
            });
            if (!room)
                return;
            console.log('Room found:', { room })
            const user = await prisma.user.findUnique({
                where: { id: room.player1Id }
            });
            if (user.username !== username) {
                socket.emit('room_error', {
                    message: 'Only the room creator can delete the room'
                });
                return;
            }

            const activeSession = findSessionByRoomId(roomId)
            if (activeSession) {
                clearTimeout(activeSession.timer!)
                activeSession.timer = null
                activeSession.game.status = 'game_over'
                activeSession.game.winner = undefined
                await emitGameOver(activeSession)
            } else {
                await prisma.room.delete({ where: { id: roomId } })
                removePlayersFromRoom(roomId)
            }
        } catch (error) {
            console.error(error);
            socket.emit('room_error', {
                message: 'Failed to delete room'
            });
        }
        io.emit('room_deleted', data.roomId);
    })
    socket.on('spectate', (roomId: number) => {
        console.log('Spectate roomId:', roomId, typeof roomId)
        console.log('Sessions:', sessions.map(s => ({ roomId: s.roomId, type: typeof s.roomId })))

        const session = findSessionByRoomId(roomId)
        if (!session) {
            socket.emit('spectate_error', 'Game not found')
            return
        }
        addSpectator(session, socket)
        socket.emit('game_update', { game: getSpectatorPerspective(session.game) })

        socket.on('disconnect', () => {
            removeSpectator(session, socket.id)
        })
    })

    socket.on('concede', async () => {
        const session = findSession(socket.id)
        if (!session) return

        const playerIndex = session.sockets.findIndex(s => s.id === socket.id)
        const winnerIndex = 1 - playerIndex

        session.game.status = 'game_over'
        session.game.winner = session.game.players[winnerIndex]
        await emitGameOver(session)
    })
    socket.on('disconnect', () => {
        console.log('Joueur déconnecté :', socket.id)
    })

    socket.on('join_chat', (roomId: number) => {
        socket.join(`chat-${roomId}`);
    });

    socket.on('leave_chat', (roomId: number) => {
        socket.leave(`chat-${roomId}`);
    });

    socket.on('send_message', async (data) => {
        try{
            const { username, content, roomId } = data;
            if (!username || !content?.trim())
                return;
            const user = await prisma.user.findUnique({
                where: { username }
            });
            if (!user)
                return;

            const message = await prisma.message.create({
                data: {
                    senderId: user.id,
                    content: content.trim(),
                    roomId: roomId ?? null,
                },
                include: {
                    sender: true,
                }
            });
            if (roomId) {
                io.to(`chat-${roomId}`).emit('new_message', message);
            } else {
                io.emit('new_message', message);
            }
        }
        catch (error)
        {
            console.error(error);
            socket.emit('chat_error', {
                message: "Failed to send message"
            });
        }
    });

    socket.on('create_room', async (data, callback) => {
        try {
            const { username } = data;
            if ( !username )
                return;
            const user =
                await prisma.user.findUnique({
                    where: {
                        username
                    }
            });
            if (!user)
                return;
            const room =
                await prisma.room.create({
                data: {
                    player1Id: user.id,
                    status: "waiting",
                },
                include: {
                    player1: true,
                    player2: true,
                }
            });
            io.emit('room_updated', room);
            callback(room);
        }
        catch (error)
        {
            console.error(error);
            socket.emit('room_error', {
                message: "Failed to create a room"
            });
        }
    });

    socket.on('join_room', async (data, callback) => {
        try{
            const { roomId, username } = data;
            if (!roomId || !username)
                return;

            const user = await prisma.user.findUnique({
                where: {username}
            });
            if (!user)
                return;

            const room = await prisma.room.findUnique({
                where: {id: roomId}
            });
            if (!room)
                return;
            if (room.player1Id === user.id)
            {
                callback(room);
                return;
            }
            if (room.player2Id) {
                socket.emit('room_error', {
                    message: 'Room is full'
                });
                return;
            }

            const updateRoom =
                await prisma.room.update({
                    where: { id: roomId },
                    data: {
                        player2Id: user.id,
                        status: "ready",
                    },
                    include: {
                        player1: true,
                        player2: true,
                    }
                });
            io.emit('room_updated', updateRoom);
            callback(room);
        }
        catch (error)
        {
            console.error(error);
            socket.emit('room_error', {
                message: 'Failed to join room'
            });
        }
    });

    socket.on("user_logged_in", ({ username }) => {
        if (!username)
            return;
        socket.username = username;
        activeUsers.set(username, socket.id);

        io.emit("status_changed", { username, isOnline: true });
    });

    socket.on("get_online_users", () => {
        socket.emit("online_users_list", Array.from(activeUsers.keys()));
    });


    socket.on('disconnect', async () => {
        console.log('User disconnected :', socket.id);

        if (socket.username) {
            activeUsers.delete(socket.username);
            io.emit("status_changed", { username: socket.username, isOnline: false });
        }
    });
}
