import { notFound } from 'next/navigation'
import { getUser } from '@/hooks/useUsers'
import { AdminUserDetailsPage } from '@/components/admin-user-details'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserEditPage({ params }: PageProps) {
  const { id } = await params
  
  try {
    console.log(id)
    const user = await getUser(id)
    
    if (!user) {
      notFound()
    }
    
    return <AdminUserDetailsPage data={user} update={true} />
  } catch (error) {
    console.error('Failed to fetch user:', error)
    notFound()
  }
}
