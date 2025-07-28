/**
 * Anthropic Claude AI Integration Service
 * StormWaterAI Enterprise System
 * 
 * Provides AI-powered document analysis and generation capabilities
 * using Anthropic's Claude model for professional stormwater engineering.
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export interface DocumentAnalysisRequest {
  content: string;
  type: 'pdf' | 'docx' | 'txt' | 'image';
  purpose: 'analysis' | 'compliance' | 'recommendation' | 'report_generation';
  context?: {
    projectType?: string;
    location?: string;
    regulations?: string[];
  };
}

export interface DocumentAnalysisResult {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  complianceStatus: {
    compliant: boolean;
    issues: string[];
    requirements: string[];
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigation: string[];
  };
  confidence: number;
}

export interface ReportGenerationRequest {
  projectData: {
    name: string;
    location: string;
    type: string;
    scope: string;
  };
  analysisResults: DocumentAnalysisResult[];
  templateType: 'technical' | 'executive' | 'compliance' | 'assessment';
  requirements: string[];
}

export interface GeneratedReport {
  title: string;
  sections: {
    heading: string;
    content: string;
    subsections?: { heading: string; content: string }[];
  }[];
  metadata: {
    generatedAt: string;
    version: string;
    author: string;
    reviewStatus: 'draft' | 'review' | 'approved';
  };
}

export class AnthropicService {
  private client: Anthropic;
  private readonly model = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string) {
    this.client = new Anthropic({
      apiKey,
    });
  }

  /**
   * Analyze documents for stormwater engineering insights
   */
  async analyzeDocument(request: DocumentAnalysisRequest): Promise<DocumentAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(request);
    
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4000,
        temperature: 0.1,
        system: this.getSystemPrompt('analysis'),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Claude');
      }

      return this.parseAnalysisResponse(content.text);
    } catch (error) {
      console.error('Document analysis failed:', error);
      throw new Error('Failed to analyze document with AI service');
    }
  }

  /**
   * Generate professional stormwater reports
   */
  async generateReport(request: ReportGenerationRequest): Promise<GeneratedReport> {
    const prompt = this.buildReportPrompt(request);
    
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8000,
        temperature: 0.2,
        system: this.getSystemPrompt('report_generation'),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Claude');
      }

      return this.parseReportResponse(content.text, request);
    } catch (error) {
      console.error('Report generation failed:', error);
      throw new Error('Failed to generate report with AI service');
    }
  }

  /**
   * Get AI recommendations for stormwater projects
   */
  async getRecommendations(projectData: any, analysisResults: DocumentAnalysisResult[]): Promise<string[]> {
    const prompt = `
Based on the following project data and analysis results, provide specific, actionable recommendations for stormwater management:

Project Data:
${JSON.stringify(projectData, null, 2)}

Analysis Results:
${JSON.stringify(analysisResults, null, 2)}

Please provide 5-10 specific, professional recommendations that address:
1. Regulatory compliance
2. Best management practices
3. Environmental protection
4. Cost-effective solutions
5. Long-term sustainability

Format as a JSON array of strings.
`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.3,
        system: this.getSystemPrompt('recommendations'),
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response type from Claude');
      }

      // Extract JSON array from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: split by lines and clean
      return content.text
        .split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 10);
    } catch (error) {
      console.error('Recommendations generation failed:', error);
      throw new Error('Failed to generate recommendations');
    }
  }

  private getSystemPrompt(type: 'analysis' | 'report_generation' | 'recommendations'): string {
    const basePrompt = `You are a QSD/CPESC certified stormwater engineer with 20+ years of experience. You provide professional, accurate, and compliant stormwater engineering analysis.`;

    switch (type) {
      case 'analysis':
        return `${basePrompt} 

When analyzing documents, focus on:
- Regulatory compliance (NPDES, local ordinances)
- Best management practices (BMPs)
- Environmental impact assessment
- Technical accuracy and feasibility
- Risk assessment and mitigation

Provide detailed, actionable insights that meet professional engineering standards.`;

      case 'report_generation':
        return `${basePrompt}

When generating reports, ensure:
- Professional formatting and structure
- Compliance with industry standards
- Clear, technical language appropriate for engineers and regulators
- Comprehensive coverage of all relevant aspects
- Actionable recommendations and next steps

Follow standard engineering report formats with executive summary, technical analysis, and recommendations.`;

      case 'recommendations':
        return `${basePrompt}

When providing recommendations:
- Prioritize regulatory compliance
- Consider cost-effectiveness
- Focus on proven, industry-standard solutions
- Address long-term sustainability
- Provide specific, actionable guidance

Recommendations should be implementable and appropriate for the project scope and budget.`;

      default:
        return basePrompt;
    }
  }

  private buildAnalysisPrompt(request: DocumentAnalysisRequest): string {
    return `
Please analyze the following ${request.type} document for stormwater engineering purposes:

Document Content:
${request.content}

Analysis Purpose: ${request.purpose}

${request.context ? `Project Context:
- Type: ${request.context.projectType || 'Not specified'}
- Location: ${request.context.location || 'Not specified'}
- Applicable Regulations: ${request.context.regulations?.join(', ') || 'Not specified'}` : ''}

Please provide a comprehensive analysis in the following JSON format:
{
  "summary": "Brief overview of the document content",
  "keyFindings": ["Finding 1", "Finding 2", ...],
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "complianceStatus": {
    "compliant": boolean,
    "issues": ["Issue 1", "Issue 2", ...],
    "requirements": ["Requirement 1", "Requirement 2", ...]
  },
  "riskAssessment": {
    "level": "low|medium|high|critical",
    "factors": ["Factor 1", "Factor 2", ...],
    "mitigation": ["Mitigation 1", "Mitigation 2", ...]
  },
  "confidence": 0.95
}
`;
  }

  private buildReportPrompt(request: ReportGenerationRequest): string {
    return `
Generate a professional ${request.templateType} stormwater engineering report based on the following information:

Project Data:
${JSON.stringify(request.projectData, null, 2)}

Analysis Results:
${JSON.stringify(request.analysisResults, null, 2)}

Requirements:
${request.requirements.join('\n- ')}

Please structure the report with appropriate sections for a ${request.templateType} report type. Include:
- Executive Summary (for executive/compliance reports)
- Technical Analysis
- Findings and Recommendations
- Compliance Assessment
- Next Steps

Format the response as a structured JSON object with sections and content.
`;
  }

  private parseAnalysisResponse(response: string): DocumentAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Analysis completed',
          keyFindings: parsed.keyFindings || [],
          recommendations: parsed.recommendations || [],
          complianceStatus: parsed.complianceStatus || {
            compliant: false,
            issues: [],
            requirements: []
          },
          riskAssessment: parsed.riskAssessment || {
            level: 'medium',
            factors: [],
            mitigation: []
          },
          confidence: parsed.confidence || 0.8
        };
      }

      // Fallback parsing if JSON extraction fails
      return this.fallbackParseAnalysis(response);
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return this.fallbackParseAnalysis(response);
    }
  }

  private parseReportResponse(response: string, request: ReportGenerationRequest): GeneratedReport {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || `${request.projectData.name} - ${request.templateType} Report`,
          sections: parsed.sections || [],
          metadata: {
            generatedAt: new Date().toISOString(),
            version: '1.0',
            author: 'StormWaterAI System',
            reviewStatus: 'draft'
          }
        };
      }

      // Fallback: create structured report from text
      return this.fallbackParseReport(response, request);
    } catch (error) {
      console.error('Failed to parse report response:', error);
      return this.fallbackParseReport(response, request);
    }
  }

  private fallbackParseAnalysis(response: string): DocumentAnalysisResult {
    const lines = response.split('\n').filter(line => line.trim().length > 0);
    
    return {
      summary: lines[0] || 'Document analyzed',
      keyFindings: lines.slice(1, 4),
      recommendations: lines.slice(4, 7),
      complianceStatus: {
        compliant: response.toLowerCase().includes('compliant'),
        issues: [],
        requirements: []
      },
      riskAssessment: {
        level: 'medium',
        factors: [],
        mitigation: []
      },
      confidence: 0.7
    };
  }

  private fallbackParseReport(response: string, request: ReportGenerationRequest): GeneratedReport {
    const sections = response.split('\n\n').map((section, index) => ({
      heading: `Section ${index + 1}`,
      content: section.trim()
    }));

    return {
      title: `${request.projectData.name} - ${request.templateType} Report`,
      sections,
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0',
        author: 'StormWaterAI System',
        reviewStatus: 'draft'
      }
    };
  }
}