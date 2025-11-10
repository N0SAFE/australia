import { notFound } from 'next/navigation'
import { getUser } from '@/hooks/useUsers'
import { AdminUserDetailsPage } from '@/components/admin-user-details'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetails({ params }: PageProps) {
  const { id } = await params
  
  try {
    const user = await getUser(id)
    
    if (!user) {
      notFound()
    }
    
    return <AdminUserDetailsPage data={user} update={false} />
  } catch (error) {
    console.error('Failed to fetch user:', error)
    notFound()
  }
}