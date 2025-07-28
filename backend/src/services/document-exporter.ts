import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import * as XLSX from 'xlsx';
import { Document, Recommendation, AiAnalysis } from '../../shared/schema';

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'txt' | 'csv' | 'xlsx' | 'json' | 'zip';
  includeRecommendations?: boolean;
  includeAnalyses?: boolean;
}

export class DocumentExporter {
  async exportDocument(
    document: Document,
    format: string,
    recommendations?: Recommendation[],
    analyses?: AiAnalysis[]
  ): Promise<Buffer> {
    switch (format.toLowerCase()) {
      case 'txt':
        return this.exportToTxt(document, recommendations, analyses);
      case 'csv':
        return this.exportToCsv(document, recommendations, analyses);
      case 'xlsx':
        return this.exportToExcel(document, recommendations, analyses);
      case 'json':
        return this.exportToJson(document, recommendations, analyses);
      case 'zip':
        return this.exportToZip(document, recommendations, analyses);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportToTxt(
    document: Document,
    recommendations?: Recommendation[],
    analyses?: AiAnalysis[]
  ): Promise<Buffer> {
    let content = '';
    
    // Document content
    content += `# ${document.originalName}\n`;
    content += `Category: ${document.category.toUpperCase()}\n`;
    content += `Uploaded: ${new Date(document.uploadedAt).toLocaleDateString()}\n`;
    content += `File Size: ${this.formatFileSize(document.fileSize)}\n\n`;
    content += `## Document Content\n`;
    content += `${document.content}\n\n`;

    // Recommendations
    if (recommendations && recommendations.length > 0) {
      content += `## Related Recommendations (${recommendations.length})\n\n`;
      recommendations.forEach((rec, index) => {
        content += `${index + 1}. **${rec.title}**\n`;
        content += `   Category: ${rec.category.toUpperCase()}\n`;
        if (rec.subcategory) content += `   Subcategory: ${rec.subcategory}\n`;
        content += `   ${rec.content}\n`;
        if (rec.citation) content += `   Citation: ${rec.citation}\n`;
        content += `\n`;
      });
    }

    // Analyses
    if (analyses && analyses.length > 0) {
      content += `## AI Analyses (${analyses.length})\n\n`;
      analyses.forEach((analysis, index) => {
        content += `${index + 1}. **Query:** ${analysis.query}\n`;
        content += `   **Date:** ${new Date(analysis.createdAt).toLocaleDateString()}\n`;
        content += `   **Analysis:**\n   ${analysis.analysis}\n`;
        if (analysis.insights && analysis.insights.length > 0) {
          content += `   **Key Insights:**\n`;
          analysis.insights.forEach(insight => {
            content += `   • ${insight}\n`;
          });
        }
        content += `\n`;
      });
    }

    return Buffer.from(content, 'utf-8');
  }

  private async exportToCsv(
    document: Document,
    recommendations?: Recommendation[],
    analyses?: AiAnalysis[]
  ): Promise<Buffer> {
    let csvContent = '';
    
    // Document info
    csvContent += 'Type,Title,Category,Date,Content,Additional Info\n';
    csvContent += `Document,"${this.escapeCsv(document.originalName)}","${document.category}","${new Date(document.uploadedAt).toISOString()}","${this.escapeCsv(document.content)}","Size: ${this.formatFileSize(document.fileSize)}"\n`;

    // Recommendations
    if (recommendations && recommendations.length > 0) {
      recommendations.forEach(rec => {
        csvContent += `Recommendation,"${this.escapeCsv(rec.title)}","${rec.category}","${new Date(rec.createdAt).toISOString()}","${this.escapeCsv(rec.content)}","${rec.citation || ''}"\n`;
      });
    }

    // Analyses
    if (analyses && analyses.length > 0) {
      analyses.forEach(analysis => {
        csvContent += `Analysis,"${this.escapeCsv(analysis.query)}","AI Analysis","${new Date(analysis.createdAt).toISOString()}","${this.escapeCsv(analysis.analysis)}","${analysis.insights ? analysis.insights.join('; ') : ''}"\n`;
      });
    }

    return Buffer.from(csvContent, 'utf-8');
  }

  private async exportToExcel(
    document: Document,
    recommendations?: Recommendation[],
    analyses?: AiAnalysis[]
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Document sheet
    const docData = [
      ['Property', 'Value'],
      ['Document Name', document.originalName],
      ['Category', document.category.toUpperCase()],
      ['Upload Date', new Date(document.uploadedAt).toLocaleDateString()],
      ['File Size', this.formatFileSize(document.fileSize)],
      ['Description', document.description || ''],
      [''],
      ['Content'],
      [document.content]
    ];
    const docSheet = XLSX.utils.aoa_to_sheet(docData);
    XLSX.utils.book_append_sheet(workbook, docSheet, 'Document');

    // Recommendations sheet
    if (recommendations && recommendations.length > 0) {
      const recData = [
        ['Title', 'Category', 'Subcategory', 'Content', 'Citation', 'Created Date', 'Bookmarked']
      ];
      recommendations.forEach(rec => {
        recData.push([
          rec.title,
          rec.category,
          rec.subcategory || '',
          rec.content,
          rec.citation || '',
          new Date(rec.createdAt).toLocaleDateString(),
          rec.isBookmarked ? 'Yes' : 'No'
        ]);
      });
      const recSheet = XLSX.utils.aoa_to_sheet(recData);
      XLSX.utils.book_append_sheet(workbook, recSheet, 'Recommendations');
    }

    // Analyses sheet
    if (analyses && analyses.length > 0) {
      const analysisData = [
        ['Query', 'Analysis', 'Key Insights', 'Created Date']
      ];
      analyses.forEach(analysis => {
        analysisData.push([
          analysis.query,
          analysis.analysis,
          analysis.insights ? analysis.insights.join('; ') : '',
          new Date(analysis.createdAt).toLocaleDateString()
        ]);
      });
      const analysisSheet = XLSX.utils.aoa_to_sheet(analysisData);
      XLSX.utils.book_append_sheet(workbook, analysisSheet, 'AI Analyses');
    }

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  private async exportToJson(
    document: Document,
    recommendations?: Recommendation[],
    analyses?: AiAnalysis[]
  ): Promise<Buffer> {
    const exportData = {
      document: {
        ...document,
        exportDate: new Date().toISOString()
      },
      recommendations: recommendations || [],
      analyses: analyses || []
    };

    return Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
  }

  private async exportToZip(
    document: Document,
    recommendations?: Recommendation[],
    analyses?: AiAnalysis[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', (err) => reject(err));

      // Add different format files to zip
      const formats = ['txt', 'csv', 'xlsx', 'json'];
      
      Promise.all(formats.map(async (format) => {
        try {
          const buffer = await this.exportDocument(document, format, recommendations, analyses);
          const filename = `${this.sanitizeFilename(document.originalName)}.${format}`;
          archive.append(buffer, { name: filename });
        } catch (error) {
          console.warn(`Failed to add ${format} format to zip:`, error);
        }
      })).then(() => {
        archive.finalize();
      }).catch(reject);
    });
  }

  private escapeCsv(text: string): string {
    return text.replace(/"/g, '""');
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-z0-9.-]/gi, '_');
  }
}