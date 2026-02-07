import { LayoutDashboard, FileText, FilePlus, History, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/patient", icon: LayoutDashboard },
  { title: "My Prescriptions", url: "/patient/prescriptions", icon: FileText },
  { title: "Add Prescription", url: "/patient/add", icon: FilePlus },
  { title: "History", url: "/patient/history", icon: History },
];

export function PatientSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <User className="h-6 w-6 text-sidebar-primary" />
          <span className="font-bold text-lg text-sidebar-foreground">Patient</span>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/patient"}
                      className="flex items-center gap-2 hover:bg-sidebar-accent/50 rounded-md px-3 py-2 text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
