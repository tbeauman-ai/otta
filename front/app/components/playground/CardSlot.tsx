"use client";
import clsx from "clsx";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Card } from '../../../types/card';
import GameCard from "./GameCard";
import { useLocale } from "next-intl";
import CardDetails from "./CardDetails";
import { useLongPress } from "../../utils/useLongPress";

interface CardSlotProps {
  id: string;
  isHand?: boolean;
  isOpponentSlot?: boolean;
  showEffectText?: boolean;
  card?: Card | null;
  onClick?: (card: Card | null) => void;
  isHighlighted?: boolean;
  isSelected?: boolean;
  animClass?: string;
}

export default function CardSlot({
  id,
  isHand = false,
  isOpponentSlot = false,
  card,
  onClick,
  isHighlighted = false,
  isSelected = false,
  animClass = '',
}: CardSlotProps) {
  const [showPreview, setShowPreview] = useState(false);

  const longPress = useLongPress(() => {
    if (card) setShowPreview(true);
  });

  const wrapperClass = clsx(
    "aspect-square w-20 h-20 lg:w-30 lg:h-30 rounded transition-all cursor-pointer",
    isHand && "hover:scale-110",
    isOpponentSlot && "opacity-80",
    card?.state === "sick" && "opacity-40 grayscale",
    isHighlighted && "ring-2 ring-yellow-400/80 scale-105",
    isSelected && "ring-4 ring-orange-500 scale-105 shadow-lg shadow-orange-500/50",
    animClass,
  );

  const emptySlotClass = clsx(
    "aspect-square rounded lg:w-30",
    "bg-sky-300/10 transition-all cursor-pointer",
    "flex items-center justify-center text-xs opacity-60",
  );

  const locale = useLocale();
  return (
    <>
      <div
        id={id}
        onClick={() => onClick?.(card ?? null)}
        className={card ? wrapperClass : emptySlotClass}
        {...longPress}
      >
        {card ? (
          <GameCard
            name={(card[`cardName_${locale}`] || card.name_en)}
            cardType={card.type}
            cost={card.runeCost}
            runeUrl={card.illustration}
            attack={card.currForce}
            defense={card.currEndurance}
            ability={card.effects.length > 0}
          />
        ) : (
          <></>
        )}
      </div>

      {/* Popup mobile onLongPress */}
      {showPreview && card && createPortal(
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          onClick={() => setShowPreview(false)}
        >
          <div className="w-64" onClick={e => e.stopPropagation()}>
            <CardDetails card={card} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}