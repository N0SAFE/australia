import { HomePage } from '@/components/pages/home';
import { Capsule } from '@/types/capsule';
import { getRecentCapsules } from '@/hooks/useCapsules';

export default async function Home() {
  let capsules: Capsule[] = [];
  try {
    const resData = await getRecentCapsules();
    console.log('Recent capsules:', resData)
    capsules = resData?.capsules ?? [];
  } catch (error) {
    console.error('Failed to fetch recent capsules:', error);
    // Return empty array on error
    capsules = [];
  }

  return <HomePage data={capsules} />;
}