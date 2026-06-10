
import { Socket } from 'socket.io';
import type { Hero } from './hero.ts'

export type WaitingPlayer = {
    socket: Socket;
    playerData: any;
    debug: boolean;
}

export type GameSession = {
    roomId: number;
    game: Game;
    sockets: Socket[];
    submittedCards: Map<string, any[]>; // socketId : cartes jouées
    timer: ReturnType<typeof setTimeout> | null;
    readyPlayers: Set<string>;  // les socketIds des joueurs qui ont cliqué fin de tour
    spectators: Socket[];
}

export type GamePhase = "beginning" | "main" | "resolve";

export type Game = {
    kind: "game";
    phase: GamePhase;
    turnNumber: number;
    clock_per_turn: number;
    players: Hero[];
    backgroundPath: string;
    status: "playing" | "game_over";
    winner?: Hero;
    debug: boolean;

};

