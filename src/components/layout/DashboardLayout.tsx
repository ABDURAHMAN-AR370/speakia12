import { ReactNode } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/auth";
import { 
  BookOpen, 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText,
  Menu,
  X,
  Image
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/days", label: "Days & Materials", icon: Calendar },
    { href: "/admin/forms", label: "Forms & Quizzes", icon: FileText },
    { href: "/admin/hero", label: "Homepage Hero", icon: Image },
  ];

  const userLinks = [
    { href: "/dashboard", label: "My Course", icon: LayoutDashboard },
  ];

  const links = isAdmin ? adminLinks : userLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-card">
        <div className="flex h-14 items-center px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link to="/" className="flex items-center gap-2 ml-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-bold">SPEAKAI</span>
          </Link>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen transition-transform duration-200 ease-in-out lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-full flex-col overflow-hidden">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6 shrink-0">
              <Link to="/" className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-sidebar-primary" />
                <span className="text-xl font-bold">SPEAKAI</span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="border-t border-sidebar-border p-4 shrink-0">
              <div className="mb-3">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || user?.email}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {isAdmin ? "Administrator" : "Student"}
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen min-w-0">
          <div className="container py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
