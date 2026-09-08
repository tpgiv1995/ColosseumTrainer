import React, { useEffect, useState } from "react";
import {
  CacheRender,
  ControlPanelController,
  V3_PRAYER_LAYOUT,
  Region,
  Settings,
  TileMarker,
  TrainerInstance,
  TrainerLoadingState,
} from "osrs-sdk";
import { DefaultSidebar, GameOverlay, LoadoutManager, TrainerApp, TrainerLoadingSplash, useSettingsSnapshot, useSettingsStore, useTrainerSnapshot } from "osrs-sdk-react";
import { ColosseumRegion } from "./content/colosseum/js/ColosseumRegion";
import { ModifierHud, SetupScreen, toggleFullscreen } from "./SetupScreen";
import { colosseumLoadout, v3ColosseumLoadout } from "./content/colosseum/js/ColosseumLoadout";
import {
  colosseumSettings,
  ColosseumSettingsState,
} from "./content/colosseum/js/ColosseumSettings";

declare const __OSRS_CACHE_RENDER_MANIFEST_URL__: string;

declare global {
  interface Window {
    OSRS_CACHE_RENDER_MANIFEST_URL?: string;
  }
}

const loadoutTemplates = [v3ColosseumLoadout, colosseumLoadout];

type TransferredSettings = {
  version: 1;
  hotkeys?: Partial<Record<"inventory" | "spellbook" | "equipment" | "prayer" | "combat", string>>;
  ui?: {
    zoomScale?: number;
    maxUiScale?: number;
    menuVisible?: boolean;
  };
};

function applyTransferredSettings() {
  const encodedSettings = new URLSearchParams(window.location.search).get("settings");
  if (!encodedSettings) return;

  try {
    const base64 = encodedSettings.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
    const settings = JSON.parse(atob(paddedBase64)) as TransferredSettings;
    if (settings.version !== 1) return;

    const hotkeySettings: Record<
      keyof NonNullable<TransferredSettings["hotkeys"]>,
      "inventory_key" | "spellbook_key" | "equipment_key" | "prayer_key" | "combat_key"
    > = {
      inventory: "inventory_key",
      spellbook: "spellbook_key",
      equipment: "equipment_key",
      prayer: "prayer_key",
      combat: "combat_key",
    };
    for (const [key, setting] of Object.entries(hotkeySettings)) {
      const value = settings.hotkeys?.[key as keyof typeof hotkeySettings];
      if (typeof value === "string" && value.length > 0) Settings[setting] = value;
    }

    if (Number.isFinite(settings.ui?.zoomScale)) {
      Settings.zoomScale = Math.max(0.5, Math.min(2, settings.ui.zoomScale));
    }
    if (Number.isFinite(settings.ui?.maxUiScale)) {
      Settings.maxUiScale = Math.max(0.5, Math.min(2, settings.ui.maxUiScale));
    }
    if (typeof settings.ui?.menuVisible === "boolean") {
      Settings.menuVisible = settings.ui.menuVisible;
    }

    Settings.persistToStorage();
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
  } catch {
    // Ignore malformed or obsolete transfer links and use the saved settings.
  }
}

function createTrainer() {
  CacheRender.configure(
    __OSRS_CACHE_RENDER_MANIFEST_URL__
      || window.OSRS_CACHE_RENDER_MANIFEST_URL
      || "http://127.0.0.1:8081/manifest.json",
  );
  Settings.readFromStorage();
  // Loadout was renamed on 2026-09-08; keep browsers that saved the old name on the same set.
  if (Settings.loadout === "Pat Colosseum") {
    Settings.set({ loadout: "V3 Colosseum", customLoadout: Settings.customLoadout ? { ...Settings.customLoadout, name: "V3 Colosseum" } : null });
  }
  applyTransferredSettings();
  colosseumSettings.load();

  const regions: Record<string, Region> = {
    "colosseum.html": new ColosseumRegion(loadoutTemplates),
  };
  const regionName = window.location.pathname.split("/").pop() ?? "colosseum.html";
  const region = regions[regionName] ?? regions["colosseum.html"];
  return new TrainerInstance(region, { readyTimer: 5 });
}

type AttackSetting = "useGrapple" | "usePhaseTransitions" | "useShields" | "useSpears" | "useTriple";

function AttackCheckbox({ label, setting }: { label: string; setting: AttackSetting }) {
  const settings = useSettingsStore(colosseumSettings);
  return (
    <label>
      <input
        type="checkbox"
        checked={settings[setting]}
        onChange={(event) => colosseumSettings.set({ [setting]: event.currentTarget.checked })}
      />
      {label}
      <br />
    </label>
  );
}

/** Shown when the player dies: one big button (or Enter) restarts the fight. Settings are untouched. */
function DeathOverlay({ trainer }: { trainer: TrainerInstance }) {
  const playerDead = useTrainerSnapshot((snapshot) => snapshot.playerDead);

  useEffect(() => {
    if (!playerDead) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        // The focused button may also fire a click; only the first restart does anything.
        if (trainer.getSnapshot().playerDead) trainer.reset();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [playerDead, trainer]);

  if (!playerDead) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.45)",
        zIndex: 6,
      }}
    >
      <div
        style={{
          background: "#2b2620",
          border: "3px solid #5c4a2a",
          borderRadius: 6,
          padding: "22px 34px",
          textAlign: "center",
          color: "#ff981f",
          fontFamily: "OSRS",
          boxShadow: "0 0 24px #000",
        }}
      >
        <div style={{ fontSize: 34, color: "#ff3333", textShadow: "2px 2px #000" }}>Oh dear, you are dead!</div>
        <div style={{ fontSize: 16, color: "#ffffff", margin: "10px 0 18px" }}>Same gear, same keybinds, same settings.</div>
        <button
          type="button"
          autoFocus
          onClick={() => trainer.reset()}
          style={{ width: 260, fontSize: 22, padding: "12px 0", border: "2px solid #ff981f", color: "#ff981f" }}
        >
          Try again (Enter)
        </button>
      </div>
    </div>
  );
}

function Credits() {
  return (
    <ul>
      <li>Jagex</li>
      <li>Supalosa (engine and logic)</li>
      <li>Tesla Owner (engine)</li>
      <li>KiwiIskadda (detailed feedback)</li>
      <li>Syndra, Varadium, ro0bo, zyth (early feedback and testing)</li>
      <li>@kattykoo on discord (dm for colosseum tips and tricks)</li>
    </ul>
  );
}

function Sidebar({ onLoadoutToggle, region }: { onLoadoutToggle: () => void; region: ColosseumRegion }) {
  const settings = useSettingsSnapshot();
  const colosseumSettingsSnapshot = useSettingsStore(colosseumSettings);
  const [showCredits, setShowCredits] = useState(false);

  return (
    <div>
      <span style={{ color: "lime" }}>Right click Sol to skip to specific phases.</span>
      <hr />
      <p>Attack sequence selector:</p>
      <AttackCheckbox label="Shields" setting="useShields" />
      <AttackCheckbox label="Spears" setting="useSpears" />
      <AttackCheckbox label="Triple Parry" setting="useTriple" />
      <AttackCheckbox label="Grapple" setting="useGrapple" />
      <AttackCheckbox label="Phase Transitions" setting="usePhaseTransitions" />

      <p>Solar Flare:</p>
      <select
        aria-label="Solar Flare"
        value={colosseumSettingsSnapshot.solarFlareLevel}
        onChange={(event) => region.setSolarFlareLevel(Number(event.currentTarget.value))}
      >
        <option value={0}>None</option>
        <option value={1}>Level 1</option>
        <option value={2}>Level 2</option>
        <option value={3}>Level 3</option>
      </select>
      <label>
        <input
          type="checkbox"
          checked={colosseumSettingsSnapshot.showSolarFlareTiles}
          onChange={(event) => region.setShowSolarFlareTiles(event.currentTarget.checked)}
        />
        Solar Flare Tiles
      </label>
      <br />
      <hr />

      <a href="https://discord.gg/nryYHbvtTa">Discord</a><br />
      <button type="button" onClick={() => setShowCredits((visible) => !visible)}>Credits</button>
      {showCredits && <Credits />}
      <hr />
      <a href="https://los.colosim.com">Line-of-Sight Solver</a>
      <a href="https://inferno.colosim.com/?wave=69">Zuk Trainer</a>
      <a href="https://verzik.colosim.com/?">Verzik P3 Tanking Trainer</a>
      <hr />

      <button type="button" onClick={() => ControlPanelController.controller.setActiveControl("SETTINGS")}>Settings</button>
      <button type="button" onClick={onLoadoutToggle}>Loadout</button>
      <hr />
      <span>More settings:</span>
      <label>
        <input
          type="checkbox"
          checked={settings.prayerLayout !== null}
          onChange={(event) => Settings.set({ prayerLayout: event.currentTarget.checked ? [...V3_PRAYER_LAYOUT] : null })}
        />
        V3 prayer book layout
        <br />
      </label>
      <div>
        <label htmlFor="cameraSensitivity">Camera sensitivity: {Math.round(settings.cameraSensitivity * 100)}%</label>
        <input
          id="cameraSensitivity"
          type="range"
          min={0.2}
          max={1.5}
          step={0.05}
          value={settings.cameraSensitivity}
          style={{ width: "100%" }}
          onChange={(event) => Settings.set({ cameraSensitivity: Number(event.currentTarget.value) })}
        />
      </div>
      <div>
        <input
          id="tileMarkerColor"
          type="color"
          value={settings.tileMarkerColor}
          onChange={(event) => {
            Settings.set({ tileMarkerColor: event.currentTarget.value });
            TileMarker.onSetColor(event.currentTarget.value);
          }}
        />
        <label htmlFor="tileMarkerColor">Tile Markers</label>
      </div>
      <div style={{ paddingBottom: 10, paddingTop: 10, textAlign: "center", width: "100%" }}>
        <div id="gpu_warning" />
      </div>
    </div>
  );
}

export function ColosseumApp() {
  const [trainer] = useState(createTrainer);
  const [loading, setLoading] = useState<TrainerLoadingState>();
  // Handy for driving the sim from devtools or automated checks.
  (window as unknown as { colosimTrainer?: TrainerInstance }).colosimTrainer = trainer;
  const [loadoutOpen, setLoadoutOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(true);
  const region = trainer.region as ColosseumRegion;

  const startFight = () => {
    // Runs inside the Start click, which is the user gesture fullscreen needs.
    if (colosseumSettings.getSnapshot().fullscreenOnStart) void toggleFullscreen(true);
    setSetupOpen(false);
    setLoadoutOpen(false);
    trainer.reset();
    trainer.start();
  };
  const openSetup = () => {
    trainer.stop();
    setSetupOpen(true);
  };

  return (
    <TrainerApp
      trainer={trainer}
      autoStart={false}
      onLoadingStateChange={setLoading}
    >
      <GameOverlay>
        <button
          type="button"
          aria-label="Toggle trainer settings"
          title="Trainer settings"
          onClick={() => Settings.setMenuVisible(!Settings.menuVisible)}
          style={{ position: "absolute", top: 4, right: 4, width: 36, padding: "4px 0", zIndex: 5, opacity: 0.8 }}
        >
          &#9881;
        </button>
        <button
          type="button"
          onClick={openSetup}
          style={{ position: "absolute", top: 4, right: 44, width: 70, padding: "4px 0", zIndex: 5, opacity: 0.8, fontSize: 14 }}
        >
          Setup
        </button>
        <button
          type="button"
          title="Toggle fullscreen"
          aria-label="Toggle fullscreen"
          onClick={() => void toggleFullscreen()}
          style={{ position: "absolute", top: 4, right: 118, width: 36, padding: "4px 0", zIndex: 5, opacity: 0.8 }}
        >
          &#x26F6;
        </button>
        <ModifierHud region={region} />
        <div id="disclaimer_panel">Work in progress.<br />All assets are property of Jagex.</div>
        <TrainerLoadingSplash state={loading} />
        <DeathOverlay trainer={trainer} />
        {setupOpen && (
          <SetupScreen
            loading={loading}
            onEditLoadout={() => setLoadoutOpen(true)}
            onStart={startFight}
            region={region}
            trainer={trainer}
          />
        )}
        <LoadoutManager
          loadouts={loadoutTemplates}
          open={loadoutOpen}
          onClose={() => {
            setLoadoutOpen(false);
            // The editor resets (and starts) the world on close; keep it parked while setup is open.
            if (setupOpen) trainer.stop();
          }}
        />
      </GameOverlay>
      <DefaultSidebar>
        <Sidebar
          onLoadoutToggle={() => setLoadoutOpen((open) => !open)}
          region={region}
        />
      </DefaultSidebar>
    </TrainerApp>
  );
}
