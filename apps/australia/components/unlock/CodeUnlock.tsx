'use client';

import { FC, useState } from 'react';
import { CodeLockConfig } from '@/types/capsule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const CodeUnlock: FC<{
  lockConfig: CodeLockConfig;
  onUnlock: (data: CodeLockConfig) => Promise<void>;
  onCancel: () => void;
}> = ({ lockConfig, onUnlock, onCancel }) => {
  const [code, setCode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const maxAttempts = lockConfig.attempts || 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (attempts >= maxAttempts) {
      setError(`Nombre maximum de tentatives atteint (${maxAttempts})`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onUnlock({
        type: 'code',
        code,
      });
    } catch (err) {
      setAttempts(prev => prev + 1);
      setError('Code incorrect');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="code">Entrez le code de déverrouillage</Label>
        <Input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code..."
          disabled={loading || attempts >= maxAttempts}
          className="mt-2"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="text-sm text-gray-500">
        Tentatives: {attempts} / {maxAttempts}
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={loading || !code || attempts >= maxAttempts}
          className="flex-1"
        >
          {loading ? 'Vérification...' : 'Déverrouiller'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
};
