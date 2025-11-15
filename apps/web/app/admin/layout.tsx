import { ReactNode, Suspense } from 'react';
import { AdminNavbar } from '@/components/admin-navbar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function AdminLayout({
  children,
}: {
  children: ReactNode,
}) {
  return <SidebarProvider>
    <AdminNavbar />
    <div className="w-full overflow-x-hidden">
      <div className="w-full h-fit p-3">
        <SidebarTrigger iconClassName="size-6 text-muted-foreground" />
      </div>
      <Suspense fallback={<div className="w-full h-dvh flex justify-center items-center">Loading...</div>}>
        {children}
      </Suspense>
    </div>
  </SidebarProvider>;
}