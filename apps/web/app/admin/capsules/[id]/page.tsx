import { connection } from 'next/server'
import { notFound } from 'next/navigation'
import { getCapsule } from '@/hooks/useCapsules'
import { AdminCapsuleDetailsPage } from '@/components/admin-capsule-details'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminCapsuleDetails({ params }: PageProps) {
  await connection()
  const { id } = await params
  
  try {
    const capsule = await getCapsule(id)
    
    if (!capsule) {
      notFound()
    }
    
    return <AdminCapsuleDetailsPage data={capsule} update={false} />
  } catch (error) {
    console.error('Failed to fetch capsule:', error)
    notFound()
  }
}