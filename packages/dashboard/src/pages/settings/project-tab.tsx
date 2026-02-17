import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { CopyButton } from '@/components/copy-button';
import { TypeToConfirmDialog } from '@/components/type-to-confirm-dialog';
import { useProject } from '@/providers/project-provider';
import {
  useProjectDetail,
  useUpdateProject,
  useDeleteProject,
  useProjectTags,
  useDeleteProjectTag,
} from '@/hooks/use-project-settings';

export function ProjectTab() {
  const { activeProjectId, environments } = useProject();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProjectDetail(activeProjectId);
  const { data: tagsData } = useProjectTags(activeProjectId);
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const deleteTagMutation = useDeleteProjectTag();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultEnvId, setDefaultEnvId] = useState<string>('none');
  const [deleteOpen, setDeleteOpen] = useState(false);

  const tags = tagsData?.tags ?? [];
  const isDirty =
    project &&
    (name !== project.name ||
      description !== (project.description || '') ||
      (defaultEnvId === 'none' ? null : defaultEnvId) !== project.defaultEnvironmentId);

  // Sync from server
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setDefaultEnvId(project.defaultEnvironmentId || 'none');
    }
  }, [project]);

  const handleSave = async () => {
    if (!activeProjectId) return;
    try {
      await updateMutation.mutateAsync({
        projectId: activeProjectId,
        input: {
          name,
          description,
          defaultEnvironmentId: defaultEnvId === 'none' ? null : defaultEnvId,
        },
      });
      toast.success('Project updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProjectId || !project) return;
    try {
      await deleteMutation.mutateAsync({
        projectId: activeProjectId,
        confirmName: project.name,
      });
      toast.success('Project deleted');
      setDeleteOpen(false);
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    if (!activeProjectId) return;
    try {
      await deleteTagMutation.mutateAsync({ projectId: activeProjectId, tag: tagName });
      toast.success(`Tag "${tagName}" removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove tag');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Project Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Information</CardTitle>
          <CardDescription>Basic project details and configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Project Key</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                {project.key}
              </code>
              <CopyButton value={project.key} />
              <span className="text-xs text-muted-foreground">(cannot be changed)</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this project"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Environment</Label>
            <Select value={defaultEnvId} onValueChange={setDefaultEnvId}>
              <SelectTrigger>
                <SelectValue placeholder="Select default environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {environments.map((env) => (
                  <SelectItem key={env._id} value={env._id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isDirty && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tags</CardTitle>
          <CardDescription>
            {tags.length} tag{tags.length !== 1 ? 's' : ''} in use across flags and segments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tags.length > 0 ? (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.name}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{tag.name}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {tag.flagCount} flag{tag.flagCount !== 1 ? 's' : ''},{' '}
                      {tag.segmentCount} segment{tag.segmentCount !== 1 ? 's' : ''}
                      {tag.flagCount === 0 && tag.segmentCount === 0 && (
                        <span className="ml-1 text-muted-foreground/50">(unused)</span>
                      )}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteTag(tag.name)}
                    disabled={deleteTagMutation.isPending}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tags in use. Tags are created when you add them to flags or segments.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that permanently affect this project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-destructive/30 p-4">
            <div>
              <p className="text-sm font-medium">Delete this project</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete this project and all its data including{' '}
                {project.stats?.environmentCount ?? 0} environments,{' '}
                {project.stats?.flagCount ?? 0} flags,{' '}
                {project.stats?.segmentCount ?? 0} segments, and{' '}
                {project.stats?.memberCount ?? 0} team members.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1.5 size-3.5" />
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Project Confirmation */}
      <TypeToConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Project"
        description={`This will permanently delete "${project.name}" and ALL associated data. This action cannot be undone.`}
        confirmText={project.name}
        confirmLabel="Delete Project"
        onConfirm={handleDeleteProject}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
