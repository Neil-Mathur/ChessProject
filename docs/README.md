# Documentation Index

| Document | Contents |
|---|---|
| [overview.md](./overview.md) | How the application works, architecture diagram, data flows, technology stack, key design decisions |
| [component-engine.md](./component-engine.md) | Chess engine — types, move generation, variant interface, all three variants, adding new variants, self-test |
| [component-ai.md](./component-ai.md) | AI opponent — Stockfish 18 WASM (Standard Chess), alpha-beta engine (variants), Web Workers, difficulty levels |
| [component-ui.md](./component-ui.md) | React UI components — BoardPanel, ControlsPanel, PocketBar, admin page, theming, skins |
| [component-state.md](./component-state.md) | Zustand stores — useGameStore, usePreferences, move notation |
| [component-auth.md](./component-auth.md) | Auth.js, Google sign-in, Dev Login, preference sync, admin authorisation, API endpoints |
| [component-multiplayer.md](./component-multiplayer.md) | Online multiplayer — Socket.IO, room lifecycle, reconnect, feature flag |
| [environment-variables.md](./environment-variables.md) | All env vars, which file they go in, visibility matrix |
| [integrations.md](./integrations.md) | Every third-party dependency with runtime consequences — includes Stockfish and Google Analytics |
| [operations.md](./operations.md) | Start/stop, pm2, Nginx, SSL, dev workflow, maintenance, troubleshooting |
| [postgres-migration.md](./postgres-migration.md) | Step-by-step guide to switching from SQLite to PostgreSQL |
