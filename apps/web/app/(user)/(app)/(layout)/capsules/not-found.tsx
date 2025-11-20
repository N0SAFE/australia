import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft } from 'lucide-react';

export default function CapsulesNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 bg-pink-dark/10 rounded-full flex items-center justify-center">
          <Package className="size-8 text-pink-dark" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-pink-dark">Capsule introuvable</h1>
          <p className="text-pink-dark/80">
            La capsule que vous recherchez n&apos;existe pas ou a peut-être été supprimée.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="secondary" className="text-pink-dark">
            <Link href="/capsules">
              <Package className="mr-2 size-4" />
              Toutes les capsules
            </Link>
          </Button>
          <Button asChild variant="secondary" className="text-pink-dark" onClick={() => window.history.back()}>
            <Link href="#">
              <ArrowLeft className="mr-2 size-4" />
              Retour
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
