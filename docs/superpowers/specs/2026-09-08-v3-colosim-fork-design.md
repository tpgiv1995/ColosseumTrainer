# Pat's Colosseum trainer fork: design

Date: 2026-09-08. Approved in chat by Pat the same day.

## Goal

A personal fork of the Sol Heredit Trainer (beta.colosim.com) that feels like Pat's
real RuneLite client: right-drag camera, his F-key bindings, his actual Colosseum
gear, his resizable-modern screen layout, and settings that survive a reset.

## Repos

- `C:\dev\colosim\trainer`: fork of Supalosa/ColosseumTrainer, branch `beta`
  (upstream 799af57). Remote `origin` is tpgiv1995/ColosseumTrainer, `upstream`
  is Supalosa.
- `C:\dev\colosim\osrs-sdk`: fork of OldSchoolSDK/osrs-sdk, branch
  `feat/cache-render-bundle` (upstream 8514232). Remote `origin` is
  tpgiv1995/osrs-sdk, `upstream` is OldSchoolSDK.
- Work happens on branch `pat` in both repos. The trainer links the SDK fork
  with its existing `npm run link:sdk` script.
- License stays GPL-3.0 with upstream attribution intact.

## 1. Camera (SDK, `src/sdk/Viewport3d.ts`, `src/sdk/ClickController.ts`)

- Right-drag rotates the camera exactly like middle-drag does today.
- A right press followed by movement above a small threshold (4 px) is a drag:
  the context menu does not open. A right press released without movement opens
  the menu as today.
- While the context menu is active the camera ignores right-drag, matching
  RuneLite's "right click menu blocks camera" setting.
- Middle-drag, scroll zoom, and arrow keys are unchanged.

## 2. Keybinds and defaults (SDK `Settings.ts`, `ControlPanelController.ts`)

- Defaults become Pat's live client bindings: F1 combat, F2 inventory,
  F3 prayer, F4 magic, F5 equipment.
- Pressing the key of the already-open panel closes it (RuneLite "side panel can
  be closed by the hotkeys").
- Default player stats: 99 in every combat stat, Prayer 93.
- Persistence is unchanged (localStorage). Baked defaults mean a wiped browser
  or a new device still lands on Pat's setup.

## 3. Gear (SDK content plus trainer loadout)

Exact copy of the "Colosseum" Inventory Setup in the reference RuneLite profile.

Equipment: Blue moon helm (29041), Fire cape (6570), Amulet of blood fury
(24780), Blood ancient sceptre (28260), Blue moon chestplate (29037), Blue moon
tassets (29039), Confliction gauntlets (31106), Avernic treads (pr)(et) (31095),
Lightbearer (25975), Rada's blessing 4 (22947).

Inventory, in slot order: Abyssal tentacle, Barrows gloves, Bow of Faerdhinen (c)
(Iorwerth 25886), Crystal body (Iorwerth 27721), Dragon defender, Necklace of
rupture (33639), Crystal helm (Iorwerth 27729), Crystal legs (Iorwerth 27725),
2x Super combat, 2x Ranging potion, 6x Super restore, Sanfew serum, 4x Saradomin
brew, Saturated heart (27641), Noxious halberd, Saradomin godsword (11806),
Burning claws (29577), Divine rune pouch (27509).

Rules:
- Every item gets a class with wiki bonuses and a cache id in `CacheAssets.ts`
  so the cache-render pipeline extracts its real model. Existing classes are
  reused where they exist (tentacle, Barrows gloves, dragon defender, halberd,
  brews, restores, super combats, crystal set, BowFa).
- Iorwerth crystal recolours use the Iorwerth ids so the model matches.
- Consumables without engine behaviour (Sanfew, ranging potion, saturated
  heart, rune pouch, blessing) are inert inventory items that render correctly.
- The loadout is named "V3 Colosseum" and is the default loadout. Upstream's
  max-melee loadout stays available in the loadout picker.
- If cache extraction cannot supply a model, the item falls back to the closest
  existing model and the fallback is listed in the trainer README.

## 4. Interface (SDK `ControlPanelController.ts`, react `DefaultSidebar`)

A `modernLayout` setting, on by default in the fork:
- Tab strip is one row of 14 tabs along the bottom edge, right-aligned, in
  RuneLite's modern order (combat, skills, quests, inventory, equipment, prayer,
  magic, then chat-channel, friends, account, logout, settings, emotes, music).
  Tabs without a panel in the sim are drawn but inert.
- The open panel sits above the strip on the right, scaled to match the
  inventory size in Pat's screenshot (roughly 1.4x the current desktop scale
  at 1707x898).
- A static chat strip (All, Game, Public, Private, Channel, Clan, Trade, clock)
  is drawn along the bottom-left. Purely visual.
- The site's yellow settings sidebar collapses to a single toggle button so it
  stops eating width. All its controls remain reachable.

## 5. Hosting

- Netlify site from the trainer fork's `pat` branch using the existing beta
  build script (clones the SDK fork's `pat` branch, builds the cache bundle
  from OpenRS2 cache 2437). Netlify env overrides: `OSRS_SDK_REPO` and
  `OSRS_SDK_BRANCH` point at the fork.
- Local: `C:\dev\colosim\start.cmd` runs the dev server on localhost:8000 with
  the cache bundle served by the SDK's `serve:assets` script.

## 6. Testing

- Existing jest suites (Sol32, SolAttack, SolMovement) stay green.
- New tests: keybind defaults, same-key toggle, camera right-drag versus
  right-click classification, every new item's bonuses against wiki values.
- Manual: drive the local build in the god Chrome, compare against Pat's
  screenshot, and confirm settings survive a page reload and the Reset button.

## Out of scope

Waves 1 to 11, modifiers, RuneLite plugin overlays (prayer bars, splits), and
any change to Sol's combat logic.
