import { useRef, useEffect } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TagMultiSelect } from '@/components/tag-multi-select';
import { useCreateSegment } from '@/hooks/use-segments';
import { useProject } from '@/providers/project-provider';
import { toast } from 'sonner';

const DEFAULT_TAGS = ['frontend', 'backend', 'experiment', 'ops', 'beta', 'release', 'mobile'];

const createSegmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Segment name is required')
    .max(256, 'Name must be 256 characters or less'),
  key: z
    .string()
    .min(1, 'Segment key is required')
    .max(128, 'Key must be 128 characters or less')
    .regex(
      /^[a-z0-9][a-z0-9-]*$/,
      'Must be lowercase alphanumeric with hyphens, cannot start with a hyphen',
    ),
  description: z.string().max(1024).optional(),
});

type FormValues = z.infer<typeof createSegmentSchema>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

interface CreateSegmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSegmentModal({ open, onOpenChange }: CreateSegmentModalProps) {
  const navigate = useNavigate();
  const keyManuallyEdited = useRef(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const createSegment = useCreateSegment();
  const { activeProjectId, activeEnvironmentKey } = useProject();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createSegmentSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
    },
  });

  const nameValue = watch('name');

  useEffect(() => {
    if (!keyManuallyEdited.current && nameValue) {
      setValue('key', slugify(nameValue), { shouldValidate: nameValue.length > 0 });
    }
  }, [nameValue, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      const segment = await createSegment.mutateAsync({
        ...values,
        projectId: activeProjectId!,
        environmentKey: activeEnvironmentKey!,
        tags: selectedTags,
      });
      toast.success('Segment created successfully');
      handleClose();
      navigate(`/segments/${segment.key}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create segment');
    }
  };

  const handleClose = () => {
    reset();
    keyManuallyEdited.current = false;
    setSelectedTags([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Segment</DialogTitle>
          <DialogDescription>
            Add a new user segment to your project for targeted rollouts.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="segment-name">Segment Name</Label>
            <Input
              id="segment-name"
              placeholder="e.g. Beta Testers"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="segment-key">Segment Key</Label>
              <span className="text-xs text-muted-foreground">Auto-generated</span>
            </div>
            <div className="relative">
              <Input
                id="segment-key"
                className="font-mono pr-8"
                placeholder="beta-testers"
                {...register('key', {
                  onChange: () => {
                    keyManuallyEdited.current = true;
                  },
                })}
              />
              <Lock className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            </div>
            {errors.key ? (
              <p className="text-xs text-destructive">{errors.key.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                URL-safe, lowercase. Cannot be changed later.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="segment-description">Description</Label>
            <Textarea
              id="segment-description"
              placeholder="Briefly describe this segment's purpose..."
              className="resize-none"
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagMultiSelect
              options={DEFAULT_TAGS}
              selected={selectedTags}
              onSelectedChange={setSelectedTags}
              placeholder="Add tags..."
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createSegment.isPending}>
              {createSegment.isPending && <Loader2 className="size-4 animate-spin" />}
              Create Segment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
