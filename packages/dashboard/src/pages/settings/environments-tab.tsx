import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  ShieldOff,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { MaskedSecret } from '@/components/masked-secret';
import { TypeToConfirmDialog } from '@/components/type-to-confirm-dialog';
import { ColorPicker } from '@/components/color-picker';
import { useProject } from '@/providers/project-provider';
import {
  useEnvironmentsList,
  useCreateEnvironment,
  useUpdateEnvironment,
  useDeleteEnvironment,
  useResetSdkKey,
  useResetMobileKey,
  useReorderEnvironments,
} from '@/hooks/use-environments';
import type { EnvironmentDetail, CreateEnvironmentInput, UpdateEnvironmentInput } from '@/types/settings';

// ---------------------------------------------------------------------------
// Sortable Environment Card
// ---------------------------------------------------------------------------

function SortableEnvironmentCard({
  environment,
  onEdit,
  onDelete,
  onToggleCritical,
  onResetSdkKey,
  onResetMobileKey,
}: {
  environment: EnvironmentDetail;
  onEdit: (env: EnvironmentDetail) => void;
  onDelete: (env: EnvironmentDetail) => void;
  onToggleCritical: (env: EnvironmentDetail) => void;
  onResetSdkKey: (env: EnvironmentDetail) => void;
  onResetMobileKey: (env: EnvironmentDetail) => void;
}) {
  const [keysOpen, setKeysOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: environment.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 ${isDragging ? 'z-50 shadow-lg opacity-90' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: environment.color }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{environment.name}</span>
            <code className="text-xs text-muted-foreground">{environment.key}</code>
            {environment.isCritical && (
              <Badge variant="secondary" className="gap-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                <Shield className="size-3" />
                Critical
              </Badge>
            )}
            {environment.requireConfirmation && (
              <Badge variant="outline" className="text-xs">Confirm required</Badge>
            )}
            {environment.requireComments && (
              <Badge variant="outline" className="text-xs">Comments required</Badge>
            )}
          </div>
          {environment.description && (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{environment.description}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(environment)}>
              <Pencil className="mr-2 size-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleCritical(environment)}>
              {environment.isCritical ? (
                <>
                  <ShieldOff className="mr-2 size-3.5" />
                  Remove critical
                </>
              ) : (
                <>
                  <Shield className="mr-2 size-3.5" />
                  Mark as critical
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(environment)}
            >
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* SDK Keys Section */}
      <Collapsible open={keysOpen} onOpenChange={setKeysOpen}>
        <CollapsibleTrigger asChild>
          <button className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            {keysOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            SDK Keys
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2 pl-4">
          <div className="flex items-center gap-2">
            <MaskedSecret value={environment.sdkKey} label="SDK Key" className="flex-1" />
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onResetSdkKey(environment)}
              title="Reset SDK Key"
            >
              <RotateCcw className="size-3" />
            </Button>
          </div>
          {environment.mobileKey && (
            <div className="flex items-center gap-2">
              <MaskedSecret value={environment.mobileKey} label="Mobile Key" className="flex-1" />
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onResetMobileKey(environment)}
                title="Reset Mobile Key"
              >
                <RotateCcw className="size-3" />
              </Button>
            </div>
          )}
          {environment.clientSideId && (
            <MaskedSecret value={environment.clientSideId} label="Client ID" canReveal={false} />
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Tab
// ---------------------------------------------------------------------------

export function EnvironmentsTab() {
  const { activeProjectId } = useProject();
  const { data, isLoading } = useEnvironmentsList(activeProjectId);
  const createMutation = useCreateEnvironment();
  const updateMutation = useUpdateEnvironment();
  const deleteMutation = useDeleteEnvironment();
  const resetSdkKeyMutation = useResetSdkKey();
  const resetMobileKeyMutation = useResetMobileKey();
  const reorderMutation = useReorderEnvironments();

  const [createOpen, setCreateOpen] = useState(false);
  const [editEnv, setEditEnv] = useState<EnvironmentDetail | null>(null);
  const [deleteEnv, setDeleteEnv] = useState<EnvironmentDetail | null>(null);
  const [resetKeyEnv, setResetKeyEnv] = useState<{ env: EnvironmentDetail; type: 'sdk' | 'mobile' } | null>(null);

  // Form state for create/edit
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#6366F1');
  const [formCritical, setFormCritical] = useState(false);
  const [formConfirmation, setFormConfirmation] = useState(false);
  const [formComments, setFormComments] = useState(false);

  const environments = data?.environments ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const resetForm = useCallback(() => {
    setFormName('');
    setFormKey('');
    setFormDescription('');
    setFormColor('#6366F1');
    setFormCritical(false);
    setFormConfirmation(false);
    setFormComments(false);
  }, []);

  const openEdit = useCallback((env: EnvironmentDetail) => {
    setFormName(env.name);
    setFormDescription(env.description || '');
    setFormColor(env.color || '#6366F1');
    setFormCritical(env.isCritical);
    setFormConfirmation(env.requireConfirmation);
    setFormComments(env.requireComments);
    setEditEnv(env);
  }, []);

  const handleCreate = async () => {
    if (!activeProjectId || !formName) return;
    const input: CreateEnvironmentInput = {
      name: formName,
      description: formDescription || undefined,
      color: formColor,
      isCritical: formCritical,
      requireConfirmation: formConfirmation,
      requireComments: formComments,
    };
    if (formKey) input.key = formKey;
    try {
      await createMutation.mutateAsync({ projectId: activeProjectId, input });
      toast.success('Environment created');
      setCreateOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create environment');
    }
  };

  const handleUpdate = async () => {
    if (!activeProjectId || !editEnv) return;
    const input: UpdateEnvironmentInput = {
      name: formName,
      description: formDescription,
      color: formColor,
      isCritical: formCritical,
      requireConfirmation: formConfirmation,
      requireComments: formComments,
    };
    try {
      await updateMutation.mutateAsync({ projectId: activeProjectId, envKey: editEnv.key, input });
      toast.success('Environment updated');
      setEditEnv(null);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update environment');
    }
  };

  const handleDelete = async () => {
    if (!activeProjectId || !deleteEnv) return;
    try {
      await deleteMutation.mutateAsync({ projectId: activeProjectId, envKey: deleteEnv.key });
      toast.success('Environment deleted');
      setDeleteEnv(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete environment');
    }
  };

  const handleToggleCritical = async (env: EnvironmentDetail) => {
    if (!activeProjectId) return;
    try {
      await updateMutation.mutateAsync({
        projectId: activeProjectId,
        envKey: env.key,
        input: { isCritical: !env.isCritical },
      });
      toast.success(env.isCritical ? 'Critical removed' : 'Marked as critical');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update environment');
    }
  };

  const handleResetKey = async () => {
    if (!activeProjectId || !resetKeyEnv) return;
    try {
      if (resetKeyEnv.type === 'sdk') {
        await resetSdkKeyMutation.mutateAsync({
          projectId: activeProjectId,
          envKey: resetKeyEnv.env.key,
        });
      } else {
        await resetMobileKeyMutation.mutateAsync({
          projectId: activeProjectId,
          envKey: resetKeyEnv.env.key,
        });
      }
      toast.success(`${resetKeyEnv.type === 'sdk' ? 'SDK' : 'Mobile'} key reset successfully`);
      setResetKeyEnv(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset key');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeProjectId) return;

    const oldIndex = environments.findIndex((e) => e.key === active.id);
    const newIndex = environments.findIndex((e) => e.key === over.id);
    const reordered = arrayMove(environments, oldIndex, newIndex);
    const orderedKeys = reordered.map((e) => e.key);

    reorderMutation.mutate({ projectId: activeProjectId, orderedKeys });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Environments</h3>
          <p className="text-xs text-muted-foreground">
            Manage deployment environments. Drag to reorder.
          </p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="mr-1.5 size-3.5" />
          Add Environment
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={environments.map((e) => e.key)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {environments.map((env) => (
              <SortableEnvironmentCard
                key={env.key}
                environment={env}
                onEdit={openEdit}
                onDelete={setDeleteEnv}
                onToggleCritical={handleToggleCritical}
                onResetSdkKey={(e) => setResetKeyEnv({ env: e, type: 'sdk' })}
                onResetMobileKey={(e) => setResetKeyEnv({ env: e, type: 'mobile' })}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {environments.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Globe className="size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No environments yet</p>
          <p className="text-xs text-muted-foreground">Create your first environment to get started</p>
          <Button size="sm" className="mt-4" onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="mr-1.5 size-3.5" />
            Add Environment
          </Button>
        </div>
      )}

      {/* Create Environment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Environment</DialogTitle>
            <DialogDescription>Add a new deployment environment to your project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Production" />
            </div>
            <div className="space-y-2">
              <Label>Key (auto-generated from name)</Label>
              <Input
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder={formName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'auto-generated'}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="critical">Critical environment</Label>
                <Switch id="critical" checked={formCritical} onCheckedChange={setFormCritical} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="confirmation">Require confirmation</Label>
                <Switch id="confirmation" checked={formConfirmation} onCheckedChange={setFormConfirmation} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="comments">Require comments</Label>
                <Switch id="comments" checked={formComments} onCheckedChange={setFormComments} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!formName || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Environment Dialog */}
      <Dialog open={!!editEnv} onOpenChange={(open) => { if (!open) setEditEnv(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment</DialogTitle>
            <DialogDescription>Update environment settings. The key cannot be changed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-critical">Critical environment</Label>
                <Switch id="edit-critical" checked={formCritical} onCheckedChange={setFormCritical} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-confirmation">Require confirmation</Label>
                <Switch id="edit-confirmation" checked={formConfirmation} onCheckedChange={setFormConfirmation} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-comments">Require comments</Label>
                <Switch id="edit-comments" checked={formComments} onCheckedChange={setFormComments} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEnv(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!formName || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Environment Dialog */}
      <TypeToConfirmDialog
        open={!!deleteEnv}
        onOpenChange={(open) => { if (!open) setDeleteEnv(null); }}
        title="Delete Environment"
        description={`This will permanently delete the environment "${deleteEnv?.name}" and all flag/segment configurations in this environment.`}
        confirmText={deleteEnv?.name ?? ''}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Reset Key Confirmation */}
      <AlertDialog open={!!resetKeyEnv} onOpenChange={(open) => { if (!open) setResetKeyEnv(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {resetKeyEnv?.type === 'sdk' ? 'SDK' : 'Mobile'} Key</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>
                  Resetting this key will invalidate the current key. Any applications using this key will need to be updated with the new key.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setResetKeyEnv(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleResetKey}
              disabled={resetSdkKeyMutation.isPending || resetMobileKeyMutation.isPending}
            >
              {(resetSdkKeyMutation.isPending || resetMobileKeyMutation.isPending) && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Reset Key
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
