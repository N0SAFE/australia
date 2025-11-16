'use client';

import { FC, useState } from 'react';
import { Capsule, LockConfig } from '@/types/capsule';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { CodeUnlock } from './CodeUnlock';
import { VoiceUnlock } from './VoiceUnlock';
import { DeviceUnlock } from './DeviceUnlock';
import { TimeBasedUnlock } from './TimeBasedUnlock';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth';
import { Shield } from 'lucide-react';
import { useUnlockCapsule } from '@/hooks/useCapsules';

export const UnlockModal: FC<{
  capsule: Capsule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ capsule, open, onOpenChange }) => {
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session } = useSession();
  const { mutateAsync: unlockCapsule } = useUnlockCapsule();
  
  // Check if user is admin
  const isAdmin = session?.user?.role === 'admin' || session?.user?.role?.includes('admin');

  const handleUnlock = async (unlockData: LockConfig) => {
    try {
      const result = await unlockCapsule({
        id: capsule.id,
        code: 'code' in unlockData ? unlockData.code : undefined,
        voiceTranscript: 'phrase' in unlockData ? unlockData.phrase : undefined,
        deviceAction: unlockData.type === 'device_shake' ? 'shake' : 
                      unlockData.type === 'device_tilt' ? 'tilt' : 
                      unlockData.type === 'device_tap' ? 'tap' : undefined,
        apiResponse: 'expectedResponse' in unlockData ? unlockData.expectedResponse : undefined,
      });

      if (!result.success) {
        throw new Error(result.message || 'Échec du déverrouillage');
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

        {/* Admin Preview Indicator */}
        {isAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2">
            <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Mode Administrateur - Aperçu uniquement</p>
              <p className="text-xs mt-1">Le déverrouillage ne sera pas enregistré dans la base de données. Cette action est temporaire pour cette session de prévisualisation.</p>
            </div>
          </div>
        )}

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
