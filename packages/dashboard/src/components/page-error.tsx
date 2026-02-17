import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, RotateCcw, ShieldAlert, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageErrorProps {
  status?: number;
  message?: string;
  onRetry?: () => void;
}

export function PageError({ status, message, onRetry }: PageErrorProps) {
  const navigate = useNavigate();

  let icon = AlertTriangle;
  let title = 'Something went wrong';
  let description = message || 'An unexpected error occurred. Please try again.';

  if (status === 403) {
    icon = ShieldAlert;
    title = 'Access denied';
    description = message || "You don't have permission to view this page.";
  } else if (status === 404) {
    icon = FileQuestion;
    title = 'Not found';
    description = message || 'The resource you are looking for does not exist.';
  } else if (status && status >= 500) {
    title = 'Server error';
    description = message || 'Something went wrong on our end. Please try again.';
  }

  const Icon = icon;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Icon className="size-8 text-muted-foreground" />
        </div>
        {status && (
          <p className="mb-1 text-3xl font-bold text-muted-foreground/50">{status}</p>
        )}
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-3.5" />
            Go Back
          </Button>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
