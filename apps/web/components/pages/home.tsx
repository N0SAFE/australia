'use client';

import { Capsule } from '@/types/capsule';
import { CapsuleCard } from '@/components/capsule';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSession } from '@/lib/auth';

export function HomePage({
  data,
}: {
  data: Capsule[];
}) {
  const { data: session } = useSession();
  const user = session?.user;

  return <div className="w-full flex flex-col justify-center items-center gap-8 mt-8">
    <h1 className="text-6xl text-pink-dark font-script" suppressHydrationWarning>Hey {user?.name?.split(' ')[0] || 'there'} !</h1>

    <h2 className="text-2xl font-bold mt-5">Les dernières capsules</h2>

    {data && data.length > 0 ? (
      <div className="gap-x-5 gap-y-4 flex flex-wrap justify-center px-4">
        {data.map((item) => {
          return <CapsuleCard className="flex-1" data={item} key={item.id} />
        })}
      </div>
    ) : (
      <p className="text-center text-gray-500 px-4">
        Aucune capsule pour le moment. Créez votre première capsule !
      </p>
    )}

    <Button asChild className="text-accent bg-white uppercase text-pink-dark" variant="secondary">
      <Link href="/capsules">
        voir les capsules du mois
      </Link>
    </Button>
  </div>
}