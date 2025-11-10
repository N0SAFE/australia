import dayjs from 'dayjs';
import { Capsule } from '@/types/capsule';
import { redirect } from 'next/navigation';
import { CapsuleDetails } from '@/components/pages/capsule-details';
import { getCapsule } from '@/hooks/useCapsules';

export default async function CapsulePage({
  params,
}: {
  params: Promise<{
    id: string;
  }>
}) {
  const { id } = await params;

  try {
    const capsule = await getCapsule(id);


    if (!capsule) {
      redirect('/capsules');
    }

  return <CapsuleDetails
    data={capsule}
  />;

  } catch (error) {
    redirect('/capsules');
  }
}