/**
 * AI Plugin Manager
 * Core system for managing hot-swappable AI plugins in the ecosystem
 */

export interface AIPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  category: 'analysis' | 'generation' | 'calculation' | 'chat' | 'processing' | 'compliance';
  capabilities: string[];
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  isActive: boolean;
  
  // Core plugin methods
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  process(input: any, context?: any): Promise<any>;
  getStatus(): PluginStatus;
  
  // Resource management
  getResourceUsage(): ResourceUsage;
  canHandle(request: PluginRequest): boolean;
}

export interface PluginStatus {
  id: string;
  isRunning: boolean;
  health: 'healthy' | 'degraded' | 'error';
  lastActivity: Date;
  requestCount: number;
  errorCount: number;
  uptime: number; // seconds
}

export interface ResourceUsage {
  memory: number; // MB
  cpu: number; // percentage
  activeRequests: number;
  queuedRequests: number;
}

export interface PluginRequest {
  type: string;
  data: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  userId?: string;
}

export class PluginManager {
  private plugins: Map<string, AIPlugin> = new Map();
  private requestQueue: PluginRequest[] = [];
  private resourceMonitor: ResourceMonitor;
  private maxMemoryUsage = 4096; // MB total
  private maxCpuUsage = 80; // percentage

  constructor() {
    this.resourceMonitor = new ResourceMonitor();
    this.startResourceMonitoring();
  }

  // Plugin lifecycle management
  async registerPlugin(plugin: AIPlugin): Promise<boolean> {
    try {
      // Check resource availability
      if (!this.canLoadPlugin(plugin)) {
        console.warn(`Cannot load plugin ${plugin.id}: insufficient resources`);
        return false;
      }

      // Initialize plugin
      await plugin.initialize();
      
      // Register in system
      this.plugins.set(plugin.id, plugin);
      plugin.isActive = true;

      console.log(`Plugin ${plugin.name} (${plugin.id}) registered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to register plugin ${plugin.id}:`, error);
      return false;
    }
  }

  async unregisterPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) return false;

      // Shutdown plugin gracefully
      await plugin.shutdown();
      plugin.isActive = false;

      // Remove from system
      this.plugins.delete(pluginId);

      console.log(`Plugin ${plugin.name} (${pluginId}) unregistered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginId}:`, error);
      return false;
    }
  }

  // Request routing and processing
  async processRequest(request: PluginRequest): Promise<any> {
    // Find suitable plugin
    const plugin = this.findBestPlugin(request);
    if (!plugin) {
      throw new Error(`No suitable plugin found for request type: ${request.type}`);
    }

    // Check plugin health
    if (plugin.getStatus().health === 'error') {
      throw new Error(`Plugin ${plugin.id} is in error state`);
    }

    // Process request
    try {
      const result = await this.executeWithTimeout(
        () => plugin.process(request.data, { userId: request.userId }),
        request.timeout || 30000
      );
      
      return result;
    } catch (error) {
      console.error(`Plugin ${plugin.id} processing failed:`, error);
      throw error;
    }
  }

  // Plugin discovery and selection
  private findBestPlugin(request: PluginRequest): AIPlugin | null {
    const suitablePlugins = Array.from(this.plugins.values())
      .filter(plugin => plugin.isActive && plugin.canHandle(request))
      .sort((a, b) => this.scorePlugin(b, request) - this.scorePlugin(a, request));

    return suitablePlugins[0] || null;
  }

  private scorePlugin(plugin: AIPlugin, request: PluginRequest): number {
    let score = 0;
    
    // Health score
    const status = plugin.getStatus();
    if (status.health === 'healthy') score += 100;
    else if (status.health === 'degraded') score += 50;
    
    // Resource availability score
    const usage = plugin.getResourceUsage();
    score += Math.max(0, 100 - usage.cpu);
    score += Math.max(0, 100 - (usage.memory / 1024) * 100);
    
    // Request queue score
    score -= usage.queuedRequests * 10;
    
    return score;
  }

  // Resource management
  private canLoadPlugin(plugin: AIPlugin): boolean {
    const currentMemory = this.getTotalMemoryUsage();
    const currentCpu = this.getTotalCpuUsage();
    
    return (currentMemory + plugin.memoryUsage <= this.maxMemoryUsage) &&
           (currentCpu + plugin.cpuUsage <= this.maxCpuUsage);
  }

  private getTotalMemoryUsage(): number {
    return Array.from(this.plugins.values())
      .reduce((total, plugin) => total + plugin.getResourceUsage().memory, 0);
  }

  private getTotalCpuUsage(): number {
    return Array.from(this.plugins.values())
      .reduce((total, plugin) => total + plugin.getResourceUsage().cpu, 0);
  }

  // System monitoring
  private startResourceMonitoring(): void {
    setInterval(() => {
      this.checkPluginHealth();
      this.optimizeResources();
    }, 30000); // Check every 30 seconds
  }

  private checkPluginHealth(): void {
    const plugins = Array.from(this.plugins.values());
    for (const plugin of plugins) {
      const status = plugin.getStatus();
      
      if (status.health === 'error') {
        console.warn(`Plugin ${plugin.id} is in error state, attempting restart...`);
        this.restartPlugin(plugin.id);
      }
    }
  }

  private async restartPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) return;

      await plugin.shutdown();
      await plugin.initialize();
      
      console.log(`Plugin ${pluginId} restarted successfully`);
    } catch (error) {
      console.error(`Failed to restart plugin ${pluginId}:`, error);
    }
  }

  private optimizeResources(): void {
    // If resources are constrained, temporarily shut down low-priority plugins
    if (this.getTotalMemoryUsage() > this.maxMemoryUsage * 0.9) {
      console.log('Memory usage high, optimizing plugin resources...');
      // Implementation for resource optimization
    }
  }

  // Utility methods
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Plugin execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn().then(resolve).catch(reject).finally(() => {
        clearTimeout(timeout);
      });
    });
  }

  // Public API methods
  getPluginStatus(pluginId?: string): PluginStatus | PluginStatus[] | null {
    if (pluginId) {
      const plugin = this.plugins.get(pluginId);
      return plugin ? plugin.getStatus() : null;
    }
    
    return Array.from(this.plugins.values()).map(plugin => plugin.getStatus());
  }

  getSystemResources(): { memory: number; cpu: number; pluginCount: number } {
    return {
      memory: this.getTotalMemoryUsage(),
      cpu: this.getTotalCpuUsage(),
      pluginCount: this.plugins.size
    };
  }

  listPlugins(): Array<{ id: string; name: string; category: string; isActive: boolean }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      category: plugin.category,
      isActive: plugin.isActive
    }));
  }
}

class ResourceMonitor {
  getMemoryUsage(): number {
    // Implementation for memory monitoring
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  
  getCpuUsage(): number {
    // Implementation for CPU monitoring
    return 0; // Placeholder
  }
}

// Singleton instance
export const pluginManager = new PluginManager();