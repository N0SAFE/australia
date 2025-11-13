'use client';

import { Capsule } from '@/types/capsule';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { ContentRenderer } from '@/components/content/ContentRenderer';
import { UnlockModal } from '@/components/unlock/UnlockModal';
import { useSession } from '@/lib/auth';
import { Shield } from 'lucide-react';
import { useMarkCapsuleAsOpened } from '@/hooks/useCapsules';

export function CapsuleDetails({
  data,
}: {
  data: Capsule;
}) {
  const [openingDialogOpen, setOpeningDialogOpen] = useState(true);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [adminBypassLock, setAdminBypassLock] = useState(false);
  const { data: session } = useSession();
  const { mutate: markAsOpened } = useMarkCapsuleAsOpened();
  
  // Check if user is admin
  const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role?.includes('admin');

  // Mark capsule as opened when component mounts (if not already opened)
  // Skip for admins to prevent state changes
  useEffect(() => {
    if (!data.openedAt && !isAdmin) {
      markAsOpened({ id: data.id });
    }
  }, [data.id, data.openedAt, isAdmin, markAsOpened]);

  // For admins: allow bypassing locks to view content
  // For regular users: respect lock state
  const isLocked = data.isLocked && !data.unlockedAt && (!isAdmin || !adminBypassLock);

  // Show unlock modal after closing opening dialog if capsule is locked
  const handleOpeningDialogChange = (open: boolean) => {
    setOpeningDialogOpen(open);
    if (!open && isLocked) {
      setUnlockModalOpen(true);
    }
  };

  return <div>
    {/* Admin Preview Mode Banner */}
    {isAdmin && (
      <div className="sticky top-0 z-50 bg-amber-500 text-white px-4 py-2 shadow-md">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4" />
          <span>Mode Administrateur - Les actions ne modifient pas la base de données</span>
          {data.isLocked && !data.unlockedAt && !adminBypassLock && (
            <button
              onClick={() => setAdminBypassLock(true)}
              className="ml-4 bg-white text-amber-600 px-3 py-1 rounded text-xs font-semibold hover:bg-amber-50 transition-colors"
            >
              Afficher le contenu verrouillé
            </button>
          )}
        </div>
      </div>
    )}

    {/* Opening Message Dialog */}
    <Dialog open={openingDialogOpen} onOpenChange={handleOpeningDialogChange}>
      <DialogContent
        className="sm:max-w-md bg-pink-light border-none"
      >
        <DialogTitle className="w-fit mx-auto uppercase text-pink-dark">
          La capsule est prête !
        </DialogTitle>
        {data?.openingMessage && <div className="text-center">
          {data?.openingMessage}
        </div>}
      </DialogContent>
    </Dialog>

    {/* Unlock Modal - shown if locked */}
    {isLocked && (
      <UnlockModal
        capsule={data}
        open={unlockModalOpen}
        onOpenChange={setUnlockModalOpen}
      />
    )}

    {/* Content - shown if unlocked or admin with bypass */}
    {(!isLocked || (isAdmin && adminBypassLock)) && (
      <div className="m-5">
        {isAdmin && adminBypassLock && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
            <p className="font-semibold">Contenu verrouillé - Aperçu administrateur</p>
            <p className="text-xs mt-1">Ce contenu est normalement verrouillé pour les utilisateurs.</p>
          </div>
        )}
        <ContentRenderer capsule={data} />
      </div>
    )}
  </div>
}