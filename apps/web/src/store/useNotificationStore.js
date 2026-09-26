import { create } from "zustand";

// Backs src/utils/toast.js's public API — this store only ever holds *what
// to render*; scheduling (auto-close timers) lives in toast.js so this
// stays a plain, synchronous state container, the same division every
// other store in this app already uses. `upsert` keyed by `id` is what
// gives toast.js's `toastId` option (e.g. apiClient.js's "session-expired"
// dedup) its actual dedup behavior — a second push with the same id
// replaces the existing entry in place instead of stacking a duplicate.
export const useNotificationStore = create((set) => ({
  notifications: [],

  upsert: (notification) =>
    set((state) => {
      const index = state.notifications.findIndex((n) => n.id === notification.id);
      if (index === -1) {
        return { notifications: [...state.notifications, notification] };
      }
      const notifications = [...state.notifications];
      notifications[index] = { ...notifications[index], ...notification };
      return { notifications };
    }),

  patch: (id, changes) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    })),

  dismiss: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
}));
