import { CapsuleDatePage } from '@/components/pages/capsule-date';
import { Capsule } from '@/types/capsule';
import { getCapsulesByDay } from '@/hooks/capsules/queries';

export default async function Date({
  params
}: {
  params: Promise<{
    date: string;
  }>
}) {
  const { date } = await params;

  const resData = await getCapsulesByDay(date);
  const capsules: Capsule[] = resData.capsules;

  return <CapsuleDatePage data={capsules} />;
}