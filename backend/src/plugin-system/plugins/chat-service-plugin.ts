/**
 * Chat Service Plugin
 * Converts existing Chat Service into a plugin for the ecosystem
 */

import { AIPlugin, PluginStatus, ResourceUsage, PluginRequest } from '../plugin-manager';
import { ChatService } from '../../services/chat-service';

export class ChatServicePlugin implements AIPlugin {
  id = 'chat-service';
  name = 'AI Chat Service';
  version = '1.0.0';
  description = 'Interactive chat with Claude AI and Python calculation capabilities';
  category = 'chat' as const;
  capabilities = [
    'interactive-chat',
    'image-analysis',
    'python-execution',
    'stormwater-calculations',
    'real-time-consultation'
  ];
  memoryUsage = 256; // MB
  cpuUsage = 15; // percentage
  isActive = false;

  private chatService: ChatService;
  private startTime: Date;
  private requestCount = 0;
  private errorCount = 0;
  private isRunning = false;

  constructor() {
    this.chatService = new ChatService();
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
      if (input.type === 'chat-message') {
        return await this.processChatMessage(input.message, input.userId);
      } else if (input.type === 'analyze-image') {
        return await this.analyzeImage(input.image, input.message);
      } else if (input.type === 'execute-python') {
        return await this.executePython(input.code, input.data);
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
      'chat-message',
      'analyze-image',
      'execute-python',
      'interactive-chat',
      'python-calculations',
      'stormwater-calculations'
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

  // Private processing methods
  private async processChatMessage(message: string, userId?: string): Promise<string> {
    return await this.chatService.processMessage(message);
  }

  private async analyzeImage(base64Image: string, message?: string): Promise<string> {
    return await this.chatService.analyzeImage(base64Image, message);
  }

  private async executePython(code: string, data?: any): Promise<any> {
    return await this.chatService.executePythonCode(code, data);
  }
}