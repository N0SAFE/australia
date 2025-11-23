import { getCapsules } from '@/hooks/capsules/queries';
import { CalendarPage } from '@/components/pages/calendar';
import { Capsule } from '@/types/capsule';

export default async function Calendar() {
  const resData = await getCapsules();
  const capsules: Capsule[] = resData.capsules;

  return <CalendarPage data={capsules} />
}