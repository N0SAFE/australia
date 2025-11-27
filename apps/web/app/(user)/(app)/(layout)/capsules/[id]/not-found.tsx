'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft, Search } from 'lucide-react';

export default function CapsuleIdNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 bg-pink-dark/10 rounded-full flex items-center justify-center">
          <Search className="size-8 text-pink-dark" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-pink-dark">Capsule introuvable</h1>
          <p className="text-pink-dark/80">
            La capsule avec cet identifiant n&apos;existe pas ou a peut-être été supprimée. Veuillez vérifier l&apos;identifiant et réessayer.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="secondary" className="text-pink-dark">
            <Link href="/capsules">
              <Package className="mr-2 size-4" />
              Voir toutes les capsules
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
