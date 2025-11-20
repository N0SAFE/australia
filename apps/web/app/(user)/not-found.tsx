'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/svg/logo';

export default function UserNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-4 py-8">
      <div className="text-center space-y-8 max-w-md">
        <Logo className="text-pink-dark h-16 mx-auto" />
        
        <div className="space-y-3">
          <h1 className="text-6xl font-bold text-pink-dark">404</h1>
          <h2 className="text-2xl font-semibold text-pink-dark">Page introuvable</h2>
          <p className="text-pink-dark/80">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="secondary" className="text-pink-dark">
            <Link href="/home">
              <Home className="mr-2 size-4" />
              Accueil
            </Link>
          </Button>
          <Button variant="secondary" className="text-pink-dark" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 size-4" />
            Retour
          </Button>
        </div>
      </div>
    </div>
  );
}
