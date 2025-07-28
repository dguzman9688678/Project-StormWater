/**
 * Document Processing Service
 * StormWaterAI Enterprise System
 * 
 * Handles processing of multiple file types including PDF, DOCX, Excel, images, etc.
 * Extracts text content for AI analysis and maintains file metadata.
 */

import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { createReadStream } from 'fs';
import { z } from 'zod';

export interface ProcessedDocument {
  filename: string;
  type: string;
  size: number;
  content: string;
  metadata: {
    pages?: number;
    words: number;
    characters: number;
    language?: string;
    author?: string;
    title?: string;
    createdAt?: Date;
    modifiedAt?: Date;
  };
  extractedData?: {
    tables?: any[][];
    images?: string[];
    forms?: Record<string, any>;
  };
}

export interface FileProcessingOptions {
  extractTables?: boolean;
  extractImages?: boolean;
  extractForms?: boolean;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

export class DocumentProcessor {
  private readonly supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/tiff'
  ];

  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB default

  /**
   * Process a document file and extract content
   */
  async processDocument(
    file: Buffer | string,
    filename: string,
    mimeType: string,
    options: FileProcessingOptions = {}
  ): Promise<ProcessedDocument> {
    // Validate file type
    if (!this.supportedTypes.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Validate file size
    const fileSize = Buffer.isBuffer(file) ? file.length : Buffer.byteLength(file);
    const maxSize = options.maxSize || this.maxFileSize;
    if (fileSize > maxSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSize} bytes`);
    }

    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.processPDF(file as Buffer, filename, options);
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.processDocx(file as Buffer, filename, options);
        
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          return await this.processExcel(file as Buffer, filename, options);
        
        case 'text/plain':
        case 'text/csv':
          return await this.processText(file, filename, mimeType, options);
        
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/bmp':
        case 'image/tiff':
          return await this.processImage(file as Buffer, filename, mimeType, options);
        
        default:
          throw new Error(`Processing not implemented for type: ${mimeType}`);
      }
    } catch (error) {
      console.error(`Error processing ${filename}:`, error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Process PDF files
   */
  private async processPDF(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptions
  ): Promise<ProcessedDocument> {
    try {
      const data = await pdf(buffer);
      
      const content = data.text;
      const words = this.countWords(content);
      
      return {
        filename,
        type: 'pdf',
        size: buffer.length,
        content,
        metadata: {
          pages: data.numpages,
          words,
          characters: content.length,
          title: data.info?.Title,
          author: data.info?.Author,
          createdAt: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
          modifiedAt: data.info?.ModDate ? new Date(data.info.ModDate) : undefined
        },
        extractedData: {
          // Additional PDF-specific data could be extracted here
        }
      };
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process DOCX files
   */
  private async processDocx(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptions
  ): Promise<ProcessedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const content = result.value;
      const words = this.countWords(content);
      
      return {
        filename,
        type: 'docx',
        size: buffer.length,
        content,
        metadata: {
          words,
          characters: content.length
        },
        extractedData: {
          // Could extract images, tables, etc. from DOCX
        }
      };
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }

  /**
   * Process Excel files
   */
  private async processExcel(
    buffer: Buffer,
    filename: string,
    options: FileProcessingOptions
  ): Promise<ProcessedDocument> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      let content = '';
      const tables: any[][] = [];
      
      // Process each worksheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert to text content
        const sheetText = jsonData
          .map(row => (row as any[]).join('\t'))
          .join('\n');
        
        content += `Sheet: ${sheetName}\n${sheetText}\n\n`;
        
        if (options.extractTables) {
          tables.push(jsonData);
        }
      });
      
      const words = this.countWords(content);
      
      return {
        filename,
        type: 'excel',
        size: buffer.length,
        content,
        metadata: {
          words,
          characters: content.length
        },
        extractedData: {
          tables: options.extractTables ? tables : undefined
        }
      };
    } catch (error) {
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  /**
   * Process text files
   */
  private async processText(
    file: Buffer | string,
    filename: string,
    mimeType: string,
    options: FileProcessingOptions
  ): Promise<ProcessedDocument> {
    try {
      const content = Buffer.isBuffer(file) ? file.toString('utf-8') : file;
      const words = this.countWords(content);
      
      return {
        filename,
        type: mimeType === 'text/csv' ? 'csv' : 'text',
        size: Buffer.byteLength(content),
        content,
        metadata: {
          words,
          characters: content.length
        }
      };
    } catch (error) {
      throw new Error(`Text processing failed: ${error.message}`);
    }
  }

  /**
   * Process image files (placeholder for OCR functionality)
   */
  private async processImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options: FileProcessingOptions
  ): Promise<ProcessedDocument> {
    try {
      // For now, return basic metadata
      // In a full implementation, you would integrate OCR (Tesseract.js, AWS Textract, etc.)
      
      const content = '[Image file - OCR processing would extract text here]';
      
      return {
        filename,
        type: 'image',
        size: buffer.length,
        content,
        metadata: {
          words: 0,
          characters: content.length
        },
        extractedData: {
          images: [filename]
        }
      };
    } catch (error) {
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Extract metadata from various file types
   */
  async extractMetadata(buffer: Buffer, mimeType: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
      size: buffer.length,
      type: mimeType,
      processedAt: new Date().toISOString()
    };

    try {
      switch (mimeType) {
        case 'application/pdf':
          const pdfData = await pdf(buffer);
          metadata.pages = pdfData.numpages;
          metadata.title = pdfData.info?.Title;
          metadata.author = pdfData.info?.Author;
          metadata.createdAt = pdfData.info?.CreationDate;
          break;
        
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          metadata.sheets = workbook.SheetNames.length;
          metadata.sheetNames = workbook.SheetNames;
          break;
      }
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
    }

    return metadata;
  }

  /**
   * Validate file type and size
   */
  validateFile(buffer: Buffer, mimeType: string, options: FileProcessingOptions = {}): void {
    const allowedTypes = options.allowedTypes || this.supportedTypes;
    
    if (!allowedTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    const maxSize = options.maxSize || this.maxFileSize;
    if (buffer.length > maxSize) {
      throw new Error(`File size ${buffer.length} exceeds maximum ${maxSize} bytes`);
    }
  }

  /**
   * Get supported file types
   */
  getSupportedTypes(): string[] {
    return [...this.supportedTypes];
  }

  /**
   * Check if file type is supported
   */
  isSupported(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  /**
   * Count words in text content
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Detect language of text content (basic implementation)
   */
  private detectLanguage(text: string): string {
    // Basic language detection - in a full implementation, 
    // you might use a library like franc or cloud services
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase().split(/\s+/);
    const englishCount = words.filter(word => englishWords.includes(word)).length;
    
    return englishCount > words.length * 0.1 ? 'en' : 'unknown';
  }
}

// Validation schemas
export const FileProcessingOptionsSchema = z.object({
  extractTables: z.boolean().optional(),
  extractImages: z.boolean().optional(),
  extractForms: z.boolean().optional(),
  maxSize: z.number().optional(),
  allowedTypes: z.array(z.string()).optional()
});

export const ProcessedDocumentSchema = z.object({
  filename: z.string(),
  type: z.string(),
  size: z.number(),
  content: z.string(),
  metadata: z.object({
    pages: z.number().optional(),
    words: z.number(),
    characters: z.number(),
    language: z.string().optional(),
    author: z.string().optional(),
    title: z.string().optional(),
    createdAt: z.date().optional(),
    modifiedAt: z.date().optional()
  }),
  extractedData: z.object({
    tables: z.array(z.array(z.any())).optional(),
    images: z.array(z.string()).optional(),
    forms: z.record(z.any()).optional()
  }).optional()
});

export type FileProcessingOptionsType = z.infer<typeof FileProcessingOptionsSchema>;
export type ProcessedDocumentType = z.infer<typeof ProcessedDocumentSchema>;