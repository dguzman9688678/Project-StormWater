import fs from 'fs/promises';
import path from 'path';

export interface ProcessedDocument {
  content: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    fileType: string;
  };
}

export class DocumentProcessor {
  async processDocument(filePath: string, originalName: string): Promise<ProcessedDocument> {
    const fileExtension = path.extname(originalName).toLowerCase();
    let content = '';

    try {
      switch (fileExtension) {
        case '.txt':
          content = await this.processTxtFile(filePath);
          break;
        case '.pdf':
          content = await this.processPdfFile(filePath);
          break;
        case '.docx':
          content = await this.processDocxFile(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

      return {
        content,
        metadata: {
          wordCount,
          fileType: fileExtension,
        },
      };
    } finally {
      // Clean up temporary file
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('Failed to cleanup temporary file:', filePath);
      }
    }
  }

  private async processTxtFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  private async processPdfFile(filePath: string): Promise<string> {
    // For now, we'll use a simple text extraction approach
    // In a production system, you'd use a library like pdf-parse or pdf2pic
    try {
      const buffer = await fs.readFile(filePath);
      // Simple text extraction - in reality you'd use pdf-parse
      const content = buffer.toString('utf-8');
      return this.cleanExtractedText(content);
    } catch (error) {
      throw new Error('Failed to process PDF file. Please ensure the file is not corrupted.');
    }
  }

  private async processDocxFile(filePath: string): Promise<string> {
    // For now, we'll use a simple text extraction approach
    // In a production system, you'd use a library like mammoth or docx-parser
    try {
      const buffer = await fs.readFile(filePath);
      // Simple text extraction - in reality you'd use mammoth
      const content = buffer.toString('utf-8');
      return this.cleanExtractedText(content);
    } catch (error) {
      throw new Error('Failed to process DOCX file. Please ensure the file is not corrupted.');
    }
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/[^\w\s\.\,\!\?\-\(\)\[\]\{\}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async validateFile(filePath: string, maxSizeBytes: number = 10 * 1024 * 1024): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size <= maxSizeBytes;
    } catch (error) {
      return false;
    }
  }
}
