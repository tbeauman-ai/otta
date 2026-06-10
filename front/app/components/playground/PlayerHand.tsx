"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import CardSlot from "./CardSlot";
import type { Card } from '../../../types/card';
import CardDetails from "./CardDetails";

interface PlayerHandProps {
  cards: (Card | null)[];
  onClick: (card: Card | null) => void;
  onConfirm: () => void;
}

export default function PlayerHand({ cards, onClick, onConfirm }: PlayerHandProps) {
  const realCards = cards.filter(Boolean) as Card[];
  const [mobilePreview, setMobilePreview] = useState<Card | null>(null);
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  return (
    <div className="border border-sky-300/20 bg-black/30 backdrop-blur-sm rounded-sm md:p-6">

      <div className="overflow-x-auto overflow-y-hidden">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {realCards.map((card, index) => (
            <div  key={card.idInGame}
                  className=""
                  onMouseEnter={(e) => {
              if (!card) return;
              if (window.matchMedia('(pointer: coarse)').matches) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: rect.left, y: rect.top - 8 });
              setHoveredCard(card);
            }}
            onMouseLeave={() => setHoveredCard(null)}>
              <CardSlot
                id={`hand-${index}`}
                isHand={true}
                card={card}
                onClick={() => {
                  setMobilePreview(card);
                  onClick(card);
                }}
              />
            </div>
          ))}
        </div>
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