'use client';

import { Capsule } from '@/types/capsule';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import { ContentRenderer } from '@/components/content/ContentRenderer';
import { UnlockModal } from '@/components/unlock/UnlockModal';

export function CapsuleDetails({
  data,
}: {
  data: Capsule;
}) {
  const [openingDialogOpen, setOpeningDialogOpen] = useState(true);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);

  const isLocked = data.isLocked && !data.unlockedAt;

  // Show unlock modal after closing opening dialog if capsule is locked
  const handleOpeningDialogChange = (open: boolean) => {
    setOpeningDialogOpen(open);
    if (!open && isLocked) {
      setUnlockModalOpen(true);
    }
  };

  return <div>
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

    {/* Content - shown if unlocked */}
    {!isLocked && (
      <div className="m-5">
        <ContentRenderer capsule={data} />
      </div>
    )}
  </div>
}