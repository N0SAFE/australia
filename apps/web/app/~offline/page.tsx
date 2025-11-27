"use client";

import { Logo } from "@/components/svg/logo";
import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-background p-4">
      <Logo className="h-16 text-pink-dark" />
      
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="relative">
          <WifiOff className="h-24 w-24 text-pink-dark/30" strokeWidth={1.5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-0.5 rotate-45 bg-pink-dark/50" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-script text-pink-dark">
            Hors ligne
          </h1>
          <p className="max-w-xs text-muted-foreground">
            Il semble que vous n&apos;ayez pas de connexion internet.
            Certaines fonctionnalités peuvent être indisponibles.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Pas d&apos;inquiétude ! Tout se synchronisera automatiquement
          une fois reconnecté.
        </p>
      </div>

      <div className="w-full max-w-xs pb-8">
        <Button
          onClick={() => window.location.reload()}
          className="w-full bg-pink-dark text-white hover:bg-pink-dark/90"
          size="lg"
        >
          Réessayer
        </Button>
      </div>
    </div>
  );
}
