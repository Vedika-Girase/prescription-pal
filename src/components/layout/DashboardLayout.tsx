import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, Pill } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DoctorSidebar } from "./DoctorSidebar";
import { StoreSidebar } from "./StoreSidebar";
import { PatientSidebar } from "./PatientSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { userRole, profile, signOut } = useAuth();

  const getSidebar = () => {
    switch (userRole) {
      case "doctor": return <DoctorSidebar />;
      case "medical_store": return <StoreSidebar />;
      case "patient": return <PatientSidebar />;
      default: return null;
    }
  };

  const getRoleLabel = () => {
    switch (userRole) {
      case "doctor": return "Doctor";
      case "medical_store": return "Medical Store";
      case "patient": return "Patient";
      default: return "";
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {getSidebar()}
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center justify-between px-4 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm hidden sm:inline">MedRemind</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden md:inline">
                {profile?.full_name} · {getRoleLabel()}
              </span>
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
