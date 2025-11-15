import { connection } from 'next/server'
import { InviteAcceptanceClient } from './invite-acceptance-client'

interface InvitePageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ redirectUrl?: string }>;
}

export default async function InviteAcceptancePage({ params, searchParams }: InvitePageProps) {
  await connection()
  const { code } = await params
  const search = await searchParams

  return <InviteAcceptanceClient token={code} redirectUrl={search.redirectUrl} />
}
