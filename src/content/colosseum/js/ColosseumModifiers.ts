import type { Player, Projectile } from "osrs-sdk";
import { Random } from "osrs-sdk";

/** 0 = off, 1..3 = tier I..III. */
export type ModifierTier = 0 | 1 | 2 | 3;

export type ColosseumModifierState = {
  /** Every hit Sol lands does 1 or 2 damage so more of his rotation can be practised. */
  practiceMode: boolean;
  doom: ModifierTier;
  frailty: ModifierTier;
  myopia: ModifierTier;
  blasphemy: ModifierTier;
  relentless: ModifierTier;
};

// Numbers from https://oldschool.runescape.wiki/w/Fortis_Colosseum/Modifiers (2026-09-08).
/** Doom: the player dies on reaching this many stacks; one stack per damaging hit. */
export const DOOM_STACK_LIMIT = [0, 15, 10, 5];
/** Frailty: base Hitpoints reduced by this fraction; overhealing disabled. */
export const FRAILTY_HP_REDUCTION = [0, 0.1, 0.2, 0.4];
/** Myopia: attack range (weapons and autocasts) reduced by this many tiles. */
export const MYOPIA_RANGE_PENALTY = [0, 2, 4, 6];
/** Blasphemy: prayer points drained by this fraction of damage taken. */
export const BLASPHEMY_DRAIN = [0, 0.2, 0.4, 0.6];
/** Relentless: enemy max hits increased by this much (the accuracy part is a no-op here: Sol's hits already skip accuracy). */
export const RELENTLESS_MAX_HIT_BONUS = [0, 1, 3, 6];

export const PRACTICE_MAX_HIT = 2;

export const MODIFIER_LABELS: Record<keyof Omit<ColosseumModifierState, "practiceMode">, { name: string; tiers: string[] }> = {
  doom: { name: "Doom", tiers: ["Off", "I: die at 15 stacks", "II: die at 10 stacks", "III: die at 5 stacks"] },
  frailty: { name: "Frailty", tiers: ["Off", "I: -10% HP, no overheal", "II: -20% HP, no overheal", "III: -40% HP, no overheal"] },
  myopia: { name: "Myopia", tiers: ["Off", "I: -2 attack range", "II: -4 attack range", "III: -6 attack range"] },
  blasphemy: { name: "Blasphemy", tiers: ["Off", "I: drain 20% of damage", "II: drain 40% of damage", "III: drain 60% of damage"] },
  relentless: { name: "Relentless", tiers: ["Off", "I: +1 max hit", "II: +3 max hit", "III: +6 max hit"] },
};

/** Per-fight state the region owns and the HUD reads. */
export class ColosseumModifierTracker {
  doomStacks = 0;

  constructor(readonly state: ColosseumModifierState) {}

  get doomLimit() {
    return DOOM_STACK_LIMIT[this.state.doom];
  }

  /** Short HUD line, or null when nothing is active. */
  hudText(): string | null {
    const parts: string[] = [];
    if (this.state.practiceMode) parts.push("Practice mode: Sol hits 1-2");
    if (this.state.doom) parts.push(`Doom ${this.doomStacks}/${this.doomLimit}`);
    if (this.state.frailty) parts.push(`Frailty ${"I".repeat(this.state.frailty).replace("III", "III")}`);
    if (this.state.myopia) parts.push(`Myopia -${MYOPIA_RANGE_PENALTY[this.state.myopia]} range`);
    if (this.state.blasphemy) parts.push(`Blasphemy ${BLASPHEMY_DRAIN[this.state.blasphemy] * 100}%`);
    if (this.state.relentless) parts.push(`Relentless +${RELENTLESS_MAX_HIT_BONUS[this.state.relentless]}`);
    return parts.length ? parts.join("  |  ") : null;
  }
}

function isEnemyHit(projectile: Projectile, player: Player) {
  return projectile.damage > 0 && projectile.from !== player;
}

/**
 * Wires the chosen modifiers and practice mode onto a freshly reset player.
 * Order matters: Relentless raises the hit, then practice mode caps it.
 */
export function applyColosseumModifiers(player: Player, state: ColosseumModifierState): ColosseumModifierTracker {
  const tracker = new ColosseumModifierTracker(state);
  player.incomingDamageModifiers = [];
  player.damageTakenListeners = [];
  player.attackRangePenalty = MYOPIA_RANGE_PENALTY[state.myopia];

  if (state.frailty) {
    const reduced = Math.floor(player.stats.hitpoint * (1 - FRAILTY_HP_REDUCTION[state.frailty]));
    // Copy: player.stats aliases the persisted settings object.
    player.stats = { ...player.stats, hitpoint: reduced };
    player.currentStats.hitpoint = Math.min(player.currentStats.hitpoint, reduced);
  }

  if (state.relentless) {
    const bonus = RELENTLESS_MAX_HIT_BONUS[state.relentless];
    player.incomingDamageModifiers.push((damage, projectile) => (isEnemyHit(projectile, player) ? damage + bonus : damage));
  }

  if (state.practiceMode) {
    player.incomingDamageModifiers.push((damage, projectile) =>
      isEnemyHit(projectile, player) ? Math.min(damage, 1 + Math.floor(Random.get() * PRACTICE_MAX_HIT)) : damage,
    );
  }

  if (state.doom) {
    player.damageTakenListeners.push((damage) => {
      if (damage <= 0) return;
      tracker.doomStacks++;
      if (tracker.doomStacks >= tracker.doomLimit) {
        player.currentStats.hitpoint = 0;
      }
    });
  }

  if (state.blasphemy) {
    const fraction = BLASPHEMY_DRAIN[state.blasphemy];
    player.damageTakenListeners.push((damage) => {
      if (damage <= 0) return;
      player.currentStats.prayer = Math.max(0, player.currentStats.prayer - Math.ceil(damage * fraction));
    });
  }

  return tracker;
}

/** Frailty: no overhealing. Call every tick. */
export function clampOverheal(player: Player, state: ColosseumModifierState) {
  if (state.frailty && player.currentStats.hitpoint > player.stats.hitpoint) {
    player.currentStats.hitpoint = player.stats.hitpoint;
  }
}
