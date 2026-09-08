# Inferno Trainer

- [Click here to try the Inferno Trainer](https://www.infernotrainer.com/)
- [Click here to beta test the Inferno Trainer](https://beta.infernotrainer.com/)
- [Join our Discord](https://discord.gg/Z3ZyY7Yzt5)

## What is this project?

This project stemmed from my interest in Old School Runescape's Inferno, and my desire for an open source, relatively clean re-implementation of the Old School Runescape engine. The underlying code is designed closer to a true game engine compared to any other trainer or simulator. The goal is for there to be a clean, well-defined API between all "Game Content" code and any underlying "Engine" code

## How do I use it?

### Pick your own waves

If you want to practice a wave, click one of the links above. You can type in a wave and it will produce a random spawn, and you can re-play the exact spawn if you wish.

### Practice a wave I failed in-game

Alternatively, if you are practicing the Inferno and have the Inferno Stats plugin (Available on RuneLite's Plugin Hub), you can click a wave in the panel and it will load the simulation with the exact spawn. I would recommend you disable the "Hide when outside of the Inferno" feature for when you plank.

## I found a bug!

Likely. Please open a issue above. Videos, screenshots, proof of OSRS science, etc is appreciated. I want this to be a faithful re-implementation of OSRS and all bugs are appreciated.

## Can I contribute?

Sure. Right now the code is undergoing rapid development and the API is not stable. I am open to pull requests but I suggest you start small and let me talk to you first to make sure we're aligned.

## Development notes

Use Node 16 for now. There's an SSL error on version >= 18.

To use a local checkout of `osrs-sdk` from the sibling directory (note: the SDK **must** be a sibling of this project and have the name `osrs-sdk`), run:

    npm run link:sdk

This builds the SDK  and uses the standard npm link workflow without changing
the committed dependency or lockfile. Re-run it after SDK source changes, then
restart the trainer dev server. Use `npm unlink osrs-sdk` followed by
`npm install` to restore the published package.

To select a hosted cache-render bundle at build/dev-server time:

    OSRS_CACHE_RENDER_MANIFEST_URL=https://assets.example.com/osrs-cache-render/manifest.json npm run start

    npm run start

### Netlify beta builds

The `beta` branch uses the `[context.beta]` configuration in `netlify.toml` and
[`scripts/build-beta.sh`](scripts/build-beta.sh). That build clones the SDK
repository and branch named by `OSRS_SDK_REPO` and
`OSRS_SDK_BRANCH` (defaulting to the cache-render branch), builds it, downloads
and extracts the cache-render assets using the cache reader repository and
branch named by `OSRS_CACHE_READER_REPO` and `OSRS_CACHE_READER_BRANCH`, then
installs that built SDK checkout before building the trainer. The generated cache bundle is
copied into `dist/cache-render` and served by the trainer site. The OpenRS2
cache is stored under `/opt/build/cache/osrs-cache-render` (or
`NETLIFY_CACHE_DIR` when provided), so subsequent builds reuse it. These values
can be overridden in Netlify for a fork or another SDK branch.

`OSRS_OPENRS2_CACHE_ID` pins the OpenRS2 cache used for the asset bundle. It is
set to `2437`, whose cache revision is `236`; its associated XTEAs are required
to decode the renderer's map assets. Do not advance this value to a later cache
without confirming that its XTEAs are available.

The beta context uses these asset settings:

    OSRS_ASSET_BASE_URL=https://assets-soltrainer.netlify.app
    OSRS_CACHE_RENDER_MANIFEST_URL=/cache-render/manifest.json

The trainer build bundles that SDK into `dist/main.js`. Since the SDK branch is
cloned by name, each beta deploy uses the latest commit on that branch. For a
fully reproducible deploy, change the command to check out a specific commit
after cloning.

Running test

    npx jest

## V3 fork

This branch (`v3`) makes the trainer behave like the reference RuneLite client. Design and
plan live in `docs/superpowers/`.

- Run locally: `C:\dev\colosim\start.cmd` (cache-render assets on http://127.0.0.1:8081,
  trainer on http://localhost:8000). The SDK fork is linked with `npm run link:sdk`.
- Camera: right-drag rotates, a stationary right click opens the menu (RuneLite
  "right click moves camera"). Middle-drag and scroll zoom still work.
- Keybinds: F1 combat, F2 inventory, F3 prayer, F4 magic, F5 equipment. Pressing the
  open panel's key closes it. Rebinding in the sim settings panel still persists.
- Gear: the "V3 Colosseum" loadout is copied from the RuneLite Inventory Setup named
  "Colosseum" (Blue moon set, Blood ancient sceptre, Fire cape, Blood fury,
  Confliction gauntlets, Avernic treads (pr)(et), Lightbearer, Rada's blessing 4; the
  BowFa/crystal switch, Noxious halberd, Saradomin godsword, Burning claws and the
  potions in the inventory). Prayer level is 93.
- Layout: `modernLayout` setting (on by default) draws one bottom tab row, a larger
  panel, and a visual-only chat strip. The site sidebar hides behind the gear button.
- Fight setup: the sim opens on a setup screen (loadout, prayer layout, keybinds, camera,
  practice mode, modifiers, Sol's attack toggles). Start applies everything with a fresh
  reset; the in-game Setup button (top right) reopens it. Dying shows a Try again overlay
  (Enter also restarts) that keeps every setting.
- Fullscreen: on by default when Start fight is pressed (Esc leaves it), plus a toggle
  button top right in-game and in the setup screen. Browsers only allow fullscreen from a
  click, which is why it is tied to Start rather than page load.
- Loadout edits made in the setup screen's editor are saved in the browser (the engine's
  `customLoadout` setting) and reapplied on every Start and Try again.
- Practice mode caps each of Sol's hits at 1-2 so more of his rotation can be seen.
- Modifiers (numbers from the wiki modifiers page): Doom dies at 15/10/5 stacks, one stack per
  damaging hit; Frailty -10/20/40% max HP and no overheal; Myopia -2/4/6 attack range (manual
  casts unaffected); Blasphemy drains 20/40/60% of damage taken from prayer (rounded up);
  Relentless +1/+3/+6 to Sol's hits (its accuracy part is moot: Sol's hits already ignore
  Defence in the sim). Solar Flare is upstream's.
- Prayer book: `Settings.prayerLayout` draws the book in the reference RuneLite arrangement (30 slots,
  hidden prayers blank). Untick "V3 prayer book layout" for the stock order.
- Kit passives and specials implemented in the SDK fork: Saradomin godsword Healing Blade
  (doubled accuracy, +10% max hit, heals 50% of damage min 10, restores 25% prayer min 5,
  50% energy), Burning claws Burning barrage (35% energy, three hits from a 75-175% /
  50-150% / 25-125% band by which accuracy roll lands, burns of 1 per 4 ticks for 40 ticks
  up to five stacks), Blood fury (20% of damaging melee hits heal 30%), Lightbearer (special
  energy every 25 ticks instead of 50). Blood ancient sceptre autocasts on the 5-tick spell
  cycle and swings at 4 in melee.
- Review: the branch was put through an adversarial Codex review on 2026-09-08; the
  findings and fixes are in the commit history ("fix: review findings").
- Model fallbacks: the pinned OpenRS2 cache (2437, revision 236) has no definition for
  the Necklace of rupture (33639), so it has a sprite and stats but no character mesh.
  Everything else in the loadout renders from the cache.
- Tests: the SDK fork's jest suite is fully green. This repo's SolAttack suite has
  18 failures inherited from upstream drift between the beta tests and the
  cache-render SDK branch; they fail identically without the fork's changes.
- Windows: `npm run assets` cannot spawn `tsx.cmd` on Node 24. Run the extractor
  directly: `OSRS_CACHE_REVISION=236 OSRS_CACHE_SOURCE=openrs2:2437 npx tsx
  scripts/cache-render/extract.mts scripts/cache-render/adapter.mts
  .cache-render/openrs2/2437/cache cache-render-bundle` from the SDK repo after
  `npx tsx scripts/cache-render/download.mts 2437`.
