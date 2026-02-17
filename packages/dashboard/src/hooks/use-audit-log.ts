import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { listAuditLog } from '@/api/audit';
import type { ListAuditLogParams } from '@/types/audit';

export function useAuditLog(params: ListAuditLogParams) {
  return useQuery({
    queryKey: ['audit-log', params],
    queryFn: () => listAuditLog(params),
  });
}

export function useAuditLogInfinite(params: Omit<ListAuditLogParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: ['audit-log-infinite', params],
    queryFn: ({ pageParam = 1 }) => listAuditLog({ ...params, page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useResourceHistory(resourceType: 'flag' | 'segment', resourceKey: string) {
  return useInfiniteQuery({
    queryKey: ['audit-log-infinite', { resourceType, resourceKey }],
    queryFn: ({ pageParam = 1 }) =>
      listAuditLog({ resourceType, resourceKey, page: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) return lastPage.page + 1;
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!resourceKey,
  });
}
