# Testing

Gherkin feature files describing the expected behaviour of MadChessLab.

## Structure

| File | Covers |
|------|--------|
| `features/navigation.feature` | Sidebar nav, page routing, banner, active link states |
| `features/variant_selection.feature` | Switching variants, board reset, persistence |
| `features/gameplay.feature` | Making moves, undo, flip, win/draw conditions, variant-specific rules |
| `features/opponents.feature` | Human vs AI configuration, difficulty, AI auto-play |
| `features/settings.feature` | Board skin, piece skin, persistence via localStorage and DB |
| `features/auth.feature` | Google sign-in, preference sync to/from DB, sign-out fallback |
| `features/multiplayer.feature` | Room create/join, real-time moves, reconnect, resign (requires `NEXT_PUBLIC_MULTIPLAYER=true`) |

## Running these scenarios

These are plain Gherkin specifications — they document intended behaviour and serve as the basis for automated acceptance tests.

To wire them up, install a Cucumber-compatible runner:

```bash
npm install --save-dev @cucumber/cucumber
```

Add step definitions under `testing/steps/` and a `cucumber.js` config file. Each step maps a Given/When/Then line to a Playwright or Testing Library action against the running app.

## Prerequisites for multiplayer scenarios

The multiplayer feature file requires the app to be running with Socket.IO enabled:

```bash
MULTIPLAYER=true NEXT_PUBLIC_MULTIPLAYER=true npm run start:multi
```
