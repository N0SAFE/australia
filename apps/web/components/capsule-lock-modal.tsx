'use client';

import { FC, useState } from 'react';
import { Capsule } from '@/types/capsule';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mic, Smartphone, Code, Clock, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUnlockCapsule } from '@/hooks/capsules/hooks';

interface CapsuleLockModalProps {
  capsule: Capsule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CapsuleLockModal: FC<CapsuleLockModalProps> = ({
  capsule,
  open,
  onOpenChange,
}) => {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const { mutate: unlockCapsule, isPending: isUnlocking } = useUnlockCapsule();

  const handleUnlock = async () => {
    setError(null);

    // Prepare unlock input based on lock type
    const unlockInput: {
      id: string;
      code?: string;
      voiceTranscript?: string;
      deviceAction?: 'shake' | 'tilt' | 'tap';
      apiResponse?: unknown;
    } = { id: capsule.id };

    switch (capsule.lockType) {
      case 'code':
        unlockInput.code = code;
        break;
      case 'voice':
        // TODO: Implement voice recognition
        unlockInput.voiceTranscript = 'sample transcript';
        break;
      case 'device_shake':
        unlockInput.deviceAction = 'shake';
        break;
      case 'device_tilt':
        unlockInput.deviceAction = 'tilt';
        break;
      case 'device_tap':
        unlockInput.deviceAction = 'tap';
        break;
      case 'api':
        unlockInput.apiResponse = {};
        break;
      case 'time_based':
        // No additional input needed
        break;
    }

    unlockCapsule(unlockInput, {
      onSuccess: (result) => {
        if (result.success) {
          onOpenChange(false);
          setCode('');
          router.push(`/capsules/${capsule.id}`);
        } else {
          setError(result.message || 'Échec du déverrouillage');
        }
      },
      onError: (err) => {
        setError('Une erreur est survenue');
      },
    });
  };

  const getLockIcon = () => {
    switch (capsule.lockType) {
      case 'code':
        return <Code className="w-12 h-12" />;
      case 'voice':
        return <Mic className="w-12 h-12" />;
      case 'device_shake':
      case 'device_tilt':
      case 'device_tap':
        return <Smartphone className="w-12 h-12" />;
      case 'time_based':
        return <Clock className="w-12 h-12" />;
      case 'api':
        return <Zap className="w-12 h-12" />;
      default:
        return null;
    }
  };

  const getLockTitle = () => {
    switch (capsule.lockType) {
      case 'code':
        return 'Code de déverrouillage';
      case 'voice':
        return 'Reconnaissance vocale';
      case 'device_shake':
        return 'Secoue ton appareil';
      case 'device_tilt':
        return 'Incline ton appareil';
      case 'device_tap':
        return 'Tape sur l\'écran';
      case 'time_based':
        return 'Déverrouillage temporel';
      case 'api':
        return 'Déverrouillage externe';
      default:
        return 'Déverrouillage requis';
    }
  };

  const getLockDescription = () => {
    switch (capsule.lockType) {
      case 'code':
        return 'Entre le code pour déverrouiller cette capsule';
      case 'voice':
        return 'Prononce la phrase secrète pour déverrouiller';
      case 'device_shake':
        return 'Secoue ton appareil pour déverrouiller';
      case 'device_tilt':
        return 'Incline ton appareil dans la bonne direction';
      case 'device_tap':
        return 'Tape sur l\'écran selon le motif';
      case 'time_based':
        return 'Cette capsule se déverrouillera automatiquement';
      case 'api':
        return 'Cette capsule nécessite une validation externe';
      default:
        return '';
    }
  };

  const renderLockContent = () => {
    switch (capsule.lockType) {
      case 'code':
        return (
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Entre le code..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code) {
                  handleUnlock();
                }
              }}
              className="text-center text-lg tracking-widest"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button
              onClick={handleUnlock}
              disabled={!code || isUnlocking}
              className="w-full"
            >
              {isUnlocking ? 'Déverrouillage...' : 'Déverrouiller'}
            </Button>
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-pink-light p-4 rounded-full mb-4">
                <Mic className="w-8 h-8 text-pink-dark" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Clique sur le micro et prononce la phrase secrète
              </p>
            </div>
            <Button
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="w-full"
            >
              {isUnlocking ? 'Écoute...' : '🎤 Commencer'}
            </Button>
          </div>
        );

      case 'device_shake':
      case 'device_tilt':
      case 'device_tap':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-pink-light p-4 rounded-full mb-4 animate-bounce">
                <Smartphone className="w-8 h-8 text-pink-dark" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {getLockDescription()}
              </p>
            </div>
            <Button
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="w-full"
            >
              {isUnlocking ? 'Détection...' : 'Activer la détection'}
            </Button>
          </div>
        );

      case 'time_based':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-pink-light p-4 rounded-full mb-4">
                <Clock className="w-8 h-8 text-pink-dark" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Cette capsule se déverrouillera automatiquement dans quelques instants
              </p>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-pink-light p-4 rounded-full mb-4">
                <Zap className="w-8 h-8 text-pink-dark" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Cette capsule nécessite une validation externe pour être déverrouillée
              </p>
            </div>
            <Button
              onClick={handleUnlock}
              disabled={isUnlocking}
              className="w-full"
            >
              {isUnlocking ? 'Vérification...' : 'Vérifier le déverrouillage'}
            </Button>
          </div>
        );

      default:
        return (
          <div className="py-4 text-center text-muted-foreground">
            Type de verrouillage non supporté
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="mb-4 text-pink-dark">
            {getLockIcon()}
          </div>
          <DialogTitle className="text-center">{getLockTitle()}</DialogTitle>
          <DialogDescription className="text-center">
            {getLockDescription()}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {renderLockContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
