import { connection } from 'next/server';
import { AdminUsersPageClient } from './admin-users-page-client';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc';

export default async function AdminUsersPage() {
  // Opt into dynamic rendering
  await connection();
  
  const queryClient = new QueryClient();

  // Prefetch initial users list
  await queryClient.prefetchQuery(
    orpc.user.list.queryOptions({
      input: {
        pagination: {
          limit: 10,
          offset: 0,
        },
        sort: {
          field: 'name',
          direction: 'asc',
        },
      },
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUsersPageClient />
    </HydrationBoundary>
  );
}