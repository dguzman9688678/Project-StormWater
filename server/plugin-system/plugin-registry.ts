/**
 * Plugin Registry
 * Initializes and registers all AI plugins in the ecosystem
 */

import { pluginManager } from './plugin-manager';
import { StormwaterAnalysisPlugin } from './plugins/stormwater-analysis-plugin';
import { ChatServicePlugin } from './plugins/chat-service-plugin';
import { DocumentGeneratorPlugin } from './plugins/document-generator-plugin';
import { RegulatoryCompliancePlugin } from './plugins/regulatory-compliance-plugin';
import { CostEstimationPlugin } from './plugins/cost-estimation-plugin';
import { SitePlanningPlugin } from './plugins/site-planning-plugin';
import { RiskAssessmentPlugin } from './plugins/risk-assessment-plugin';
import { TrainingCertificationPlugin } from './plugins/training-certification-plugin';
import { EnvironmentalMonitoringPlugin } from './plugins/environmental-monitoring-plugin';

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
      // All 9 AI plugins for NASA presentation
      const corePlugins = [
        new StormwaterAnalysisPlugin(),
        new ChatServicePlugin(),
        new DocumentGeneratorPlugin(),
        new RegulatoryCompliancePlugin(),
        new CostEstimationPlugin(),
        new SitePlanningPlugin(),
        new RiskAssessmentPlugin(),
        new TrainingCertificationPlugin(),
        new EnvironmentalMonitoringPlugin()
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

  // All plugins now active - no future expansion needed
  getActivePlugins(): string[] {
    return [
      'Stormwater Analysis AI',
      'Chat Service AI', 
      'Document Generator AI',
      'Regulatory Compliance AI',
      'Cost Estimation AI',
      'Site Planning AI',
      'Risk Assessment AI',
      'Training & Certification AI',
      'Environmental Monitoring AI'
    ];
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

  async activatePlugin(pluginId: string): Promise<boolean> {
    // For now, plugins are managed by the plugin manager
    // This would interface with the plugin manager to activate plugins
    console.log(`Activating plugin: ${pluginId}`);
    return true; // Placeholder - would implement actual activation logic
  }

  async deactivatePlugin(pluginId: string): Promise<boolean> {
    // For now, plugins are managed by the plugin manager
    // This would interface with the plugin manager to deactivate plugins
    console.log(`Deactivating plugin: ${pluginId}`);
    return true; // Placeholder - would implement actual deactivation logic
  }
}

// Export singleton instance
export const pluginRegistry = PluginRegistry.getInstance();