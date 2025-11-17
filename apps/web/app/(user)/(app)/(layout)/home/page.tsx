import { HomePage } from '@/components/pages/home';
import { Capsule } from '@/types/capsule';
import { getRecentCapsules } from '@/hooks/useCapsules';
import { connection } from 'next/server';

export default async function Home() {
  await connection();
  let capsules: Capsule[] = [];
  try {
    const result = await getRecentCapsules();
    capsules = result?.capsules ?? [];
  } catch (error) {
    console.error('Failed to fetch recent capsules:', error);
    // Return empty array on error
    capsules = [];
  }

  return <HomePage data={capsules} />;
}