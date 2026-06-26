import React from 'react'
import { Inbox, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// SKELETON LOADERS
export const SkeletonCard: React.FC = () => (
  <div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse space-y-3">
    <div className="flex items-center justify-between">
      <div className="h-4 w-24 bg-muted rounded"></div>
      <div className="h-5 w-5 bg-muted rounded-full"></div>
    </div>
    <div className="h-8 w-16 bg-muted rounded"></div>
    <div className="h-3 w-32 bg-muted rounded"></div>
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
  <div className="w-full border rounded-lg bg-card overflow-hidden animate-pulse">
    <div className="h-10 bg-muted/60 border-b border-border"></div>
    <div className="p-4 space-y-4">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div key={cIdx} className="h-6 flex-1 bg-muted rounded"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export const SkeletonChart: React.FC = () => (
  <div className="rounded-xl border bg-card p-6 shadow-sm animate-pulse flex flex-col justify-between h-[300px]">
    <div className="h-4 w-40 bg-muted rounded mb-4"></div>
    <div className="flex-1 flex items-end gap-2 px-4">
      {Array.from({ length: 12 }).map((_, idx) => (
        <div 
          key={idx} 
          className="flex-1 bg-muted rounded-t"
          style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }}
        />
      ))}
    </div>
  </div>
)


// EMPTY STATE
interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-12 text-center bg-card shadow-sm">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
      <Inbox className="h-6 w-6 text-muted-foreground" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
    {actionText && onAction && (
      <div className="mt-6">
        <Button onClick={onAction} size="sm">
          {actionText}
        </Button>
      </div>
    )}
  </div>
)


// ERROR STATE
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Failed to load data. Please check your network connection or credentials.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center border border-destructive/20 rounded-lg p-12 text-center bg-destructive/5 shadow-sm max-w-xl mx-auto my-6">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <AlertCircle className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{message}</p>
    {onRetry && (
      <div className="mt-6">
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Request
        </Button>
      </div>
    )}
  </div>
)


// ACCESS DENIED STATE
export const AccessDenied: React.FC = () => (
  <div className="flex flex-col items-center justify-center border border-amber-500/20 rounded-xl p-12 text-center bg-amber-500/5 shadow-sm max-w-xl mx-auto my-12 select-none">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 animate-bounce">
      <ShieldAlert className="h-8 w-8" />
    </div>
    <h3 className="mt-5 text-lg font-bold text-foreground">Access Restricted</h3>
    <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed max-w-md">
      You do not have the required permissions to access this administrative module. 
      Please contact your system administrator if you believe this is an error.
    </p>
  </div>
)

