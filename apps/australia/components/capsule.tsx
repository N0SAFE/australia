'use client';

import { DetailedHTMLProps, FC, HTMLAttributes } from 'react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { LockKeyhole, LockKeyholeOpen, Lock, Image as ImageIcon, Video, Music, FileText } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Capsule } from '@/types/capsule';
import Link from 'next/link';

export const CapsuleCard: FC<{
  data: Capsule
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = ({
  className,
  data,
  ...props
}) => {
  const now = dayjs();
  const capsuleDate = dayjs(data.openingDate);
  const isAvailable = !capsuleDate.isAfter(now);
  const isLocked = data.isLocked && !data.unlockedAt;

  if (!isAvailable) {
    return <div className={cn("w-46 aspect-square bg-pink-light rounded-2xl flex flex-col items-center justify-center p-4", className)} {...props}>
      <div className="bg-white w-full flex py-3 px-4 gap-3 justify-center rounded-lg">
        <LockKeyhole />
        <span>{capsuleDate.format('DD/MM/YYYY')}</span>
      </div>
    </div>
  }

  return <Link
    href={`/capsules/${data.id}`}
    tabIndex={0}
    className={cn(
      "w-46 aspect-square bg-pink-light rounded-2xl flex flex-col items-center justify-center p-4 transition-all",
      "hover:bg-pink-medium focus:bg-pink-medium cursor-pointer",
      isLocked && "opacity-75",
      className
    )}
    // onClick={() => {
    //   redirect(`/capsules/${data.id}`)
    // }}
    // {...props}
  >
    <div className={cn(
      "bg-pink-dark w-full flex py-3 px-4 gap-3 justify-center text-white rounded-lg",
      isLocked && "bg-gray-600"
    )}>
      {isLocked ? <Lock className="w-5 h-5" /> : <LockKeyholeOpen className="w-5 h-5" />}
      <span>{capsuleDate.format('DD/MM/YYYY')}</span>
    </div>

    {isLocked && data.lockType && (
      <div className="mt-1 text-xs text-gray-500">
        {data.lockType === 'code' && '🔢 Code'}
        {data.lockType === 'voice' && '🎤 Voix'}
        {(data.lockType === 'device_shake' || data.lockType === 'device_tilt' || data.lockType === 'device_tap') && '📱 Geste'}
        {data.lockType === 'time_based' && '⏰ Temps'}
        {data.lockType === 'api' && '🔗 API'}
      </div>
    )}
  </Link>
}