'use client';

import { FC, useState } from 'react';
import { Capsule, LockConfig } from '@/types/capsule';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CodeUnlock } from './CodeUnlock';
import { VoiceUnlock } from './VoiceUnlock';
import { DeviceUnlock } from './DeviceUnlock';
import { TimeBasedUnlock } from './TimeBasedUnlock';
import { getApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export const UnlockModal: FC<{
  capsule: Capsule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ capsule, open, onOpenChange }) => {
  const [error, setError] = useState('');
  const router = useRouter();

  const handleUnlock = async (unlockData: LockConfig) => {
    try {
      const response = await getApi().capsule.unlock(capsule.id, unlockData);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Échec du déverrouillage');
      }

      // Refresh the page to show unlocked content
      router.refresh();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Échec du déverrouillage');
      throw err;
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setError('');
  };

  const renderUnlockComponent = () => {
    if (!capsule.lockType || !capsule.lockConfig) {
      return <div>Configuration de verrouillage invalide</div>;
    }

    switch (capsule.lockType) {
      case 'code':
        return (
          <CodeUnlock
            lockConfig={capsule.lockConfig as any}
            onUnlock={handleUnlock}
            onCancel={handleCancel}
          />
        );

      case 'voice':
        return (
          <VoiceUnlock
            lockConfig={capsule.lockConfig as any}
            onUnlock={handleUnlock}
            onCancel={handleCancel}
          />
        );

      case 'device_shake':
      case 'device_tilt':
      case 'device_tap':
        return (
          <DeviceUnlock
            lockConfig={capsule.lockConfig as any}
            onUnlock={handleUnlock}
            onCancel={handleCancel}
          />
        );

      case 'time_based':
        return (
          <TimeBasedUnlock
            lockConfig={capsule.lockConfig as any}
            capsuleOpeningDate={capsule.openingDate}
            onCancel={handleCancel}
          />
        );

      case 'api':
        return (
          <div className="text-center p-4">
            <p className="mb-4">Cette capsule nécessite une validation externe.</p>
            <button onClick={handleCancel} className="underline">
              Fermer
            </button>
          </div>
        );

      default:
        return <div>Type de verrouillage non supporté</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-none">
        <DialogTitle className="text-center">
          🔒 Capsule verrouillée
        </DialogTitle>

        <div className="mt-4">
          {renderUnlockComponent()}
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center mt-4">{error}</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
