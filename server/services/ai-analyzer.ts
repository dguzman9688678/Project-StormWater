import Anthropic from '@anthropic-ai/sdk';
import type { Document } from "@shared/schema";

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
    this.hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    if (this.hasApiKey) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('Anthropic AI (Claude) initialized for stormwater engineering analysis.');
    } else {
      console.log('ANTHROPIC_API_KEY not found. AI analysis will use fallback mode.');
    }
  }

  async analyzeDocument(document: Document, query?: string): Promise<AnalysisResult> {
    if (!this.hasApiKey || !this.anthropic) {
      return this.generateFallbackAnalysis(document, query);
    }

    try {
      // Get all documents from storage to use as reference context
      const { storage } = await import('../storage');
      const allDocuments = await storage.getAllDocuments();
      
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(document.originalName);
      
      if (isImage) {
        return await this.analyzeImageWithContext(document, allDocuments, query);
      } else {
        return await this.analyzeDocumentWithContext(document, allDocuments, query);
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.generateFallbackAnalysis(document, query);
    }
  }

  private async analyzeImageWithContext(document: Document, allDocuments: Document[], query?: string): Promise<AnalysisResult> {
    // Build context from all reference documents
    const referenceContext = this.buildReferenceContext(allDocuments);
    
    const prompt = `As a specialized stormwater engineering expert, analyze this construction site image by referencing the comprehensive document library below:

**REFERENCE DOCUMENT LIBRARY:**
${referenceContext}

**CURRENT IMAGE TO ANALYZE:**
- Filename: ${document.originalName}
- Category: ${document.category}
- Site Description: ${document.content}

**COMPREHENSIVE ANALYSIS INSTRUCTIONS:**
Cross-reference this image against ALL documents in the library to identify every possible stormwater issue. Use the reference documents to:

1. **Identify ALL Issues**: Compare site conditions against standards, regulations, and best practices from the document library
2. **Reference Violations**: Cite specific violations of codes, standards, or procedures from uploaded documents
3. **Comprehensive Solutions**: Provide solutions that reference specific sections, formulas, and requirements from the library
4. **Regulatory Compliance**: Ensure all recommendations comply with regulations found in the reference documents
5. **Cost Analysis**: Use pricing and material data from the library where available

${query ? `**Specific Query**: ${query}` : ''}

**Format your response as:**
ANALYSIS: [Comprehensive analysis referencing specific documents and sections]

INSIGHTS: [Key insights with document citations]

RECOMMENDATIONS:
STORMWATER: [Title] - [Detailed recommendation with specific document references, calculations, and regulatory citations]`;

    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are Claude, a specialized stormwater engineering AI with access to a comprehensive reference library. Always cite specific documents, sections, and standards from the provided library when making recommendations.`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAnalysisResponse(analysisText, document);
  }

  private async analyzeImageDocument(document: Document, query?: string): Promise<AnalysisResult> {
    // For images, we need to read the file and convert to base64
    const fs = await import('fs');
    const path = await import('path');
    
    try {
      // The document content for images contains the description, but we need the actual file
      // Let's construct a text-based analysis for now since we don't have direct file access
      const prompt = `As a specialized stormwater engineering expert, analyze this construction site image:

**Image Information:**
- Filename: ${document.originalName}
- Category: ${document.category}
- Site Description: ${document.content}

**Analysis Instructions:**
Based on the filename "${document.originalName}" and any site description provided, perform a comprehensive stormwater engineering analysis. This appears to be a construction site photo that requires professional stormwater management assessment.

**Analysis Required:**
1. **Site Assessment**: Based on the image name and context, identify likely site conditions
2. **Stormwater Concerns**: Identify potential drainage, erosion, and sediment control issues
3. **BMP Recommendations**: Suggest appropriate Best Management Practices
4. **Compliance Requirements**: Address regulatory compliance needs

${query ? `**Specific Query**: ${query}` : ''}

**Format your response as:**
ANALYSIS: [Detailed engineering analysis based on site context]

INSIGHTS: [Key engineering insights as bullet points]

RECOMMENDATIONS:
STORMWATER: [Title] - [Detailed recommendation with engineering specifications]`;

      const response = await this.anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are Claude, acting as a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control). You are conducting professional site assessments with the expertise and authority of a licensed stormwater consultant. Provide professional-grade recommendations with implementation specifications, regulatory compliance guidance, and cost-effective solutions.`,
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
      console.error('Image analysis failed:', error);
      return this.generateFallbackAnalysis(document, query);
    }
  }

  private async analyzeDocumentWithContext(document: Document, allDocuments: Document[], query?: string): Promise<AnalysisResult> {
    // Build context from all reference documents
    const referenceContext = this.buildReferenceContext(allDocuments);
    
    const prompt = `As a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control), conduct a professional site assessment by cross-referencing this comprehensive document library below:

**REFERENCE DOCUMENT LIBRARY:**
${referenceContext}

**CURRENT DOCUMENT TO ANALYZE:**
- Title: ${document.originalName}
- Category: ${document.category}
- Content: ${document.content.substring(0, 3000)}${document.content.length > 3000 ? '...' : ''}

**PROFESSIONAL QSD/CPESC ASSESSMENT PROTOCOL:**
Apply your professional expertise to evaluate this site/document against industry standards. Cross-reference ALL library documents to provide consultant-level recommendations:

1. **Regulatory Compliance Assessment**: Evaluate against CGP requirements, NPDES permits, state/local regulations from reference documents
2. **Site-Specific BMP Selection**: Recommend appropriate BMPs based on site conditions, soil types, slopes, and drainage patterns
3. **Implementation Specifications**: Provide detailed installation standards, material specs, and construction sequencing
4. **Professional Risk Assessment**: Identify potential failure modes, environmental impacts, and liability concerns
5. **Inspection and Maintenance Protocols**: Define professional inspection schedules, performance monitoring, and maintenance requirements
6. **Cost-Benefit Analysis**: Balance compliance requirements with practical implementation costs and timelines
7. **Documentation Requirements**: Address SWPPP updates, inspection forms, and regulatory reporting needs

${query ? `**Client Request**: ${query}` : ''}

**Provide Professional Consultant-Level Response:**
PROFESSIONAL SITE ASSESSMENT: [Comprehensive evaluation with regulatory context and technical findings]

CRITICAL FINDINGS: [Priority issues requiring immediate professional attention with risk assessment]

PROFESSIONAL RECOMMENDATIONS:
QSD/CPESC RECOMMENDATION: [Professional BMP Title] - [Detailed implementation specifications with materials, installation standards, inspection requirements, regulatory compliance notes, and professional liability considerations]`;

    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are Claude, acting as a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control) with extensive field experience in stormwater management. You provide professional-grade analysis and recommendations with the authority and expertise of a licensed consultant.

Professional Standards:
- Apply regulatory knowledge of Construction General Permit (CGP) requirements
- Reference specific BMPs, installation standards, and maintenance protocols
- Provide cost-effective solutions with implementation timelines
- Include inspection schedules and performance monitoring requirements
- Address regulatory compliance and documentation needs
- Consider site-specific conditions, soil types, and drainage patterns

Always cite specific documents, sections, and standards from the provided library when making recommendations. Provide actionable solutions a professional consultant would deliver.`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAnalysisResponse(analysisText, document);
  }

  private buildReferenceContext(allDocuments: Document[]): string {
    // Filter out the current document and build a context summary
    const referenceDocs = allDocuments
      .filter(doc => doc.content && doc.content.length > 50) // Only include substantial documents
      .slice(0, 20); // Limit to avoid token limits

    if (referenceDocs.length === 0) {
      return "No reference documents available in the library.";
    }

    return referenceDocs.map((doc, index) => {
      const preview = doc.content.substring(0, 500);
      return `[${index + 1}] Document: "${doc.originalName}"
Category: ${doc.category}
Content Preview: ${preview}${doc.content.length > 500 ? '...' : ''}
---`;
    }).join('\n');
  }

  private async analyzeTextDocument(document: Document, query?: string): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(document, query);
    
    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `You are Claude, a specialized stormwater engineering AI with deep expertise in QSD certification, SWPPP development, erosion control, construction site stormwater management, and regional regulations. Provide detailed, practical, and actionable engineering recommendations based on uploaded documents.`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAnalysisResponse(analysisText, document);
  }

  private buildAnalysisPrompt(document: Document, query?: string): string {
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(document.originalName);
    
    if (isImage) {
      return `As a specialized stormwater engineering expert, analyze this site image and provide practical engineering guidance:

**Image Information:**
- Filename: ${document.originalName}
- Category: ${document.category}
- Description: ${document.content}

**Visual Analysis Instructions:**
Analyze this stormwater engineering site photo for:
- Current site conditions and drainage patterns
- Existing erosion issues or sediment buildup
- Installed BMPs and their effectiveness
- Areas requiring immediate attention
- Specific engineering recommendations with calculations

**Analysis Required:**
1. **Technical Analysis**: Identify key stormwater engineering concepts from the image
2. **Engineering Insights**: Extract practical insights for construction site stormwater management
3. **Actionable Recommendations**: Provide specific, implementable recommendations with detailed calculations

${query ? `**Specific Query**: ${query}` : ''}

**Format your response as:**
ANALYSIS: [Detailed technical analysis]

INSIGHTS: [Key insights as bullet points]

RECOMMENDATIONS:
STORMWATER: [Title] - [Detailed recommendation with calculations and costs]`;
    } else {
      return `As a specialized stormwater engineering expert, analyze this document and provide practical engineering guidance:

**Document Information:**
- Title: ${document.originalName}
- Category: ${document.category}
- Content: ${document.content.substring(0, 4000)}${document.content.length > 4000 ? '...' : ''}

**Analysis Required:**
1. **Technical Analysis**: Identify key stormwater engineering concepts, regulations, and requirements
2. **Engineering Insights**: Extract practical insights for construction site stormwater management
3. **Actionable Recommendations**: Provide specific, implementable recommendations with detailed calculations

${query ? `**Specific Query**: ${query}` : ''}

**Format your response as:**
ANALYSIS: [Detailed technical analysis]

INSIGHTS: [Key insights as bullet points]

RECOMMENDATIONS:
STORMWATER: [Title] - [Detailed recommendation with calculations and costs]`;
    }
  }

  private parseAnalysisResponse(analysisText: string, document: Document): AnalysisResult {
    const analysis = this.extractSection(analysisText, 'ANALYSIS') || 
      `Document analysis for ${document.originalName} (${document.category}). The document contains ${document.content.length} characters of content related to stormwater management.`;

    const insights = this.extractInsights(analysisText);
    const recommendations = this.extractRecommendations(analysisText, document);

    return {
      analysis,
      insights,
      recommendations
    };
  }

  private extractSection(text: string, sectionName: string): string {
    const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z]+:|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractInsights(text: string): string[] {
    const insightsSection = this.extractSection(text, 'INSIGHTS');
    if (!insightsSection) return ['Document successfully processed and indexed', 'Content is available for search and reference'];

    const insights = insightsSection
      .split(/[-•*]\s*/)
      .filter(line => line.trim())
      .map(line => line.trim());

    return insights.slice(0, 5);
  }

  private extractRecommendations(text: string, document: Document): Array<{
    title: string;
    content: string;
    category: 'stormwater';
    subcategory?: string;
    citation: string;
  }> {
    const recommendations: Array<{
      title: string;
      content: string;
      category: 'stormwater';
      subcategory?: string;
      citation: string;
    }> = [];

    const recommendationsSection = this.extractSection(text, 'RECOMMENDATIONS');
    if (!recommendationsSection) {
      return [{
        title: 'Document Review Required',
        content: 'This document has been processed and is available for search. Manual review is recommended to extract specific engineering recommendations.',
        category: 'stormwater',
        citation: `${document.originalName}, Full Document`
      }];
    }

    const lines = recommendationsSection.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.includes('STORMWATER:') || line.includes('QSD:') || line.includes('SWPPP:') || line.includes('EROSION:')) {
        const parts = line.split(' - ');
        if (parts.length >= 2) {
          const titlePart = parts[0].replace(/^(STORMWATER|QSD|SWPPP|EROSION):\s*/, '');
          let subcategory = 'General';
          
          if (line.includes('QSD:')) subcategory = 'QSD';
          else if (line.includes('SWPPP:')) subcategory = 'SWPPP';
          else if (line.includes('EROSION:')) subcategory = 'Erosion Control';

          recommendations.push({
            title: titlePart.trim(),
            content: parts.slice(1).join(' - ').trim(),
            category: 'stormwater',
            subcategory,
            citation: `${document.originalName}, Section ${recommendations.length + 1}`
          });
        }
      }
    }

    return recommendations.slice(0, 10);
  }

  async generateDocument(prompt: string): Promise<string> {
    if (!this.hasApiKey || !this.anthropic) {
      return this.generateFallbackDocument(prompt);
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are a specialized stormwater engineering document generator. Create professional engineering documents with technical specifications, calculations, and regulatory compliance information.`,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      console.error('Document generation failed:', error);
      return this.generateFallbackDocument(prompt);
    }
  }

  private generateFallbackDocument(prompt: string): string {
    return `# Generated Document

**Request:** ${prompt}

**Note:** This document was generated using fallback mode due to AI service limitations.

## Content

This document would contain detailed stormwater engineering specifications, calculations, and recommendations based on your request. To access full AI-powered document generation, please ensure the Anthropic API key is properly configured.

## Recommendations

- Review uploaded source documents for relevant information
- Consult current stormwater management regulations
- Consider site-specific conditions and requirements
- Implement appropriate best management practices

**Generated:** ${new Date().toLocaleDateString()}
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