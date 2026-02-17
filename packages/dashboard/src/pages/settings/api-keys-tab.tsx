import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  MoreHorizontal,
  Ban,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/providers/project-provider';
import { useApiKeys, useCreateApiKey, useRevokeApiKey, useDeleteApiKey } from '@/hooks/use-api-keys';
import type { ApiKeyItem, CreateApiKeyInput, ApiKeyType } from '@/types/settings';

const KEY_TYPE_LABELS: Record<ApiKeyType, string> = {
  server: 'Server',
  client: 'Client',
  mobile: 'Mobile',
};

const KEY_TYPE_COLORS: Record<ApiKeyType, string> = {
  server: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  client: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  mobile: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ApiKeysTab() {
  const { activeProjectId, environments } = useProject();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const params = useMemo(
    () => ({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      environmentId: envFilter !== 'all' ? envFilter : undefined,
      keyType: typeFilter !== 'all' ? typeFilter : undefined,
    }),
    [statusFilter, envFilter, typeFilter],
  );

  const { data, isLoading } = useApiKeys(activeProjectId, params);
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();
  const deleteMutation = useDeleteApiKey();

  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [revokeKey, setRevokeKey] = useState<ApiKeyItem | null>(null);
  const [deleteKey, setDeleteKey] = useState<ApiKeyItem | null>(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ApiKeyType>('server');
  const [formEnvId, setFormEnvId] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const apiKeys = data?.apiKeys ?? [];

  const envMap = useMemo(() => {
    const map = new Map<string, string>();
    environments.forEach((e) => map.set(e._id, e.name));
    return map;
  }, [environments]);

  const handleCreate = async () => {
    if (!activeProjectId || !formName || !formEnvId) return;
    const input: CreateApiKeyInput = {
      name: formName,
      keyType: formType,
      environmentId: formEnvId,
      description: formDescription || undefined,
    };
    try {
      const result = await createMutation.mutateAsync({ projectId: activeProjectId, input });
      setCreateOpen(false);
      setRevealedKey(result.fullKey);
      setKeyCopied(false);
      setFormName('');
      setFormDescription('');
      toast.success('API key created');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleRevoke = async () => {
    if (!activeProjectId || !revokeKey) return;
    try {
      await revokeMutation.mutateAsync({ projectId: activeProjectId, keyId: revokeKey._id });
      toast.success('API key revoked');
      setRevokeKey(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const handleDelete = async () => {
    if (!activeProjectId || !deleteKey) return;
    try {
      await deleteMutation.mutateAsync({ projectId: activeProjectId, keyId: deleteKey._id });
      toast.success('API key deleted');
      setDeleteKey(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setKeyCopied(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">API Keys</h3>
          <p className="text-xs text-muted-foreground">
            Manage API credentials for your applications.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          Create API Key
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="revoked">Revoked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            {environments.map((env) => (
              <SelectItem key={env._id} value={env._id}>{env.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="server">Server</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {apiKeys.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key._id} className={key.status === 'revoked' ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`border-0 ${KEY_TYPE_COLORS[key.keyType]}`}>
                      {KEY_TYPE_LABELS[key.keyType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{envMap.get(key.environmentId) || 'Unknown'}</TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">{key.keyPrefix}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={key.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                      {key.status === 'active' ? 'Active' : 'Revoked'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(key.lastUsedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {key.status === 'active' && (
                          <DropdownMenuItem className="text-destructive" onClick={() => setRevokeKey(key)}>
                            <Ban className="mr-2 size-3.5" />
                            Revoke
                          </DropdownMenuItem>
                        )}
                        {key.status === 'revoked' && (
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteKey(key)}>
                            <Trash2 className="mr-2 size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Key className="size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No API keys</p>
          <p className="text-xs text-muted-foreground">Create an API key for your applications</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Create API Key
          </Button>
        </div>
      )}

      {/* Create API Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Generate a new API key for connecting to FeatureGate.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Backend Production" />
            </div>
            <div className="space-y-2">
              <Label>Key Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as ApiKeyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="server">Server-side SDK</SelectItem>
                  <SelectItem value="client">Client-side SDK</SelectItem>
                  <SelectItem value="mobile">Mobile SDK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select value={formEnvId} onValueChange={setFormEnvId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((env) => (
                    <SelectItem key={env._id} value={env._id}>{env.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formName || !formEnvId || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Reveal Dialog */}
      <Dialog open={!!revealedKey} onOpenChange={(open) => { if (!open && keyCopied) setRevealedKey(null); }}>
        <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => { if (!keyCopied) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p className="text-sm">
                This is the only time you&apos;ll see this key. Copy it now and store it securely.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted p-3">
              <code className="flex-1 break-all font-mono text-sm">{revealedKey}</code>
              <Button variant="outline" size="sm" onClick={copyKey} className="shrink-0">
                {keyCopied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
                {keyCopied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="key-copied"
                checked={keyCopied}
                onCheckedChange={(checked) => setKeyCopied(checked === true)}
              />
              <Label htmlFor="key-copied" className="text-sm">
                I&apos;ve copied this key
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealedKey(null)} disabled={!keyCopied}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!revokeKey} onOpenChange={(open) => { if (!open) setRevokeKey(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Revoking this key will immediately prevent any application using it from connecting to FeatureGate. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRevokeKey(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revokeMutation.isPending}>
              {revokeMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Revoke Key
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteKey} onOpenChange={(open) => { if (!open) setDeleteKey(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Revoked Key</AlertDialogTitle>
            <AlertDialogDescription>Remove this revoked key from the list? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setDeleteKey(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
