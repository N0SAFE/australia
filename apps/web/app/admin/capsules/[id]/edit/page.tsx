import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { AdminCapsuleDetailsPageClient } from '../admin-capsule-details-page-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CapsuleEditPage({ params }: PageProps) {
  await connection()
  const { id } = await params
  
  const queryClient = new QueryClient()
  
  try {
    // Prefetch capsule data
    await queryClient.prefetchQuery(
      orpc.capsule.findById.queryOptions({
        input: { id },
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
      })
    )
    
    // Check if capsule exists in cache after prefetch
    const capsule = queryClient.getQueryData(orpc.capsule.findById.queryKey({ input: { id } }))
    
    if (!capsule) {
      notFound()
    }
    
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminCapsuleDetailsPageClient capsuleId={id} update={true} />
      </HydrationBoundary>
    )
  } catch (error) {
    console.error('Failed to fetch capsule:', error)
    notFound()
  }
}
