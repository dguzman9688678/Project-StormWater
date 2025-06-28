import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { DocumentProcessor } from "./services/document-processor";
import { AIAnalyzer } from "./services/ai-analyzer";
import { RecommendationGenerator } from "./services/recommendation-generator";
import { insertDocumentSchema, insertAiAnalysisSchema } from "@shared/schema";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const documentProcessor = new DocumentProcessor();
const aiAnalyzer = new AIAnalyzer();
const recommendationGenerator = new RecommendationGenerator();

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

  const httpServer = createServer(app);
  return httpServer;
}
