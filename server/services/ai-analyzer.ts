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
    
    // Check if image is too large for visual analysis
    if (document.content.includes('IMAGE_TOO_LARGE:')) {
      // Handle large images with text-based analysis
      const textAnalysisPrompt = `As a certified QSD/CPESC stormwater professional, analyze the construction site image "${document.originalName}" by referencing the comprehensive document library below:

**REFERENCE DOCUMENT LIBRARY:**
${referenceContext}

**IMAGE ANALYSIS REQUEST:**
This large construction site image (${document.originalName}) exceeded the visual analysis size limit. Provide professional stormwater analysis based on typical construction site conditions and the document library.

${query ? `**User Question**: ${query}` : ''}

**COMPREHENSIVE ANALYSIS INSTRUCTIONS:**
1. **Site Assessment**: Based on filename and typical construction issues
2. **Regulatory Compliance**: Reference specific codes from the document library
3. **BMP Specifications**: Recommend appropriate BMPs with detailed technical specifications
4. **Materials & Installation**: Provide complete materials lists, quantities, and installation procedures
5. **Implementation Timeline**: Include installation sequence, timing, and maintenance requirements
6. **Cost Analysis**: Provide material and labor estimates where applicable

**Format your response as:**
ANALYSIS: [Professional assessment based on typical construction site conditions]

INSIGHTS: [Key technical insights with document citations]

RECOMMENDATIONS:
STORMWATER: [Title] - [Comprehensive recommendation including:
- BMP Type and Technical Specifications
- Complete Materials List (quantities, grades, specifications)
- Step-by-Step Installation Instructions
- Quality Control and Inspection Requirements
- Maintenance Schedule and Procedures
- Regulatory Compliance Citations
- Material and Labor Cost Estimates]`;

      const response = await this.anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control) providing professional stormwater engineering analysis.`,
        messages: [
          {
            role: 'user',
            content: textAnalysisPrompt
          }
        ],
      });

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseAnalysisResponse(analysisText, document);
    }

    // Extract base64 image data if available
    const base64Match = document.content.match(/IMAGE_BASE64:([A-Za-z0-9+/=]+)/);
    
    if (base64Match) {
      const base64Image = base64Match[1];
      const mediaType = this.getMediaType(document.originalName);
      
      const imageAnalysisPrompt = `As a certified QSD/CPESC stormwater professional, analyze this construction site image by referencing the comprehensive document library below:

**REFERENCE DOCUMENT LIBRARY:**
${referenceContext}

**IMAGE ANALYSIS REQUEST:**
Analyze the uploaded construction site image "${document.originalName}" for stormwater management issues and provide professional recommendations.

${query ? `**User Question**: ${query}` : ''}

**COMPREHENSIVE ANALYSIS INSTRUCTIONS:**
1. **Visual Assessment**: Identify all visible stormwater issues in the image
2. **Regulatory Compliance**: Reference specific codes and standards from the document library
3. **BMP Requirements**: Recommend appropriate Best Management Practices with detailed specifications
4. **Materials & Installation**: Provide complete materials lists, quantities, and step-by-step installation instructions
5. **Implementation Timeline**: Include installation sequence, timing, and maintenance schedules
6. **Cost Estimation**: Provide material and labor cost estimates where possible

**Format your response as:**
ANALYSIS: [Detailed visual analysis of site conditions and stormwater issues]

INSIGHTS: [Key technical insights with document citations]

RECOMMENDATIONS:
STORMWATER: [Title] - [Detailed recommendation including:
- BMP Type and Purpose
- Materials List (with quantities and specifications)
- Installation Instructions (step-by-step)
- Maintenance Requirements
- Regulatory Compliance Citations
- Cost Estimates (if available)]`;

      const response = await this.anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control) providing professional stormwater engineering analysis. Always reference specific documents and standards from the provided library.`,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: imageAnalysisPrompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image
                }
              }
            ]
          }
        ],
      });

      const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseAnalysisResponse(analysisText, document);
    } else {
      // Fallback to text-based analysis if no image data
      return this.analyzeTextDocument(document, query);
    }
  }

  private getMediaType(filename: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
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
Based on the filename "${document.originalName}"${document.description ? ` and the provided site description: "${document.description}"` : ''}, perform a comprehensive stormwater engineering analysis. This appears to be a construction site photo that requires professional stormwater management assessment.

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
        max_tokens: 8000, // Increased for extended thinking
        system: `You are Claude 4 Sonnet, acting as a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control). 

IMPORTANT: Use Extended Thinking Mode for comprehensive analysis. Show your step-by-step reasoning process by wrapping your detailed thinking in <thinking> tags, especially for:
- Regulatory compliance assessments
- Risk evaluations  
- Technical solution development
- Cross-reference analysis with multiple standards

Provide professional-grade recommendations with implementation specifications, regulatory compliance guidance, and cost-effective solutions. Your analysis should demonstrate the depth and rigor expected from a licensed environmental consultant.`,
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
    
    const prompt = `<thinking>
Let me systematically approach this professional QSD/CPESC assessment using Claude 4's Extended Thinking Mode:

1. First, I'll analyze the regulatory framework by examining all reference documents for applicable standards
2. Next, I'll evaluate the current document against industry best practices
3. Then I'll cross-reference multiple sources to identify comprehensive solutions
4. Finally, I'll develop prioritized recommendations with implementation timelines
</thinking>

As a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control), conduct a professional site assessment by cross-referencing this comprehensive document library below:

**REFERENCE DOCUMENT LIBRARY:**
${referenceContext}

**CURRENT DOCUMENT TO ANALYZE:**
- Title: ${document.originalName}
- Category: ${document.category}
${document.description ? `- User Description: ${document.description}` : ''}
- Content: ${document.content.substring(0, 3000)}${document.content.length > 3000 ? '...' : ''}

**CLAUDE 4 EXTENDED THINKING PROTOCOL:**
Use Extended Thinking Mode to systematically evaluate:

<thinking>
- What regulatory frameworks apply from the reference library?
- What are the specific technical requirements and constraints?
- How do different BMP solutions compare in effectiveness?
- What are the implementation challenges and risk factors?
- Which recommendations offer the best cost-benefit ratio?
</thinking>

**CRITICAL: COMPREHENSIVE DOCUMENT ANALYSIS & CITATION REQUIREMENTS:**

You MUST analyze and reference ALL documents in the library above. This is essential for providing complete stormwater solutions.

**MANDATORY CITATION PROTOCOL:**
- Reference specific documents using [DOC-X] format (e.g., [DOC-1], [DOC-2])
- Quote relevant sections from multiple documents
- Cross-reference between documents for comprehensive solutions
- Identify which documents contain specific technical requirements
- Note any conflicting information between documents

**PROFESSIONAL QSD/CPESC ASSESSMENT PROTOCOL:**
Apply your professional expertise to evaluate this site/document against industry standards. You MUST cross-reference ALL library documents to provide consultant-level recommendations:

1. **Regulatory Compliance Assessment**: Evaluate against CGP requirements, NPDES permits, state/local regulations from reference documents - CITE SPECIFIC DOCUMENTS
2. **Site-Specific BMP Selection**: Recommend appropriate BMPs based on site conditions, soil types, slopes, and drainage patterns - REFERENCE MULTIPLE DOCUMENTS  
3. **Implementation Specifications**: Provide detailed installation standards, material specs, and construction sequencing - CITE TECHNICAL DOCUMENTS
4. **Professional Risk Assessment**: Identify potential failure modes, environmental impacts, and liability concerns - REFERENCE SAFETY DOCUMENTS
5. **Inspection and Maintenance Protocols**: Define professional inspection schedules, performance monitoring, and maintenance requirements - CITE MAINTENANCE STANDARDS
6. **Cost-Benefit Analysis**: Balance compliance requirements with practical implementation costs and timelines - REFERENCE COST GUIDELINES
7. **Documentation Requirements**: Address SWPPP updates, inspection forms, and regulatory reporting needs - CITE REGULATORY DOCUMENTS

${query ? `**Client Request**: ${query}` : ''}

**DOCUMENT CROSS-REFERENCING REQUIREMENT:**
Your analysis MUST demonstrate that you have reviewed and considered ALL reference documents above. Include specific citations and cross-references in your recommendations.

**Provide Professional Consultant-Level Response:**
PROFESSIONAL SITE ASSESSMENT: [Comprehensive evaluation with regulatory context and technical findings]

CRITICAL FINDINGS: [Priority issues requiring immediate professional attention with risk assessment]

PROFESSIONAL RECOMMENDATIONS:
QSD/CPESC RECOMMENDATION: [Professional BMP Title] - [Complete implementation package including:

**BMP SPECIFICATIONS:**
- Type and purpose of BMP
- Technical design criteria and sizing calculations
- Performance standards and efficiency targets

**MATERIALS LIST:**
- Itemized list with quantities, grades, and specifications
- Supplier recommendations and material standards
- Alternative materials for different budgets

**INSTALLATION INSTRUCTIONS:**
- Step-by-step installation procedures
- Equipment and labor requirements
- Quality control checkpoints and testing procedures
- Installation sequence and timing considerations

**MAINTENANCE PROGRAM:**
- Inspection schedule and checklists
- Routine maintenance procedures and frequencies
- Performance monitoring and documentation requirements
- Repair and replacement protocols

**REGULATORY COMPLIANCE:**
- Applicable permit requirements and citations
- Documentation and reporting requirements
- Inspection and certification procedures

**COST ANALYSIS:**
- Material costs with unit pricing
- Labor estimates and installation time
- Long-term maintenance costs
- Cost-benefit analysis and alternatives]`;

    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000, // Enhanced for extended thinking
      system: `You are Claude 4 Sonnet, certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control) with extensive field experience in stormwater management.

IMPORTANT: Use Extended Thinking Mode. Show your step-by-step reasoning process using <thinking> tags for:
- Multi-document cross-referencing and regulatory analysis
- Technical solution evaluation and comparison
- Risk assessment and mitigation planning
- Implementation strategy development

Professional Standards:
- Apply regulatory knowledge of Construction General Permit (CGP) requirements
- Reference specific BMPs, installation standards, and maintenance protocols
- Provide cost-effective solutions with implementation timelines
- Include inspection schedules and performance monitoring requirements
- Address regulatory compliance and documentation needs
- Consider site-specific conditions, soil types, and drainage patterns

Always cite specific documents, sections, and standards from the provided library when making recommendations. Show your reasoning process and provide actionable solutions a professional consultant would deliver.`,
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
    // Include ALL documents for comprehensive analysis - this is critical for proper referencing
    const referenceDocs = allDocuments
      .filter(doc => doc.content && doc.content.length > 50) // Only include substantial documents
      .sort((a, b) => b.content.length - a.content.length); // Prioritize larger documents first

    if (referenceDocs.length === 0) {
      return "No reference documents available in the library.";
    }

    console.log(`Building reference context from ${referenceDocs.length} documents for comprehensive analysis`);

    // Create comprehensive reference with ALL documents for proper citations
    const referenceContext = referenceDocs.map((doc, index) => {
      // Include more content for better analysis - this is critical for document referencing
      const preview = doc.content.substring(0, 1500); // Increased from 500 to 1500 for better context
      return `[DOC-${index + 1}] "${doc.originalName}" (${doc.category})
FILE SIZE: ${(doc.content.length / 1024).toFixed(1)}KB
CONTENT EXTRACT: ${preview}${doc.content.length > 1500 ? '...[FULL DOCUMENT AVAILABLE]' : ''}
---`;
    }).join('\n');

    // Add comprehensive BMP implementation database for detailed recommendations
    const bmpImplementationGuide = `

**COMPREHENSIVE BMP IMPLEMENTATION DATABASE:**

**EROSION CONTROL BMPs:**

Silt Fence Installation:
- Materials: Geotextile fabric (ASTM D4632, min 200 lb tensile), steel T-posts (6 ft), hardware cloth, zip ties
- Quantities: 1 post per 6-8 feet, fabric height 36 inches
- Installation: Dig 6-inch trench, install posts 3 feet deep, attach fabric with 6 inches above grade
- Cost: $3-5 per linear foot (materials and labor)

Straw Wattles:
- Materials: Certified weed-free straw, biodegradable netting, wooden stakes (2x2 inches)
- Installation: Create 6-inch deep trench on contour, stake every 4 feet, overlap ends 2 feet
- Maintenance: Replace after 90% breakdown or loss of function
- Cost: $8-12 per linear foot

Hydroseeding:
- Materials: Seed mix (2-4 lbs/1000 sf), wood fiber mulch (1500-2000 lbs/acre), tackifier
- Application: Mix in hydro-tank, spray evenly, water if no rain within 48 hours
- Timing: Optimal planting seasons (spring/fall), avoid extreme weather
- Cost: $0.15-0.30 per square foot

**SEDIMENT CONTROL BMPs:**

Sediment Basin Construction:
- Sizing: 1800 cf per acre of drainage area (minimum 2-year, 24-hour storm)
- Materials: Excavation, outlet structure (riser pipe/orifice), emergency spillway, rip-rap
- Installation: Compact bottom, install outlet, stabilize embankment
- Maintenance: Remove sediment when 50% capacity reached
- Cost: $2-8 per cubic foot

Check Dam Installation:
- Materials: Rock (6-18 inch diameter), filter fabric, geotextile
- Spacing: 200-300 feet apart in channels, center notch 12 inches deep
- Installation: Excavate foundation, place fabric, install rock with center low
- Cost: $50-200 per check dam

**INFILTRATION BMPs:**

Bioretention Cell:
- Sizing: 5-10% of drainage area, minimum 18-inch ponding depth
- Materials: Engineered soil mix (sand/topsoil/compost), plants, underdrain system
- Components: Pretreatment, ponding area, soil media (36-48 inches), underdrain
- Plants: Native species, salt/pollution tolerant, varied root depths
- Cost: $5-15 per square foot

Rain Garden:
- Sizing: 20-30% of roof drainage area
- Materials: Amended soil (50% sand, 30% topsoil, 20% compost), native plants
- Installation: Excavate 6-18 inches deep, install overflow, plant selection
- Maintenance: Weeding, mulching, plant replacement as needed
- Cost: $3-8 per square foot

**MATERIAL SPECIFICATIONS:**
- Geotextile: ASTM D4632, minimum 200 lb tensile strength, UV stable
- Aggregate: ASTM C33, clean washed stone, 1.5-2.5 inch diameter for rip-rap
- Steel Posts: Galvanized T-posts, 6-foot length, driven 3 feet minimum
- Seed Mix: Certified, 90% germination, appropriate for local climate
- Filter Fabric: Non-woven, 140 gsm minimum, high flow rate

**INSTALLATION TIMING:**
- Best: Dry weather periods, avoid frozen ground
- Seeding: Spring (March-May) or Fall (September-November)
- Avoid: During rain events, extreme heat, or winter months`;

    return referenceContext + bmpImplementationGuide;
  }

  private async analyzeTextDocument(document: Document, query?: string): Promise<AnalysisResult> {
    const prompt = this.buildAnalysisPrompt(document, query);
    
    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000, // Enhanced for extended thinking
      system: `You are Claude 4 Sonnet, specialized stormwater engineering AI with deep expertise in QSD certification, SWPPP development, erosion control, construction site stormwater management, and regional regulations.

IMPORTANT: Use Extended Thinking Mode to show your analytical reasoning process using <thinking> tags, especially for:
- Document interpretation and technical analysis
- Regulatory compliance evaluation
- Solution development and prioritization
- Risk assessment and implementation planning

Provide detailed, practical, and actionable engineering recommendations that demonstrate professional-level analysis and reasoning.`,
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
      return `You are a professional Qualified SWPPP Developer (QSD) and Certified Professional in Erosion and Sediment Control (CPESC) providing expert-level analysis for environmental consulting professionals.

**PROFESSIONAL CONTEXT:**
- Client: Environmental engineering professionals requiring industry-standard analysis  
- Standards: Must meet professional software quality and reliability requirements
- Scope: Comprehensive stormwater management, erosion control, and regulatory compliance

**DOCUMENT ANALYSIS TARGET:**
- Document: "${document.originalName}"
- Category: ${document.category}
- Content Length: ${document.content.length} characters
- Content Preview: ${document.content.substring(0, 3000)}${document.content.length > 3000 ? '...' : ''}

${query ? `**Specific Analysis Request:** ${query}` : ''}

**REQUIRED PROFESSIONAL ANALYSIS FORMAT:**

ANALYSIS: [Comprehensive technical evaluation suitable for environmental consultants covering stormwater management compliance, erosion control measures, regulatory framework adherence, implementation feasibility, cost considerations, and risk assessment]

INSIGHTS: [Professional bullet points including regulatory compliance review, technical observations, implementation priorities, cost implications, and timeline considerations]

RECOMMENDATIONS:
[Provide minimum 5 professional recommendations in this format:]
STORMWATER: [Implementation-focused title] - [Detailed professional guidance with technical specifications, materials, timeline, estimated hours, priority level, and regulatory citations]`;
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