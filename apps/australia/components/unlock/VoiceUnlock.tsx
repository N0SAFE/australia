'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { VoiceLockConfig } from '@/types/capsule';
import { Button } from '@/components/ui/button';
import { Mic, MicOff } from 'lucide-react';

export const VoiceUnlock: FC<{
  lockConfig: VoiceLockConfig;
  onUnlock: (data: VoiceLockConfig) => Promise<void>;
  onCancel: () => void;
}> = ({ lockConfig, onUnlock, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = lockConfig.language || 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        handleVoiceResult(result);
      };

      recognitionRef.current.onerror = () => {
        setError('Erreur de reconnaissance vocale');
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [lockConfig.language]);

  const handleVoiceResult = async (result: string) => {
    setLoading(true);
    setError('');

    try {
      await onUnlock({
        type: 'voice',
        phrase: result,
      });
    } catch (err) {
      setError('Phrase incorrecte. Essayez de dire : "' + lockConfig.phrase + '"');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      setError('');
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    } else {
      setError('Reconnaissance vocale non supportée par votre navigateur');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Déverrouillage vocal</h3>
        <p className="text-sm text-gray-600">
          Prononcez la phrase magique pour déverrouiller cette capsule
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 p-6 bg-pink-50 rounded-lg">
        <Button
          type="button"
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          className="w-20 h-20 rounded-full"
        >
          {isRecording ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </Button>

        <p className="text-sm font-medium">
          {isRecording ? 'Écoute en cours...' : 'Appuyez pour parler'}
        </p>

        {transcript && (
          <div className="text-sm text-gray-600">
            Vous avez dit : <span className="font-semibold">{transcript}</span>
          </div>
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
          disabled={loading || isRecording}
          className="flex-1"
        >
          Annuler
        </Button>
      </div>
    </div>
  );
};
