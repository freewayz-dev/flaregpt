# flaregpt

pnpm + Turborepo monorepo.

- `apps/web` — the FlareGPT web dashboard (Vite + React), deployed via Vercel. See its own README for app-specific commands.
- `apps/mobile` — the FlareGPT mobile app (React Native + Expo), not yet scaffolded.
- `packages/*` — shared packages consumed by both apps: `api`, `queries`, `state`, `i18n`, `design-tokens`, `wallet`, `domain-utils`. None exist yet — see the FlareGPT Mobile Architecture Plan for the full migration sequence.

## Commands (from repo root)

```bash
pnpm install       # installs every workspace package
pnpm dev           # turbo run dev, currently targets apps/web only
pnpm build         # turbo run build
pnpm lint          # turbo run lint
pnpm test          # turbo run test
```

Per-app commands (e.g. `pnpm test:e2e`, `pnpm build:analyze`) are run from inside that app's own directory, or via `pnpm --filter <app-name> <script>` from the root.
