import { Card } from "./card";
import { Hero } from "./hero";

export type EffectType =
| "ad_mod" // 1 target
| "def_mod" // 1 target
| "addef_mod" // 1 target
| "draw"
| "dmg"
| "armor"
| "runes"
| "swap"
| "destroy"
| "freeze"
| "win";

export type EffectTime =
| "immediate"
| "start_turn"
| "end_of_turn"
| "on_deal_damage";
// | "on_death"; pour plus tard peut-être

export type EffectTarget =
| "self_hero"
| "opponent_hero"
| "self"
| "opponent"
| "all"
| "random_enemies"
| "random_allies"
| "random_all"
| "left_neighbor"
| "right_neighbor"
| "all_allies"
| "all_board"
| "all_enemies";

export type TargetType = {
    creature?: boolean;
    building?: boolean;
    hero?: boolean;
}

export type Effect = {
    effect: EffectType;
    timing?: EffectTime;
    value?: number;
    valueFrom?: string;
    target?: EffectTarget;
    targetType?: TargetType;
}

export interface EffectContext {
    targets: (Card | Hero)[]
}
