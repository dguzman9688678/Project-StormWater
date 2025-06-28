import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Award, 
  Shield, 
  Mountain, 
  FileText, 
  Brain 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'QSD Recommendations', href: '/qsd', icon: Award },
  { name: 'SWPPP Guidance', href: '/swppp', icon: Shield },
  { name: 'Erosion Control', href: '/erosion-control', icon: Mountain },
  { name: 'Reference Documents', href: '/documents', icon: FileText },
  { name: 'AI Analysis', href: '/ai-analysis', icon: Brain },
];

export function Sidebar() {
  const [location, navigate] = useLocation();
  
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
  });

  return (
    <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="mt-6 px-3">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className={`sidebar-nav-item w-full text-left ${isActive ? 'active' : ''}`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
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
    </aside>
  );
}
