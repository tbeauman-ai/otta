"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Hero } from "../../../types/hero";
import CardSlot from "./CardSlot";
import LargeCardView from "./LargeCardView";
import type { Card } from '../../../types/card';
import CardDetails from "./CardDetails"

interface PlayerBoardProps {
  cards: (Card | null)[];
  potentialTargets?: (Card | Hero)[];
  selectedTargets?: (Card | Hero)[];
  onPlay?: (slotIndex: number) => void;
  onClick?: (card: Card) => void;
  cardAnimations?: Record<string, string>;
}

export default function PlayerBoard({ cards, potentialTargets, selectedTargets, onPlay, onClick, cardAnimations }: PlayerBoardProps) {
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mobilePreview, setMobilePreview] = useState<Card | null>(null);

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-sm p-2">
      <div className="grid grid-cols-4 grid-lines-2 md:grid-cols-8 md:grid-lines-1 gap-2">
        {cards.map((card, index) => (
          <div
            key={index}
            onMouseEnter={(e) => {
              if (!card) return;
              if (window.matchMedia('(pointer: coarse)').matches) return;
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltipPos({ x: rect.left, y: rect.top - 8 });
              setHoveredCard(card);
            }}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <CardSlot
              id={`player-slot-${index}`}
              card={card ?? undefined}
              onClick={() => {
                if (card) {
                  setMobilePreview(card);
                  onClick?.(card);
                } else {
                  setMobilePreview(null);
                  onPlay?.(index);
                }
              }}
              isHighlighted={potentialTargets?.some(c => c.idInGame === card?.idInGame)}
              isSelected={selectedTargets?.some(c => c.idInGame === card?.idInGame)}
              animClass={card ? (cardAnimations?.[card.idInGame] ?? '') : ''}
            />
          </div>
        ))}
      </div>

      {/* Desktop tooltip */}
      {hoveredCard && createPortal(
        <div
          className="fixed z-[999] pointer-events-none w-56"
          style={{ top: tooltipPos.y, left: tooltipPos.x, transform: 'translateY(-100%)' }}
        >
          <CardDetails card={hoveredCard} />
        </div>,
        document.body
      )}

      {/* Mobile bandeau */}
      {mobilePreview && createPortal(
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-blue-400/40 px-4 py-2 flex items-center gap-3">
          <div className="w-12 shrink-0">
            <CardSlot id="mobile-preview-player" card={mobilePreview} onClick={() => setMobilePreview(null)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{mobilePreview.cardName}</p>
            {mobilePreview.effectText && <p className="text-xs text-slate-300 truncate">{mobilePreview.effectText}</p>}
          </div>
          <button onClick={() => setMobilePreview(null)} className="text-blue-300 px-2">✕</button>
        </div>,
        document.body
      )}
    </div>
  );
}