import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  toast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  dismiss: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));

export const toast = {
  success: (title: string, description?: string) => 
    useToastStore.getState().toast({ title, description, type: 'success' }),
  error: (title: string, description?: string) => 
    useToastStore.getState().toast({ title, description, type: 'error' }),
  info: (title: string, description?: string) => 
    useToastStore.getState().toast({ title, description, type: 'info' }),
  warning: (title: string, description?: string) => 
    useToastStore.getState().toast({ title, description, type: 'warning' }),
};
