"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import Navbar from '../../../components/navigation/Navbar';
import HeroSelection from '../../../components/playground/HeroSelection';
import OpponentBoard from '../../../components/playground/OpponentBoard';
import PlayerBoard from '../../../components/playground/PlayerBoard';
import SpectatorBoard from '@/app/components/playground/SpectatorBoard'
import PlayerHand from '../../../components/playground/PlayerHand';
import GameStats from '../../../components/playground/GameStats';
import ConfirmPlay from '../../../components/playground/ConfirmPlay';
import type { Card } from '../../../../types/card';
import { io, Socket } from 'socket.io-client';
import { useParams, useSearchParams } from 'next/navigation';
import LargeCardView from '@/app/components/playground/LargeCardView';
import { Hero } from '../../../../types/hero';
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl';
import { useTranslations } from "next-intl";
import HeroStrip from '@/app/components/playground/HeroStripProps';
import ChatPanel from '@/app/components/lobby/ChatPanel';
import CardDetails from '@/app/components/playground/CardDetails';
import { createPortal } from 'react-dom';
import Footer from '@/app/components/footer/footer';

function findCardName(idInGame: string, game: any, locale?: string): string {
    if (!game) return '?';
    const eq = (a: any) => String(a) === idInGame;
    const localName = (card: any) =>
        (locale ? card[`cardName_${locale}`] ?? card[`name_${locale}`] : undefined)
        ?? card.cardName_en ?? card.name_en ?? '?';
    for (const p of game.players) {
        if (eq(p.idInGame)) return p.username ?? p.class ?? '?';
        for (const card of Object.values<any>(p.battlefield)) {
            if (card && eq(card.idInGame)) return localName(card);
        }
        for (const card of (p.hand ?? [])) {
            if (card && eq(card.idInGame)) return localName(card);
        }
    }
    return '?';
}

function fmt(v: number): string { return v >= 0 ? `+${v}` : `${v}`; }

function buildEventMessage(
    event: { source: 'combat' | 'effect' | 'card_played'; data: any },
    game: any,
    myIdx: number,
    t: (key: string, values?: Record<string, string | number>) => string,
    sourceNames?: Map<string, string>,
    locale?: string
): string {
    const d = event.data;
    const n = (id: string | number) => findCardName(String(id), game, locale);
    const src = (id: string | number) => sourceNames?.get(String(id)) ?? n(id);
    if (event.source === 'card_played')
        return t('feedback.card_played_msg', { player: d.player, name: sourceNames?.get(String(d.cardId)) ?? d.name_en });
    if (event.source === 'combat') {
        if (d.type === 'zone_fight')   return t('feedback.zone_fight', { a: src(d.card0Id), b: src(d.card1Id) });
        if (d.type === 'card_damaged') return t('feedback.card_damaged', { name: src(d.cardId), value: d.value });
        if (d.type === 'card_dies')    return t('feedback.card_dies', { name: src(d.cardId), attacker: src(d.attackerId) });
        if (d.type === 'hit_hero') {
            const key = d.targetPlayer === myIdx ? 'feedback.hit_hero_me' : 'feedback.hit_hero_opponent';
            return t(key, { attacker: src(d.attackerId), value: d.value });
        }
    } else {
        if (d.type === 'dmg_card') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?'
                ? t('feedback.dmg_card_by', { source: s, name: src(d.targetId), value: d.value })
                : t('feedback.dmg_card', { name: src(d.targetId), value: d.value });
        }
        if (d.type === 'destroy') {
            const source = d.sourceId ? src(d.sourceId) : null;
            return source && source !== '?'
                ? t('feedback.destroy_by', { name: src(d.targetId), source })
                : t('feedback.destroy', { name: src(d.targetId) });
        }
        if (d.type === 'dmg_hero') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?'
                ? t('feedback.dmg_hero_by', { source: s, value: d.value })
                : t('feedback.dmg_hero', { name: src(d.targetId), value: d.value });
        }
        if (d.type === 'ad_mod') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?' ? t('feedback.ad_mod_by', { name: src(d.targetId), value: fmt(d.value), source: s }) : t('feedback.ad_mod', { name: src(d.targetId), value: fmt(d.value) });
        }
        if (d.type === 'def_mod') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?' ? t('feedback.def_mod_by', { name: src(d.targetId), value: fmt(d.value), source: s }) : t('feedback.def_mod', { name: src(d.targetId), value: fmt(d.value) });
        }
        if (d.type === 'addef_mod') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?' ? t('feedback.addef_mod_by', { name: src(d.targetId), value: fmt(d.value), source: s }) : t('feedback.addef_mod', { name: src(d.targetId), value: fmt(d.value) });
        }
        if (d.type === 'draw') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?' ? t('feedback.draw_card_by', { name: src(d.targetId), value: d.value, source: s }) : t('feedback.draw_card', { name: src(d.targetId), value: d.value });
        }
        if (d.type === 'armor') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?' ? t('feedback.armor_gain_by', { name: src(d.targetId), value: fmt(d.value), source: s }) : t('feedback.armor_gain', { name: src(d.targetId), value: fmt(d.value) });
        }
        if (d.type === 'runes') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?'
                ? t('feedback.runes_gain_by', { name: src(d.targetId), value: fmt(d.value), source: s })
                : t('feedback.runes_gain', { name: src(d.targetId), value: fmt(d.value) });
        }
        if (d.type === 'freeze') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?' ? t('feedback.freeze_by', { name: src(d.targetId), source: s }) : t('feedback.freeze', { name: src(d.targetId) });
        }
        if (d.type === 'swap') {
            const s = d.sourceId ? src(d.sourceId) : null;
            return s && s !== '?' ? t('feedback.swap_by', { a: src(d.targetId), b: src(d.target2Id), source: s }) : t('feedback.swap', { a: src(d.targetId), b: src(d.target2Id) });
        }
    }
    return '';
}


let _msgId = 0;

export default function PlaygroundPage() {
  const { id } = useParams();
  const pathname = usePathname()
  const p = useTranslations("Playground");
  const e = useTranslations("Error");
  const CurrentRoomId = id ? Number(id) : null;

  // permet de restaurer la sélection du héros si la page est rechargée accidentellement (F5, crash, etc.) pendant une partie
  const [selectedHero, setSelectedHero] = useState<string | null>(() => {
      if (typeof window === 'undefined') return null
      const saved = localStorage.getItem('currentGame')
      if (!saved) return null
      const { roomId: savedRoomId, heroId } = JSON.parse(saved)
      if (savedRoomId === Number(id) && heroId) return heroId
      return null
  })
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()
  useEffect(() => {
  const token = localStorage.getItem('token')
  if (!token) router.push(`/${locale}/lobby`)
    }, [])

// useEffect de restauration qui se déclenche à l'arrivée sur la page, et à chaque changement de pathname (permet de réinitialiser la sélection du héros si on quitte la page et qu'on y revient, ou si on recharge la page)
  useEffect(() => {
      const saved = localStorage.getItem('currentGame')
      if (saved) {
          const { roomId: savedRoomId, heroId } = JSON.parse(saved)
          if (savedRoomId === Number(id) && heroId) {
              setSelectedHero(heroId)
          }
      }
      setHydrated(true)
  }, [pathname])

  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<any>(null);
  const [waitingEndTurn, setWaitingEndTurn] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Array<{ target: Card | Hero; effectIndex: number }>>([]);
  const [potentialTargets, setPotentialTargets] = useState<(Card | Hero)[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [runeError, setRuneError] = useState<string | null>(null);
  const [hand, setHand] = useState<(Card | null)[]>(Array(8).fill(null));
  const [playerSlots, setPlayerSlots] = useState<(Card | null)[]>(Array(8).fill(null));
  const [opponentSlots, setOpponentSlots] = useState<(Card | null)[]>(Array(8).fill(null));
  const [runes, setRunes] = useState(100);
  const [meStats, setMeStats] = useState<any>(null);
  const [opponentStats, setOpponentStats] = useState<any>(null);
  const [turnNumber, setTurnNumber] = useState(1);
  const [pendingSlots, setPendingSlots] = useState<(Card | null)[]>(Array(8).fill(null));
  const [pendingSlotIndex, setPendingSlotIndex] = useState<number | null>(null); // Pour mémoriser le slot ciblé lors du play d'une créature
  const [currentEffectIndex, setCurrentEffectIndex] = useState<number>(0);
  const [gameOverMessage, setGameOverMessage] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false);
  const [isDebug, setIsDebug] = useState(false);
  const myPlayerIndexRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const gameRef = useRef<any>(null);
  const [cardAnimations, setCardAnimations] = useState<Record<string, string>>({});
  type FloatingNumber = { id: number; text: string; color: string; x: number; y: number };
  const [floats, setFloats] = useState<FloatingNumber[]>([]);
  const nextFloatId = useRef(0);
  const [heroAnimations, setHeroAnimations] = useState<[string, string]>(['', '']);
  const [resolutionMsg, setResolutionMsg] = useState<{ text: string; id: number } | null>(null);
  const [resolutionLog, setResolutionLog] = useState<string[]>([]);
  const turnStartHandledRef = useRef(false);
  const pendingPlayZonesRef = useRef<Map<string, 'mine' | 'opponent'>>(new Map());
  const playedCardNamesRef = useRef<Map<string, string>>(new Map());
  const eventQueueRef = useRef<Array<{ source: 'combat' | 'effect' | 'card_played'; data: any }>>([]);

const highlightOpponentHero = potentialTargets.some(t => t.kind === "hero" && t !== game?.players[myPlayerIndexRef.current!]);
const highlightPlayerHero = potentialTargets.some(t => t.kind === "hero" && t === game?.players[myPlayerIndexRef.current!]);
const isOpponentHeroSelected = selectedTargets.some(t => t.target.kind === "hero" && t.target.idInGame === game?.players[1 - myPlayerIndexRef.current!]?.idInGame);
const isPlayerHeroSelected = selectedTargets.some(t => t.target.kind === "hero" && t.target.idInGame === game?.players[myPlayerIndexRef.current!]?.idInGame);

  function spawnFloatAt(el: Element | null, text: string, color: string) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const id = nextFloatId.current++;
    setFloats(prev => [...prev, { id, text, color, x: rect.left + rect.width / 2, y: rect.top }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 650);
  }

  function findCardSlotEl(idInGame: string | number): Element | null {
    const sid = String(idInGame);
    const g = gameRef.current;
    const myIdx = myPlayerIndexRef.current;
    if (!g || myIdx === null) return null;
    const eq = (a: any) => String(a) === sid;
    for (let i = 0; i < 8; i++) {
        const zone = `bf${i + 1}`;
        if (eq(g.players[myIdx]?.battlefield?.[zone]?.idInGame))
            return document.getElementById(`player-slot-${i}`);
        if (eq(g.players[1 - myIdx]?.battlefield?.[zone]?.idInGame))
            return document.getElementById(`opponent-${i}`);
    }
    return null;
  }

  function spawnFloatOnHero(playerIdx: number, text: string, color: string) {
    const isMe = playerIdx === myPlayerIndexRef.current;
    spawnFloatAt(document.getElementById(isMe ? 'hero-strip-player' : 'hero-strip-opponent'), text, color);
  }

  const searchParams = useSearchParams()
  const [isSpectator] = useState(() => searchParams.get('spectate') === 'true')
  const roomId = id
  const socketDep = isSpectator ? 'spectator' : selectedHero

  useEffect(() => {
    if (!isSpectator && !selectedHero) return;

    const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL);
    socketRef.current = newSocket;
    setSocket(newSocket);

    const battlefieldToSlots = (battlefield: any) => {
        const slots = Array(8).fill(null);
        for (let i = 1; i <= 8; i++) {
            slots[i - 1] = battlefield[`bf${i}`] ?? null;
        }
        return slots;
    };

    // Plays queued events one by one with text + animation, then calls onDone.
    const scheduleAnimQueue = (queue: Array<{ source: 'combat' | 'effect' | 'card_played'; data: any }>, onDone: () => void, applyPartialPlay?: (zone: string, isMe: boolean) => void) => {
        if (queue.length === 0) { onDone(); return; }

        let t = 0;
        const myIdx = myPlayerIndexRef.current; // null for spectators

        // Convert server player index (0/1) to display index (0=meStats, 1=opponentStats)
        const toDisplay = (serverIdx: number): 0 | 1 =>
            (myIdx === null ? serverIdx === 0 : serverIdx === myIdx) ? 0 : 1;

        const setters = [setMeStats, setOpponentStats] as const;

        const shakeHero = (idx: 0 | 1, at: number) => {
            setTimeout(() => setHeroAnimations(prev => { const n = [...prev] as [string, string]; n[idx] = ''; return n; }), at);
            setTimeout(() => setHeroAnimations(prev => { const n = [...prev] as [string, string]; n[idx] = 'animate-shake'; return n; }), at + 30);
        };

        for (const event of queue) {
            const { source, data: d } = event;
            const at = t;

            const msg = buildEventMessage(event, gameRef.current, myPlayerIndexRef.current ?? 0, p, playedCardNamesRef.current, locale);
            if (msg) {
                const id = _msgId++;
                setTimeout(() => {
                    setResolutionMsg({ text: msg, id });
                    setResolutionLog(prev => [...prev, msg]);
                }, at);
            }

            if (source === 'card_played') {
                if (d.zone && applyPartialPlay) {
                    const myUsername = localStorage.getItem('username');
                    const isMe = d.player === myUsername;
                    setTimeout(() => applyPartialPlay(d.zone, isMe), at);
                }
                t += 1200;
            } else if (source === 'combat') {
                if (d.type === 'zone_fight') {
                    setTimeout(() => setCardAnimations(prev => ({
                        ...prev,
                        [d.card0Id]: 'animate-fb-combat',
                        [d.card1Id]: 'animate-fb-combat',
                    })), at);
                    t += 1800;
                } else if (d.type === 'card_damaged') {
                    setTimeout(() => {
                        spawnFloatAt(findCardSlotEl(d.cardId), `-${d.value}`, 'text-red-400');
                        const tid = String(d.cardId);
                        const patch = (prev: (Card | null)[]) => {
                            const i = prev.findIndex(c => c && String(c.idInGame) === tid);
                            if (i === -1) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i]!, currEndurance: next[i]!.currEndurance - d.value };
                            return next;
                        };
                        setPlayerSlots(patch);
                        setOpponentSlots(patch);
                    }, at);
                    t += 2000;
                } else if (d.type === 'card_dies') {
                    setTimeout(() => {
                        setCardAnimations(prev => ({ ...prev, [d.cardId]: 'animate-fb-death' }));
                        const tid = String(d.cardId);
                        const patch = (prev: (Card | null)[]) => {
                            const i = prev.findIndex(c => c && String(c.idInGame) === tid);
                            if (i === -1) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i]!, currEndurance: 0 };
                            return next;
                        };
                        setPlayerSlots(patch);
                        setOpponentSlots(patch);
                    }, at);
                    t += 2500;
                } else if (d.type === 'hit_hero') {
                    setTimeout(() => setCardAnimations(prev => ({ ...prev, [d.attackerId]: 'animate-fb-combat' })), at);
                    shakeHero(d.targetPlayer as 0 | 1, at);
                    { const dispIdx = toDisplay(d.targetPlayer);
                      const capArmor = d.newArmor ?? 0; const capDmg = d.actualDmg ?? 0;
                      setTimeout(() => {
                        spawnFloatOnHero(d.targetPlayer, `-${d.value}`, 'text-red-400');
                        setters[dispIdx]((prev: any) => prev ? { ...prev, armor: capArmor } : prev);
                        setters[1 - dispIdx]((prev: any) => prev ? { ...prev, dmgDealt: prev.dmgDealt + capDmg } : prev);
                      }, at);
                    }
                    t += 2000;
                }
            } else {
                if (d.type === 'dmg_card') {
                    setTimeout(() => {
                        setCardAnimations(prev => ({ ...prev, [d.targetId]: 'animate-fb-combat' }));
                        spawnFloatAt(findCardSlotEl(d.targetId), `-${d.value}`, 'text-red-400');
                        const tid = String(d.targetId);
                        const patch = (prev: (Card | null)[]) => {
                            const i = prev.findIndex(c => c && String(c.idInGame) === tid);
                            if (i === -1) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i]!, currEndurance: next[i]!.currEndurance - d.value };
                            return next;
                        };
                        setPlayerSlots(patch);
                        setOpponentSlots(patch);
                    }, at);
                    t += 2000;
                } else if (d.type === 'destroy') {
                    setTimeout(() => {
                        setCardAnimations(prev => ({ ...prev, [d.targetId]: 'animate-fb-death' }));
                        const tid = String(d.targetId);
                        const patch = (prev: (Card | null)[]) => {
                            const i = prev.findIndex(c => c && String(c.idInGame) === tid);
                            if (i === -1) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i]!, currEndurance: 0 };
                            return next;
                        };
                        setPlayerSlots(patch);
                        setOpponentSlots(patch);
                    }, at);
                    t += 2500;
                } else if (d.type === 'dmg_hero') {
                    const g = gameRef.current;
                    if (g) {
                        const serverIdx = g.players.findIndex((p: any) => p.idInGame === d.targetId);
                        if (serverIdx === 0 || serverIdx === 1) {
                            shakeHero(serverIdx, at);
                            const dispIdx = toDisplay(serverIdx);
                            const capArmor = d.newArmor ?? 0; const capDmg = d.actualDmg ?? 0;
                            setTimeout(() => {
                                spawnFloatOnHero(serverIdx, `-${d.value}`, 'text-red-400');
                                setters[dispIdx]((prev: any) => prev ? { ...prev, armor: capArmor } : prev);
                                setters[1 - dispIdx]((prev: any) => prev ? { ...prev, dmgDealt: prev.dmgDealt + capDmg } : prev);
                            }, at);
                        }
                    }
                    t += 1800;
                } else if (d.type === 'ad_mod') {
                    setTimeout(() => {
                        spawnFloatAt(findCardSlotEl(d.targetId), `${fmt(d.value)} ATK`, 'text-orange-400');
                        const tid = String(d.targetId);
                        const patch = (prev: (Card | null)[]) => {
                            const i = prev.findIndex(c => c && String(c.idInGame) === tid);
                            if (i === -1) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i]!, currForce: next[i]!.currForce + d.value };
                            return next;
                        };
                        setPlayerSlots(patch);
                        setOpponentSlots(patch);
                    }, at);
                    t += 1200;
                } else if (d.type === 'def_mod') {
                    setTimeout(() => {
                        spawnFloatAt(findCardSlotEl(d.targetId), `${fmt(d.value)} DEF`, 'text-sky-300');
                        const tid = String(d.targetId);
                        const patch = (prev: (Card | null)[]) => {
                            const i = prev.findIndex(c => c && String(c.idInGame) === tid);
                            if (i === -1) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i]!, currEndurance: next[i]!.currEndurance + d.value };
                            return next;
                        };
                        setPlayerSlots(patch);
                        setOpponentSlots(patch);
                    }, at);
                    t += 1200;
                } else if (d.type === 'addef_mod') {
                    setTimeout(() => {
                        spawnFloatAt(findCardSlotEl(d.targetId), fmt(d.value), 'text-purple-400');
                        const tid = String(d.targetId);
                        const patch = (prev: (Card | null)[]) => {
                            const i = prev.findIndex(c => c && String(c.idInGame) === tid);
                            if (i === -1) return prev;
                            const next = [...prev];
                            next[i] = { ...next[i]!, currForce: next[i]!.currForce + d.value, currEndurance: next[i]!.currEndurance + d.value };
                            return next;
                        };
                        setPlayerSlots(patch);
                        setOpponentSlots(patch);
                    }, at);
                    t += 1200;
                } else if (d.type === 'armor') {
                    const g = gameRef.current;
                    if (g) {
                        const serverIdx = g.players.findIndex((p: any) => p.idInGame === d.targetId);
                        if (serverIdx === 0 || serverIdx === 1) {
                            const dispIdx = toDisplay(serverIdx);
                            const capArmor = d.newArmor ?? 0;
                            setTimeout(() => {
                                spawnFloatOnHero(serverIdx, fmt(d.value), 'text-cyan-300');
                                setters[dispIdx]((prev: any) => prev ? { ...prev, armor: capArmor } : prev);
                            }, at);
                        }
                    }
                    t += 1200;
                } else if (d.type === 'runes') {
                    const g = gameRef.current;
                    if (g) {
                        const idx = g.players.findIndex((p: any) => p.idInGame === d.targetId);
                        if (idx === 0 || idx === 1) {
                            setTimeout(() => spawnFloatOnHero(idx, fmt(d.value), 'text-yellow-400'), at);
                        }
                    }
                    t += 1200;
                } else if (d.type === 'draw') {
                    const g = gameRef.current;
                    if (g) {
                        const idx = g.players.findIndex((p: any) => p.idInGame === d.targetId);
                        if (idx === 0 || idx === 1) setTimeout(() => spawnFloatOnHero(idx, `+${d.value}`, 'text-green-400'), at);
                    }
                    t += 1200;
                } else if (d.type === 'freeze') {
                    setTimeout(() => spawnFloatAt(findCardSlotEl(d.targetId), '❄', 'text-blue-300'), at);
                    t += 1200;
                } else {
                    t += 1200;
                }
            } // end else (source === 'effect')
        }

        setTimeout(() => { setResolutionMsg(null); onDone(); }, t);
    };

    newSocket.on('connect', () => {
      console.log('isSpectator:', isSpectator, 'selectedHero:', selectedHero)
      if (isSpectator) {
            // On prévient le serveur qu'on veut juste regarder
            newSocket.emit('spectate', Number(roomId));
        } else {
            // Comportement normal pour les joueurs
            localStorage.setItem('currentGame', JSON.stringify({ roomId: Number(id), heroId: selectedHero }))
            console.log('Emitting join_game with heroId:', selectedHero, 'roomId:', roomId, 'username:', localStorage.getItem('username'))
            newSocket.emit('join_game', {
              heroId: selectedHero,
              roomId: Number(roomId),
              username: localStorage.getItem('username'),
              token: localStorage.getItem('token'),
              debug: isDebug
            });
        }
    });

    newSocket.on('card_played', (data: { cardId: number; zone: string | null; player: string; name_en: string; name_fr?: string; name_sv?: string; cardType: string }) => {
        if (data.zone) {
            const myUsername = localStorage.getItem('username');
            pendingPlayZonesRef.current.set(data.zone, data.player === myUsername ? 'mine' : 'opponent');
        }
        const localeName = (data as any)[`name_${locale}`] ?? data.name_en;
        playedCardNamesRef.current.set(String(data.cardId), localeName || data.name_en);
        eventQueueRef.current.push({ source: 'card_played', data });
    });

    newSocket.on('combat_event', (data: any) => {
        eventQueueRef.current.push({ source: 'combat', data });
    });

    newSocket.on('effect_event', (data: any) => {
        eventQueueRef.current.push({ source: 'effect', data });
    });

    newSocket.on('turn_start', (data) => {
        if (isSpectator) return;
        if (myPlayerIndexRef.current === null) return;

        turnStartHandledRef.current = true;
        setResolutionLog([]);
        const queue = [...eventQueueRef.current];
        eventQueueRef.current = [];

        const me = data.game.players[myPlayerIndexRef.current];
        const opponent = data.game.players[1 - myPlayerIndexRef.current];
        const newPlayerSlots = battlefieldToSlots(me.battlefield);
        const newOpponentSlots = battlefieldToSlots(opponent.battlefield);

        const applyFinalState = () => {
            const playAnims: Record<string, string> = {};
            for (const [zone, side] of pendingPlayZonesRef.current.entries()) {
                const zoneIdx = parseInt(zone.replace('bf', '')) - 1;
                const card = side === 'mine' ? newPlayerSlots[zoneIdx] : newOpponentSlots[zoneIdx];
                if (card) playAnims[card.idInGame] = side === 'mine' ? 'animate-fb-play-bottom' : 'animate-fb-play-top';
            }
            pendingPlayZonesRef.current.clear();
            setPendingSlots(Array(8).fill(null));
            setGame(data.game);
            gameRef.current = data.game;
            setMeStats(me);
            setOpponentStats(opponent);
            setTurnNumber(data.game.turnNumber);
            setHand(me.hand);
            setRunes(me.curRunes);
            setPlayerSlots(newPlayerSlots);
            setOpponentSlots(newOpponentSlots);
            setCardAnimations(playAnims);
            if (Object.keys(playAnims).length > 0)
                setTimeout(() => setCardAnimations({}), 600);
            setHeroAnimations(['', '']);
            turnStartHandledRef.current = false;
        };

        const applyPartialPlay = (zone: string, isMe: boolean) => {
            const zoneIdx = parseInt(zone.replace('bf', '')) - 1;
            const card = isMe ? newPlayerSlots[zoneIdx] : newOpponentSlots[zoneIdx];
            if (!card) return;
            pendingPlayZonesRef.current.delete(zone);
            const animClass = isMe ? 'animate-fb-play-bottom' : 'animate-fb-play-top';
            if (isMe) setPlayerSlots(prev => { const n = [...prev]; n[zoneIdx] = card; return n; });
            else setOpponentSlots(prev => { const n = [...prev]; n[zoneIdx] = card; return n; });
            setCardAnimations(prev => ({ ...prev, [card.idInGame]: animClass }));
            setTimeout(() => setCardAnimations(prev => { const n = { ...prev }; delete n[card.idInGame]; return n; }), 600);
        };

        scheduleAnimQueue(queue, applyFinalState, applyPartialPlay);
    });

    newSocket.on('game_over', (data) => {
        let msg: string;
        if (data.message) {
            msg = data.message;
        } else if (data.winner === -1) {
            msg = p("draw");
        } else if (isSpectator) {
            const winnerName = gameRef.current?.players[data.winner]?.username ?? `Player ${data.winner + 1}`;
            msg = `${winnerName} gagne !`;
        } else {
            msg = data.winner === myPlayerIndexRef.current ? "Vous avez gagné !" : "Vous avez perdu !";
        }
        localStorage.removeItem('currentGame')
        const queue = [...eventQueueRef.current];
        eventQueueRef.current = [];
        scheduleAnimQueue(queue, () => setGameOverMessage(msg));
    });
    newSocket.on('error', (data) => {
        setIsLoading(false);
        setIsError(true);
    });
    newSocket.on('game_start', (data) => {
        if (isSpectator) return;
        myPlayerIndexRef.current = data.playerIndex;
        const me = data.game.players[data.playerIndex];
        const opponent = data.game.players[1 - data.playerIndex];
        // Update board immediately — this is the initial state
        setGame(data.game);
        gameRef.current = data.game;
        setMeStats(me);
        setOpponentStats(opponent);
        setTurnNumber(data.game.turnNumber);
        setHand(me.hand);
        setRunes(me.curRunes);
        setPlayerSlots(battlefieldToSlots(me.battlefield));
        setOpponentSlots(battlefieldToSlots(opponent.battlefield));
        setIsLoading(false);
        // Drain passive events emitted by startTurn inside launchGame
        setResolutionLog([]);
        const queue = [...eventQueueRef.current];
        eventQueueRef.current = [];
        scheduleAnimQueue(queue, () => {});
    });

    newSocket.on('game_update', (data) => {
        if (isSpectator) {
            const queue = [...eventQueueRef.current];
            eventQueueRef.current = [];
            const applySpectator = () => {
                setGame(data.game);
                gameRef.current = data.game;
                setMeStats(data.game.players[0]);
                setOpponentStats(data.game.players[1]);
                setTurnNumber(data.game.turnNumber);
                setPlayerSlots(battlefieldToSlots(data.game.players[0].battlefield));
                setOpponentSlots(battlefieldToSlots(data.game.players[1].battlefield));
                setIsLoading(false);
            };
            scheduleAnimQueue(queue, applySpectator);
            return;
        }

        if (myPlayerIndexRef.current === null) return;

        // turn_start already scheduled a sequential animation — don't race it
        if (turnStartHandledRef.current) {
            setWaitingEndTurn(false);
            return;
        }

        const me = data.game.players[myPlayerIndexRef.current];
        const opponent = data.game.players[1 - myPlayerIndexRef.current];

        // drain queue (immediate spell effects)
        setResolutionLog([]);
        const queue = [...eventQueueRef.current];
        eventQueueRef.current = [];

        const doUpdate = () => {
            setGame(data.game);
            gameRef.current = data.game;
            setMeStats(me);
            setOpponentStats(opponent);
            setTurnNumber(data.game.turnNumber);
            setHand(me.hand);
            setRunes(me.curRunes);
            setPlayerSlots(battlefieldToSlots(me.battlefield));
            setOpponentSlots(battlefieldToSlots(opponent.battlefield));
            setIsLoading(false);
            setWaitingEndTurn(false);
            setCardAnimations({});
            setHeroAnimations(['', '']);
        };

        scheduleAnimQueue(queue, doUpdate);
    });

    return () => { newSocket.disconnect(); };
  }, [socketDep]);

  const playerHandCards = useMemo(() => hand, [hand]);
  const displaySlots = playerSlots.map((card, i) => {
    if (card) return card;
    const pending = pendingSlots[i];
    if (!pending) return null;
    return pending.type === 'creature' ? { ...pending, state: 'sick' as const } : pending;
  });


  function handleConcede(){
    if (!socketRef.current) return
    if (confirm('You want to give up your runic power to Odin ?')) {
        socketRef.current.emit('concede')
    }
  }
  function handleConfirmSpell() {
    if (!selectedCard) return;
    if (selectedCard.type !== "spell" && pendingSlotIndex === null) return;

    socketRef.current?.emit('play_card', {
        cardId: selectedCard.idInGame,
        zone: selectedCard.type === "spell" ? null : `bf${pendingSlotIndex! + 1}`,
        targets: selectedTargets.map(t => ({ targetId: t.target.idInGame }))
    });

    setSelectedCard(null);
    setSelectedTargets([]);
    setPotentialTargets([]);
    setPendingSlotIndex(null);
    setCurrentEffectIndex(0);
}

function handlePlayToSlot(slotIndex: number) {
    if (!selectedCard || !socketRef.current) return;
    if (selectedCard.runeCost > runes) {
      setRuneError("Not enough runes!");
      setTimeout(() => setRuneError(null), 1000);
      return;
    }

    if (playerSlots[slotIndex] || pendingSlots[slotIndex]) return;
    if (selectedCard.type === "spell") return;
    setPendingSlots(prev => {
        const next = [...prev]; // On copie l'état actuel

        // 1. On nettoie uniquement l'ancienne preview si elle existait
        if (pendingSlotIndex !== null) {
            next[pendingSlotIndex] = null;
        }

        // 2. On place la nouvelle carte à la nouvelle position
        next[slotIndex] = selectedCard;

        return next;
    });    // On pose TOUJOURS la carte en preview, qu'elle ait des effets ou non
    setPendingSlotIndex(slotIndex);


    setSelectedTargets([]);
    setPotentialTargets([]);

      // Si elle a besoin de cibles, on lance le ciblage
    const hasTargetedEffects = selectedCard.effects.some(e =>
        typeof e.target === "string" && ["opponent", "self", "all"].includes(e.target)
    );

    if (hasTargetedEffects) {
        getTargets();
    }
}

function getTargetCountForEffect(effect: any) {
  if (effect.effect === "swap") return 2;
  if (typeof effect.target !== "string") return 0;
  if (["self", "opponent", "all"].includes(effect.target)) return 1;
  return 0;
}


function getNextEffectIndex(card: Card, targets: Array<{ target: Card | Hero; effectIndex: number }>) {
  const effects = card.effects;
  let effectIndex = 0;
  while (effectIndex < effects.length) {
    const required = getTargetCountForEffect(effects[effectIndex]);
    const selectedCount = targets.filter(t => t.effectIndex === effectIndex).length;
    if (selectedCount < required) return effectIndex;
    effectIndex += 1;
  }

  return effects.length;
}

function handleEndTurn() {
    abortPlay();
    if (!socketRef.current) return;
    setWaitingEndTurn(true);
    socketRef.current.emit('end_turn');
  }

function getTargets(effectIndex: number = 0, card: Card | null = selectedCard) {
    console.log("getTargets for card", { card });

    if (!card) return;
    const ef = card.effects;
    if (effectIndex >= ef.length) {
        setPotentialTargets([]);
        return;
    }
    const e = ef[effectIndex];

    if (typeof e.target === "string" && ["self_hero","opponent_hero","left_neighbor","right_neighbor",
         "all_allies","all_enemies","all_board","random_enemies","random_allies","random_all"].includes(e.target)) {
        getTargets(effectIndex + 1, card);
        return;
    }

    const selectedForEffect = selectedTargets.filter(t => t.effectIndex === effectIndex).length;
    const requiredForEffect = getTargetCountForEffect(e);
    if (requiredForEffect === 0 || selectedForEffect >= requiredForEffect) {
      getTargets(effectIndex + 1, card);
      return;
    }

    let pool: (Card | Hero)[] = [];
    if (e.target === "self") pool = playerSlots.filter(Boolean) as Card[];
    else if (e.target === "opponent") pool = opponentSlots.filter(Boolean) as Card[];
    else if (e.target === "all") pool = [...playerSlots, ...opponentSlots].filter(Boolean) as Card[];

    if (e.targetType?.hero) {
        if (e.target === "opponent") pool.push(game.players[1 - myPlayerIndexRef.current!]);
        else if (e.target === "self") pool.push(game.players[myPlayerIndexRef.current!]);
        else if (e.target === "all") pool.push(...game.players);
    }

    if (!e.targetType?.creature) pool = pool.filter(c => !('type' in c) || c.type !== "creature");
    if (!e.targetType?.building) pool = pool.filter(c => !('type' in c) || c.type !== "building");

    console.log("game:", game, "myPlayerIndex:", myPlayerIndexRef.current, "e.targetType:", e.targetType)
    setPotentialTargets(pool);
    setCurrentEffectIndex(effectIndex);
    console.log("Potential targets for effect", { effect: e, pool });
}

  function abortPlay() {
    // 1. On vide le slot en attente
    setPendingSlots(prev => {
        const next = [...prev];
        if (pendingSlotIndex !== null) {
            next[pendingSlotIndex] = null;
        }
        return next;
    });

    // 2. On reset tous les états de ciblage et de sélection
    setSelectedCard(null);
    setPendingSlotIndex(null);
    setSelectedTargets([]);
    setPotentialTargets([]);
}

function pushSelectedTarget(target: Card | Hero) {
    if (!selectedCard) return;

    const existingIndex = selectedTargets.findIndex((st) => st.target.idInGame === target.idInGame);

    if (existingIndex !== -1) {
        const nextTargets = [...selectedTargets];
        nextTargets.splice(existingIndex, 1);
        setSelectedTargets(nextTargets);

        const nextEffectIndex = getNextEffectIndex(selectedCard, nextTargets);
        getTargets(nextEffectIndex, selectedCard);
        return;
    }

    if (!potentialTargets.some(c => c.idInGame === target.idInGame)) return;

    const nextTargets = [...selectedTargets, { target, effectIndex: currentEffectIndex }];
    setSelectedTargets(nextTargets);

    const selectedForEffect = nextTargets.filter(st => st.effectIndex === currentEffectIndex).length;
    const requiredForEffect = getTargetCountForEffect(selectedCard.effects[currentEffectIndex]);

    const nextEffectIndex = selectedForEffect >= requiredForEffect
      ? getNextEffectIndex(selectedCard, nextTargets)
      : currentEffectIndex;

    getTargets(nextEffectIndex, selectedCard);
}

const onHeroClick = (type: "self" | "opponent") => {
    const index = type === "opponent" ? 1 - myPlayerIndexRef.current! : myPlayerIndexRef.current!;
    const hero = game?.players[index];
    if (hero)
        pushSelectedTarget(hero);
};

const locale = useLocale();
    if (!hydrated) return (
        <div className="pt-20 text-center text-blue-200/70">{p("loading")}</div>
    )
    return (
    <main className="overflow-x-hidden h-screen bg-[url('/homepage_bg.png')] bg-cover bg-center p-4 text-white/80 overflow-y-hidden">
        {floats.map(f => (
            <div key={f.id}
                 className={`fixed z-[60] pointer-events-none font-bold text-lg drop-shadow-lg ${f.color} animate-fb-float-up`}
                 style={{ left: f.x, top: f.y, transform: 'translateX(-50%)' }}>
                {f.text}
            </div>
        ))}
        <Navbar />

        {!isSpectator && !selectedHero ? (
            <HeroSelection onSelect={(id) => setSelectedHero(id)} onSetDebug={(debug) => setIsDebug(debug)} />
        ) : (
            <>
                {isLoading ? (
                    <div className="pt-20 text-center text-blue-200/70">
                        {p("loading")}
                    </div>

                    ) : isSpectator ? (
                        <div className="flex flex-col h-screen">
                            <SpectatorBoard players={game?.players ?? []} turnNumber={game?.turnNumber ?? 0} />
                            <div className="fixed bottom-0 left-0 right-0 h-48 border-t border-blue-400/20 bg-black/60 backdrop-blur-sm">
                                <ChatPanel roomId={CurrentRoomId} />
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="pt-20 text-center text-red-500">
                            {e("error_playground")}
                        </div>
                    ) : (
                        <>

                        {/* ── DESKTOP ── */}
                        <div className="hidden md:grid md:grid-cols-4 gap-4 pt-16 h-[calc(100vh-6rem)]">

                            {/* Colonne principale — 3/4 */}
                            <div className="col-span-3 flex flex-col gap-2 min-h-0">

                                <div id="hero-strip-opponent">
                                <HeroStrip
                                    label={opponentStats?.username ?? p("opponent")}
                                    playerClass={opponentStats?.class}
                                    armor={opponentStats?.armor ?? 0}
                                    dmgDealt={opponentStats?.dmgDealt ?? 0}
                                    deckCount={opponentStats?.library.length ?? 0}
                                    isHighlighted={highlightOpponentHero}
                                    isSelected={isOpponentHeroSelected}
                                    onClick={() => onHeroClick?.("opponent")}
                                    isOpponent
                                    animClass={heroAnimations[1 - (myPlayerIndexRef.current ?? 0)]}
                                />
                                </div>

                                <OpponentBoard
                                    cards={opponentSlots}
                                    onPlay={() => {}}
                                    potentialTargets={potentialTargets}
                                    selectedTargets={selectedTargets.map(st => st.target)}
                                    onClick={pushSelectedTarget}
                                    cardAnimations={cardAnimations}
                                />

                                <PlayerBoard
                                    cards={displaySlots}
                                    onPlay={handlePlayToSlot}
                                    potentialTargets={potentialTargets}
                                    selectedTargets={selectedTargets.map(st => st.target)}
                                    onClick={pushSelectedTarget}
                                    cardAnimations={cardAnimations}
                                />

                                <div id="hero-strip-player">
                                <HeroStrip
                                    label={p("you")}
                                    playerClass={meStats?.class}
                                    armor={meStats?.armor ?? 0}
                                    dmgDealt={meStats?.dmgDealt ?? 0}
                                    curRunes={meStats?.curRunes}
                                    handCount={meStats?.hand.length}
                                    deckCount={meStats?.library.length ?? 0}
                                    isHighlighted={highlightPlayerHero}
                                    isSelected={isPlayerHeroSelected}
                                    onClick={() => onHeroClick?.("self")}
                                    animClass={heroAnimations[myPlayerIndexRef.current ?? 0]}
                                />
                                </div>

                                <div>
                                    <ConfirmPlay onClick={handleConfirmSpell} disabled={!selectedCard || (selectedCard.type !== "spell" && pendingSlotIndex === null)} />
                                </div>

                                <PlayerHand
                                    cards={playerHandCards}
                                    onClick={(card) => {
                                        if (!card) return;
                                        abortPlay();
                                        setSelectedCard(card);
                                        if (card.type === "spell") getTargets(0, card);
                                    }}
                                    onConfirm={handleConfirmSpell}
                                />

                            </div>

                            {/* Colonne droite — 1/4 */}
                            <div className="flex flex-col gap-4 max-h-[calc(100vh-6rem)] overflow-y-auto">

                                <div className="flex items-center justify-center gap-5">

                                    {/* End Turn centré */}
                                    <div>
                                        <button
                                            disabled={waitingEndTurn}
                                            onClick={handleEndTurn}
                                            className="border rounded-xl border-blue-300 py-1.5 px-2 text-sm hover:bg-blue-300 hover:text-black transition"
                                            >
                                                {waitingEndTurn ? "..." : p("end_turn")}
                                        </button>
                                    </div>

                                    {/* Tour */}
                                    <div className="text-center text-sm text-blue-300/60 py-1">
                                        {p("turn")} {turnNumber}/8
                                    </div>

                                    <button
                                            onClick={handleConcede}
                                            className="border border-red-400/40 py-2 px-2 text-xs text-red-400 hover:bg-red-400/20 transition rounded-sm"
                                            >
                                                {p("concede")}
                                    </button>
                                </div>

                                {/* Log de résolution */}
                                <div className="border border-blue-400/20 rounded p-2 flex flex-col gap-0.5 max-h-40 overflow-y-auto custom-scrollbar shrink-0">
                                    <div className="text-[9px] uppercase text-blue-300/40 tracking-wider mb-0.5">{p('feedback.last_turn')}</div>
                                    {resolutionLog.length === 0 ? (
                                        <div className="text-blue-300/25 italic text-xs">—</div>
                                    ) : (
                                        resolutionLog.map((msg, i) => (
                                            <div key={i} className="text-xs text-blue-100/70 leading-tight">{msg}</div>
                                        ))
                                    )}
                                </div>

                                {/* Chat */}
                                <div className="flex-1 min-h-0">
                                    <ChatPanel roomId={CurrentRoomId} />
                                </div>

                                {/* LargeCard + Confirm */}
                                <div className="flex flex-col gap-2">
                                    <CardDetails
                                        card={selectedCard}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── MOBILE ── */}
                        <div className="flex flex-col md:hidden pt-14 h-[calc(100vh-3.5rem)] overflow-hidden">

                        {/* Opponent HeroStrip */}
                        <div id="hero-strip-opponent">
                        <HeroStrip
                            label={opponentStats?.username ?? "Opponent"}
                            playerClass={opponentStats?.class}
                            armor={opponentStats?.armor ?? 0}
                            dmgDealt={opponentStats?.dmgDealt ?? 0}
                            deckCount={opponentStats?.library.length ?? 0}
                            isHighlighted={highlightOpponentHero}
                            isSelected={isOpponentHeroSelected}
                            onClick={() => onHeroClick("opponent")}
                            isOpponent
                            animClass={heroAnimations[1 - (myPlayerIndexRef.current ?? 0)]}
                        />
                        </div>

                        <OpponentBoard
                            cards={opponentSlots}
                            onPlay={() => {}}
                            potentialTargets={potentialTargets}
                            selectedTargets={selectedTargets.map(st => st.target)}
                            onClick={pushSelectedTarget}
                            cardAnimations={cardAnimations}
                        />

                        <PlayerBoard
                            cards={displaySlots}
                            onPlay={handlePlayToSlot}
                            potentialTargets={potentialTargets}
                            selectedTargets={selectedTargets.map(st => st.target)}
                            onClick={pushSelectedTarget}
                            cardAnimations={cardAnimations}
                        />

                        {/* Player HeroStrip */}
                        <div id="hero-strip-player">
                        <HeroStrip
                            label="You"
                            playerClass={meStats?.class}
                            armor={meStats?.armor ?? 0}
                            dmgDealt={meStats?.dmgDealt ?? 0}
                            curRunes={meStats?.curRunes}
                            handCount={meStats?.hand.length}
                            deckCount={meStats?.library.length ?? 0}
                            isHighlighted={highlightPlayerHero}
                            isSelected={isPlayerHeroSelected}
                            onClick={() => onHeroClick("self")}
                            animClass={heroAnimations[myPlayerIndexRef.current ?? 0]}
                        />
                        </div>

                        <PlayerHand
                            cards={playerHandCards}
                            onConfirm={handleConfirmSpell}
                            onClick={(card) => {
                            if (!card) return;
                            abortPlay();
                            setSelectedCard(card);
                            if (card.type === "spell") getTargets(0, card);
                            }}
                        />
                        <div className="flex items-center justify-center">
                            <div className="text-center text-sm text-blue-300/60 py-1">
                                Turn {turnNumber}/8
                            </div>


                            {/* Confirm Play */}
                            <div className="shrink-0 px-4 py-2">
                                <ConfirmPlay onClick={handleConfirmSpell} disabled={!selectedCard || (selectedCard.type !== "spell" && pendingSlotIndex === null)} />
                            </div>
                            {/* End Turn centré */}
                            <div className="flex justify-center py-1 shrink-0">
                                <button
                                    disabled={waitingEndTurn}
                                    onClick={handleEndTurn}
                                    className="border rounded-xl border-blue-300 py-1.5 px-2 text-sm hover:bg-blue-300 hover:text-black transition"
                                    >
                                        {waitingEndTurn ? "..." : "End Turn"}
                                </button>
                            </div>
                        </div>

                        {/* Bandeau bas */}
                        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-blue-400/20">
                            <button
                                onClick={handleConcede}
                                className="border border-red-400/40 py-1 px-3 text-xs text-red-400 hover:bg-red-400/20 transition rounded-sm"
                            >
                                Give Up
                            </button>
                            <button
                                onClick={() => setShowChat(true)}
                                className="border border-blue-400/40 px-3 py-1 text-lg text-blue-300 rounded-sm"
                            >
                                💬
                            </button>
                        </div>

                        {/* Chat popup */}
                        {showChat && createPortal(
                            <div className="fixed inset-0 bg-black/80 z-50">
                                <div
                                className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-blue-400 rounded-t-xl flex flex-col p-4"
                                style={{ height: '70dvh' }}
                                >
                                    <button
                                        onClick={() => setShowChat(false)}
                                        className="self-end text-blue-300 text-lg shrink-0 mb-2"
                                    >
                                        ✕
                                    </button>
                                    <div className="flex-1 min-h-0">
                                        <ChatPanel roomId={CurrentRoomId}/>
                                    </div>
                                </div>
                            </div>,
                            document.body
                            )}

                        </div>
                    </>
                )}
            </>
        )}

        {resolutionMsg && (
        <div key={resolutionMsg.id} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none
                        bg-black/85 text-white/95 px-6 py-3 rounded border border-blue-400/50
                        text-sm md:text-base text-center max-w-xs md:max-w-sm animate-fb-play-bottom">
            {resolutionMsg.text}
        </div>
        )}

        {gameOverMessage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="border border-blue-300 bg-black/90 p-8 flex flex-col items-center gap-6 rounded-sm">
            <p className="text-2xl text-blue-200">{gameOverMessage}</p>
            <button
                onClick={() => window.location.href = `/${locale}/lobby`}
                className="border border-blue-300 px-6 py-2 hover:bg-blue-300 hover:text-black transition"
            >
                {p("return_to_lobby")}
            </button>
            </div>
        </div>
        )}

        {runeError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-200 px-4 py-2 rounded border border-red-500 text-sm z-50">
            {runeError}
        </div>
        )}
        <Footer/>
    </main>
    );
}
