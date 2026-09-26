# packages

Internal, unpublished workspace packages consumed by `apps/web` and `apps/mobile`. Each has a single stated purpose and an enforced dependency direction — see the FlareGPT Mobile Architecture Plan artifact for the full per-package boundary rules before adding to any of these.

- `api` — services, `apiClient`, `queryKeys` (Phase 3)
- `queries` — `useXQueries` hooks, resilience profiles (Phase 3)
- `state` — zustand stores, storage engine injected per app (Phase 4)
- `i18n` — the 15 locale resources + i18next core config (Phase 5)
- `design-tokens` — color/spacing/radius/type-scale as plain JS (Phase 2)
- `wallet` — the wallet contract, with separate web/native implementations (Phase 6)
- `domain-utils` — pure `derive*.js` view-models, formatting/address helpers (Phase 2)
