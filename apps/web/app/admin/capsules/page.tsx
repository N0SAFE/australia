import { connection } from 'next/server';
import { AdminCapsulesPageClient } from './admin-capsules-page-client';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc';

export default async function AdminCapsulesPage() {
  // Opt into dynamic rendering
  await connection();
  
  const queryClient = new QueryClient();

  // Prefetch initial capsules list
  await queryClient.prefetchQuery(
    orpc.capsule.list.queryOptions({
      input: {
        pagination: {
          limit: 10,
          offset: 0,
        },
      },
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
    })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminCapsulesPageClient />
    </HydrationBoundary>
  );
}