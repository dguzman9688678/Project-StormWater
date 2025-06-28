import Anthropic from '@anthropic-ai/sdk';
import { type Document, type InsertAiAnalysis } from "@shared/schema";

export interface AnalysisResult {
  analysis: string;
  insights: string[];
  recommendations: Array<{
    title: string;
    content: string;
    category: 'qsd' | 'swppp' | 'erosion';
    subcategory?: string;
    citation: string;
  }>;
}

export class AIAnalyzer {
  private anthropic: Anthropic | null = null;
  private hasApiKey: boolean;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.hasApiKey = !!apiKey;
    
    if (!this.hasApiKey) {
      console.warn('Anthropic API key not found. AI analysis will be simulated.');
    } else {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });
      console.log('Anthropic AI (Claude) initialized for stormwater engineering analysis.');
    }
  }

  async analyzeDocument(document: Document, query?: string): Promise<AnalysisResult> {
    if (!this.hasApiKey || !this.anthropic) {
      return this.generateFallbackAnalysis(document, query);
    }

    try {
      const prompt = this.buildAnalysisPrompt(document, query);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514', // Latest Claude model for best performance
        max_tokens: 4000,
        system: `You are Claude, a specialized stormwater engineering AI with deep expertise in:
- QSD (Qualified SWPPP Developer) certification requirements and guidelines
- SWPPP (Stormwater Pollution Prevention Plan) development and implementation
- Erosion and sediment control best practices
- Construction site stormwater management
- Regional stormwater regulations and compliance

Provide detailed, practical, and actionable engineering recommendations based on the uploaded documents. Focus on real-world implementation and regulatory compliance.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';

      return this.parseAnalysisResponse(analysisText, document);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.generateFallbackAnalysis(document, query);
    }
  }

  private buildAnalysisPrompt(document: Document, query?: string): string {
    const basePrompt = `
As a specialized stormwater engineering expert, analyze this document and provide practical engineering guidance:

**Document Information:**
- Title: ${document.originalName}
- Category: ${document.category}
- Content: ${document.content.substring(0, 4000)}${document.content.length > 4000 ? '...' : ''}

**Analysis Required:**
1. **Technical Analysis**: Identify key stormwater engineering concepts, regulations, and requirements
2. **Engineering Insights**: Extract practical insights for construction site stormwater management
3. **Actionable Recommendations**: Provide specific, implementable recommendations in these categories:
   - **QSD Guidelines**: Qualified SWPPP Developer certification and inspection requirements
   - **SWPPP Practices**: Stormwater Pollution Prevention Plan development and implementation
   - **Erosion Control**: Best management practices for erosion and sediment control

**Format your response as:**
ANALYSIS: [Detailed technical analysis]

INSIGHTS: [Key insights as bullet points]

RECOMMENDATIONS:
QSD: [Title] - [Detailed recommendation with regulatory citation]
SWPPP: [Title] - [Detailed recommendation with regulatory citation]  
EROSION: [Title] - [Detailed recommendation with regulatory citation]

${query ? `\n**Specific Focus**: ${query}` : ''}

Please structure your response with clear sections and provide citations referencing the source document.
`;

    return basePrompt;
  }

  private parseAnalysisResponse(analysisText: string, document: Document): AnalysisResult {
    // Simple parsing logic - in production, you'd use more sophisticated NLP
    const insights = this.extractInsights(analysisText);
    const recommendations = this.extractRecommendations(analysisText, document);

    return {
      analysis: analysisText,
      insights,
      recommendations,
    };
  }

  private extractInsights(text: string): string[] {
    // Extract key insights from the analysis
    const insights: string[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.includes('key insight') || line.includes('important') || line.includes('critical')) {
        insights.push(line.trim());
      }
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  private extractRecommendations(text: string, document: Document): Array<{
    title: string;
    content: string;
    category: 'qsd' | 'swppp' | 'erosion';
    subcategory?: string;
    citation: string;
  }> {
    // Extract recommendations from the analysis
    const recommendations: Array<{
      title: string;
      content: string;
      category: 'qsd' | 'swppp' | 'erosion';
      subcategory?: string;
      citation: string;
    }> = [];

    // Simple extraction logic - in production, use more sophisticated parsing
    const sections = text.split(/(?=QSD|SWPPP|Erosion)/i);
    
    for (const section of sections) {
      let category: 'qsd' | 'swppp' | 'erosion' = 'qsd';
      
      if (section.toLowerCase().includes('swppp')) {
        category = 'swppp';
      } else if (section.toLowerCase().includes('erosion')) {
        category = 'erosion';
      }

      // Extract recommendation titles and content
      const lines = section.split('\n').filter(line => line.trim());
      if (lines.length > 2) {
        recommendations.push({
          title: lines[0].replace(/^\d+\.?\s*/, '').trim() || `${category.toUpperCase()} Recommendation`,
          content: lines.slice(1, 3).join(' ').trim(),
          category,
          citation: `${document.originalName}, Section ${recommendations.length + 1}`,
        });
      }
    }

    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  private generateFallbackAnalysis(document: Document, query?: string): AnalysisResult {
    return {
      analysis: `Document analysis for ${document.originalName} (${document.category}). ${query ? `Query: ${query}. ` : ''}The document contains ${document.content.length} characters of content related to stormwater management. Due to AI service limitations, detailed analysis is not available at this time.`,
      insights: [
        'Document successfully processed and indexed',
        'Content is available for search and reference',
        'Manual review recommended for detailed insights'
      ],
      recommendations: [
        {
          title: 'Document Review Required',
          content: 'This document has been processed and is available for search. Manual review is recommended to extract specific engineering recommendations.',
          category: document.category as any || 'qsd',
          citation: `${document.originalName}, Full Document`
        }
      ]
    };
  }
}
