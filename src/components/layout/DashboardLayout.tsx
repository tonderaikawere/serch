import { Sidebar } from "./Sidebar";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="md:hidden">
        <Sidebar
          variant="mobile"
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
      </div>

      <main className={cn("flex-1 min-w-0 overflow-x-hidden", className)}>
        <div className="md:hidden sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}
