import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listSegments,
  getSegment,
  createSegment,
  updateSegment,
  deleteSegment,
  checkSegmentMembership,
  getSegmentFlags,
} from '@/api/segments';
import type {
  Segment,
  CreateSegmentInput,
  UpdateSegmentInput,
  ListSegmentsParams,
} from '@/types/segment';
import type { PaginatedResponse } from '@/types/flag';

export function useSegments(params: ListSegmentsParams) {
  return useQuery({
    queryKey: ['segments', params],
    queryFn: async () => {
      const res = await listSegments(params);
      const normalized: PaginatedResponse<Segment> = {
        data: res.segments,
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
      };
      return normalized;
    },
    enabled: !!params.projectId && !!params.environmentKey,
  });
}

export function useSegment(key: string | undefined) {
  return useQuery({
    queryKey: ['segment', key],
    queryFn: () => getSegment(key!),
    enabled: !!key,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSegmentInput) => {
      return createSegment(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useUpdateSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, input }: { key: string; input: UpdateSegmentInput }) =>
      updateSegment(key, input),
    onSuccess: (updatedSegment) => {
      queryClient.setQueryData(['segment', updatedSegment.key], updatedSegment);
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      return deleteSegment(key);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useCheckSegmentMembership() {
  return useMutation({
    mutationFn: ({ key, context }: { key: string; context: Record<string, unknown> }) =>
      checkSegmentMembership(key, context),
  });
}

export function useSegmentFlags(key: string | undefined) {
  return useQuery({
    queryKey: ['segment-flags', key],
    queryFn: async () => {
      const res = await getSegmentFlags(key!);
      return res.flags;
    },
    enabled: !!key,
  });
}
