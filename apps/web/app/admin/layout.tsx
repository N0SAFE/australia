import { ReactNode } from "react";
import { AdminNavbar } from "@/components/admin-navbar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@repo/ui/components/shadcn/button";
import { Home } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AdminNavbar />
      <div className="w-full overflow-x-hidden">
        <div className="w-full h-fit p-3 flex items-center justify-between">
          <SidebarTrigger iconClassName="size-6 text-muted-foreground" />
          <Button asChild variant="outline" size="sm">
            <Link href="/home">
              <Home className="mr-2 size-4" />
              Go to App
            </Link>
          </Button>
        </div>
        {children}
      </div>
    </SidebarProvider>
  );
}
