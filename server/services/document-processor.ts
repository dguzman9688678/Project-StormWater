import fs from 'fs/promises';
import path from 'path';
// import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import csv from 'csv-parser';
import { createReadStream } from 'fs';

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
        case '.doc':
          content = await this.processDocxFile(filePath);
          break;
        case '.xlsx':
        case '.xls':
          content = await this.processExcelFile(filePath);
          break;
        case '.csv':
          content = await this.processCsvFile(filePath);
          break;
        case '.json':
          content = await this.processJsonFile(filePath);
          break;
        case '.xml':
          content = await this.processXmlFile(filePath);
          break;
        case '.rtf':
          content = await this.processRtfFile(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileExtension}. Supported formats: .txt, .pdf, .docx, .doc, .xlsx, .xls, .csv, .json, .xml, .rtf`);
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
    try {
      // For now, we'll use basic text extraction
      // PDF processing requires additional setup
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString('utf-8');
      return this.cleanExtractedText(content);
    } catch (error) {
      throw new Error(`Failed to process PDF file: ${error}`);
    }
  }

  private async processDocxFile(filePath: string): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return this.cleanExtractedText(result.value);
    } catch (error) {
      throw new Error(`Failed to process DOCX file: ${error}`);
    }
  }

  private async processExcelFile(filePath: string): Promise<string> {
    try {
      const workbook = XLSX.readFile(filePath);
      let content = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        content += `\n=== Sheet: ${sheetName} ===\n`;
        jsonData.forEach((row: any) => {
          if (Array.isArray(row) && row.length > 0) {
            content += row.join('\t') + '\n';
          }
        });
      });
      
      return this.cleanExtractedText(content);
    } catch (error) {
      throw new Error(`Failed to process Excel file: ${error}`);
    }
  }

  private async processCsvFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
          try {
            let content = '';
            if (results.length > 0) {
              // Add headers
              const headers = Object.keys(results[0]);
              content += headers.join('\t') + '\n';
              
              // Add data rows
              results.forEach(row => {
                const values = headers.map(header => row[header] || '');
                content += values.join('\t') + '\n';
              });
            }
            resolve(this.cleanExtractedText(content));
          } catch (error) {
            reject(new Error(`Failed to process CSV file: ${error}`));
          }
        })
        .on('error', (error) => {
          reject(new Error(`Failed to read CSV file: ${error}`));
        });
    });
  }

  private async processJsonFile(filePath: string): Promise<string> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      return this.cleanExtractedText(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      throw new Error(`Failed to process JSON file: ${error}`);
    }
  }

  private async processXmlFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.cleanExtractedText(content);
    } catch (error) {
      throw new Error(`Failed to process XML file: ${error}`);
    }
  }

  private async processRtfFile(filePath: string): Promise<string> {
    try {
      // Basic RTF processing - strip RTF formatting
      const content = await fs.readFile(filePath, 'utf-8');
      const textContent = content
        .replace(/\\[a-z]+[0-9]*\s?/g, '') // Remove RTF control words
        .replace(/[{}]/g, '') // Remove braces
        .replace(/\\\\/g, '\\') // Unescape backslashes
        .replace(/\\'/g, "'"); // Unescape quotes
      return this.cleanExtractedText(textContent);
    } catch (error) {
      throw new Error(`Failed to process RTF file: ${error}`);
    }
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/[^\w\s\.\,\!\?\-\(\)\[\]\{\}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async validateFile(filePath: string, maxSizeBytes: number = 50 * 1024 * 1024): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size <= maxSizeBytes;
    } catch (error) {
      return false;
    }
  }
}
