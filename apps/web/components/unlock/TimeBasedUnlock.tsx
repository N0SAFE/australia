'use client';

import { FC, useState } from 'react';
import { TimeBasedLockConfig } from '@/types/capsule';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('fr');

export const TimeBasedUnlock: FC<{
  lockConfig: TimeBasedLockConfig;
  capsuleOpeningDate: string;
  onCancel: () => void;
}> = ({ lockConfig, capsuleOpeningDate, onCancel }) => {
  const unlockDate = dayjs(capsuleOpeningDate).add(lockConfig.delayMinutes, 'minute');
  const now = dayjs();
  const isUnlocked = now.isAfter(unlockDate);
  const timeRemaining = unlockDate.diff(now);

  const formatTimeRemaining = () => {
    if (timeRemaining <= 0) return 'Déverrouillé !';
    
    const duration = dayjs.duration(timeRemaining);
    const days = duration.days();
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    const parts = [];
    if (days > 0) parts.push(`${days}j`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}min`);
    if (days === 0 && seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Déverrouillage temporisé</h3>
        <p className="text-sm text-gray-600">
          Cette capsule se déverrouillera automatiquement
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 p-6 bg-pink-50 rounded-lg">
        <Clock className="w-16 h-16 text-pink-600" />
        
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            Date de déverrouillage
          </p>
          <p className="text-lg font-semibold">
            {unlockDate.format('DD/MM/YYYY à HH:mm')}
          </p>
        </div>

        {!isUnlocked && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Temps restant
            </p>
            <p className="text-2xl font-bold text-pink-600">
              {formatTimeRemaining()}
            </p>
          </div>
        )}

        {isUnlocked && (
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-gray-500">
        {isUnlocked 
          ? 'Vous pouvez maintenant voir le contenu de cette capsule !' 
          : 'Revenez plus tard pour déverrouiller cette capsule'}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Fermer
        </Button>
      </div>
    </div>
  );
};
