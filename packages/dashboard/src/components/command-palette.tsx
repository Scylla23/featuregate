import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Users, ClipboardList, Settings, Plus, Moon, Sun } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useFlags } from '@/hooks/use-flags';
import { useSegments } from '@/hooks/use-segments';
import { useProject } from '@/providers/project-provider';
import { useTheme } from '@/hooks/use-theme';
import { useDebounce } from '@/hooks/use-debounce';

interface CommandPaletteProps {
  onCreateFlag?: () => void;
}

export function CommandPalette({ onCreateFlag }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { activeProjectId, activeEnvironmentKey } = useProject();
  const debouncedSearch = useDebounce(search, 200);

  const { data: flagsData } = useFlags({
    search: debouncedSearch,
    limit: 5,
    projectId: activeProjectId || '',
    environmentKey: activeEnvironmentKey || '',
  });

  const { data: segmentsData } = useSegments({
    search: debouncedSearch,
    limit: 5,
    projectId: activeProjectId || '',
    environmentKey: activeEnvironmentKey || '',
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (callback: () => void) => {
    setOpen(false);
    setSearch('');
    callback();
  };

  const flags = flagsData?.data ?? [];
  const segments = segmentsData?.data ?? [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Search flags, segments, or navigate to a page">
      <CommandInput
        placeholder="Search flags, segments, or type a command..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {flags.length > 0 && (
          <CommandGroup heading="Flags">
            {flags.map((flag) => (
              <CommandItem
                key={flag.key}
                value={`flag-${flag.key}`}
                onSelect={() => runCommand(() => navigate(`/flags/${flag.key}`))}
              >
                <Flag className="size-4 text-muted-foreground" />
                <span>{flag.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{flag.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {segments.length > 0 && (
          <CommandGroup heading="Segments">
            {segments.map((segment) => (
              <CommandItem
                key={segment.key}
                value={`segment-${segment.key}`}
                onSelect={() => runCommand(() => navigate(`/segments/${segment.key}`))}
              >
                <Users className="size-4 text-muted-foreground" />
                <span>{segment.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{segment.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          <CommandItem
            value="go-flags"
            onSelect={() => runCommand(() => navigate('/flags'))}
          >
            <Flag className="size-4" />
            Go to Flags
          </CommandItem>
          <CommandItem
            value="go-segments"
            onSelect={() => runCommand(() => navigate('/segments'))}
          >
            <Users className="size-4" />
            Go to Segments
          </CommandItem>
          <CommandItem
            value="go-audit"
            onSelect={() => runCommand(() => navigate('/audit-log'))}
          >
            <ClipboardList className="size-4" />
            Go to Audit Log
          </CommandItem>
          <CommandItem
            value="go-settings"
            onSelect={() => runCommand(() => navigate('/settings'))}
          >
            <Settings className="size-4" />
            Go to Settings
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {onCreateFlag && (
            <CommandItem
              value="create-flag"
              onSelect={() => runCommand(() => onCreateFlag())}
            >
              <Plus className="size-4" />
              Create Flag
            </CommandItem>
          )}
          <CommandItem
            value="toggle-theme"
            onSelect={() =>
              runCommand(() => setTheme(theme === 'dark' ? 'light' : 'dark'))
            }
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            Toggle Theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
