import { useNotificationStore } from "@/store/useNotificationStore";

// Drop-in replacement for react-toastify's own `toast` — same callable-
// plus-methods shape (`toast(content, opts)`, `.success`, `.error`,
// `.info`, `.warning`, `.dismiss`, `.update`), same option names
// (`toastId`, `autoClose`, `closeOnClick`, `onClick`, and `update`'s own
// `render`). Every one of this app's ~25 existing call sites already uses
// exactly this surface, so migrating off react-toastify is a one-line
// import-source change per file, not a rewrite of the call sites
// themselves — see NotificationCenter.jsx for the actual pill UI this
// renders into, and useNotificationStore.js for where state lives.
//
// `draggable`/`closeButton` (react-toastify options a couple of call
// sites still pass) are accepted and silently ignored — this pill design
// has no drag-to-dismiss gesture and never renders an explicit close
// button at all (click-to-dismiss + auto-close covers every real case
// today), so there's nothing for either option to actually configure.

const DEFAULT_AUTO_CLOSE = 3000;

let seq = 0;
function generateId() {
  seq += 1;
  return `notif-${Date.now()}-${seq}`;
}

function show(tone, content, options = {}) {
  const id = options.toastId ?? generateId();
  const autoClose = options.autoClose === undefined ? DEFAULT_AUTO_CLOSE : options.autoClose;

  useNotificationStore.getState().upsert({
    id,
    tone,
    content,
    onClick: options.onClick,
    closeOnClick: options.closeOnClick !== false,
  });

  if (autoClose !== false) {
    setTimeout(() => useNotificationStore.getState().dismiss(id), autoClose);
  }

  return id;
}

export function toast(content, options) {
  return show("default", content, options);
}

toast.success = (content, options) => show("success", content, options);
toast.error = (content, options) => show("error", content, options);
toast.info = (content, options) => show("info", content, options);
toast.warning = (content, options) => show("warning", content, options);

toast.dismiss = (id) => useNotificationStore.getState().dismiss(id);

// Matches react-toastify's own `toast.update(id, { render, ...opts })` —
// `render` is the new content; everything else merges in as-is (only
// `UpdateAvailableToast.jsx`'s `{ render }` case exists today).
toast.update = (id, patch = {}) => {
  const { render, ...rest } = patch;
  useNotificationStore.getState().patch(id, {
    ...(render !== undefined ? { content: render } : {}),
    ...rest,
  });
};
