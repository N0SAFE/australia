import Link from 'next/link';
import { Button } from '@repo/ui/components/shadcn/button';
import { Package, ArrowLeft, Search } from 'lucide-react';

export default function AdminCapsuleIdNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
          <Search className="size-8 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Capsule Not Found</h1>
          <p className="text-muted-foreground">
            The capsule with this ID doesn&apos;t exist or may have been deleted. Please check the capsule ID and try again.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/admin/capsules">
              <Package className="mr-2 size-4" />
              Browse All Capsules
            </Link>
          </Button>
          <Button asChild variant="outline" onClick={() => window.history.back()}>
            <Link href="#">
              <ArrowLeft className="mr-2 size-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
