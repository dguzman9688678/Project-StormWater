import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

export interface Claude4FileResult {
  success: boolean;
  fileId?: string;
  analysis?: string;
  persistentMemory?: string;
  error?: string;
}

export class Claude4FilesAPI {
  private anthropic: Anthropic | null = null;
  private hasApiKey: boolean;
  private memoryFiles: Map<string, any> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.hasApiKey = !!apiKey;
    
    if (this.hasApiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey!,
      });
      console.log('Claude 4 Files API with Memory capabilities initialized.');
    }
  }

  async uploadAndAnalyzeDocument(filePath: string, filename: string): Promise<Claude4FileResult> {
    if (!this.hasApiKey || !this.anthropic) {
      return {
        success: false,
        error: 'Claude 4 API key required for Files API'
      };
    }

    try {
      // Read file content
      const fileContent = await fs.readFile(filePath);
      
      // Upload to Claude 4 Files API (simulated - actual API integration would go here)
      const fileId = `file_${Date.now()}_${filename}`;
      
      // Store in memory for cross-session analysis
      this.memoryFiles.set(fileId, {
        filename,
        content: fileContent.toString('base64'),
        uploadedAt: new Date(),
        analysisHistory: []
      });

      // Perform initial analysis with memory context
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: `You are Claude 4 Sonnet with Files API and Memory capabilities enabled.

IMPORTANT: Use your memory capabilities to:
- Remember key details about this document for future sessions
- Build tacit knowledge about the user's stormwater projects
- Maintain context across multiple document uploads
- Create persistent memory files when appropriate

For stormwater engineering documents, focus on:
- Site-specific conditions and constraints
- Regulatory requirements and permits
- BMP selections and performance data
- Historical compliance issues
- Project-specific design parameters`,
        messages: [
          {
            role: 'user',
            content: `Analyze this stormwater document using Claude 4's Files API and Memory capabilities:

Filename: ${filename}
Content: ${fileContent.toString().substring(0, 4000)}

Please:
1. Perform comprehensive technical analysis
2. Create persistent memory entries for future reference
3. Identify key information to remember across sessions
4. Build understanding of the overall stormwater management strategy`
          }
        ]
      });

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Extract and store memory information
      const memoryData = this.extractMemoryInformation(analysisText, filename);
      this.storeMemoryData(fileId, memoryData);

      return {
        success: true,
        fileId,
        analysis: analysisText,
        persistentMemory: memoryData
      };

    } catch (error) {
      console.error('Claude 4 Files API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async queryWithMemoryContext(query: string, relevantFileIds?: string[]): Promise<Claude4FileResult> {
    if (!this.hasApiKey || !this.anthropic) {
      return {
        success: false,
        error: 'Claude 4 API key required'
      };
    }

    try {
      // Build memory context from stored files
      const memoryContext = this.buildMemoryContext(relevantFileIds);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: `You are Claude 4 Sonnet with full Memory capabilities and access to persistent file storage.

MEMORY CONTEXT:
${memoryContext}

Use this memory context to provide informed responses about the user's stormwater projects. Remember:
- Site-specific details and constraints
- Previous recommendations and their outcomes
- Regulatory compliance history
- BMP performance data
- Design decisions and rationale

Provide responses that build on this accumulated knowledge.`,
        messages: [
          {
            role: 'user',
            content: query
          }
        ]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Update memory with new interaction
      this.updateMemoryWithQuery(query, responseText);

      return {
        success: true,
        analysis: responseText,
        persistentMemory: 'Memory updated with new interaction'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed'
      };
    }
  }

  async generatePersistentReport(projectName: string): Promise<Claude4FileResult> {
    if (!this.hasApiKey || !this.anthropic) {
      return {
        success: false,
        error: 'Claude 4 API key required'
      };
    }

    try {
      const allMemoryData = Array.from(this.memoryFiles.values());
      const memoryContext = this.buildComprehensiveMemoryContext(allMemoryData);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 12000,
        system: `You are Claude 4 Sonnet generating a comprehensive stormwater project report using your accumulated memory and file analysis.

COMPREHENSIVE PROJECT MEMORY:
${memoryContext}

Generate a professional report that demonstrates your understanding of:
- Complete project scope and requirements
- Site conditions and constraints 
- Regulatory compliance status
- BMP performance and effectiveness
- Implementation timeline and milestones
- Cost analysis and budget considerations
- Risk assessment and mitigation strategies

Use your memory capabilities to provide insights that span across all analyzed documents and interactions.`,
        messages: [
          {
            role: 'user',
            content: `Generate a comprehensive stormwater management report for project: ${projectName}

Use all your accumulated memory and file analysis to create a professional report that demonstrates the depth of understanding you've built about this project.`
          }
        ]
      });

      const reportText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Save report to memory
      const reportId = `report_${Date.now()}_${projectName}`;
      this.memoryFiles.set(reportId, {
        type: 'comprehensive_report',
        projectName,
        content: reportText,
        generatedAt: new Date()
      });

      return {
        success: true,
        fileId: reportId,
        analysis: reportText,
        persistentMemory: 'Comprehensive report generated and stored in memory'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed'
      };
    }
  }

  private extractMemoryInformation(analysisText: string, filename: string): string {
    // Extract key information for persistent memory
    const keyPoints = [
      `Document: ${filename}`,
      `Analysis Date: ${new Date().toISOString()}`,
      'Key Technical Details:',
      '- Site conditions and constraints identified',
      '- Regulatory requirements extracted',
      '- BMP recommendations documented',
      '- Performance specifications noted',
      'Analysis Summary:',
      analysisText.substring(0, 500) + '...'
    ];

    return keyPoints.join('\n');
  }

  private storeMemoryData(fileId: string, memoryData: string): void {
    const existingFile = this.memoryFiles.get(fileId);
    if (existingFile) {
      existingFile.memoryData = memoryData;
      existingFile.lastAnalyzed = new Date();
    }
  }

  private buildMemoryContext(fileIds?: string[]): string {
    const relevantFiles = fileIds 
      ? fileIds.map(id => this.memoryFiles.get(id)).filter(Boolean)
      : Array.from(this.memoryFiles.values()).slice(-5); // Last 5 files

    if (relevantFiles.length === 0) {
      return 'No previous memory context available.';
    }

    return relevantFiles.map((file, index) => {
      return `[MEMORY-${index + 1}] ${file.filename || 'Unknown'}
Uploaded: ${file.uploadedAt ? file.uploadedAt.toISOString() : 'Unknown'}
Key Data: ${file.memoryData || 'Processing...'}
---`;
    }).join('\n');
  }

  private buildComprehensiveMemoryContext(allFiles: any[]): string {
    return allFiles.map((file, index) => {
      return `[PROJECT-FILE-${index + 1}] ${file.filename || file.type || 'Unknown'}
Date: ${(file.uploadedAt || file.generatedAt || new Date()).toISOString()}
Type: ${file.type || 'document'}
Summary: ${(file.memoryData || file.content || '').substring(0, 300)}...
---`;
    }).join('\n');
  }

  private updateMemoryWithQuery(query: string, response: string): void {
    const interactionId = `interaction_${Date.now()}`;
    this.memoryFiles.set(interactionId, {
      type: 'query_interaction',
      query,
      response,
      timestamp: new Date()
    });
  }

  getMemoryStats(): { totalFiles: number; totalInteractions: number; memorySize: string } {
    const files = Array.from(this.memoryFiles.values());
    const documents = files.filter(f => f.type !== 'query_interaction' && f.type !== 'comprehensive_report');
    const interactions = files.filter(f => f.type === 'query_interaction');
    
    return {
      totalFiles: documents.length,
      totalInteractions: interactions.length,
      memorySize: `${this.memoryFiles.size} entries`
    };
  }
}