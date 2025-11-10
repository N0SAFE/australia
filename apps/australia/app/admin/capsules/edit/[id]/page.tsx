import { Capsule } from '@/types/capsule';
import { AdminCapsuleDetailsPage } from '@/components/admin-capsule-details';

export default async function AdminUserDetails({
  params
}: {
  params: Promise<{
    id: string;
  }>
}) {
  const { id } = await params;

  const capsule: Capsule = {
    id: id,
    openingDate: '2024-12-31',
    contentType: 'text',
    content: `
      <p><span style="white-space: pre-wrap;">Lorem </span></p><h1><span style="white-space: pre-wrap;">ipsum </span></h1><ol><li value="1"><ol><li value="1"><ol><li value="1"><ol><li value="1"><ol><li value="1"><span style="white-space: pre-wrap;">in dolor et</span></li></ol></li></ol></li></ol></li></ol></li></ol><p><span style="white-space: pre-wrap;">something else what</span></p>
    `,
    openingMessage: 'Happy New Year!',
    isLocked: false,
    lockType: null,
    lockConfig: null,
    unlockedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return <AdminCapsuleDetailsPage data={capsule} update />
}