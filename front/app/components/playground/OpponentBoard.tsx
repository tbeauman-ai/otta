"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Hero } from "../../../types/hero";
import CardSlot from "./CardSlot";
import LargeCardView from "./LargeCardView";
import type { Card } from '../../../types/card';
import CardDetails from "./CardDetails";

interface OpponentBoardProps {
  cards: (Card | null)[];
  label?: string;
  onPlay?: (cardId: string, targetIndex: number, isOpponent: boolean) => void;
  potentialTargets?: (Card | Hero)[];
  selectedTargets?: (Card | Hero)[];
  onClick?: (card: Card) => void;
  cardAnimations?: Record<string, string>;
}

export default function OpponentBoard({ cards, label="Opponent", onPlay, potentialTargets, selectedTargets, onClick, cardAnimations }: OpponentBoardProps) {
  const opponentSlots = Array.from({ length: 8 }, (_, i) => `opponent-${i}`);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="bg-black/40 backdrop-blur-sm rounded-sm p-2">

      <div className="grid grid-cols-4 grid-lines-2 md:grid-cols-8 md:grid-lines-1 gap-2">
        {opponentSlots.map((slot, index) => (
          <div
            key={slot}
            onMouseEnter={(e) => {
              if (!cards[index]) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: rect.left, y: rect.bottom + 8 });
              setHoveredCard(cards[index]);
            }}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <CardSlot
              id={slot}
              isOpponentSlot={true}
              card={cards[index] ?? undefined}
              isHighlighted={potentialTargets?.some(c => c.idInGame === cards[index]?.idInGame)}
              isSelected={selectedTargets?.some(c => c.idInGame === cards[index]?.idInGame)}
              onClick={() => onClick?.(cards[index] as Card)}
              animClass={cards[index] ? (cardAnimations?.[cards[index]!.idInGame] ?? '') : ''}
            />
          </div>
        ))}
      </div>

      {hoveredCard && createPortal(
        <div
          className="fixed z-[999] pointer-events-none w-56"
          style={{ top: tooltipPos.y, left: tooltipPos.x, transform: 'translateY(-100%)' }}
        >
          <CardDetails card={hoveredCard} />
        </div>,
        document.body
      )}
    </div>
  );
}