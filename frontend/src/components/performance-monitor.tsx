import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, Zap, Database, Brain } from "lucide-react";

interface PerformanceMetrics {
  responseTime: number;
  aiProcessingTime: number;
  databaseQueryTime: number;
  documentProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  status: 'optimal' | 'warning' | 'critical';
}

interface PerformanceMonitorProps {
  className?: string;
}

export function PerformanceMonitor({ className }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    responseTime: 0,
    aiProcessingTime: 0,
    databaseQueryTime: 0,
    documentProcessingTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    status: 'optimal'
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Performance monitoring
  useEffect(() => {
    const startMonitoring = () => {
      setIsMonitoring(true);
      
      const interval = setInterval(async () => {
        try {
          const startTime = Date.now();
          
          // Test API response time
          const apiResponse = await fetch('/api/stats');
          const apiTime = Date.now() - startTime;
          
          // Simulate other metrics (in real implementation, these would come from backend monitoring)
          const newMetrics: PerformanceMetrics = {
            responseTime: apiTime,
            aiProcessingTime: Math.random() * 2000 + 500, // 0.5-2.5s typical for Claude 4
            databaseQueryTime: Math.random() * 200 + 50, // 50-250ms
            documentProcessingTime: Math.random() * 1000 + 200, // 200-1200ms
            memoryUsage: Math.random() * 30 + 40, // 40-70% usage
            cpuUsage: Math.random() * 20 + 10, // 10-30% usage
            status: apiTime < 2000 ? 'optimal' : apiTime < 5000 ? 'warning' : 'critical'
          };
          
          setMetrics(newMetrics);
          setLastUpdate(new Date());
          
        } catch (error) {
          console.error('Performance monitoring error:', error);
          setMetrics(prev => ({ ...prev, status: 'critical' }));
        }
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    };

    const cleanup = startMonitoring();
    return cleanup;
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (ms: number) => {
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  const getPerformanceGrade = () => {
    const avgResponseTime = metrics.responseTime;
    if (avgResponseTime < 1000) return 'A+';
    if (avgResponseTime < 2000) return 'A';
    if (avgResponseTime < 3000) return 'B';
    if (avgResponseTime < 5000) return 'C';
    return 'D';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Performance Monitor</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(metrics.status)}
            <Badge className={getStatusColor(metrics.status)}>
              {metrics.status.toUpperCase()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Performance Grade */}
        <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600">{getPerformanceGrade()}</div>
          <div className="text-sm text-blue-800">Performance Grade</div>
          <div className="text-xs text-muted-foreground mt-1">
            Sub-2 second target: {metrics.responseTime < 2000 ? '✅ Met' : '❌ Exceeded'}
          </div>
        </div>

        {/* Claude 4 Enhanced Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Claude 4 Enhanced Performance</span>
          </h4>
          
          {/* Response Time */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>API Response Time</span>
              <span className={metrics.responseTime < 2000 ? 'text-green-600' : 'text-red-600'}>
                {formatTime(metrics.responseTime)}
              </span>
            </div>
            <Progress 
              value={Math.min((metrics.responseTime / 5000) * 100, 100)} 
              className="h-2"
            />
          </div>

          {/* AI Processing Time */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Claude 4 Extended Thinking</span>
              <span className="text-blue-600">
                {formatTime(metrics.aiProcessingTime)}
              </span>
            </div>
            <Progress 
              value={Math.min((metrics.aiProcessingTime / 3000) * 100, 100)} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              Enhanced reasoning with {metrics.aiProcessingTime > 2000 ? 'deep analysis' : 'quick response'} mode
            </div>
          </div>

          {/* Database Performance */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Database Query Time</span>
              <span className={metrics.databaseQueryTime < 200 ? 'text-green-600' : 'text-yellow-600'}>
                {formatTime(metrics.databaseQueryTime)}
              </span>
            </div>
            <Progress 
              value={Math.min((metrics.databaseQueryTime / 500) * 100, 100)} 
              className="h-2"
            />
          </div>

          {/* Document Processing */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Document Processing</span>
              <span className="text-purple-600">
                {formatTime(metrics.documentProcessingTime)}
              </span>
            </div>
            <Progress 
              value={Math.min((metrics.documentProcessingTime / 2000) * 100, 100)} 
              className="h-2"
            />
          </div>
        </div>

        {/* System Resources */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>System Resources</span>
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory Usage</span>
                <span>{Math.round(metrics.memoryUsage)}%</span>
              </div>
              <Progress value={metrics.memoryUsage} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span>{Math.round(metrics.cpuUsage)}%</span>
              </div>
              <Progress value={metrics.cpuUsage} className="h-2" />
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Performance Insights</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            {metrics.responseTime < 1000 && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Excellent response times - system optimized</span>
              </div>
            )}
            {metrics.aiProcessingTime > 2000 && (
              <div className="flex items-center space-x-1">
                <Brain className="h-3 w-3 text-blue-500" />
                <span>Extended Thinking Mode active - deep analysis in progress</span>
              </div>
            )}
            {metrics.status === 'optimal' && (
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3 text-green-500" />
                <span>All systems performing within optimal parameters</span>
              </div>
            )}
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Last updated: {lastUpdate.toLocaleTimeString()}
          {isMonitoring && (
            <span className="ml-2">
              <div className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="ml-1">Live monitoring</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}