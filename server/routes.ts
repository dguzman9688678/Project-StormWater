import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { DocumentProcessor } from "./services/document-processor";
import { AIAnalyzer } from "./services/ai-analyzer";
import { RecommendationGenerator } from "./services/recommendation-generator";
import { DocumentExporter } from "./services/document-exporter";
import { DocumentGenerator } from "./services/document-generator";
import { ChatService } from "./services/chat-service";
import { WebSearchService } from "./services/web-search-service";

import { insertDocumentSchema, insertAiAnalysisSchema } from "@shared/schema";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for large PDFs
});

const documentProcessor = new DocumentProcessor();
const aiAnalyzer = new AIAnalyzer();
const recommendationGenerator = new RecommendationGenerator();
const documentExporter = new DocumentExporter();
const documentGenerator = new DocumentGenerator();
const chatService = new ChatService();
const webSearchService = new WebSearchService();


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

      const { category, description, saveToLibrary } = req.body;
      const shouldSaveToLibrary = saveToLibrary === 'true';

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

      if (shouldSaveToLibrary) {
        // Save document to permanent library (admin only)
        const documentData = insertDocumentSchema.parse({
          filename: req.file.filename,
          originalName: req.file.originalname,
          category: category || 'stormwater',
          description: description || null,
          content: processed.content,
          fileSize: req.file.size,
        });

        const document = await storage.createDocument(documentData);

        // Start AI analysis in background
        setImmediate(async () => {
          try {
            console.log(`Starting AI analysis for ${document.originalName} (ID: ${document.id})`);
            const analysisResult = await aiAnalyzer.analyzeDocument(document);
            
            console.log(`AI analysis complete for ${document.originalName}`);
            
            // Save AI analysis
            const aiAnalysisData = insertAiAnalysisSchema.parse({
              documentId: document.id,
              query: 'Document analysis and recommendation extraction',
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

        res.json({ 
          document, 
          savedToLibrary: true,
          message: "Document saved to library and queued for analysis" 
        });
      } else {
        // Temporary analysis only - don't save to library
        console.log(`Performing temporary analysis for ${req.file.originalname}`);
        
        // Create temporary document object for analysis
        const tempDocument = {
          id: 0, // Temporary ID
          filename: req.file.filename,
          originalName: req.file.originalname,
          category: 'stormwater',
          description: description || null,
          content: processed.content,
          fileSize: req.file.size,
          uploadedAt: new Date(),
          filePath: req.file.path, // Include file path for image analysis
        };

        // Perform AI analysis immediately
        try {
          const analysisResult = await aiAnalyzer.analyzeDocument(tempDocument);
          console.log(`Temporary analysis complete for ${tempDocument.originalName}`);
          
          // For images, include base64 data for chat analysis
          let imageData = null;
          const fileExtension = tempDocument.originalName.toLowerCase();
          const isImage = fileExtension.includes('.jpg') || fileExtension.includes('.jpeg') || fileExtension.includes('.png') || fileExtension.includes('.gif') || fileExtension.includes('.bmp') || fileExtension.includes('.webp');
          
          if (isImage && tempDocument.filePath) {
            try {
              const fs = await import('fs');
              const imageBuffer = await fs.promises.readFile(tempDocument.filePath);
              imageData = imageBuffer.toString('base64');
            } catch (error) {
              console.error('Failed to read image for chat:', error);
            }
          }

          res.json({ 
            document: { ...tempDocument, imageData }, 
            analysis: analysisResult,
            savedToLibrary: false,
            message: "Document analyzed successfully. Results are temporary and not saved to library."
          });
        } catch (error) {
          console.error('Temporary analysis failed:', error);
          res.json({ 
            document: tempDocument, 
            savedToLibrary: false,
            message: "Document processed successfully. Analysis temporarily unavailable."
          });
        }
      }
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

  // Comprehensive analysis and solution generation
  app.post("/api/analyze-all", async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Query is required" });
      }

      // Get all documents
      const documents = await storage.getAllDocuments();
      
      if (documents.length === 0) {
        return res.status(400).json({ error: "No documents available for analysis" });
      }

      // Combine content from all documents for comprehensive analysis
      const combinedContent = documents.map(doc => 
        `Document: ${doc.originalName}\nCategory: ${doc.category}\nContent: ${doc.content}\n---\n`
      ).join('\n');

      // Create a comprehensive document object for analysis
      const comprehensiveDoc = {
        id: 0,
        originalName: "All Documents Combined",
        content: combinedContent,
        category: "comprehensive",
        description: `Analysis across ${documents.length} documents`,
        filename: "comprehensive-analysis",
        fileSize: combinedContent.length,
        uploadedAt: new Date()
      };

      const analysisResult = await aiAnalyzer.analyzeDocument(comprehensiveDoc, query);
      
      // Store the analysis
      const aiAnalysisData = {
        documentId: documents[0].id,
        query: `Comprehensive Analysis: ${query}`,
        analysis: analysisResult.analysis,
        insights: analysisResult.insights ? [...analysisResult.insights] : [],
      };
      
      const analysis = await storage.createAiAnalysis(aiAnalysisData);

      // Generate recommendations
      if (analysisResult.recommendations.length > 0) {
        await recommendationGenerator.generateFromAnalysis(analysisResult, documents[0].id);
      }

      // Generate solution documents automatically
      const solutionDocuments = await documentGenerator.generateSolutionDocuments({
        problem: query,
        sourceDocuments: documents,
        analysisResult: analysisResult
      });

      // Return comprehensive response
      res.json({
        ...analysis,
        sourceDocuments: documents.map(doc => ({
          id: doc.id,
          name: doc.originalName,
          category: doc.category
        })),
        generatedDocuments: solutionDocuments,
        recommendationsGenerated: analysisResult.recommendations.length
      });
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      res.status(500).json({ error: "Failed to analyze all documents" });
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

  // Enhanced web search with Claude 4
  app.post("/api/search/web-enhanced", async (req, res) => {
    try {
      const { query, context, includeRegulations, includeGuidance } = req.body;
      
      if (!query || query.length < 3) {
        return res.status(400).json({ error: "Search query must be at least 3 characters" });
      }

      // Use web search service to find relevant results
      const webResults = await webSearchService.searchStormwaterResources(query, {
        includeRegulations: includeRegulations || false,
        includeBMPs: true,
        includeGuidance: includeGuidance || false,
        context: context || 'stormwater engineering'
      });

      // Use Claude 4 to analyze and summarize the results
      const aiSummary = await chatService.processMessage(`
        Analyze these stormwater search results for "${query}" and provide key insights:
        
        Results:
        ${webResults.map((r: any) => `${r.title}: ${r.content}`).join('\n')}
        
        Provide a professional summary focusing on:
        1. Key regulatory requirements
        2. Best management practices
        3. Implementation guidance
        4. Compliance considerations
      `);

      res.json({
        results: webResults.map((result: any) => ({
          id: `web-${Date.now()}-${Math.random()}`,
          title: result.title,
          content: result.content,
          source: 'web',
          url: result.url,
          relevance: result.relevance || 0.8
        })),
        aiSummary: aiSummary
      });

    } catch (error) {
      console.error('Enhanced web search error:', error);
      res.status(500).json({ 
        error: "Enhanced web search failed",
        results: [],
        aiSummary: "Unable to perform enhanced search analysis"
      });
    }
  });

  // AI-enhanced contextual search
  app.post("/api/search/ai-enhanced", async (req, res) => {
    try {
      const { query, searchLibrary, generateInsights, includeRecommendations } = req.body;
      
      if (!query || query.length < 3) {
        return res.status(400).json({ error: "Search query must be at least 3 characters" });
      }

      // Perform local search first
      const localResults = await storage.globalSearch(query);
      
      // Get all documents for context if requested
      let contextDocuments: any[] = [];
      if (searchLibrary) {
        contextDocuments = await storage.getAllDocuments();
      }

      // Use Claude 4 to enhance search results with AI insights
      const aiAnalysis = await chatService.processMessage(`
        As a stormwater expert, analyze this search query: "${query}"
        
        Available documents: ${contextDocuments.map((doc: any) => `${doc.originalName}: ${doc.content?.substring(0, 300)}`).join('\n')}
        
        Current search results:
        ${JSON.stringify(localResults, null, 2)}
        
        Provide:
        1. Enhanced search insights specific to stormwater management
        2. Related topics the user should consider
        3. Regulatory context and requirements
        4. Practical implementation guidance
        
        ${includeRecommendations ? '5. Specific actionable recommendations' : ''}
      `);

      // Format results for consistent interface
      const enhancedResults = [
        ...localResults.documents?.map((doc: any) => ({
          id: `ai-doc-${doc.id}`,
          title: doc.originalName,
          content: doc.content?.substring(0, 200) + "...",
          source: 'document',
          category: doc.category,
          relevance: 0.95
        })) || [],
        ...localResults.recommendations?.map((rec: any) => ({
          id: `ai-rec-${rec.id}`,
          title: rec.title,
          content: rec.content?.substring(0, 200) + "...",
          source: 'recommendation',
          category: rec.category,
          relevance: 0.9
        })) || []
      ];

      res.json({
        results: enhancedResults,
        insights: aiAnalysis
      });

    } catch (error) {
      console.error('AI enhanced search error:', error);
      res.status(500).json({ 
        error: "AI enhanced search failed",
        results: [],
        insights: "Unable to generate AI insights for this search"
      });
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

  // Generate new document
  app.post("/api/documents/generate", async (req, res) => {
    try {
      const { 
        title, 
        query, 
        sourceDocumentIds = [], 
        includeRecommendations = true, 
        includeAnalyses = true, 
        format = 'txt', 
        template = 'report' 
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Document title is required" });
      }

      const generatedDoc = await documentGenerator.generateDocument({
        title,
        query,
        sourceDocumentIds,
        includeRecommendations,
        includeAnalyses,
        format,
        template
      });

      res.json(generatedDoc);
    } catch (error) {
      console.error('Document generation error:', error);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // Chat with Claude about documents
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, currentDocument, adminMode } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get all documents to provide context
      const documents = await storage.getAllDocuments();
      
      // Create context from all documents for Claude
      const documentContext = documents.map(doc => 
        `Document: ${doc.originalName}\nCategory: ${doc.category}\nContent: ${doc.content.substring(0, 500)}...\n---\n`
      ).join('\n');

      // Add current document context if provided
      let currentDocContext = '';
      if (currentDocument) {
        const fileExtension = currentDocument.originalName.toLowerCase();
        const isImage = fileExtension.includes('.jpg') || fileExtension.includes('.jpeg') || fileExtension.includes('.png') || fileExtension.includes('.gif') || fileExtension.includes('.bmp') || fileExtension.includes('.webp');
        
        if (isImage && (currentDocument.filePath || currentDocument.imageData)) {
          // For images, we need to handle visual analysis by sending the actual image
          try {
            let base64Image = currentDocument.imageData;
            
            // If no imageData but we have filePath, try to read the file
            if (!base64Image && currentDocument.filePath) {
              const fs = await import('fs');
              const imageBuffer = await fs.promises.readFile(currentDocument.filePath);
              base64Image = imageBuffer.toString('base64');
            }
            
            if (base64Image) {
              // Use Claude's image analysis with the document context
              const imageAnalysisMessage = `As a certified QSD/CPESC stormwater professional, analyze this uploaded image "${currentDocument.originalName}" to identify any stormwater management issues, problems, BMPs, or conditions visible. Then provide specific professional solutions and recommendations using the reference library documents below.

REFERENCE LIBRARY:
${documentContext}

User question: ${message}

Please provide detailed professional site assessment of what you see in the image and specific consultant-level recommendations based on your reference materials.`;

              const response = await chatService.analyzeImage(base64Image, imageAnalysisMessage);
              return res.json({ response });
            }
          } catch (error) {
            console.error('Image analysis error:', error);
            // Fall back to text-based analysis
          }
        }
        
        if (isImage) {
          // For images without file path, provide descriptive context
          currentDocContext = `

CURRENTLY UPLOADED IMAGE:
Image: ${currentDocument.originalName}
Category: ${currentDocument.category || 'stormwater'}
Image Content: This is a stormwater-related image that needs visual analysis to identify issues, problems, or conditions.
---

`;
        } else {
          currentDocContext = `

CURRENTLY UPLOADED DOCUMENT:
Document: ${currentDocument.originalName}
Category: ${currentDocument.category || 'stormwater'}
Content: ${currentDocument.content ? currentDocument.content.substring(0, 1000) : 'Content processed but not available for display'}
---

`;
        }
      }

      // Enhanced message with context - special handling for admin mode
      let contextualMessage;
      
      if (adminMode) {
        // Admin mode: Give Claude full capabilities and system awareness
        contextualMessage = `You are Claude 4, in administrator mode for the Stormwater AI system. You have full administrative awareness and capabilities.

SYSTEM CONTEXT:
- You are chatting with Daniel Guzman, the system owner and administrator
- This is a private administrative chat with full Claude 4 capabilities
- You have access to all system functions and can discuss any topic
- Current system status: Stormwater AI application with ${documents.length} documents in library

REFERENCE LIBRARY (${documents.length} documents):
${documentContext}

Administrator message: ${message}

Respond as Claude 4 with full capabilities. You can discuss system administration, provide technical analysis, answer general questions, or help with any stormwater engineering topics. Be professional but conversational.`;
      } else {
        // Regular user mode: Focus on stormwater engineering
        contextualMessage = `You are a stormwater engineering expert with access to a reference library. Here is the available documentation:

REFERENCE LIBRARY:
${documentContext}
${currentDocContext}

User question: ${message}

Please provide a comprehensive response using information from the reference library above and the currently uploaded document if provided. Include specific recommendations and cite relevant documents when applicable.`;
      }

      const response = await chatService.processMessage(contextualMessage);
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Download generated document
  app.post("/api/documents/generate/download", async (req, res) => {
    try {
      const { 
        title, 
        query, 
        sourceDocumentIds = [], 
        includeRecommendations = true, 
        includeAnalyses = true, 
        format = 'txt', 
        template = 'report' 
      } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Document title is required" });
      }

      const generatedDoc = await documentGenerator.generateDocument({
        title,
        query,
        sourceDocumentIds,
        includeRecommendations,
        includeAnalyses,
        format,
        template
      });

      // Convert content to buffer
      const buffer = Buffer.from(generatedDoc.content, 'utf-8');

      // Set appropriate headers for download
      const mimeTypes: Record<string, string> = {
        txt: 'text/plain',
        md: 'text/markdown',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        pdf: 'application/pdf'
      };

      const extensions: Record<string, string> = {
        txt: 'txt',
        md: 'md',
        docx: 'docx',
        pdf: 'pdf'
      };

      const mimeType = mimeTypes[format] || 'text/plain';
      const extension = extensions[format] || 'txt';
      const filename = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.${extension}`;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

    } catch (error) {
      console.error('Document generation download error:', error);
      res.status(500).json({ error: "Failed to generate and download document" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const documentId = parseInt(id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.deleteDocument(documentId);
      
      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // Chat endpoint for interactive AI conversations
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await chatService.processMessage(message);
      res.json({ message: response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Image analysis endpoint
  app.post("/api/analyze-image", upload.single('image'), async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      // Convert image to base64
      const fs = await import('fs/promises');
      const imageBuffer = await fs.readFile(req.file.path);
      const base64Image = imageBuffer.toString('base64');

      const analysis = await chatService.analyzeImage(base64Image, message);
      
      // Clean up uploaded file
      await fs.unlink(req.file.path);
      
      res.json({ analysis });
    } catch (error) {
      console.error('Image analysis error:', error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // Web search endpoint for stormwater regulations
  app.get("/api/web-search", async (req, res) => {
    try {
      const { q, location } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }

      const results = await webSearchService.searchStormwaterRegulations(
        q, 
        location as string | undefined
      );
      
      res.json({ results });
    } catch (error) {
      console.error('Web search error:', error);
      res.status(500).json({ error: "Failed to perform web search" });
    }
  });

  // Admin Authentication Routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }
      
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ error: "Password is required" });
      }

      // Only allow Daniel Guzman with correct credentials
      if (email !== 'guzman.danield@outlook.com') {
        return res.status(401).json({ error: "Unauthorized access" });
      }

      // Verify password
      if (password !== '529504Djg1.') {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      const token = await storage.createAdminSession(email);
      res.json({ success: true, token, message: "Admin authenticated successfully" });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(401).json({ error: "Authentication failed" });
    }
  });

  // Verify admin token
  app.get("/api/admin/verify", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const isValid = await storage.validateAdminToken(token);
      
      if (isValid) {
        res.json({ success: true, message: "Valid admin session" });
      } else {
        res.status(401).json({ error: "Invalid or expired token" });
      }
    } catch (error) {
      console.error('Admin verify error:', error);
      res.status(401).json({ error: "Token validation failed" });
    }
  });

  // Admin middleware function
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: "Admin access required" });
      }

      const isValid = await storage.validateAdminToken(token);
      
      if (!isValid) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      next();
    } catch (error) {
      res.status(401).json({ error: "Admin authentication failed" });
    }
  };

  // Delete document (admin only)
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const documentId = parseInt(id);
      
      if (isNaN(documentId)) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      await storage.deleteDocument(documentId);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
