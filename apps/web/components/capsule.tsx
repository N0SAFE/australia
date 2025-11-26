'use client';

import { DetailedHTMLProps, FC, HTMLAttributes, useState } from 'react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { LockKeyhole, LockKeyholeOpen, Lock, MoreVertical, Eye, EyeOff } from 'lucide-react';
import { Capsule } from '@/types/capsule';
import Link from 'next/link';
import { ContentRenderer } from '@/components/content/ContentRenderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/shadcn/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@repo/ui/components/shadcn/dropdown-menu';
import { CapsuleLockModal } from './capsule-lock-modal';
import { useSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useCapsule } from '@/hooks/capsules/hooks';

export const CapsuleCard: FC<{
  data: Capsule
} & DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>> = ({
  className,
  data,
  ...props
}) => {
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const { data: session } = useSession();
  const router = useRouter();
  // Role property added by admin plugin - cast to any to access it
  const isAdmin = (session?.user as any)?.role === 'admin' || (session?.user as any)?.role?.includes('admin');
  
  // Fetch capsule data only when modal should be shown
  const { data: responseCapsule, isLoading: isLoadingResponse, refetch: refetchCapsule } = useCapsule(data.id, {
    enabled: showResponseModal,
  });
  
  const now = dayjs();
  const capsuleDate = dayjs(data.openingDate);
  const isAvailable = !capsuleDate.isAfter(now);
  const isLocked = data.isLocked && !data.isOpened;
  const isUnlockedButNotOpened = !data.isLocked && !data.isOpened && isAvailable;

  const handleShowResponse = async () => {
    setShowResponseModal(true);
    // Refetch to ensure fresh data
    if (!responseCapsule) {
      refetchCapsule();
    }
  };

  const handleOpenWithoutResponse = () => {
    router.push(`/capsules/${data.id}?preview=true`);
  };

  // Unavailable capsule - show modal when clicked
  if (!isAvailable) {
    return (
      <>
        <div 
          onClick={() => setShowUnavailableModal(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "w-46 aspect-square bg-pink-light rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all relative",
            "hover:bg-pink-medium focus:bg-pink-medium",
            className
          )} 
          {...props}
        >
          <div className="bg-white w-full flex py-3 px-4 gap-3 justify-center rounded-lg text-pink-dark">
            <LockKeyhole />
            <span>{capsuleDate.format('DD/MM/YYYY')}</span>
          </div>
        </div>

        <Dialog open={showUnavailableModal} onOpenChange={setShowUnavailableModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">PAS DISPO POUR LE MOMENT...</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4"> {/**create a customizable and accessible modal for unavailable capsules using funny messages registered in the database from the admin panel */}
              <p className="text-center text-muted-foreground">
                Ce portefolio n'a pas encore été enchainé.
              </p>
              <div className="text-center text-sm text-muted-foreground">
                📅 {capsuleDate.format('DD/MM/YYYY')}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <ResponseModal 
          open={showResponseModal}
          onOpenChange={setShowResponseModal}
          capsule={responseCapsule}
          isLoading={isLoadingResponse}
        />
      </>
    );
  }

  // Available but locked capsule - show lock modal when clicked
  if (isLocked) {
    return (
      <>
        <div
          onClick={() => setShowLockModal(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "w-46 aspect-square bg-pink-light rounded-2xl flex flex-col items-center justify-center p-4 transition-all cursor-pointer relative",
            "hover:bg-pink-medium focus:bg-pink-medium opacity-75",
            className
          )}
          suppressHydrationWarning
          {...props}
        >
          {isAdmin && (isHovered || dropdownOpen) && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger 
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-all"
              >
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleShowResponse(); setDropdownOpen(false); }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Afficher la réponse
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleOpenWithoutResponse(); setDropdownOpen(false); }}>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Ouvrir sans réponse
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          <div className="bg-gray-600 w-full flex py-3 px-4 gap-3 justify-center text-white rounded-lg">
            <Lock className="w-5 h-5" />
            <span>{capsuleDate.format('DD/MM/YYYY')}</span>
          </div>

          {data.lockType && (
            <div className="mt-1 text-xs text-gray-500">
              {data.lockType === 'code' && '🔢 Code'}
              {data.lockType === 'voice' && '🎤 Voix'}
              {(data.lockType === 'device_shake' || data.lockType === 'device_tilt' || data.lockType === 'device_tap') && '📱 Geste'}
              {data.lockType === 'time_based' && '⏰ Temps'}
              {data.lockType === 'api' && '🔗 API'}
            </div>
          )}
        </div>

        <CapsuleLockModal
          capsule={data}
          open={showLockModal}
          onOpenChange={setShowLockModal}
        />

        <ResponseModal 
          open={showResponseModal}
          onOpenChange={setShowResponseModal}
          capsule={responseCapsule}
          isLoading={isLoadingResponse}
        />
      </>
    );
  }

  // Available and unlocked AND opened - regular link
  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative", className)}
      {...props}
    >
      <Link
        href={`/capsules/${data.id}`}
        tabIndex={0}
        className={cn(
          "w-46 aspect-square bg-pink-light rounded-2xl flex flex-col items-center justify-center p-4 transition-all",
          "hover:bg-pink-medium focus:bg-pink-medium cursor-pointer"
        )}
      >
        {isUnlockedButNotOpened && <div className="absolute top-3 right-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
            </span>
          </div>}
          
        <div className="bg-pink-dark w-full flex py-3 px-4 gap-3 justify-center text-white rounded-lg">
          <LockKeyholeOpen className="w-5 h-5" />
          <span>{capsuleDate.format('DD/MM/YYYY')}</span>
        </div>
      </Link>
    </div>
  );
}

// Response Modal Component (placed outside the main component to avoid re-rendering)
function ResponseModal({ 
  open, 
  onOpenChange, 
  capsule, 
  isLoading 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  capsule: Capsule | null | undefined; 
  isLoading: boolean;
}) {
  const renderLockResponse = () => {
    if (!capsule?.lockConfig) {
      return (
        <div className="py-8 text-center text-muted-foreground">
          Cette capsule n'a pas de mécanisme de verrouillage
        </div>
      );
    }

    const lockConfig = capsule.lockConfig;

    switch (lockConfig.type) {
      case 'code':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🔢 Verrouillage par Code</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-blue-700 font-medium">Code:</span>
                  <div className="mt-1 p-3 bg-white rounded border border-blue-300">
                    <code className="text-lg font-mono font-bold text-blue-900">{lockConfig.code}</code>
                  </div>
                </div>
                {lockConfig.attempts && (
                  <div className="text-sm text-blue-700">
                    <span className="font-medium">Tentatives autorisées:</span> {lockConfig.attempts}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'voice':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">🎤 Verrouillage Vocal</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-purple-700 font-medium">Phrase à prononcer:</span>
                  <div className="mt-1 p-3 bg-white rounded border border-purple-300">
                    <code className="text-lg font-semibold text-purple-900">"{lockConfig.phrase}"</code>
                  </div>
                </div>
                {lockConfig.language && (
                  <div className="text-sm text-purple-700">
                    <span className="font-medium">Langue:</span> {lockConfig.language}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'device_shake':
      case 'device_tilt':
      case 'device_tap':
        const actionType = lockConfig.type.replace('device_', '');
        const actionLabel = actionType === 'shake' ? 'Secouer' : actionType === 'tilt' ? 'Incliner' : 'Taper';
        const actionIcon = actionType === 'shake' ? '📱' : actionType === 'tilt' ? '📐' : '👆';
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">{actionIcon} Verrouillage par Geste</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-green-700 font-medium">Action requise:</span>
                  <div className="mt-1 p-3 bg-white rounded border border-green-300">
                    <span className="text-lg font-semibold text-green-900">{actionLabel} l'appareil</span>
                  </div>
                </div>
                {lockConfig.threshold !== undefined && (
                  <div className="text-sm text-green-700">
                    <span className="font-medium">Seuil:</span> {lockConfig.threshold}
                  </div>
                )}
                {lockConfig.pattern && (
                  <div className="text-sm text-green-700">
                    <span className="font-medium">Motif:</span> {lockConfig.pattern.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">🔗 Verrouillage API</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-orange-700 font-medium">Point de terminaison:</span>
                  <div className="mt-1 p-3 bg-white rounded border border-orange-300">
                    <code className="text-sm font-mono text-orange-900">{lockConfig.endpoint}</code>
                  </div>
                </div>
                {lockConfig.method && (
                  <div className="text-sm text-orange-700">
                    <span className="font-medium">Méthode:</span> {lockConfig.method}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'time_based':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">⏰ Verrouillage Temporel</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-amber-700 font-medium">Délai requis:</span>
                  <div className="mt-1 p-3 bg-white rounded border border-amber-300">
                    <span className="text-lg font-semibold text-amber-900">{lockConfig.delayMinutes} minutes</span>
                  </div>
                </div>
                <div className="text-sm text-amber-700">
                  Attendez {lockConfig.delayMinutes} minutes après la date d'ouverture pour déverrouiller
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-8 text-center text-muted-foreground">
            Type de verrouillage inconnu
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réponse au mécanisme de verrouillage</DialogTitle>
          <DialogDescription>
            {capsule && `Capsule du ${dayjs(capsule.openingDate).format('DD/MM/YYYY')}`}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Chargement...
          </div>
        ) : capsule ? (
          <div className="py-4">
            {renderLockResponse()}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Impossible de charger la réponse
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}