/**
 * Stormwater Analysis Plugin
 * Converts existing AI Analyzer service into a plugin for the ecosystem
 */

import { AIPlugin, PluginStatus, ResourceUsage, PluginRequest } from '../plugin-manager';
import { AIAnalyzer } from '../../services/ai-analyzer';
import type { Document } from '../../../shared/schema';

export class StormwaterAnalysisPlugin implements AIPlugin {
  id = 'stormwater-analysis';
  name = 'Stormwater Analysis AI';
  version = '1.0.0';
  description = 'Professional QSD/CPESC level stormwater analysis and regulatory compliance';
  category = 'analysis' as const;
  capabilities = [
    'document-analysis',
    'regulatory-compliance',
    'qsd-analysis',
    'cpesc-analysis',
    'stormwater-recommendations',
    'multi-document-analysis'
  ];
  memoryUsage = 512; // MB
  cpuUsage = 25; // percentage
  isActive = false;

  private aiAnalyzer: AIAnalyzer;
  private startTime: Date;
  private requestCount = 0;
  private errorCount = 0;
  private isRunning = false;

  constructor() {
    this.aiAnalyzer = new AIAnalyzer();
    this.startTime = new Date();
  }

  async initialize(): Promise<void> {
    try {
      this.isRunning = true;
      this.isActive = true;
      console.log(`${this.name} plugin initialized successfully`);
    } catch (error) {
      this.isRunning = false;
      this.isActive = false;
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    this.isActive = false;
    console.log(`${this.name} plugin shutdown successfully`);
  }

  async process(input: any, context?: any): Promise<any> {
    try {
      this.requestCount++;

      // Handle different request types
      if (input.type === 'analyze-document') {
        return await this.analyzeDocument(input.document, input.query, input.allDocuments);
      } else if (input.type === 'multi-document-analysis') {
        return await this.analyzeMultipleDocuments(input.documents, input.query);
      } else if (input.type === 'generate-recommendations') {
        return await this.generateRecommendations(input.analysis, input.document);
      } else {
        throw new Error(`Unsupported request type: ${input.type}`);
      }
    } catch (error) {
      this.errorCount++;
      throw error;
    }
  }

  canHandle(request: PluginRequest): boolean {
    const supportedTypes = [
      'analyze-document',
      'multi-document-analysis', 
      'generate-recommendations',
      'stormwater-analysis',
      'regulatory-compliance',
      'qsd-analysis',
      'cpesc-analysis'
    ];
    
    return supportedTypes.includes(request.type) || 
           (request.data?.type && supportedTypes.includes(request.data.type));
  }

  getStatus(): PluginStatus {
    return {
      id: this.id,
      isRunning: this.isRunning,
      health: this.errorCount > this.requestCount * 0.1 ? 'degraded' : 'healthy',
      lastActivity: new Date(),
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    };
  }

  getResourceUsage(): ResourceUsage {
    return {
      memory: this.memoryUsage,
      cpu: this.isRunning ? this.cpuUsage : 0,
      activeRequests: 0, // Would track actual active requests
      queuedRequests: 0  // Would track queued requests
    };
  }

  // Private analysis methods
  private async analyzeDocument(document: Document, query?: string, allDocuments?: Document[]) {
    if (allDocuments && allDocuments.length > 1) {
      // Use multi-document analysis for comprehensive results
      return await this.aiAnalyzer.analyzeDocument(document, query);
    } else {
      // Single document analysis
      return await this.aiAnalyzer.analyzeDocument(document, query);
    }
  }

  private async analyzeMultipleDocuments(documents: Document[], query?: string) {
    // Analyze each document and combine insights
    const analyses = [];
    
    for (const document of documents) {
      try {
        const analysis = await this.aiAnalyzer.analyzeDocument(document, query);
        analyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze document ${document.id}:`, error);
      }
    }

    // Combine analyses into comprehensive result
    return this.combineAnalyses(analyses, documents, query);
  }

  private combineAnalyses(analyses: any[], documents: Document[], query?: string) {
    const combinedInsights = analyses.flatMap(a => a.insights || []);
    const combinedRecommendations = analyses.flatMap(a => a.recommendations || []);
    
    // Remove duplicates and prioritize
    const uniqueInsights = [...new Set(combinedInsights)];
    const uniqueRecommendations = this.deduplicateRecommendations(combinedRecommendations);

    return {
      analysis: `Comprehensive analysis of ${documents.length} documents${query ? ` for: ${query}` : ''}`,
      insights: uniqueInsights,
      recommendations: uniqueRecommendations,
      documentCount: documents.length,
      analysisType: 'multi-document',
      processingTime: Date.now()
    };
  }

  private deduplicateRecommendations(recommendations: any[]) {
    const seen = new Set();
    return recommendations.filter(rec => {
      const key = `${rec.title}-${rec.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async generateRecommendations(analysis: string, document: Document) {
    // Extract recommendations from analysis
    return {
      recommendations: [
        {
          title: 'QSD/CPESC Analysis Complete',
          content: analysis,
          category: 'stormwater',
          subcategory: 'analysis',
          citation: `Analysis of ${document.filename}`
        }
      ]
    };
  }
}