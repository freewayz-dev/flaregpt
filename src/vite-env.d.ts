/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />
/// <reference types="vite-plugin-pwa/client" />

// vite.config.js configures vite-plugin-svgr with `exportType: "default"`
// and `include: "**/*.svg"`, so at RUNTIME every bare `*.svg` import in
// this app default-exports a React component, not a URL string. This
// override was meant to make bare imports (e.g. `import MxrpyIcon from
// "@/assets/protocols/mxrpy.svg"`) type-check that way too — but confirmed
// live (via protocols.tsx, the first bare-`.svg` import to actually get
// type-checked) that it silently loses to vite/client's own built-in
// `declare module "*.svg" { const src: string }`: both are ambient
// wildcard module declarations for the identical "*.svg" specifier from
// different files, and TypeScript does not merge/override between them
// the way named-interface declaration merging does — vite/client's wins,
// with no error to flag the conflict. Left here as a documented dead end,
// not removed, so a future bare `.svg` import doesn't quietly re-hit the
// exact same trap: the real fix is to import with the `?react` suffix
// instead (`import Icon from "./icon.svg?react"`), which resolves through
// vite-plugin-svgr's own bundled, non-conflicting type declaration for
// that distinct specifier — see protocols.tsx's MxrpyIcon/SceptreIcon
// imports. `?url`-suffixed imports (e.g. TokenIcon.tsx) are unaffected —
// vite/client's own ambient declaration for those already returns a
// string, matching real behavior with no override needed.
declare module "*.svg" {
  import type { FunctionComponent, SVGProps } from "react";

  const ReactComponent: FunctionComponent<
    SVGProps<SVGSVGElement> & { title?: string }
  >;

  export default ReactComponent;
}

// The DOM lib's own `Window`/`Navigator` types have no idea about a wallet
// extension's injected globals — those only ever exist because a browser
// extension put them there at runtime, not because any web standard defines
// them. `window.ethereum` is genuinely optional (nothing injects it with no
// wallet extension installed) — matches `WindowWithEthereum` in
// web3Config.ts, which stays as its own narrower, wagmi-callback-context
// type; this just makes the *real* global `window` object honest about
// carrying the same property too, for code (ConnectWalletModal.tsx) that
// reads `window.ethereum` directly rather than through wagmi's contextual
// callback. `navigator.brave` is Brave's own documented (non-standard)
// feature-detection API — see ConnectWalletModal.tsx's isBraveBrowser.
import type { InjectedProvider } from "@/config/web3Config";

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }

  interface Navigator {
    brave?: {
      isBrave: () => Promise<boolean>;
    };
    // iOS Safari's own (long-standing, still non-standard) way of exposing
    // "launched from a home-screen icon, not a browser tab" — the one
    // signal `display-mode: standalone` can't provide there, since iOS
    // Safari doesn't support that media feature the way Chromium does.
    // See src/utils/platform.ts's isStandaloneDisplayMode.
    standalone?: boolean;
  }

  // Chromium-only (Chrome, Edge, Samsung Internet, ...), not yet part of
  // any DOM lib — narrowed to just the members this app actually reads
  // (see usePwaInstallListeners.ts) rather than guessing the full spec.
  // Firefox and Safari never fire this event at all, which is the whole
  // reason src/utils/platform.ts's iOS detection exists as a separate
  // path — there's no event-based signal to listen for there.
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}
