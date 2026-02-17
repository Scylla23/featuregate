import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TypeToConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  confirmLabel = 'Delete',
  onConfirm,
  isLoading,
}: TypeToConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState('');
  const isMatch = typedValue === confirmText;

  const handleConfirm = async () => {
    if (!isMatch) return;
    await onConfirm();
    setTypedValue('');
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setTypedValue('');
        onOpenChange(val);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-input">
            Type <span className="font-semibold">{confirmText}</span> to confirm
          </Label>
          <Input
            id="confirm-input"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={confirmText}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isMatch || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
