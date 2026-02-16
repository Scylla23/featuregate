import { useNavigate } from 'react-router-dom';
import { MoreVertical, Pencil, Copy, History, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface FlagRowActionsProps {
  flagKey: string;
}

export function FlagRowActions({ flagKey }: FlagRowActionsProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
          <MoreVertical className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate(`/flags/${flagKey}`)}>
          <Pencil className="mr-2 size-4" />
          Edit Flag
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await navigator.clipboard.writeText(flagKey);
            toast.success('Flag key copied to clipboard');
          }}
        >
          <Copy className="mr-2 size-4" />
          Copy Key
        </DropdownMenuItem>
        <DropdownMenuItem>
          <History className="mr-2 size-4" />
          View Audit Log
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <Archive className="mr-2 size-4" />
          Archive Flag
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
