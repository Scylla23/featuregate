import { useState, useRef, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { TagMultiSelect } from '@/components/tag-multi-select';
import { useCreateFlag } from '@/hooks/use-flags';
import { useProject } from '@/providers/project-provider';
import { toast } from 'sonner';

const DEFAULT_TAGS = ['frontend', 'backend', 'mobile', 'experiment', 'ops', 'beta', 'release'];

const createFlagSchema = z.object({
  name: z.string().min(1, 'Flag name is required').max(256, 'Name must be 256 characters or less'),
  key: z
    .string()
    .min(1, 'Flag key is required')
    .max(128, 'Key must be 128 characters or less')
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Must be lowercase alphanumeric with hyphens, cannot start with a hyphen'),
  description: z.string().max(1024).optional(),
});

type FormValues = z.infer<typeof createFlagSchema>;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

interface CreateFlagModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateFlagModal({ open, onOpenChange }: CreateFlagModalProps) {
  const keyManuallyEdited = useRef(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const createFlag = useCreateFlag();
  const { activeProjectId, activeEnvironmentKey } = useProject();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(createFlagSchema),
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
      await createFlag.mutateAsync({
        ...values,
        projectId: activeProjectId!,
        environmentKey: activeEnvironmentKey!,
        variations: [
          { value: true, name: 'True' },
          { value: false, name: 'False' },
        ],
        offVariation: 1,
        fallthrough: { variation: 0 },
        tags: selectedTags,
      });
      toast.success('Flag created successfully');
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create flag');
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
          <DialogTitle>Create Feature Flag</DialogTitle>
          <DialogDescription>
            Add a new feature flag to your project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="flag-name">Flag Name</Label>
            <Input
              id="flag-name"
              placeholder="e.g. New Checkout Flow"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="flag-key">Flag Key</Label>
              <span className="text-xs text-muted-foreground">Auto-generated</span>
            </div>
            <div className="relative">
              <Input
                id="flag-key"
                className="font-mono pr-8"
                placeholder="new-checkout-flow"
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
            <Label htmlFor="flag-description">Description</Label>
            <Textarea
              id="flag-description"
              placeholder="Briefly describe what this flag controls..."
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Variations</Label>
              <Badge variant="secondary" className="text-[11px]">
                Boolean
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 text-[10px] uppercase tracking-wider">
                  On
                </Badge>
                <div>
                  <p className="text-sm font-medium">Variation 1</p>
                  <p className="text-xs text-muted-foreground font-mono">true</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  Off
                </Badge>
                <div>
                  <p className="text-sm font-medium">Variation 2</p>
                  <p className="text-xs text-muted-foreground font-mono">false</p>
                </div>
              </div>
            </div>
            <button type="button" className="text-sm text-primary hover:underline">
              + Add Variation
            </button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createFlag.isPending}>
              {createFlag.isPending && <Loader2 className="size-4 animate-spin" />}
              Create Flag
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
