import { AIAnalyzer } from './ai-analyzer';
import { storage } from '../storage';
import { Document, Recommendation, AiAnalysis } from '../../shared/schema';

export interface DocumentGenerationRequest {
  title: string;
  query?: string;
  sourceDocumentIds?: number[];
  includeRecommendations?: boolean;
  includeAnalyses?: boolean;
  format: 'txt' | 'md' | 'docx' | 'pdf';
  template?: 'report' | 'summary' | 'analysis' | 'recommendations';
}

export interface GeneratedDocument {
  title: string;
  content: string;
  metadata: {
    generatedAt: Date;
    wordCount: number;
    sections: string[];
    sourceDocuments: string[];
  };
}

export class DocumentGenerator {
  private aiAnalyzer: AIAnalyzer;

  constructor() {
    this.aiAnalyzer = new AIAnalyzer();
  }

  async generateSolutionDocuments(params: {
    problem: string;
    sourceDocuments: any[];
    analysisResult: any;
  }): Promise<GeneratedDocument[]> {
    const { problem, sourceDocuments, analysisResult } = params;
    
    // Determine what types of documents to generate based on the problem
    const documentTypes = this.determineSolutionDocumentTypes(problem);
    const generatedDocs: GeneratedDocument[] = [];

    for (const docType of documentTypes) {
      try {
        const doc = await this.generateSpecificSolutionDocument(
          docType,
          problem,
          sourceDocuments,
          analysisResult
        );
        generatedDocs.push(doc);
      } catch (error) {
        console.error(`Failed to generate ${docType} document:`, error);
      }
    }

    return generatedDocs;
  }

  private determineSolutionDocumentTypes(problem: string): string[] {
    const lowerProblem = problem.toLowerCase();
    const types: string[] = [];

    // Infrastructure problems
    if (lowerProblem.includes('culvert') || lowerProblem.includes('pipe') || lowerProblem.includes('drain')) {
      types.push('inspection_form', 'maintenance_plan', 'safety_checklist');
    }

    // Erosion problems
    if (lowerProblem.includes('erosion') || lowerProblem.includes('sediment') || lowerProblem.includes('slope')) {
      types.push('erosion_control_plan', 'monitoring_checklist', 'installation_guide');
    }

    // Water quality issues
    if (lowerProblem.includes('pollution') || lowerProblem.includes('contamination') || lowerProblem.includes('quality')) {
      types.push('water_quality_monitoring', 'sampling_protocol', 'treatment_plan');
    }

    // Construction/development
    if (lowerProblem.includes('construction') || lowerProblem.includes('development') || lowerProblem.includes('site')) {
      types.push('swppp_checklist', 'inspection_schedule', 'contractor_requirements');
    }

    // Always include JSA for safety-related work
    if (types.length > 0) {
      types.push('job_safety_analysis');
    }

    // Default documents if no specific match
    if (types.length === 0) {
      types.push('general_inspection_form', 'maintenance_recommendations', 'job_safety_analysis');
    }

    return types;
  }

  private async generateSpecificSolutionDocument(
    docType: string,
    problem: string,
    sourceDocuments: any[],
    analysisResult: any
  ): Promise<GeneratedDocument> {
    const templates = this.getDocumentTemplates();
    const template = templates[docType] || templates['general_inspection_form'];
    
    const sourceContent = sourceDocuments.map(doc => 
      `Source: ${doc.originalName}\nRelevant Content: ${doc.content.substring(0, 1000)}...`
    ).join('\n\n');

    const prompt = `
Based on the problem: "${problem}"

Using these source documents:
${sourceContent}

And this analysis:
${analysisResult.analysis}

Generate a comprehensive ${template.title} following this structure:
${template.structure}

Requirements:
- Include specific citations from source documents
- Make it practical and actionable
- Follow industry standards for stormwater management
- Include safety considerations
- Provide clear step-by-step procedures where applicable

Format as a professional document with proper sections and numbering.
`;

    try {
      const generatedContent = await this.aiAnalyzer.generateDocument(prompt);
      
      return {
        title: `${template.title} - ${problem}`,
        content: generatedContent,
        metadata: {
          generatedAt: new Date(),
          wordCount: generatedContent.split(' ').length,
          sections: template.sections,
          sourceDocuments: sourceDocuments.map(doc => doc.originalName)
        }
      };
    } catch (error) {
      // Fallback to template-based generation
      return this.generateFallbackDocument(docType, problem, sourceDocuments, analysisResult);
    }
  }

  private getDocumentTemplates(): Record<string, any> {
    return {
      inspection_form: {
        title: "Infrastructure Inspection Form",
        sections: ["Header", "Pre-Inspection", "Visual Assessment", "Measurements", "Recommendations", "Photos/Sketches"],
        structure: `
1. PROJECT INFORMATION
2. INSPECTION DETAILS
3. STRUCTURAL ASSESSMENT
4. FUNCTIONAL ASSESSMENT
5. DEFICIENCIES IDENTIFIED
6. IMMEDIATE ACTIONS REQUIRED
7. RECOMMENDED REPAIRS/MAINTENANCE
8. FOLLOW-UP SCHEDULE
9. INSPECTOR CERTIFICATION
`
      },
      job_safety_analysis: {
        title: "Job Safety Analysis (JSA)",
        sections: ["Job Steps", "Hazards", "Controls", "PPE Requirements"],
        structure: `
1. JOB DESCRIPTION
2. PERSONNEL REQUIREMENTS
3. STEP-BY-STEP HAZARD ANALYSIS
4. PERSONAL PROTECTIVE EQUIPMENT
5. EMERGENCY PROCEDURES
6. ENVIRONMENTAL CONSIDERATIONS
7. PERMITS REQUIRED
8. SIGNATURES AND APPROVALS
`
      },
      maintenance_plan: {
        title: "Maintenance Plan",
        sections: ["Schedule", "Procedures", "Materials", "Safety"],
        structure: `
1. MAINTENANCE OVERVIEW
2. ROUTINE MAINTENANCE SCHEDULE
3. PREVENTIVE MAINTENANCE PROCEDURES
4. EMERGENCY MAINTENANCE PROTOCOLS
5. MATERIALS AND EQUIPMENT
6. SAFETY REQUIREMENTS
7. DOCUMENTATION REQUIREMENTS
8. PERFORMANCE MONITORING
`
      },
      erosion_control_plan: {
        title: "Erosion Control Plan",
        sections: ["Site Assessment", "Control Measures", "Installation", "Monitoring"],
        structure: `
1. SITE CONDITIONS
2. EROSION RISK ASSESSMENT
3. CONTROL MEASURE SELECTION
4. INSTALLATION SPECIFICATIONS
5. MAINTENANCE REQUIREMENTS
6. MONITORING PROTOCOL
7. ADAPTIVE MANAGEMENT
8. COMPLIANCE VERIFICATION
`
      },
      swppp_checklist: {
        title: "SWPPP Inspection Checklist",
        sections: ["Site Conditions", "BMPs", "Discharge Points", "Documentation"],
        structure: `
1. GENERAL SITE CONDITIONS
2. PERIMETER CONTROLS
3. SEDIMENT CONTROLS
4. MATERIAL STORAGE AREAS
5. VEHICLE TRACKING
6. WASTE MANAGEMENT
7. DISCHARGE POINTS
8. MAINTENANCE NEEDS
9. NON-COMPLIANCE ISSUES
`
      },
      water_quality_monitoring: {
        title: "Water Quality Monitoring Plan",
        sections: ["Parameters", "Locations", "Frequency", "Procedures"],
        structure: `
1. MONITORING OBJECTIVES
2. SAMPLING LOCATIONS
3. PARAMETERS TO MONITOR
4. SAMPLING FREQUENCY
5. SAMPLING PROCEDURES
6. LABORATORY ANALYSIS
7. DATA MANAGEMENT
8. REPORTING REQUIREMENTS
`
      }
    };
  }

  private generateFallbackDocument(
    docType: string,
    problem: string,
    sourceDocuments: any[],
    analysisResult: any
  ): GeneratedDocument {
    const templates = this.getDocumentTemplates();
    const template = templates[docType] || templates['inspection_form'];
    
    const content = `
# ${template.title}

## Problem Description
${problem}

## Source Documents Referenced
${sourceDocuments.map(doc => `- ${doc.originalName} (${doc.category})`).join('\n')}

## Analysis Summary
${analysisResult.analysis.substring(0, 500)}...

## Key Insights
${analysisResult.insights.map((insight: string) => `- ${insight}`).join('\n')}

## Recommendations
${analysisResult.recommendations.map((rec: any) => `
### ${rec.title}
${rec.content}
*Source: ${rec.citation}*
`).join('\n')}

---
*Generated automatically based on comprehensive document analysis*
*Date: ${new Date().toLocaleDateString()}*
`;

    return {
      title: `${template.title} - ${problem}`,
      content,
      metadata: {
        generatedAt: new Date(),
        wordCount: content.split(' ').length,
        sections: template.sections,
        sourceDocuments: sourceDocuments.map(doc => doc.originalName)
      }
    };
  }

  async generateDocument(request: DocumentGenerationRequest): Promise<GeneratedDocument> {
    const { title, query, sourceDocumentIds = [], template = 'report' } = request;

    // Gather source documents
    const sourceDocuments: Document[] = [];
    for (const id of sourceDocumentIds) {
      const doc = await storage.getDocument(id);
      if (doc) sourceDocuments.push(doc);
    }

    // Gather recommendations and analyses if requested
    let recommendations: Recommendation[] = [];
    let analyses: AiAnalysis[] = [];

    if (request.includeRecommendations) {
      recommendations = await storage.getAllRecommendations();
    }

    if (request.includeAnalyses) {
      analyses = await storage.getAllAiAnalyses();
    }

    // Generate content based on template
    let content = '';
    const sections: string[] = [];

    switch (template) {
      case 'report':
        content = await this.generateComprehensiveReport(title, query, sourceDocuments, recommendations, analyses);
        sections.push('Executive Summary', 'Document Analysis', 'Recommendations', 'Conclusion');
        break;
      case 'summary':
        content = await this.generateSummary(title, query, sourceDocuments);
        sections.push('Overview', 'Key Points', 'Summary');
        break;
      case 'analysis':
        content = await this.generateAnalysisReport(title, query, sourceDocuments, analyses);
        sections.push('Analysis Overview', 'Findings', 'Technical Assessment');
        break;
      case 'recommendations':
        content = await this.generateRecommendationReport(title, query, recommendations);
        sections.push('Recommendations Overview', 'QSD Guidelines', 'SWPPP Practices', 'Erosion Control');
        break;
      default:
        content = await this.generateComprehensiveReport(title, query, sourceDocuments, recommendations, analyses);
        sections.push('Executive Summary', 'Analysis', 'Recommendations');
    }

    return {
      title,
      content,
      metadata: {
        generatedAt: new Date(),
        wordCount: content.split(/\s+/).length,
        sections,
        sourceDocuments: sourceDocuments.map(doc => doc.originalName)
      }
    };
  }

  private async generateComprehensiveReport(
    title: string,
    query?: string,
    sourceDocuments: Document[] = [],
    recommendations: Recommendation[] = [],
    analyses: AiAnalysis[] = []
  ): Promise<string> {
    
    // Build comprehensive reference context from ALL documents
    const documentContext = sourceDocuments.map((doc, index) => {
      return `**[DOC-${index + 1}] ${doc.originalName}** (${doc.category})
Content Summary: ${doc.content.substring(0, 2000)}${doc.content.length > 2000 ? '...' : ''}
Key Information: ${doc.description || 'Professional stormwater documentation'}

---`;
    }).join('\n\n');

    const prompt = `<thinking>
The user is requesting a comprehensive professional document that must reference ALL available documents from the stormwater library. This is critical - I need to analyze and cite every single document provided to ensure complete coverage of available knowledge and regulatory requirements.

The documents provided contain valuable engineering information, regulatory guidance, and practical implementation details that must be incorporated into the final professional document with proper citations.
</thinking>

As a certified QSD (Qualified SWPPP Developer) and CPESC (Certified Professional in Erosion and Sediment Control), create a comprehensive professional document: ${title}

**PROJECT REQUIREMENTS:** ${query || 'Comprehensive stormwater management documentation'}

**COMPREHENSIVE DOCUMENT LIBRARY ANALYSIS (${sourceDocuments.length} DOCUMENTS):**
${documentContext}

**CRITICAL MANDATE:** You MUST analyze and reference ALL ${sourceDocuments.length} documents above with proper [DOC-X] citations. This is essential for complete professional documentation.

**PROFESSIONAL DOCUMENT REQUIREMENTS:**

1. **EXECUTIVE SUMMARY**
   - Comprehensive project overview incorporating insights from ALL library documents
   - Key findings with specific citations from [DOC-1] through [DOC-${sourceDocuments.length}]
   - Regulatory compliance requirements referenced from applicable documents

2. **COMPREHENSIVE DOCUMENT ANALYSIS**
   - Detailed analysis of EVERY document in the library with [DOC-X] citations
   - Cross-reference overlapping requirements and recommendations
   - Identify gaps and complementary information across all documents

3. **PROFESSIONAL ENGINEERING RECOMMENDATIONS**
   - Synthesize recommendations from ALL documents
   - Prioritize actions based on regulatory requirements and best practices
   - Include specific implementation guidance with proper citations

4. **TECHNICAL SPECIFICATIONS & COMPLIANCE**
   - Reference ALL applicable standards and regulations from the documents
   - Include detailed technical requirements with document citations
   - Ensure complete regulatory compliance coverage

5. **IMPLEMENTATION PLAN**
   - Step-by-step procedures incorporating guidance from all documents
   - Timeline and sequencing based on professional standards
   - Quality control measures and inspection requirements

**CITATION REQUIREMENTS:**
- EVERY recommendation must include [DOC-X] citations
- Reference multiple documents where applicable
- Ensure NO document is left unreferenced
- Use format: "According to [DOC-1] and [DOC-3], the recommended approach..."

Generate a complete professional document suitable for actual project use with comprehensive library integration.`;

    try {
      // Use AI analyzer to generate comprehensive document with all library references
      const generatedContent = await this.aiAnalyzer.generateDocument(prompt);
      
      return generatedContent;
    } catch (error) {
      console.error('Error generating AI report:', error);
      return this.generateFallbackReport(title, query, sourceDocuments, recommendations, analyses);
    }
  }

  private async generateSummary(
    title: string,
    query?: string,
    sourceDocuments: Document[] = []
  ): Promise<string> {
    let content = `# ${title}\n\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    if (query) {
      content += `## Query\n${query}\n\n`;
    }

    content += `## Document Summary\n\n`;
    
    if (sourceDocuments.length > 0) {
      for (const doc of sourceDocuments) {
        content += `### ${doc.originalName}\n`;
        content += `- **Category:** ${doc.category.toUpperCase()}\n`;
        content += `- **Size:** ${this.formatFileSize(doc.fileSize)}\n`;
        content += `- **Uploaded:** ${new Date(doc.uploadedAt).toLocaleDateString()}\n\n`;
        
        const summary = doc.content.substring(0, 300);
        content += `**Summary:** ${summary}${doc.content.length > 300 ? '...' : ''}\n\n`;
      }
    } else {
      content += `No documents provided for summary.\n\n`;
    }

    content += `## Key Points\n`;
    content += `- Document analysis completed\n`;
    content += `- Stormwater engineering practices evaluated\n`;
    content += `- Recommendations available for implementation\n\n`;

    return content;
  }

  private async generateAnalysisReport(
    title: string,
    query?: string,
    sourceDocuments: Document[] = [],
    analyses: AiAnalysis[] = []
  ): Promise<string> {
    let content = `# Technical Analysis Report: ${title}\n\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    if (query) {
      content += `## Analysis Focus\n${query}\n\n`;
    }

    content += `## Analysis Overview\n\n`;
    content += `This technical analysis examines ${sourceDocuments.length} document(s) with ${analyses.length} AI-generated analysis result(s).\n\n`;

    if (analyses.length > 0) {
      content += `## AI Analysis Results\n\n`;
      for (const analysis of analyses.slice(0, 10)) {
        content += `### Analysis: ${analysis.query}\n`;
        content += `**Generated:** ${new Date(analysis.createdAt).toLocaleDateString()}\n\n`;
        content += `${analysis.analysis}\n\n`;
        
        if (analysis.insights && analysis.insights.length > 0) {
          content += `**Key Insights:**\n`;
          for (const insight of analysis.insights) {
            content += `- ${insight}\n`;
          }
          content += `\n`;
        }
      }
    }

    if (sourceDocuments.length > 0) {
      content += `## Source Documents\n\n`;
      for (const doc of sourceDocuments) {
        content += `### ${doc.originalName}\n`;
        content += `- **Category:** ${doc.category.toUpperCase()}\n`;
        content += `- **Content Preview:** ${doc.content.substring(0, 200)}...\n\n`;
      }
    }

    content += `## Technical Assessment\n\n`;
    content += `Based on the analysis of provided documents and AI-generated insights, the following technical assessment is provided:\n\n`;
    content += `- Document quality and completeness evaluation\n`;
    content += `- Stormwater engineering best practices compliance\n`;
    content += `- Regulatory requirement adherence\n`;
    content += `- Implementation feasibility assessment\n\n`;

    return content;
  }

  private async generateRecommendationReport(
    title: string,
    query?: string,
    recommendations: Recommendation[] = []
  ): Promise<string> {
    let content = `# Engineering Recommendations: ${title}\n\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    if (query) {
      content += `## Request Focus\n${query}\n\n`;
    }

    content += `## Recommendations Overview\n\n`;
    content += `This report contains ${recommendations.length} engineering recommendations across multiple categories.\n\n`;

    const categories = ['qsd', 'swppp', 'erosion'];
    
    for (const category of categories) {
      const categoryRecs = recommendations.filter(rec => rec.category === category);
      if (categoryRecs.length === 0) continue;

      const categoryTitle = category === 'qsd' ? 'QSD Guidelines' : 
                           category === 'swppp' ? 'SWPPP Practices' : 
                           'Erosion Control Measures';

      content += `## ${categoryTitle}\n\n`;
      
      for (const rec of categoryRecs.slice(0, 10)) {
        content += `### ${rec.title}\n`;
        if (rec.subcategory) {
          content += `**Subcategory:** ${rec.subcategory}\n\n`;
        }
        content += `${rec.content}\n\n`;
        if (rec.citation) {
          content += `**Citation:** ${rec.citation}\n\n`;
        }
      }
    }

    content += `## Implementation Guidelines\n\n`;
    content += `- Review all recommendations for site-specific applicability\n`;
    content += `- Consult with qualified stormwater professionals\n`;
    content += `- Ensure compliance with local regulations\n`;
    content += `- Implement monitoring and maintenance programs\n\n`;

    return content;
  }

  private formatReportContent(
    title: string,
    aiContent: string,
    sourceDocuments: Document[],
    recommendations: Recommendation[]
  ): string {
    let content = `# ${title}\n\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n`;
    content += `**Source Documents:** ${sourceDocuments.length}\n`;
    content += `**Recommendations:** ${recommendations.length}\n\n`;
    
    content += `---\n\n`;
    content += aiContent;
    content += `\n\n---\n\n`;
    
    content += `## Source Documents Referenced\n\n`;
    for (const doc of sourceDocuments) {
      content += `- **${doc.originalName}** (${doc.category})\n`;
    }
    
    content += `\n## Additional Resources\n\n`;
    content += `For more detailed recommendations and analysis, please refer to the complete Stormwater-AI system.\n\n`;
    content += `**Contact:** Daniel Guzman (guzman.danield@outlook.com)\n`;
    
    return content;
  }

  private generateFallbackReport(
    title: string,
    query?: string,
    sourceDocuments: Document[] = [],
    recommendations: Recommendation[] = [],
    analyses: AiAnalysis[] = []
  ): string {
    let content = `# ${title}\n\n`;
    content += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    content += `## Executive Summary\n\n`;
    content += `This report provides a comprehensive analysis of stormwater engineering documentation and recommendations.\n\n`;

    if (query) {
      content += `**Focus Area:** ${query}\n\n`;
    }

    content += `## Document Analysis\n\n`;
    if (sourceDocuments.length > 0) {
      content += `**Analyzed Documents (${sourceDocuments.length}):**\n`;
      for (const doc of sourceDocuments) {
        content += `- ${doc.originalName} (${doc.category})\n`;
      }
      content += `\n`;
    }

    content += `## Key Recommendations\n\n`;
    if (recommendations.length > 0) {
      const topRecs = recommendations.slice(0, 5);
      for (const rec of topRecs) {
        content += `### ${rec.title}\n`;
        content += `**Category:** ${rec.category.toUpperCase()}\n`;
        content += `${rec.content.substring(0, 200)}...\n\n`;
      }
    }

    content += `## Implementation Notes\n\n`;
    content += `- Ensure compliance with local stormwater regulations\n`;
    content += `- Consult with qualified environmental engineers\n`;
    content += `- Regular monitoring and maintenance required\n`;
    content += `- Document all implementation activities\n\n`;

    content += `## Conclusion\n\n`;
    content += `This analysis provides foundational guidance for stormwater management practices. `;
    content += `For detailed technical specifications and site-specific recommendations, `;
    content += `please consult with qualified stormwater professionals.\n\n`;

    content += `**Generated by Stormwater-AI Engineering System**\n`;
    content += `**Contact:** Daniel Guzman (guzman.danield@outlook.com)\n`;

    return content;
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}