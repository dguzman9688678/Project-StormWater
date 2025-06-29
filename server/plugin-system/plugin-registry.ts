/**
 * Plugin Registry
 * Initializes and registers all AI plugins in the ecosystem
 */

import { pluginManager } from './plugin-manager';
import { StormwaterAnalysisPlugin } from './plugins/stormwater-analysis-plugin';
import { ChatServicePlugin } from './plugins/chat-service-plugin';
import { DocumentGeneratorPlugin } from './plugins/document-generator-plugin';

export class PluginRegistry {
  private static instance: PluginRegistry;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  async initializeAllPlugins(): Promise<void> {
    if (this.isInitialized) {
      console.log('Plugin system already initialized');
      return;
    }

    console.log('Initializing AI Plugin Ecosystem...');

    try {
      // Core plugins that form the foundation
      const corePlugins = [
        new StormwaterAnalysisPlugin(),
        new ChatServicePlugin(),
        new DocumentGeneratorPlugin()
      ];

      // Register each plugin
      for (const plugin of corePlugins) {
        const success = await pluginManager.registerPlugin(plugin);
        if (success) {
          console.log(`✅ ${plugin.name} registered successfully`);
        } else {
          console.warn(`⚠️ Failed to register ${plugin.name}`);
        }
      }

      this.isInitialized = true;
      console.log(`🚀 Plugin ecosystem initialized with ${pluginManager.listPlugins().length} plugins`);
      
      // Log system resources
      const resources = pluginManager.getSystemResources();
      console.log(`📊 System Resources: ${resources.memory}MB memory, ${resources.cpu}% CPU`);

    } catch (error) {
      console.error('Failed to initialize plugin system:', error);
      throw error;
    }
  }

  async shutdownAllPlugins(): Promise<void> {
    if (!this.isInitialized) return;

    console.log('Shutting down plugin ecosystem...');
    
    const plugins = pluginManager.listPlugins();
    for (const plugin of plugins) {
      await pluginManager.unregisterPlugin(plugin.id);
      console.log(`🔴 ${plugin.name} shutdown`);
    }

    this.isInitialized = false;
    console.log('Plugin ecosystem shutdown complete');
  }

  // Future plugin expansion slots
  async loadFuturePlugins(): Promise<void> {
    console.log('🔮 Future plugin slots available:');
    console.log('   - Regulatory Compliance AI (planned)');
    console.log('   - Cost Estimation AI (planned)');
    console.log('   - Site Planning AI (planned)');
    console.log('   - Risk Assessment AI (planned)');
    console.log('   - Training & Certification AI (planned)');
    console.log('   - Environmental Monitoring AI (planned)');
    
    // When ready to add new plugins:
    // const newPlugin = new RegulatoryCompliancePlugin();
    // await pluginManager.registerPlugin(newPlugin);
  }

  getSystemStatus(): any {
    return {
      initialized: this.isInitialized,
      plugins: pluginManager.listPlugins(),
      resources: pluginManager.getSystemResources(),
      health: this.getOverallHealth()
    };
  }

  private getOverallHealth(): 'healthy' | 'degraded' | 'error' {
    const statuses = pluginManager.getPluginStatus() as any[];
    if (!Array.isArray(statuses)) return 'error';

    const healthyCount = statuses.filter(s => s.health === 'healthy').length;
    const totalCount = statuses.length;

    if (healthyCount === totalCount) return 'healthy';
    if (healthyCount > totalCount * 0.5) return 'degraded';
    return 'error';
  }
}

// Export singleton instance
export const pluginRegistry = PluginRegistry.getInstance();