import React from 'react'
import { AlertCircle, HelpCircle, ShieldAlert } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'warning';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'destructive':
        return <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />;
      default:
        return <HelpCircle className="h-5 w-5 text-primary shrink-0" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-left">
        <div className={`flex items-start gap-3 border p-3.5 rounded-lg text-sm leading-relaxed ${getVariantStyles()}`}>
          {getIcon()}
          <div>
            <p className="font-bold">Attention Required</p>
            <p className="mt-0.5 text-xs opacity-90">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading} size="sm">
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'primary'}
            onClick={() => {
              onConfirm();
            }}
            loading={loading}
            size="sm"
            className={variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
