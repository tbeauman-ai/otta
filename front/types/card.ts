import type { Zone } from './zones.ts'
import type { EffectTime, Effect } from './effects.ts'
import type { Hero } from './hero.ts'

export type CardType = "creature" | "spell" | "building";
export type CreatureState = "sick" | "ready";
export type CardClass = "common" | "Warrior" | "Druid";

export type Card = {
    kind: "card";
    zone: Zone;
    effect: string; 
    effects: Effect[];
    timing: EffectTime;
    type: CardType;
    class: CardClass;
    owner: Hero;
    state: CreatureState;
    idInCollection: number;
    idInGame: number;
    baseForce: number;
    currForce: number;
    baseEndurance: number;
    currEndurance: number;
    illustration: string;
    
    rune_cost: number;
    
    name_en: string;
    type_en: string;
    effect_text_en: string;

    name_fr?: string;
    type_fr?: string;
    effect_text_fr?: string;

    [key: string]: any; 
};

// export type PlayCardPayload = {
//     cardId: number;
//     zone?: Zone;
//     target?: Card | Hero;
//     target2?: Card;

// };


export type PlayCardPayload = {
    cardId: number;
    zone?: Zone;
    targets?: { targetId?: number, target2Id?: number }[];
}