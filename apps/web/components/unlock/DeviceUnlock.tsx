'use client';

import { FC, useState, useEffect } from 'react';
import { DeviceLockConfig } from '@/types/capsule';
import { Button } from '@/components/ui/button';
import { Smartphone, Move } from 'lucide-react';

export const DeviceUnlock: FC<{
  lockConfig: DeviceLockConfig;
  onUnlock: (data: DeviceLockConfig) => Promise<void>;
  onCancel: () => void;
}> = ({ lockConfig, onUnlock, onCancel }) => {
  const [isListening, setIsListening] = useState(false);
  const [detected, setDetected] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isListening) return;

    const handleMotion = async (event: DeviceMotionEvent) => {
      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      const threshold = lockConfig.threshold || 15;
      const totalAcceleration = Math.sqrt(
        Math.pow(acceleration.x || 0, 2) +
        Math.pow(acceleration.y || 0, 2) +
        Math.pow(acceleration.z || 0, 2)
      );

      // Detect shake
      if (lockConfig.type === 'device_shake' && totalAcceleration > threshold) {
        setDetected(true);
        setIsListening(false);
        await handleUnlock();
      }
    };

    const handleOrientation = async (event: DeviceOrientationEvent) => {
      const threshold = lockConfig.threshold || 45;

      // Detect tilt
      if (lockConfig.type === 'device_tilt') {
        const beta = event.beta || 0;
        if (Math.abs(beta) > threshold) {
          setDetected(true);
          setIsListening(false);
          await handleUnlock();
        }
      }
    };

    if (lockConfig.type === 'device_shake') {
      window.addEventListener('devicemotion', handleMotion);
    } else if (lockConfig.type === 'device_tilt') {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isListening, lockConfig]);

  const handleUnlock = async () => {
    setLoading(true);
    setError('');

    try {
      await onUnlock(lockConfig);
    } catch (err) {
      setError('Échec du déverrouillage');
      setDetected(false);
    } finally {
      setLoading(false);
    }
  };

  const startListening = async () => {
    // Request permission for iOS 13+
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') {
          setError('Permission refusée pour accéder aux capteurs');
          return;
        }
      } catch (err) {
        setError('Erreur lors de la demande de permission');
        return;
      }
    }

    setIsListening(true);
    setError('');
    setDetected(false);
  };

  const getInstructions = () => {
    switch (lockConfig.type) {
      case 'device_shake':
        return 'Secouez votre appareil';
      case 'device_tilt':
        return 'Inclinez votre appareil';
      case 'device_tap':
        return 'Tapez sur votre écran selon le motif';
      default:
        return 'Effectuez le geste requis';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Déverrouillage par geste</h3>
        <p className="text-sm text-gray-600">{getInstructions()}</p>
      </div>

      <div className="flex flex-col items-center gap-4 p-6 bg-pink-50 rounded-lg">
        {!isListening && !detected && (
          <>
            <Smartphone className="w-16 h-16 text-pink-600" />
            <Button
              onClick={startListening}
              disabled={loading}
              size="lg"
            >
              Commencer
            </Button>
          </>
        )}

        {isListening && (
          <>
            <Move className="w-16 h-16 text-pink-600 animate-pulse" />
            <p className="text-sm font-medium text-center">
              {getInstructions()}...
            </p>
            <Button
              variant="outline"
              onClick={() => setIsListening(false)}
            >
              Arrêter
            </Button>
          </>
        )}

        {detected && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-green-600">
              Geste détecté !
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading || isListening}
          className="flex-1"
        >
          Annuler
        </Button>
      </div>
    </div>
  );
};
