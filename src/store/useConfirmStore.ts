import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions | null;
  resolver: ((value: boolean) => void) | null;

  /** Opens the dialog and resolves with true/false on user choice. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Called by the dialog when the user confirms. */
  accept: () => void;
  /** Called by the dialog when the user cancels or dismisses. */
  dismiss: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: null,
  resolver: null,

  confirm(options) {
    // If another dialog is open, resolve it as false first
    const prev = get().resolver;
    if (prev) prev(false);

    return new Promise<boolean>((resolve) => {
      set({ open: true, options, resolver: resolve });
    });
  },

  accept() {
    const { resolver } = get();
    if (resolver) resolver(true);
    set({ open: false, options: null, resolver: null });
  },

  dismiss() {
    const { resolver } = get();
    if (resolver) resolver(false);
    set({ open: false, options: null, resolver: null });
  },
}));

/** Convenience wrapper for one-shot confirmations outside React. */
export const confirm = (options: ConfirmOptions): Promise<boolean> =>
  useConfirmStore.getState().confirm(options);
