import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Globe,
  FileText,
  Search,
  MessageSquare,
  Code,
  Zap,
  Bot,
  BarChart3,
  GraduationCap,
  Settings,
  ChevronLeft,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type NavItem = { icon: typeof Home; label: string; path: string };

const studentNav: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/students/dashboard" },
  { icon: BookOpen, label: "Courses", path: "/students/courses" },
  { icon: Globe, label: "Page Builder", path: "/students/page-builder" },
  { icon: Code, label: "Metadata Editor", path: "/students/metadata" },
  { icon: Search, label: "Keyword Lab", path: "/students/keywords" },
  { icon: Bot, label: "AEO Lab", path: "/students/aeo-lab" },
  { icon: FileText, label: "Schema Builder", path: "/students/schema" },
  { icon: Zap, label: "Technical SEO", path: "/students/technical" },
  { icon: Search, label: "Search Simulation", path: "/students/search-sim" },
  { icon: BarChart3, label: "Performance", path: "/students/performance" },
  { icon: MessageSquare, label: "Chat", path: "/students/chats" },
  { icon: Settings, label: "Settings", path: "/students/settings" },
  { icon: Settings, label: "Profile", path: "/students/profile" },
];

const studentNavGroups: Array<{ id: string; label: string; items: NavItem[] }> = [
  {
    id: "core",
    label: "Core",
    items: [
      { icon: Home, label: "Dashboard", path: "/students/dashboard" },
      { icon: BookOpen, label: "Courses", path: "/students/courses" },
      { icon: GraduationCap, label: "Assessments", path: "/students/assessments" },
      { icon: BarChart3, label: "Performance", path: "/students/performance" },
      { icon: MessageSquare, label: "Chat", path: "/students/chats" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { icon: Globe, label: "Page Builder", path: "/students/page-builder" },
      { icon: Code, label: "Metadata Editor", path: "/students/metadata" },
      { icon: FileText, label: "Schema Builder", path: "/students/schema" },
    ],
  },
  {
    id: "labs",
    label: "Labs",
    items: [
      { icon: Search, label: "Keyword Lab", path: "/students/keywords" },
      { icon: Bot, label: "AEO Lab", path: "/students/aeo-lab" },
      { icon: Zap, label: "Technical SEO", path: "/students/technical" },
      { icon: Search, label: "Search Simulation", path: "/students/search-sim" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { icon: Settings, label: "Settings", path: "/students/settings" },
      { icon: Settings, label: "Profile", path: "/students/profile" },
    ],
  },
];

const instructorNav: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/instructors/dashboard" },
  { icon: FileText, label: "My Students", path: "/instructors/students" },
  { icon: BarChart3, label: "Leaderboard", path: "/instructors/leaderboard" },
  { icon: GraduationCap, label: "Assessments", path: "/instructors/assessments" },
  { icon: BookOpen, label: "Courses", path: "/instructors/courses" },
  { icon: BarChart3, label: "Analytics", path: "/instructors/analytics" },
  { icon: MessageSquare, label: "Chats", path: "/instructors/chats" },
  { icon: Settings, label: "Profile", path: "/instructors/profile" },
];

const adminNav: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/admin/dashboard" },
  { icon: Search, label: "User Mgmt", path: "/admin/users" },
  { icon: BookOpen, label: "Course Mgmt", path: "/admin/courses" },
  { icon: GraduationCap, label: "Instructors", path: "/admin/instructors" },
  { icon: BarChart3, label: "Reports", path: "/admin/reports" },
  { icon: Settings, label: "Profile", path: "/admin/settings" },
];

interface SidebarProps {
  className?: string;
  variant?: "desktop" | "mobile";
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function Sidebar({
  className,
  variant = "desktop",
  mobileOpen = false,
  onMobileOpenChange,
}: SidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useAuth();

  const navItems: NavItem[] =
    profile?.role === "admin"
      ? adminNav
      : profile?.role === "instructor"
        ? instructorNav
        : studentNav;

  const isMobile = variant === "mobile";

  const closeMobile = () => {
    if (!isMobile) return;
    onMobileOpenChange?.(false);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={closeMobile}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "text-sidebar-foreground hover:bg-sidebar-accent",
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow-primary",
          collapsed && !isMobile && "justify-center",
        )}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {(!collapsed || isMobile) && <span className="font-medium text-sm">{item.label}</span>}
      </Link>
    );
  };

  const renderStudentGroupedNav = () => {
    if (collapsed && !isMobile) {
      return <nav className="p-2 space-y-1">{studentNav.map(renderNavItem)}</nav>;
    }

    const activeGroupIds = studentNavGroups
      .filter((g) => g.items.some((i) => location.pathname === i.path || location.pathname.startsWith(i.path + "/")))
      .map((g) => g.id);

    return (
      <nav className="p-2">
        <Accordion type="multiple" defaultValue={activeGroupIds} className="w-full">
          {studentNavGroups.map((group) => (
            <AccordionItem key={group.id} value={group.id} className="border-b-0">
              <AccordionTrigger className="px-3 py-2.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground hover:no-underline">
                <span className="text-sm font-medium">{group.label}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <div className="space-y-1 pl-2">
                  {group.items.map((item) => (
                    <div key={item.path}>{renderNavItem(item)}</div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    );
  };

  const sidebarContent = (
    <aside
      className={cn(
        isMobile
          ? "fixed left-0 top-0 z-50 h-screen bg-sidebar border-r border-sidebar-border transition-transform duration-300 w-64"
          : "sticky top-0 z-40 h-screen shrink-0 bg-sidebar border-r border-sidebar-border transition-all duration-300",
        !isMobile && (collapsed ? "w-16" : "w-64"),
        isMobile && (mobileOpen ? "translate-x-0" : "-translate-x-full"),
        className,
      )}
    >
      <div className="flex h-full min-h-0 flex-col">
        {/* Header */}
        <div
          className={cn(
            "relative flex items-center h-16 px-4 border-b border-sidebar-border",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2" onClick={closeMobile}>
              <div className="w-8 h-8 rounded-lg gradient-seo flex items-center justify-center">
                <Search className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-sidebar-foreground">Serch</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg gradient-seo flex items-center justify-center">
              <Search className="w-4 h-4 text-primary-foreground" />
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "absolute -right-3 top-6 bg-sidebar border border-sidebar-border rounded-full w-6 h-6",
              )}
            >
              <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
            </Button>
          )}
        </div>

        {/* Navigation (scrolls) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {profile?.role === "student" ? (
            renderStudentGroupedNav()
          ) : (
            <nav className="p-2 space-y-1">{navItems.map(renderNavItem)}</nav>
          )}
        </div>

        {/* Bottom links */}
        <div className={cn("p-2 space-y-2", collapsed && !isMobile && "px-2")}>
          {profile?.role !== "admin" && (
            <Link
              to={profile?.role === "instructor" ? "/instructors/courses" : "/students/courses"}
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 transition-colors",
                collapsed && !isMobile && "justify-center",
              )}
            >
              <BookOpen className="w-5 h-5" />
              {(!collapsed || isMobile) && <span className="font-medium text-sm">Courses</span>}
            </Link>
          )}

          {profile?.role === "admin" && (
            <Link
              to="/admin/settings"
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                collapsed && !isMobile && "justify-center",
              )}
            >
              <Settings className="w-5 h-5" />
              {(!collapsed || isMobile) && <span className="font-medium text-sm">Settings</span>}
            </Link>
          )}
        </div>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => onMobileOpenChange?.(false)}
          />
        )}
        {sidebarContent}
      </>
    );
  }

  return sidebarContent;
}
