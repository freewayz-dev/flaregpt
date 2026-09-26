import { useId} from "react";

// Hand-written, not the usual `?react` SVGR import (see
// src/assets/icons/flaregpt-mark.svg for the static source, used as-is for
// the favicon/apple-touch-icon exports where only one copy of the markup
// ever exists on a page). This component renders on-screen throughout the
// app — sidebar, navbar, chat message avatars — where two or more instances
// are routinely mounted at once (e.g. every assistant message in a chat
// thread, or the sidebar's expanded/collapsed logo, which stays mounted
// underneath `lg:hidden` rather than unmounting). SVGR inlines the gradient
// def's `id="flaregpt-mark-gradient"` verbatim on every instance; with two
// or more copies in the DOM simultaneously, `fill="url(#flaregpt-mark-gradient)"`
// becomes ambiguous (confirmed live: Chromium resolves it to whichever
// element currently owns that id, silently leaving the *other* instance's
// rect unfilled) — invisible in exactly the "second logo on the page"
// case that's completely routine here. `useId()` gives every mounted
// instance its own real id, so the gradient reference can never collide.
// The badge's rounded corners are baked into the artwork itself (the `rect`
// below has rx="51.96" on a 414 viewBox — a fixed 12.55% ratio), not
// something callers control. Every call site used to *also* slap its own
// fixed-pixel `rounded-lg`/`rounded-xl` CSS class on top (a leftover from
// when this wrapped a plain `bg-brand` div that needed it to clip its own
// background) — border-radius clips a replaced element like this one, so
// that second, independent, non-proportional radius was fighting the
// vector's own shape at every size. On a 24px icon, a 12px `rounded-xl`
// clip is 50% — a full circle — while the same class on a 36px icon comes
// out to a much gentler 33%: two icons of the same asset, visibly
// different shapes, purely from being sized differently. Baking the exact
// proportional radius in here once, as a percentage (scales with whatever
// size a caller renders it at), is what actually guarantees every instance
// is the same shape — callers should only ever pass size/shadow/margin
// classes, never their own `rounded-*`.
const MARK_SHAPE_CLASS = "rounded-[12.5%]";

export default function FlareGptMark({ className = "", ...props }) {
  const gradientId = useId();

  return (
    <svg viewBox="0 0 414 414" className={`${MARK_SHAPE_CLASS} ${className}`} {...props}>
      <defs>
        <linearGradient id={gradientId} x1="207.79" y1="-80.52" x2="206.26" y2="475.57" gradientUnits="userSpaceOnUse">
          <stop offset=".01" stopColor="#e62058"/>
          <stop offset=".05" stopColor="#bc1d4a"/>
          <stop offset=".1" stopColor="#8e1a3d"/>
          <stop offset=".14" stopColor="#681731"/>
          <stop offset=".19" stopColor="#481527"/>
          <stop offset=".24" stopColor="#30141f"/>
          <stop offset=".29" stopColor="#1e121a"/>
          <stop offset=".35" stopColor="#141217"/>
          <stop offset=".42" stopColor="#111216"/>
          <stop offset=".53" stopColor="#131216"/>
          <stop offset=".62" stopColor="#1d1219"/>
          <stop offset=".69" stopColor="#2d131e"/>
          <stop offset=".76" stopColor="#431525"/>
          <stop offset=".82" stopColor="#60172e"/>
          <stop offset=".88" stopColor="#831939"/>
          <stop offset=".94" stopColor="#ad1c46"/>
          <stop offset=".99" stopColor="#dd1f55"/>
          <stop offset="1" stopColor="#e62058"/>
        </linearGradient>
      </defs>
      <rect width="414" height="414" rx="51.96" ry="51.96" fill={`url(#${gradientId})`}/>
      <g fill="none" stroke="#e62058" strokeMiterlimit="10" strokeWidth="8px">
        <line x1="225.5" y1="178" x2="225.5" y2="199.72"/>
        <line x1="225.5" y1="219.28" x2="225.5" y2="241"/>
        <line x1="257" y1="209.5" x2="235.28" y2="209.5"/>
        <line x1="215.72" y1="209.5" x2="194" y2="209.5"/>
      </g>
      <path fill="#e62058" d="M122,158.74s48,10,48,41-1,149-1,149c0,0-47-9-47-42v-148Z"/>
      <path fill="#e62058" d="M121.89,143.74s10-48,41-48,149,1,149,1c0,0-9,47-42,47h-148Z"/>
    </svg>
  );
}
