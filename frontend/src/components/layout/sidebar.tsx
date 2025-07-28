import { useState } from "react";
import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Award, 
  Shield, 
  Mountain, 
  FileText, 
  Brain,
  Menu,
  X,
  Lock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const navigation = [
  { name: 'Instant Analysis', href: '/', icon: Brain },
  { name: 'Source Library', href: '/documents', icon: FileText },
  { name: 'System Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Admin', href: '/admin', icon: Lock },
];

export function Sidebar() {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
  });

  const closeSidebar = () => setIsOpen(false);

  const SidebarContent = () => (
    <nav className="mt-6 px-3">
      <div className="space-y-1">
        {navigation.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <button
              key={item.name}
              onClick={() => {
                navigate(item.href);
                closeSidebar();
              }}
              className={`sidebar-nav-item w-full text-left ${isActive ? 'active' : ''}`}
            >
              <Icon className="mr-3 h-4 w-4" />
              <span className="truncate">{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Statistics */}
      <div className="mt-8 px-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Statistics
        </h3>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Documents</span>
            <span className="text-foreground font-medium">
              {stats?.documentCount || 0}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Recommendations</span>
            <span className="text-foreground font-medium">
              {stats?.recommendationCount || 0}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">AI Analyses</span>
            <span className="text-foreground font-medium">
              {stats?.analysisCount || 0}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={closeSidebar}
          />
          <aside className="relative flex flex-col w-64 max-w-xs bg-white border-r border-gray-200 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <Button variant="ghost" size="sm" onClick={closeSidebar}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar - always visible on desktop */}
      <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <SidebarContent />
      </aside>
    </>
  );
}
