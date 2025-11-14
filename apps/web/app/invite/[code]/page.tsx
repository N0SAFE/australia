import { connection } from 'next/server'
import { InviteAcceptanceClient } from './invite-acceptance-client'

interface InvitePageProps {
  params: Promise<{ code: string }>
}

export default async function InviteAcceptancePage({ params }: InvitePageProps) {
  await connection()
  const { code } = await params

  return <InviteAcceptanceClient token={code} />
}
