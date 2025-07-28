/**
 * Plugin Ecosystem Dashboard
 * Visualizes and manages the AI plugin system
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Cpu, HardDrive, Activity, Zap, Settings, TrendingUp, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface PluginStatus {
  id: string;
  isRunning: boolean;
  health: 'healthy' | 'degraded' | 'error';
  lastActivity: string;
  requestCount: number;
  errorCount: number;
  uptime: number;
}

interface PluginInfo {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
}

interface SystemStatus {
  initialized: boolean;
  plugins: PluginInfo[];
  resources: {
    memory: number;
    cpu: number;
    pluginCount: number;
  };
  health: 'healthy' | 'degraded' | 'error';
}

export function PluginEcosystemDashboard() {
  const queryClient = useQueryClient();

  // Query system status
  const { data: systemStatus, isLoading } = useQuery<SystemStatus>({
    queryKey: ['/api/plugins'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Query system resources
  const { data: resources } = useQuery({
    queryKey: ['/api/plugins/resources'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Test plugin processing
  const testProcessing = useMutation({
    mutationFn: async (testData: any) => {
      return await apiRequest('/api/plugins/process', 'POST', testData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
    }
  });

  // Toggle plugin on/off
  const togglePlugin = useMutation({
    mutationFn: async ({ pluginId, activate }: { pluginId: string; activate: boolean }) => {
      return await apiRequest(`/api/plugins/${pluginId}/${activate ? 'activate' : 'deactivate'}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
    }
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthBadgeVariant = (health: string) => {
    switch (health) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const testPluginSystem = async () => {
    try {
      await testProcessing.mutateAsync({
        type: 'chat-message',
        data: { message: 'Test plugin system health' },
        priority: 'normal'
      });
    } catch (error) {
      console.error('Plugin test failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Plugin Ecosystem</h2>
          <p className="text-gray-600">Manage and monitor your AI plugins</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge 
            variant={getHealthBadgeVariant(systemStatus?.health || 'error')}
            className="px-3 py-1"
          >
            <Activity className="w-3 h-3 mr-1" />
            {systemStatus?.health?.toUpperCase() || 'UNKNOWN'}
          </Badge>
          
          <Button 
            onClick={testPluginSystem}
            disabled={testProcessing.isPending}
            size="sm"
          >
            <Zap className="w-4 h-4 mr-2" />
            {testProcessing.isPending ? 'Testing...' : 'Test System'}
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plugins</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus?.plugins?.filter(p => p.isActive).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {systemStatus?.plugins?.length || 0} total plugins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(resources?.memory || systemStatus?.resources?.memory || 0)}MB
            </div>
            <Progress 
              value={(resources?.memory || systemStatus?.resources?.memory || 0) / 40.96} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(resources?.cpu || systemStatus?.resources?.cpu || 0)}%
            </div>
            <Progress 
              value={resources?.cpu || systemStatus?.resources?.cpu || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Plugin Details */}
      <Tabs defaultValue="plugins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plugins">Active Plugins</TabsTrigger>
          <TabsTrigger value="resources">Resource Monitor</TabsTrigger>
          <TabsTrigger value="future">Future Expansion</TabsTrigger>
        </TabsList>

        <TabsContent value="plugins" className="space-y-4">
          <div className="grid gap-4">
            {systemStatus?.plugins?.map((plugin) => (
              <PluginCard 
                key={plugin.id} 
                plugin={plugin} 
                onToggle={(pluginId, activate) => togglePlugin.mutate({ pluginId, activate })}
                isToggling={togglePlugin.isPending}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Resources</CardTitle>
              <CardDescription>Real-time resource monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Memory Usage</label>
                  <div className="mt-1">
                    <Progress value={(resources?.memory || 0) / 40.96} />
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(resources?.memory || 0)}MB / 4096MB
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">CPU Usage</label>
                  <div className="mt-1">
                    <Progress value={resources?.cpu || 0} />
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(resources?.cpu || 0)}% / 100%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="future" className="space-y-4">
          <div className="grid gap-4">
            <FuturePluginCard 
              name="Regulatory Compliance AI"
              description="Automated regulatory compliance checking and documentation"
              category="compliance"
              status="planned"
            />
            <FuturePluginCard 
              name="Cost Estimation AI"
              description="Intelligent cost estimation for stormwater projects"
              category="analysis"
              status="planned"
            />
            <FuturePluginCard 
              name="Site Planning AI"
              description="Automated site planning and BMP placement optimization"
              category="generation"
              status="planned"
            />
            <FuturePluginCard 
              name="Risk Assessment AI"
              description="Comprehensive risk analysis and mitigation planning"
              category="analysis"
              status="planned"
            />
            <FuturePluginCard 
              name="Training & Certification AI"
              description="Personalized training programs and certification tracking"
              category="processing"
              status="planned"
            />
            <FuturePluginCard 
              name="Environmental Monitoring AI"
              description="Real-time environmental monitoring and alerting"
              category="processing"
              status="planned"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PluginCard({ 
  plugin, 
  onToggle, 
  isToggling 
}: { 
  plugin: PluginInfo; 
  onToggle: (pluginId: string, activate: boolean) => void;
  isToggling: boolean;
}) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analysis': return <TrendingUp className="w-4 h-4" />;
      case 'chat': return <Activity className="w-4 h-4" />;
      case 'generation': return <Zap className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'analysis': return 'bg-blue-100 text-blue-800';
      case 'chat': return 'bg-green-100 text-green-800';
      case 'generation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getCategoryColor(plugin.category)}`}>
              {getCategoryIcon(plugin.category)}
            </div>
            <div>
              <h3 className="font-medium">{plugin.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{plugin.category}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant={plugin.isActive ? "default" : "secondary"}>
              {plugin.isActive ? "Active" : "Inactive"}
            </Badge>
            
            <div className="flex items-center space-x-2">
              <Power className="w-4 h-4 text-gray-500" />
              <Switch
                checked={plugin.isActive}
                onCheckedChange={(checked) => onToggle(plugin.id, checked)}
                disabled={isToggling}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FuturePluginCard({ 
  name, 
  description, 
  category, 
  status 
}: { 
  name: string; 
  description: string; 
  category: string; 
  status: string;
}) {
  return (
    <Card className="border-dashed border-2 border-gray-300">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-gray-700">{name}</h3>
              <p className="text-sm text-gray-500">{description}</p>
            </div>
          </div>
          
          <Badge variant="outline" className="text-gray-500">
            {status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}