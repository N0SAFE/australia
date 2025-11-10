import { HomePage } from '@/components/pages/home';
import { Capsule } from '@/types/capsule';
import { getCapsulesByMonth } from '@/hooks/useCapsules';
import dayjs from 'dayjs';

export default async function Home() {
  const currentMonth = dayjs().format('YYYY-MM');
  
  let capsules: Capsule[] = [];
  try {
    console.log(currentMonth)
    const resData = await getCapsulesByMonth(currentMonth);
    console.log('resData', resData)
    capsules = resData?.capsules ?? [];
  } catch (error) {
    console.error('Failed to fetch capsules:', error);
    // Return empty array on error
    capsules = [];
  }

  const filteredCapsules = capsules.filter(capsule => {
    const today = dayjs();
    return !dayjs(capsule.openingDate).isAfter(today);
  }).slice(-2);

  return <HomePage data={filteredCapsules} />;
}