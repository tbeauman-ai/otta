import type { Zone, BfZone } from './zones.ts'
import type { EffectType, EffectTarget, TargetType, Effect } from './effects.ts'
import type { CardClass, Card } from './card.ts'

export type Hero = {
    kind: "hero";
    idInGame: number;
    class: CardClass;
    passive: Effect[];
    armor: number;
    dmgDealt: number;
    curRunes: number;
    battlefield: Partial<Record<BfZone, Card>>;
    library: Card[];
    graveyard: Card[];
    hand: Card[];
    heroPicPath: string;
    username?: string;
    userId?: number;
};
