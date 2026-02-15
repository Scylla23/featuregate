import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MOCK_FLAGS } from '@/mock/flags';
import type { Flag, CreateFlagInput, PaginatedResponse, ListFlagsParams } from '@/types/flag';

const ITEMS_PER_PAGE = 5;

function filterAndSort(flags: Flag[], params: ListFlagsParams): PaginatedResponse<Flag> {
  let filtered = [...flags];

  if (params.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (f) => f.name.toLowerCase().includes(s) || f.key.toLowerCase().includes(s),
    );
  }

  if (params.tags?.length) {
    filtered = filtered.filter((f) => params.tags!.some((t) => f.tags.includes(t)));
  }

  const sortBy = params.sortBy || 'updatedAt';
  const sortOrder = params.sortOrder || 'desc';
  filtered.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (sortBy === 'enabled') {
      cmp = Number(a.enabled) - Number(b.enabled);
    } else {
      cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  const page = params.page || 1;
  const limit = params.limit || ITEMS_PER_PAGE;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return { data, total, page, totalPages };
}

// Simulated local store for mock mutations
let localFlags = [...MOCK_FLAGS];

export function useFlags(params: ListFlagsParams) {
  return useQuery({
    queryKey: ['flags', params],
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));
      return filterAndSort(localFlags, params);
    },
  });
}

export function useToggleFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      await new Promise((r) => setTimeout(r, 200));
      const flag = localFlags.find((f) => f.key === key);
      if (!flag) throw new Error('Flag not found');
      flag.enabled = !flag.enabled;
      flag.updatedAt = new Date().toISOString();
      return flag;
    },
    onMutate: async (key: string) => {
      await queryClient.cancelQueries({ queryKey: ['flags'] });
      const previousQueries = queryClient.getQueriesData<PaginatedResponse<Flag>>({
        queryKey: ['flags'],
      });

      queryClient.setQueriesData<PaginatedResponse<Flag>>(
        { queryKey: ['flags'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((f) =>
              f.key === key ? { ...f, enabled: !f.enabled } : f,
            ),
          };
        },
      );

      return { previousQueries };
    },
    onError: (_err, _key, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
    },
  });
}

export function useCreateFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFlagInput) => {
      await new Promise((r) => setTimeout(r, 400));

      if (localFlags.some((f) => f.key === input.key)) {
        throw new Error(`Flag key "${input.key}" already exists`);
      }

      const newFlag: Flag = {
        _id: String(localFlags.length + 1),
        key: input.key,
        name: input.name,
        description: input.description,
        projectId: input.projectId,
        environmentKey: input.environmentKey,
        enabled: input.enabled ?? false,
        variations: input.variations.map((v) => ({ value: v.value, name: v.name })),
        offVariation: input.offVariation,
        fallthrough: input.fallthrough || { variation: 0 },
        targets: [],
        rules: [],
        tags: input.tags || [],
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localFlags = [newFlag, ...localFlags];
      return newFlag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flags'] });
    },
  });
}
