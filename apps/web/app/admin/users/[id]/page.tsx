import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { QueryClient, HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'
import { AdminUserDetailsPageClient } from './admin-user-details-page-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetails({ params }: PageProps) {
  await connection()
  const { id } = await params
  
  const queryClient = new QueryClient()
  
  try {
    // Prefetch user data
    await queryClient.prefetchQuery(
      orpc.user.findById.queryOptions({
        input: { id },
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
      })
    )
    
    // Check if user exists in cache after prefetch
    const user = queryClient.getQueryData(orpc.user.findById.queryKey({ input: { id } }))
    
    if (!user) {
      notFound()
    }
    
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminUserDetailsPageClient userId={id} update={false} />
      </HydrationBoundary>
    )
  } catch (error) {
    console.error('Failed to fetch user:', error)
    notFound()
  }
}