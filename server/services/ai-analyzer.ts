import Anthropic from '@anthropic-ai/sdk';
import { type Document, type InsertAiAnalysis } from "@shared/schema";

export interface AnalysisResult {
  analysis: string;
  insights: string[];
  recommendations: Array<{
    title: string;
    content: string;
    category: 'stormwater';
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
3. **Actionable Recommendations**: Provide specific, implementable recommendations with detailed calculations
4. **MATERIAL CALCULATIONS**: Calculate all required materials including:
   - Aggregate quantities (tons), fabric areas (sq ft), pipe lengths (ft)
   - Concrete volumes (cubic yards), reinforcement (lbs)
   - Erosion control blanket areas (sq ft)
   - Seed quantities (lbs/acre), mulch volumes (cubic yards)
   - Equipment hours and labor requirements
5. **BMP CALCULATIONS**: Include engineering calculations:
   - Detention volumes: V = (Runoff - Infiltration) × Duration
   - Orifice sizing: Q = Cd × A × √(2gh)
   - Peak flow: Q = CiA (Rational Method)
   - Sediment load calculations
6. **COST ESTIMATES**: Material costs, labor costs, total project cost

**Format your response as:**
ANALYSIS: [Detailed technical analysis]

INSIGHTS: [Key insights as bullet points]

MATERIAL CALCULATIONS:
- [Item]: [Quantity] [Units] @ $[Unit Cost] = $[Total]
- [Calculations showing formulas and assumptions]

BMP CALCULATIONS:
- [Calculation Name]: [Formula] = [Result with units]
- [Show all work and assumptions]

RECOMMENDATIONS:
DEVELOPER: [Title] - [Detailed recommendation with calculations and costs]
SWPPP: [Title] - [Detailed recommendation with calculations and costs]  
EROSION: [Title] - [Detailed recommendation with calculations and costs]

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
    category: 'stormwater';
    subcategory?: string;
    citation: string;
  }> {
    // Extract recommendations from the analysis
    const recommendations: Array<{
      title: string;
      content: string;
      category: 'stormwater';
      subcategory?: string;
      citation: string;
    }> = [];

    // Simple extraction logic - in production, use more sophisticated parsing
    const sections = text.split(/(?=QSD|SWPPP|Erosion)/i);
    
    for (const section of sections) {
      let subcategory = 'General';
      
      if (section.toLowerCase().includes('swppp')) {
        subcategory = 'SWPPP';
      } else if (section.toLowerCase().includes('erosion')) {
        subcategory = 'Erosion Control';
      } else if (section.toLowerCase().includes('qsd')) {
        subcategory = 'QSD';
      }

      // Extract recommendation titles and content
      const lines = section.split('\n').filter(line => line.trim());
      if (lines.length > 2) {
        recommendations.push({
          title: lines[0].replace(/^\d+\.?\s*/, '').trim() || `${subcategory} Recommendation`,
          content: lines.slice(1, 3).join(' ').trim(),
          category: 'stormwater',
          subcategory,
          citation: `${document.originalName}, Section ${recommendations.length + 1}`,
        });
      }
    }

    return recommendations.slice(0, 10); // Limit to 10 recommendations
  }

  async generateDocument(prompt: string): Promise<string> {
    if (!this.hasApiKey) {
      return this.generateFallbackDocument(prompt);
    }

    try {
      const message = await this.anthropic!.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: prompt
        }],
        system: "You are a professional stormwater management expert. Generate comprehensive, accurate documents following industry standards. Include proper citations and safety considerations."
      });

      return message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate document content.';
    } catch (error) {
      console.error('AI document generation error:', error);
      return this.generateFallbackDocument(prompt);
    }
  }

  private generateFallbackDocument(prompt: string): string {
    return `
# Generated Document

This document was generated based on your request. Due to limited AI processing capabilities, 
this is a template version. For a comprehensive document, please ensure proper API configuration.

## Key Sections:
1. Problem Identification
2. Assessment Procedures  
3. Safety Requirements
4. Implementation Steps
5. Quality Control
6. Documentation Requirements

## Notes:
- Review all safety procedures before implementation
- Verify local regulatory requirements
- Consult with qualified professionals
- Document all actions and findings

---
Generated: ${new Date().toLocaleDateString()}
`;
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
          category: 'stormwater',
          citation: `${document.originalName}, Full Document`
        }
      ]
    };
  }
}
