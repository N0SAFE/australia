import { getCapsulesByMonth } from '@/hooks/useCapsules';
import { CapsuleCard } from '@/components/capsule';
import { Capsule } from '@/types/capsule';
import dayjs from 'dayjs';

export default async function Capsules() {
  const currentMonth = dayjs().format('YYYY-MM');
  
  let capsules: Capsule[] = [];
  try {
    const resData = await getCapsulesByMonth(currentMonth);
    capsules = resData?.capsules ?? [];
  } catch (error) {
    console.error('Failed to fetch capsules:', error);
    capsules = [];
  }

  return <div>
    <h1 className="font-bold text-2xl mx-auto w-fit mt-5 mb-12">les capsules du mois</h1>

    <div className="gap-x-5 gap-y-4 flex flex-wrap justify-center px-4">
      {capsules.map((capsule) => {
        return <CapsuleCard className="flex-1 max-w-1/2 sm:flex-0 sm:max-w-none" key={capsule.id} data={capsule} />
      })}
    </div>

  </div>;
}