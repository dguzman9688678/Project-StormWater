/**
 * AI Services Entry Point
 * StormWaterAI Enterprise System
 */

export { AnthropicService } from './anthropic/claude-service.js';
export { DocumentProcessor } from './document-analysis/processor.js';

// Main AI Services API
export class AIServices {
  constructor() {
    console.log('AI Services initialized');
  }

  async health() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        anthropic: 'available',
        documentProcessor: 'available'
      }
    };
  }
}

export default AIServices;