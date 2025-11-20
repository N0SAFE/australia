import Link from 'next/link';
import { Button } from '@repo/ui/components/shadcn/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The admin page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/admin">
              <Home className="mr-2 size-4" />
              Admin Dashboard
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
