"use strict";

import {
  createJsonSettingsStorage,
  createSettingsStore,
  SettingsStorage,
} from "osrs-sdk";

import type { ModifierTier } from "./ColosseumModifiers";

export type ColosseumSettingsState = {
  /** Sol's hits are capped at 1-2 damage. */
  practiceMode: boolean;
  doom: ModifierTier;
  frailty: ModifierTier;
  myopia: ModifierTier;
  blasphemy: ModifierTier;
  relentless: ModifierTier;
  showSolarFlareTiles: boolean;
  solarFlareLevel: number;
  useGrapple: boolean;
  usePhaseTransitions: boolean;
  useShields: boolean;
  useSpears: boolean;
  useTriple: boolean;
};

const STORAGE_KEY = "colosseum-trainer:settings";
const defaults: ColosseumSettingsState = {
  practiceMode: false,
  doom: 0,
  frailty: 0,
  myopia: 0,
  blasphemy: 0,
  relentless: 0,
  showSolarFlareTiles: false,
  solarFlareLevel: 1,
  useGrapple: true,
  usePhaseTransitions: true,
  useShields: true,
  useSpears: true,
  useTriple: true,
};

const jsonStorage = createJsonSettingsStorage<ColosseumSettingsState>(STORAGE_KEY, 1);

/** Older saved blobs predate the modifier keys; fill them from the defaults. */
function withDefaults(loaded: Partial<ColosseumSettingsState>, fallbacks: ColosseumSettingsState): ColosseumSettingsState {
  return { ...fallbacks, ...loaded };
}

// Import the trainer's original one-key-per-setting values the first time the
// consolidated store is loaded. The legacy keys can remain for rollback/debugging.
const storage: SettingsStorage<ColosseumSettingsState> = {
  load(fallbacks) {
    if (window.localStorage.getItem(STORAGE_KEY) !== null) {
      return withDefaults(jsonStorage.load(fallbacks), fallbacks);
    }

    const legacySolarFlareLevel = Number.parseInt(
      window.localStorage.getItem("solarFlareLevel") ?? String(fallbacks.solarFlareLevel),
      10,
    );
    const migrated = {
      ...fallbacks,
      showSolarFlareTiles: window.localStorage.getItem("showSolarFlareTiles") === "true",
      solarFlareLevel: Number.isFinite(legacySolarFlareLevel)
        ? legacySolarFlareLevel
        : fallbacks.solarFlareLevel,
      useGrapple: window.localStorage.getItem("useGrapple") !== "false",
      usePhaseTransitions: window.localStorage.getItem("usePhaseTransitions") !== "false",
      useShields: window.localStorage.getItem("useShields") !== "false",
      useSpears: window.localStorage.getItem("useSpears") !== "false",
      useTriple: window.localStorage.getItem("useTriple") !== "false",
    };
    jsonStorage.save(migrated);
    return migrated;
  },
  save: jsonStorage.save,
};

export const colosseumSettings = createSettingsStore({ defaults, storage });
