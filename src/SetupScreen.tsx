import React, { useEffect, useState } from "react";
import { Settings, TrainerInstance, TrainerLoadingState, PAT_PRAYER_LAYOUT } from "osrs-sdk";
import { useSettingsSnapshot, useSettingsStore } from "osrs-sdk-react";
import { colosseumSettings, ColosseumSettingsState } from "./content/colosseum/js/ColosseumSettings";
import { MODIFIER_LABELS, ModifierTier } from "./content/colosseum/js/ColosseumModifiers";
import type { ColosseumRegion } from "./content/colosseum/js/ColosseumRegion";

type KeyField = "combat_key" | "inventory_key" | "prayer_key" | "spellbook_key" | "equipment_key";
const KEY_FIELDS: { field: KeyField; label: string }[] = [
  { field: "combat_key", label: "Combat" },
  { field: "inventory_key", label: "Inventory" },
  { field: "prayer_key", label: "Prayer" },
  { field: "spellbook_key", label: "Magic" },
  { field: "equipment_key", label: "Equipment" },
];

const panel: React.CSSProperties = {
  background: "#2b2620",
  border: "3px solid #5c4a2a",
  borderRadius: 6,
  color: "#ff981f",
  fontFamily: "OSRS",
  boxShadow: "0 0 24px #000",
  padding: "18px 26px",
  width: 520,
  maxHeight: "92%",
  overflowY: "auto",
};
const heading: React.CSSProperties = { color: "#ffffff", fontSize: 18, margin: "14px 0 6px", borderBottom: "1px solid #5c4a2a" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "4px 0", fontSize: 15 };
const select: React.CSSProperties = { width: 260, padding: "4px 0", fontSize: 14, margin: 0 };
const smallButton: React.CSSProperties = { width: "auto", padding: "4px 12px", fontSize: 14, margin: 0 };

/** Click, then press a key; the sim ignores panel hotkeys while capturing. */
function KeyCapture({ field, label }: { field: KeyField; label: string }) {
  const settings = useSettingsSnapshot();
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!capturing) return;
    Settings.is_keybinding = true;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key !== "Escape") Settings.set({ [field]: event.key } as Partial<Record<KeyField, string>>);
      setCapturing(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      Settings.is_keybinding = false;
    };
  }, [capturing, field]);

  return (
    <div style={row}>
      <span>{label}</span>
      <button type="button" style={{ ...smallButton, width: 120 }} onClick={() => setCapturing(true)}>
        {capturing ? "Press a key..." : settings[field]}
      </button>
    </div>
  );
}

function TierSelect({ id }: { id: keyof typeof MODIFIER_LABELS }) {
  const settings = useSettingsStore(colosseumSettings);
  const { name, tiers } = MODIFIER_LABELS[id];
  return (
    <div style={row}>
      <span>{name}</span>
      <select
        aria-label={name}
        style={select}
        value={settings[id]}
        onChange={(event) => colosseumSettings.set({ [id]: Number(event.currentTarget.value) as ModifierTier } as Partial<ColosseumSettingsState>)}
      >
        {tiers.map((label, tier) => (
          <option key={tier} value={tier}>{label}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label style={row}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
    </label>
  );
}

export type SetupScreenProps = {
  loading?: TrainerLoadingState;
  onEditLoadout: () => void;
  onStart: () => void;
  region: ColosseumRegion;
  trainer: TrainerInstance;
};

/** Pre-fight configuration: everything is applied on Start via a full reset. */
export function SetupScreen({ loading, onEditLoadout, onStart, region }: SetupScreenProps) {
  const settings = useSettingsSnapshot();
  const colosseum = useSettingsStore(colosseumSettings);
  const ready = loading?.status === "ready";

  return (
    <div
      style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", zIndex: 7 }}
    >
      <div style={panel}>
        <div style={{ fontSize: 30, color: "#ffffff", textAlign: "center", textShadow: "2px 2px #000" }}>Fight setup</div>

        <div style={heading}>Loadout</div>
        <div style={row}>
          <span>{settings.customLoadout ? `${settings.loadout} (edited)` : settings.loadout}</span>
          <button type="button" style={smallButton} onClick={onEditLoadout}>Edit loadout</button>
        </div>
        <Toggle
          label="Pat's prayer book layout"
          checked={settings.prayerLayout !== null}
          onChange={(checked) => Settings.set({ prayerLayout: checked ? [...PAT_PRAYER_LAYOUT] : null })}
        />

        <div style={heading}>Keybinds</div>
        {KEY_FIELDS.map(({ field, label }) => (
          <KeyCapture key={field} field={field} label={label} />
        ))}

        <div style={heading}>Camera</div>
        <div style={row}>
          <span>Sensitivity {Math.round(settings.cameraSensitivity * 100)}%</span>
          <input
            type="range"
            min={0.2}
            max={1.5}
            step={0.05}
            style={{ width: 260 }}
            value={settings.cameraSensitivity}
            onChange={(event) => Settings.set({ cameraSensitivity: Number(event.currentTarget.value) })}
          />
        </div>

        <div style={heading}>Practice</div>
        <Toggle
          label="Practice mode: every Sol hit does 1-2"
          checked={colosseum.practiceMode}
          onChange={(checked) => colosseumSettings.set({ practiceMode: checked })}
        />

        <div style={heading}>Modifiers</div>
        <div style={row}>
          <span>Solar Flare</span>
          <select aria-label="Solar Flare" style={select} value={colosseum.solarFlareLevel} onChange={(event) => region.setSolarFlareLevel(Number(event.currentTarget.value))}>
            <option value={0}>Off</option>
            <option value={1}>I</option>
            <option value={2}>II</option>
            <option value={3}>III</option>
          </select>
        </div>
        {(Object.keys(MODIFIER_LABELS) as (keyof typeof MODIFIER_LABELS)[]).map((id) => (
          <TierSelect key={id} id={id} />
        ))}

        <div style={heading}>Sol's attacks</div>
        <Toggle label="Shields" checked={colosseum.useShields} onChange={(checked) => colosseumSettings.set({ useShields: checked })} />
        <Toggle label="Spears" checked={colosseum.useSpears} onChange={(checked) => colosseumSettings.set({ useSpears: checked })} />
        <Toggle label="Triple parry" checked={colosseum.useTriple} onChange={(checked) => colosseumSettings.set({ useTriple: checked })} />
        <Toggle label="Grapple" checked={colosseum.useGrapple} onChange={(checked) => colosseumSettings.set({ useGrapple: checked })} />
        <Toggle label="Phase transitions" checked={colosseum.usePhaseTransitions} onChange={(checked) => colosseumSettings.set({ usePhaseTransitions: checked })} />

        <button
          type="button"
          disabled={!ready}
          onClick={onStart}
          style={{ marginTop: 16, fontSize: 22, padding: "12px 0", border: "2px solid #ff981f", color: ready ? "#ff981f" : "#777" }}
        >
          {ready ? "Start fight" : "Loading..."}
        </button>
        <div style={{ color: "#aaa", fontSize: 12, textAlign: "center", marginTop: 6 }}>
          Everything here is saved as you change it. Reopen with the Setup button in-game.
        </div>
      </div>
    </div>
  );
}

/** One line under Sol's health bar showing practice mode and modifier state. */
export function ModifierHud({ region }: { region: ColosseumRegion }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setText(region.modifiers?.hudText() ?? null), 300);
    return () => clearInterval(timer);
  }, [region]);
  if (!text) return null;
  return (
    <div style={{ position: "absolute", top: 46, left: 0, right: 0, textAlign: "center", color: "#ffff00", fontFamily: "OSRS", fontSize: 15, textShadow: "1px 1px #000", pointerEvents: "none" }}>
      {text}
    </div>
  );
}
