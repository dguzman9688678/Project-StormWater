import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Shield, CheckCircle, AlertCircle, FileText, Award, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export function AdminPage() {
  const [email, setEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const { toast } = useToast();

  // Fetch system statistics for admin dashboard
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch("/api/admin/verify", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setAdminToken(token);
      } else {
        localStorage.removeItem("adminToken");
        setIsAuthenticated(false);
      }
    } catch (error) {
      localStorage.removeItem("adminToken");
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setAdminToken(data.token);
        localStorage.setItem("adminToken", data.token);
        
        toast({
          title: "Authentication Successful",
          description: "Welcome, Administrator",
        });
      } else {
        toast({
          title: "Authentication Failed",
          description: data.error || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to authenticate",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setAdminToken("");
    setEmail("");
    
    toast({
      title: "Logged Out",
      description: "Admin session ended",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Administration Access</CardTitle>
            <CardDescription>
              Secure access for system administration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 block">
                  Administrator Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your admin email"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Only authorized personnel (Daniel Guzman) can access administrative functions.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !email}
              >
                {isLoading ? "Authenticating..." : "Authenticate"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-muted-foreground mt-2">
            Administrative control panel for Daniel Guzman
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            <CheckCircle className="h-4 w-4 mr-2" />
            Authenticated
          </Badge>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Admin Access</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex justify-between">
                <span>Database</span>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex justify-between">
                <span>AI Service</span>
                <Badge variant="default">Available</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              System Statistics
            </CardTitle>
            <CardDescription>Current system data overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Documents</span>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {stats?.documentCount || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  <span>Recommendations</span>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {stats?.recommendationCount || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  <span>AI Analyses</span>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {stats?.analysisCount || 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Control user access and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                View User Sessions
              </Button>
              <Button className="w-full" variant="outline">
                Manage Permissions
              </Button>
              <Button className="w-full" variant="outline">
                View Access Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content Management */}
        <Card>
          <CardHeader>
            <CardTitle>Content Management</CardTitle>
            <CardDescription>Manage recommendations and documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                Edit Recommendations
              </Button>
              <Button className="w-full" variant="outline">
                Manage Templates
              </Button>
              <Button className="w-full" variant="outline">
                System Backup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>Configure system settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                AI Settings
              </Button>
              <Button className="w-full" variant="outline">
                Upload Limits
              </Button>
              <Button className="w-full" variant="outline">
                Security Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>System usage and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                Usage Reports
              </Button>
              <Button className="w-full" variant="outline">
                Performance Metrics
              </Button>
              <Button className="w-full" variant="outline">
                Error Logs
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Emergency Controls</CardTitle>
            <CardDescription>Critical system operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="destructive">
                Clear All Sessions
              </Button>
              <Button className="w-full" variant="destructive">
                Reset Database
              </Button>
              <Button className="w-full" variant="destructive">
                System Maintenance
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Session Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">User:</span>
              <p className="text-muted-foreground">Daniel Guzman</p>
            </div>
            <div>
              <span className="font-medium">Email:</span>
              <p className="text-muted-foreground">guzman.danield@outlook.com</p>
            </div>
            <div>
              <span className="font-medium">Session:</span>
              <p className="text-muted-foreground">Active</p>
            </div>
            <div>
              <span className="font-medium">Access Level:</span>
              <p className="text-muted-foreground">Full Administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}