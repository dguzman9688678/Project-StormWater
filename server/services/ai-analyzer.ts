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
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. AI analysis will be simulated.');
    }
  }

  async analyzeDocument(document: Document, query?: string): Promise<AnalysisResult> {
    if (!this.apiKey) {
      return this.generateFallbackAnalysis(document, query);
    }

    try {
      const prompt = this.buildAnalysisPrompt(document, query);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a specialized stormwater engineering AI assistant with expertise in QSD guidelines, SWPPP development, and erosion control practices. Provide detailed, practical recommendations based on engineering documents.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;

      return this.parseAnalysisResponse(analysisText, document);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.generateFallbackAnalysis(document, query);
    }
  }

  private buildAnalysisPrompt(document: Document, query?: string): string {
    const basePrompt = `
Analyze the following stormwater engineering document and provide:

1. A comprehensive analysis of the content
2. Key insights for stormwater management
3. Specific actionable recommendations categorized as:
   - QSD (Qualified SWPPP Developer) guidelines
   - SWPPP (Stormwater Pollution Prevention Plan) practices  
   - Erosion control techniques

Document Title: ${document.originalName}
Document Category: ${document.category}
Document Content: ${document.content.substring(0, 3000)}...

${query ? `Specific Query: ${query}` : ''}

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
