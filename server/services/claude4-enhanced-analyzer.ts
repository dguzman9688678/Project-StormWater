import Anthropic from '@anthropic-ai/sdk';
import { Document, AiAnalysis, InsertAiAnalysis } from '../../shared/schema.js';
import { storage } from '../storage.js';

export interface Claude4AnalysisResult {
  analysis: string;
  insights: string[];
  recommendations: Array<{
    title: string;
    content: string;
    category: 'stormwater';
    subcategory?: string;
    citation: string;
    priority: 'High' | 'Medium' | 'Low';
    timeline: string;
    costBenefit: string;
  }>;
  thinkingProcess?: string;
  parallelAnalysis?: {
    regulatoryCompliance: string;
    technicalAssessment: string;
    riskAnalysis: string;
    solutionDevelopment: string;
  };
}

export class Claude4EnhancedAnalyzer {
  private anthropic: Anthropic | null = null;
  private hasApiKey: boolean;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.hasApiKey = !!apiKey;
    
    if (this.hasApiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey!,
      });
      console.log('Claude 4 Enhanced Analyzer initialized with full capabilities.');
    } else {
      console.log('Claude 4 Enhanced Analyzer: No API key available.');
    }
  }

  async performAdvancedAnalysis(document: Document, query?: string): Promise<Claude4AnalysisResult> {
    if (!this.hasApiKey || !this.anthropic) {
      return this.generateFallbackAnalysis(document, query);
    }

    try {
      // Get all documents for comprehensive analysis
      const allDocuments = await storage.getAllDocuments();
      
      // Use Claude 4's advanced capabilities
      return await this.runParallelAnalysisWithExtendedThinking(document, allDocuments, query);
    } catch (error) {
      console.error('Claude 4 enhanced analysis failed:', error);
      return this.generateFallbackAnalysis(document, query);
    }
  }

  private async runParallelAnalysisWithExtendedThinking(
    document: Document, 
    allDocuments: Document[], 
    query?: string
  ): Promise<Claude4AnalysisResult> {
    const referenceContext = this.buildEnhancedReferenceContext(allDocuments);
    
    const prompt = `**CLAUDE 4 SONNET MAXIMUM CAPABILITY ANALYSIS**

You are Claude 4 Sonnet operating at maximum capability with all advanced features enabled:
- Extended Thinking Mode with 128K token budget
- Parallel Tool Integration
- Enhanced Reasoning Architecture
- Professional QSD/CPESC Consultation Level

<thinking>
I need to perform comprehensive parallel analysis using Claude 4's enhanced capabilities:

1. PARALLEL PROCESSING STREAMS:
   - Stream 1: Regulatory compliance analysis across all reference documents
   - Stream 2: Technical assessment with cross-document validation
   - Stream 3: Risk analysis with failure mode evaluation
   - Stream 4: Solution development with cost-benefit optimization

2. EXTENDED THINKING PROCESS:
   - Deep regulatory framework analysis
   - Multi-document cross-referencing
   - Advanced BMP selection methodology
   - Implementation timeline optimization
   - Cost-effectiveness evaluation

3. ENHANCED REASONING:
   - Professional consultant-level analysis depth
   - Multiple solution pathway evaluation
   - Risk-based prioritization matrix
   - Regulatory compliance verification
</thinking>

**COMPREHENSIVE DOCUMENT LIBRARY REFERENCE:**
${referenceContext}

**TARGET DOCUMENT FOR ANALYSIS:**
- Title: ${document.originalName}
- Category: ${document.category}
${document.description ? `- Description: ${document.description}` : ''}
${query ? `- Specific Focus: ${query}` : ''}
- Content: ${document.content.substring(0, 5000)}${document.content.length > 5000 ? '...' : ''}

**CLAUDE 4 PARALLEL ANALYSIS PROTOCOL:**

**STREAM 1 - REGULATORY COMPLIANCE:**
<thinking>
Analyzing regulatory requirements by cross-referencing:
- Construction General Permit (CGP) requirements
- NPDES permit conditions
- State and local regulations
- Industry standards and codes
</thinking>

**STREAM 2 - TECHNICAL ASSESSMENT:**
<thinking>
Evaluating technical aspects including:
- Site conditions and constraints
- BMP effectiveness and appropriateness
- Engineering design requirements
- Performance specifications
</thinking>

**STREAM 3 - RISK ANALYSIS:**
<thinking>
Assessing risks across multiple dimensions:
- Environmental impact potential
- Regulatory non-compliance risks
- Implementation failure modes
- Long-term performance risks
</thinking>

**STREAM 4 - SOLUTION DEVELOPMENT:**
<thinking>
Developing comprehensive solutions:
- Multiple BMP alternatives
- Implementation sequencing
- Cost-benefit optimization
- Performance monitoring protocols
</thinking>

**ENHANCED OUTPUT FORMAT:**
Provide professional QSD/CPESC analysis with:

EXTENDED_REASONING: [Show your complete thinking process for complex decisions]

PARALLEL_ANALYSIS:
- Regulatory_Compliance: [Detailed compliance assessment]
- Technical_Assessment: [Engineering evaluation]
- Risk_Analysis: [Comprehensive risk evaluation]
- Solution_Development: [Optimized solution strategies]

PROFESSIONAL_ANALYSIS: [Consultant-level technical analysis]

KEY_INSIGHTS: [Critical professional insights with regulatory basis]

PRIORITIZED_RECOMMENDATIONS: [Action items with High/Medium/Low priority, timelines, and cost-benefit analysis]

Use your maximum 64K output capability to provide the most comprehensive analysis possible.`;

    const response = await this.anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000, // Using maximum output capacity
      system: `You are Claude 4 Sonnet operating at maximum capability as a certified QSD/CPESC environmental consultant.

IMPORTANT CLAUDE 4 FEATURES TO USE:
✅ Extended Thinking Mode - Show detailed reasoning in <thinking> tags
✅ Parallel Processing - Analyze multiple aspects simultaneously  
✅ 64K Output Tokens - Provide comprehensive detailed analysis
✅ Enhanced Tool Integration - Cross-reference entire document library
✅ Advanced Reasoning - Professional consultant-level depth
✅ Hybrid Architecture - Balance speed and depth appropriately

PROFESSIONAL STANDARDS:
- Apply regulatory knowledge from entire reference library
- Provide cost-effective solutions with implementation timelines
- Include specific citations and regulatory compliance guidance
- Show your reasoning process for complex decisions
- Deliver analysis equivalent to $200/hour environmental consultant

Use every advanced Claude 4 capability to maximize the value of this analysis.`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseEnhancedAnalysisResponse(analysisText, document);
  }

  private buildEnhancedReferenceContext(allDocuments: Document[]): string {
    const referenceDocs = allDocuments
      .filter(doc => doc.content && doc.content.length > 100)
      .slice(0, 25); // Increased for Claude 4's larger context window

    if (referenceDocs.length === 0) {
      return "No reference documents available for cross-analysis.";
    }

    return referenceDocs.map((doc, index) => {
      const preview = doc.content.substring(0, 800); // Increased preview for better context
      return `[DOC-${index + 1}] "${doc.originalName}"
Category: ${doc.category}
Key Content: ${preview}${doc.content.length > 800 ? '...' : ''}
---`;
    }).join('\n');
  }

  private parseEnhancedAnalysisResponse(analysisText: string, document: Document): Claude4AnalysisResult {
    // Extract thinking process
    const thinkingMatch = analysisText.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const thinkingProcess = thinkingMatch ? thinkingMatch[1].trim() : undefined;

    // Extract parallel analysis sections
    const parallelAnalysis = {
      regulatoryCompliance: this.extractSection(analysisText, 'Regulatory_Compliance') || 
                           this.extractSection(analysisText, 'REGULATORY COMPLIANCE'),
      technicalAssessment: this.extractSection(analysisText, 'Technical_Assessment') || 
                          this.extractSection(analysisText, 'TECHNICAL ASSESSMENT'),
      riskAnalysis: this.extractSection(analysisText, 'Risk_Analysis') || 
                   this.extractSection(analysisText, 'RISK ANALYSIS'),
      solutionDevelopment: this.extractSection(analysisText, 'Solution_Development') || 
                          this.extractSection(analysisText, 'SOLUTION DEVELOPMENT')
    };

    // Extract main analysis
    const analysis = this.extractSection(analysisText, 'PROFESSIONAL_ANALYSIS') || 
                    this.extractSection(analysisText, 'ANALYSIS') ||
                    analysisText.substring(0, 1000);

    // Extract insights
    const insights = this.extractEnhancedInsights(analysisText);

    // Extract recommendations with enhanced parsing
    const recommendations = this.extractEnhancedRecommendations(analysisText, document);

    return {
      analysis,
      insights,
      recommendations,
      thinkingProcess,
      parallelAnalysis
    };
  }

  private extractSection(text: string, sectionName: string): string {
    const patterns = [
      new RegExp(`${sectionName}[:\s]*([\\s\\S]*?)(?=\\n\\*\\*|\\n[A-Z_]+:|$)`, 'i'),
      new RegExp(`\\*\\*${sectionName}\\*\\*[:\s]*([\\s\\S]*?)(?=\\n\\*\\*|$)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }

  private extractEnhancedInsights(text: string): string[] {
    const insightsSection = this.extractSection(text, 'KEY_INSIGHTS') || 
                           this.extractSection(text, 'INSIGHTS');
    
    if (!insightsSection) return [];

    return insightsSection
      .split(/[-•]\s+/)
      .map(insight => insight.trim())
      .filter(insight => insight.length > 10)
      .slice(0, 8); // Allow more insights for Claude 4
  }

  private extractEnhancedRecommendations(text: string, document: Document): Array<{
    title: string;
    content: string;
    category: 'stormwater';
    subcategory?: string;
    citation: string;
    priority: 'High' | 'Medium' | 'Low';
    timeline: string;
    costBenefit: string;
  }> {
    const recommendationsSection = this.extractSection(text, 'PRIORITIZED_RECOMMENDATIONS') || 
                                  this.extractSection(text, 'RECOMMENDATIONS');
    
    if (!recommendationsSection) return [];

    const recommendations: Array<any> = [];
    const lines = recommendationsSection.split('\n');

    let currentRec: any = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('**') && trimmedLine.includes('**')) {
        if (currentRec) {
          recommendations.push(currentRec);
        }
        
        const titleMatch = trimmedLine.match(/\*\*(.*?)\*\*/);
        if (titleMatch) {
          currentRec = {
            title: titleMatch[1],
            content: trimmedLine.replace(/\*\*.*?\*\*[:\s]*/, ''),
            category: 'stormwater' as const,
            subcategory: this.determineSubcategory(titleMatch[1]),
            citation: this.extractCitation(trimmedLine),
            priority: this.extractPriority(trimmedLine) as 'High' | 'Medium' | 'Low',
            timeline: this.extractTimeline(trimmedLine),
            costBenefit: this.extractCostBenefit(trimmedLine)
          };
        }
      } else if (currentRec && trimmedLine) {
        currentRec.content += ' ' + trimmedLine;
      }
    }

    if (currentRec) {
      recommendations.push(currentRec);
    }

    return recommendations.slice(0, 10); // Allow more recommendations for Claude 4
  }

  private determineSubcategory(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('erosion') || lower.includes('sediment')) return 'Erosion Control';
    if (lower.includes('swppp') || lower.includes('plan')) return 'SWPPP';
    if (lower.includes('qsd') || lower.includes('inspection')) return 'QSD';
    return 'General';
  }

  private extractPriority(text: string): string {
    if (/high|critical|urgent/i.test(text)) return 'High';
    if (/low|minor/i.test(text)) return 'Low';
    return 'Medium';
  }

  private extractTimeline(text: string): string {
    const timelineMatch = text.match(/timeline[:\s]*([^,.\n]*)/i);
    return timelineMatch ? timelineMatch[1].trim() : 'TBD';
  }

  private extractCostBenefit(text: string): string {
    const costMatch = text.match(/cost[:\s]*([^,.\n]*)/i);
    return costMatch ? costMatch[1].trim() : 'Analysis pending';
  }

  private extractCitation(text: string): string {
    const citationMatch = text.match(/citation[:\s]*([^,.\n]*)/i);
    return citationMatch ? citationMatch[1].trim() : `Reference: ${new Date().getFullYear()}`;
  }

  private generateFallbackAnalysis(document: Document, query?: string): Claude4AnalysisResult {
    return {
      analysis: `Fallback analysis for ${document.originalName}. ${query ? `Query: ${query}` : ''}`,
      insights: ['API key required for enhanced analysis'],
      recommendations: [{
        title: 'Configure API Access',
        content: 'Set up Anthropic API key to enable Claude 4 enhanced analysis capabilities.',
        category: 'stormwater' as const,
        priority: 'High' as const,
        timeline: 'Immediate',
        costBenefit: 'Essential for system operation',
        citation: 'System Requirements'
      }]
    };
  }
}