import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import type { ToastType } from '@/store/toastStore'

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-destructive shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
};

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300',
  error: 'border-destructive/20 bg-destructive/10 text-destructive dark:bg-destructive/950/20',
  info: 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300',
  warning: 'border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300',
};

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-md flex-col gap-2 p-4 md:bottom-6 md:right-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md transition-colors ${toastStyles[toast.type]}`}
          >
            {toastIcons[toast.type]}
            <div className="flex-1">
              <h3 className="font-semibold text-sm leading-none">{toast.title}</h3>
              {toast.description && (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-muted-foreground/60 hover:text-foreground shrink-0 rounded-md p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
