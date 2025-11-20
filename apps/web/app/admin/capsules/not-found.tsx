'use client';
import Link from 'next/link';
import { Button } from '@repo/ui/components/shadcn/button';
import { Package, ArrowLeft } from 'lucide-react';

export default function AdminCapsulesNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Package className="size-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Capsule Not Found</h1>
          <p className="text-muted-foreground">
            The capsule you&apos;re looking for doesn&apos;t exist or may have been deleted.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/admin/capsules">
              <Package className="mr-2 size-4" />
              All Capsules
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 size-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
