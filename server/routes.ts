import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { DocumentProcessor } from "./services/document-processor";
import { AIAnalyzer } from "./services/ai-analyzer";
import { RecommendationGenerator } from "./services/recommendation-generator";
import { DocumentExporter } from "./services/document-exporter";
import { insertDocumentSchema, insertAiAnalysisSchema } from "@shared/schema";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for large PDFs
});

const documentProcessor = new DocumentProcessor();
const aiAnalyzer = new AIAnalyzer();
const recommendationGenerator = new RecommendationGenerator();
const documentExporter = new DocumentExporter();

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize with template recommendations
  await recommendationGenerator.generateTemplateRecommendations();

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const { category } = req.query;
      const documents = category 
        ? await storage.getDocumentsByCategory(category as string)
        : await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  // Create document from text description
  app.post("/api/documents/text", async (req, res) => {
    try {
      const { title, description, category } = req.body;

      if (!title || !description || !category) {
        return res.status(400).json({ error: "Title, description, and category are required" });
      }

      // Create document from text
      const documentData = insertDocumentSchema.parse({
        filename: `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
        originalName: `${title}.txt`,
        category,
        description,
        content: description,
        fileSize: description.length,
      });

      const document = await storage.createDocument(documentData);

      // Start AI analysis in background
      setImmediate(async () => {
        try {
          const analysisResult = await aiAnalyzer.analyzeDocument(document);
          
          // Save AI analysis
          const aiAnalysisData = insertAiAnalysisSchema.parse({
            documentId: document.id,
            query: 'Text document analysis and recommendation extraction',
            analysis: analysisResult.analysis,
            insights: analysisResult.insights,
          });
          
          await storage.createAiAnalysis(aiAnalysisData);
          
          // Generate recommendations from analysis
          await recommendationGenerator.generateFromAnalysis(analysisResult, document.id);
        } catch (error) {
          console.error('Background AI analysis failed:', error);
        }
      });

      res.json(document);
    } catch (error) {
      console.error('Text document creation error:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });

  // Upload and process document
  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { category, description } = req.body;

      // Validate file
      const isValid = await documentProcessor.validateFile(req.file.path);
      if (!isValid) {
        return res.status(400).json({ error: "File is too large or invalid" });
      }

      // Process document
      const processed = await documentProcessor.processDocument(
        req.file.path, 
        req.file.originalname
      );

      // Save document
      const documentData = insertDocumentSchema.parse({
        filename: req.file.filename,
        originalName: req.file.originalname,
        category: category || 'other',
        description: description || null,
        content: processed.content,
        fileSize: req.file.size,
      });

      const document = await storage.createDocument(documentData);

      // Start AI analysis in background
      setImmediate(async () => {
        try {
          const analysisResult = await aiAnalyzer.analyzeDocument(document);
          
          // Save AI analysis
          const aiAnalysisData = insertAiAnalysisSchema.parse({
            documentId: document.id,
            query: 'Document analysis and recommendation extraction',
            analysis: analysisResult.analysis,
            insights: analysisResult.insights,
          });
          
          await storage.createAiAnalysis(aiAnalysisData);

          // Generate recommendations
          await recommendationGenerator.generateFromAnalysis(analysisResult, document.id);
        } catch (error) {
          console.error('Background AI analysis failed:', error);
        }
      });

      res.json({ 
        document,
        message: "Document uploaded and queued for analysis" 
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // Get recommendations
  app.get("/api/recommendations", async (req, res) => {
    try {
      const { category, recent } = req.query;
      
      let recommendations;
      if (recent) {
        recommendations = await storage.getRecentRecommendations(parseInt(recent as string));
      } else if (category) {
        recommendations = await storage.getRecommendationsByCategory(category as string);
      } else {
        recommendations = await storage.getAllRecommendations();
      }
      
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  // Toggle bookmark
  app.patch("/api/recommendations/:id/bookmark", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.toggleBookmark(id);
      const recommendation = await storage.getRecommendation(id);
      res.json(recommendation);
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle bookmark" });
    }
  });

  // Get AI analyses
  app.get("/api/analyses", async (req, res) => {
    try {
      const { documentId } = req.query;
      
      const analyses = documentId 
        ? await storage.getAnalysesByDocument(parseInt(documentId as string))
        : await storage.getAllAiAnalyses();
      
      res.json(analyses);
    } catch (error) {
      res.status(500).json({ error: "Failed to get analyses" });
    }
  });

  // Analyze document with custom query
  app.post("/api/documents/:id/analyze", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { query } = req.body;

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const analysisResult = await aiAnalyzer.analyzeDocument(document, query);
      
      const aiAnalysisData = insertAiAnalysisSchema.parse({
        documentId,
        query: query || 'Custom document analysis',
        analysis: analysisResult.analysis,
        insights: analysisResult.insights,
      });
      
      const analysis = await storage.createAiAnalysis(aiAnalysisData);

      // Generate recommendations if any were found
      if (analysisResult.recommendations.length > 0) {
        await recommendationGenerator.generateFromAnalysis(analysisResult, documentId);
      }

      res.json({ analysis, recommendationsGenerated: analysisResult.recommendations.length });
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: "Failed to analyze document" });
    }
  });

  // Global search
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string' || q.length < 2) {
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }

      const results = await storage.globalSearch(q);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // Download document in various formats
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const { id } = req.params;
      const { format = 'txt', includeRecommendations = 'false', includeAnalyses = 'false' } = req.query;
      
      const documentId = parseInt(id);
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Get related data if requested
      let recommendations = undefined;
      let analyses = undefined;

      if (includeRecommendations === 'true') {
        const allRecommendations = await storage.getAllRecommendations();
        recommendations = allRecommendations.filter(rec => 
          rec.sourceDocumentId === documentId || rec.category === document.category
        );
      }

      if (includeAnalyses === 'true') {
        analyses = await storage.getAnalysesByDocument(documentId);
      }

      // Export document
      const buffer = await documentExporter.exportDocument(
        document,
        format as string,
        recommendations,
        analyses
      );

      // Set appropriate headers
      const mimeTypes: Record<string, string> = {
        txt: 'text/plain',
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        json: 'application/json',
        zip: 'application/zip'
      };

      const extensions: Record<string, string> = {
        txt: 'txt',
        csv: 'csv',
        xlsx: 'xlsx',
        json: 'json',
        zip: 'zip'
      };

      const mimeType = mimeTypes[format as string] || 'application/octet-stream';
      const extension = extensions[format as string] || 'bin';
      const filename = `${document.originalName.replace(/\.[^/.]+$/, '')}.${extension}`;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
