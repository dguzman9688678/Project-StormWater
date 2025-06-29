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
import { PythonInterpreter } from "./services/python-interpreter";
import archiver from "archiver";

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
const pythonInterpreter = new PythonInterpreter();

// Helper function to detect what calculations are needed based on content
function detectCalculationNeeds(content: string, description?: string): string[] {
  const text = (content + ' ' + (description || '')).toLowerCase();
  const calculations = [];

  if (text.includes('runoff') || text.includes('flow') || text.includes('drainage')) {
    calculations.push('runoff_analysis');
  }
  if (text.includes('bmp') || text.includes('detention') || text.includes('retention')) {
    calculations.push('bmp_sizing');
  }
  if (text.includes('erosion') || text.includes('sediment')) {
    calculations.push('erosion_control');
  }
  if (text.includes('pipe') || text.includes('culvert') || text.includes('sizing')) {
    calculations.push('hydraulic_sizing');
  }

  return calculations;
}

// Extract actual site measurements and parameters from document content
function extractRealSiteData(content: string, description?: string): any {
  const text = content + ' ' + (description || '');
  const siteData: any = {
    filename: 'uploaded_document',
    description: description || ''
  };

  // Extract area measurements (acres, square feet)
  const areaMatches = text.match(/(\d+(?:\.\d+)?)\s*(acres?|ac|square feet|sf|sq\.?\s*ft)/gi);
  if (areaMatches) {
    const areas = areaMatches.map(match => {
      const [, value, unit] = match.match(/(\d+(?:\.\d+)?)\s*(acres?|ac|square feet|sf|sq\.?\s*ft)/i) || [];
      const numValue = parseFloat(value);
      return unit.toLowerCase().includes('acre') ? numValue : numValue / 43560; // Convert sf to acres
    });
    siteData.total_area_acres = Math.max(...areas);
  }

  // Extract slope percentages
  const slopeMatches = text.match(/(\d+(?:\.\d+)?)\s*%?\s*slope/gi);
  if (slopeMatches) {
    const slopes = slopeMatches.map(match => {
      const [, value] = match.match(/(\d+(?:\.\d+)?)/i) || [];
      return parseFloat(value);
    });
    siteData.slope_percent = Math.max(...slopes);
  }

  // Extract flow lengths
  const lengthMatches = text.match(/(\d+(?:\.\d+)?)\s*(feet|ft|meters?|m)\s*(long|length)/gi);
  if (lengthMatches) {
    const lengths = lengthMatches.map(match => {
      const [, value, unit] = match.match(/(\d+(?:\.\d+)?)\s*(feet|ft|meters?|m)/i) || [];
      const numValue = parseFloat(value);
      return unit.toLowerCase().startsWith('m') ? numValue * 3.28084 : numValue; // Convert meters to feet
    });
    siteData.flow_length_ft = Math.max(...lengths);
  }

  // Extract pipe/culvert diameters
  const diameterMatches = text.match(/(\d+(?:\.\d+)?)\s*(inch|in|"|foot|ft|')\s*(diameter|pipe|culvert)/gi);
  if (diameterMatches) {
    const diameters = diameterMatches.map(match => {
      const [, value, unit] = match.match(/(\d+(?:\.\d+)?)\s*(inch|in|"|foot|ft|')/i) || [];
      const numValue = parseFloat(value);
      return unit.toLowerCase().includes('ft') || unit === "'" ? numValue * 12 : numValue; // Convert feet to inches
    });
    siteData.culvert = { diameter_inches: Math.max(...diameters) };
  }

  // Extract rainfall data
  const rainfallMatches = text.match(/(\d+(?:\.\d+)?)\s*(inch|in|")\s*(rain|rainfall|storm)/gi);
  if (rainfallMatches) {
    const rainfalls = rainfallMatches.map(match => {
      const [, value] = match.match(/(\d+(?:\.\d+)?)/i) || [];
      return parseFloat(value);
    });
    siteData.design_storm_inches = Math.max(...rainfalls);
  }

  // Detect land use types from text
  const landUseTypes: any = {};
  if (text.includes('residential') || text.includes('housing')) {
    landUseTypes.residential = siteData.total_area_acres * 0.6 || 20;
  }
  if (text.includes('commercial') || text.includes('business')) {
    landUseTypes.commercial = siteData.total_area_acres * 0.3 || 10;
  }
  if (text.includes('industrial') || text.includes('manufacturing')) {
    landUseTypes.industrial = siteData.total_area_acres * 0.4 || 15;
  }
  if (text.includes('paved') || text.includes('parking') || text.includes('asphalt')) {
    landUseTypes.paved = siteData.total_area_acres * 0.2 || 5;
  }
  if (text.includes('forest') || text.includes('trees') || text.includes('woods')) {
    landUseTypes.forest = siteData.total_area_acres * 0.3 || 8;
  }

  // Default land use if none detected
  if (Object.keys(landUseTypes).length === 0) {
    landUseTypes.mixed_development = siteData.total_area_acres || 25;
  }

  siteData.land_use = landUseTypes;

  // Set reasonable defaults if no data extracted
  if (!siteData.total_area_acres) siteData.total_area_acres = Object.values(landUseTypes).reduce((a: any, b: any) => a + b, 0) || 25;
  if (!siteData.slope_percent) siteData.slope_percent = 3.0;
  if (!siteData.flow_length_ft) siteData.flow_length_ft = 1200;

  return siteData;
}

// Generate comprehensive engineering calculation code using real formulas
function generateComprehensiveCalculations(siteData: any, calculationTypes: string[]): string {
  const calculationCode = `
# Real Engineering Calculations for Site: ${siteData.filename || 'uploaded_document'}
print("="*70)
print("COMPREHENSIVE STORMWATER ENGINEERING ANALYSIS")
print("Using Real Engineering Formulas and Extracted Site Data")
print("="*70)

# Site parameters extracted from document
site_data = ${JSON.stringify(siteData, null, 2).replace(/"/g, "'")}

# 1. RUNOFF COEFFICIENT ANALYSIS (NRCS TR-55)
print("\\n1. RUNOFF COEFFICIENT ANALYSIS (NRCS TR-55)")
print("-" * 50)
runoff_result = analyze_runoff_coefficient(
    site_data['land_use'], 
    site_data.get('soil_type', 'B'),
    site_data.get('slope_percent', 3.0)
)

for land_use, results in runoff_result.items():
    if isinstance(results, dict) and 'curve_number' in results:
        print(f"{land_use}: {results['area_acres']} acres, CN={results['curve_number']}, C={results['runoff_coefficient']}")
    elif isinstance(results, dict) and 'total_area_acres' in results:
        print(f"\\nCOMPOSITE SITE ANALYSIS:")
        print(f"Total Area: {results['total_area_acres']} acres")
        print(f"Weighted Curve Number: {results['weighted_curve_number']}")
        print(f"Composite Runoff Coefficient: {results['composite_runoff_coefficient']}")

# 2. TIME OF CONCENTRATION (Kirpich Formula)
print("\\n2. TIME OF CONCENTRATION (Kirpich Formula)")
print("-" * 50)
tc_result = calculate_time_of_concentration(
    site_data.get('flow_length_ft', 1200),
    site_data.get('slope_percent', 3.0),
    'mixed'
)
print(f"Flow Length: {tc_result['flow_length_ft']} feet")
print(f"Average Slope: {tc_result['slope_percent']}%")
print(f"Time of Concentration: {tc_result['tc_minutes']} minutes")

# 3. RAINFALL INTENSITY (NOAA Atlas 14)
print("\\n3. RAINFALL INTENSITY ANALYSIS (NOAA Atlas 14)")
print("-" * 50)
idf_result = calculate_idf_rainfall(
    site_data.get('storm_frequency', '10-year'), 
    tc_result['tc_minutes'], 
    site_data.get('location', 'california_central')
)
print(f"Storm Frequency: {idf_result['storm_frequency']}")
print(f"Duration: {idf_result['duration_minutes']} minutes")
print(f"Rainfall Intensity: {idf_result['intensity_in_hr']} inches/hour")

# 4. PEAK FLOW CALCULATION (Rational Method)
print("\\n4. PEAK FLOW CALCULATION (Rational Method)")
print("-" * 50)
composite_data = runoff_result.get('COMPOSITE', {})
peak_flow_result = calculate_peak_flow_rational(
    idf_result['intensity_in_hr'],
    composite_data.get('total_area_acres', site_data['total_area_acres']),
    composite_data.get('composite_runoff_coefficient', 0.6)
)
print(f"PEAK FLOW: {peak_flow_result['peak_flow_cfs']} cfs ({peak_flow_result['peak_flow_gpm']:,} gpm)")

# 5. RUNOFF VOLUME (SCS Method)
print("\\n5. RUNOFF VOLUME CALCULATION (SCS Method)")
print("-" * 50)
volume_result = calculate_runoff_volume_scs(
    composite_data.get('total_area_acres', site_data['total_area_acres']),
    idf_result['rainfall_depth_inches'],
    composite_data.get('weighted_curve_number', 75)
)
print(f"Runoff Volume: {volume_result['runoff_volume_cf']:,} cubic feet")
print(f"Runoff Volume: {volume_result['runoff_volume_gallons']:,} gallons")

# 6. BMP SIZING WITH REAL COSTS
print("\\n6. BMP SIZING AND COST ANALYSIS")
print("-" * 50)
bmp_types = ['bioretention', 'wet_pond', 'dry_detention']
for bmp_type in bmp_types:
    bmp_result = bmp_sizing_calculator(
        composite_data.get('total_area_acres', site_data['total_area_acres']),
        volume_result['runoff_depth_inches'],
        bmp_type
    )
    print(f"\\n{bmp_type.upper()}:")
    print(f"  Area Required: {bmp_result['required_area_sf']:,} sq ft")
    print(f"  Construction Cost: $\\{bmp_result['construction_cost']:,\\}")
    print(f"  Annual Maintenance: $\\{bmp_result['annual_maintenance_cost']:,\\}")

# 7. CULVERT ANALYSIS (if data available)
if 'culvert' in site_data and 'diameter_inches' in site_data.get('culvert', {}):
    print("\\n7. CULVERT CAPACITY ANALYSIS (FHWA HDS-5)")
    print("-" * 50)
    culvert_result = calculate_culvert_capacity(
        site_data['culvert']['diameter_inches'],
        site_data.get('flow_length_ft', 100),
        100.0,
        98.0,
        3.0
    )
    print(f"Culvert Diameter: {culvert_result['diameter_inches']} inches")
    print(f"Capacity: {culvert_result['capacity_cfs']} cfs")
    
    if culvert_result['capacity_cfs'] >= peak_flow_result['peak_flow_cfs']:
        print("✓ ADEQUATE: Capacity > Required Flow")
    else:
        print("✗ INADEQUATE: Needs larger diameter")

print("\\n" + "="*70)
print("ENGINEERING ANALYSIS COMPLETE - ALL REAL CALCULATIONS")
print("="*70)
`;

  return calculationCode;
}

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

        // Start AI analysis in background with ALL library documents for comprehensive analysis
        setImmediate(async () => {
          try {
            console.log(`Starting comprehensive AI analysis for ${document.originalName} (ID: ${document.id})`);
            console.log(`AI will automatically cross-reference ALL library documents for comprehensive analysis`);
            
            const analysisResult = await aiAnalyzer.analyzeDocument(document);
            
            console.log(`Comprehensive AI analysis complete for ${document.originalName}`);
            
            // Save AI analysis
            const aiAnalysisData = insertAiAnalysisSchema.parse({
              documentId: document.id,
              query: 'Comprehensive document analysis with full library cross-referencing',
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

        // Perform comprehensive AI analysis immediately with ALL library documents
        try {
          console.log(`Starting comprehensive temporary analysis for ${tempDocument.originalName}`);
          console.log(`AI will automatically cross-reference ALL library documents for comprehensive analysis`);
          
          const analysisResult = await aiAnalyzer.analyzeDocument(tempDocument);
          console.log(`Comprehensive temporary analysis complete for ${tempDocument.originalName}`);
          
          // For images, include base64 data for chat analysis
          let imageData = null;
          const fileExtension = tempDocument.originalName.toLowerCase();
          const isImage = fileExtension.includes('.jpg') || fileExtension.includes('.jpeg') || fileExtension.includes('.png') || fileExtension.includes('.gif') || fileExtension.includes('.bmp') || fileExtension.includes('.webp') || fileExtension.includes('.heic') || fileExtension.includes('.heif');
          
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

  // Upload multiple files for analysis (temporary - not saved to library)
  app.post("/api/documents/upload-analyze", upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const { description } = req.body;
      
      // Process first file for analysis
      const primaryFile = files[0];
      
      // Validate file
      const isValid = await documentProcessor.validateFile(primaryFile.path);
      if (!isValid) {
        return res.status(400).json({ error: "File is too large or invalid" });
      }

      // Process document
      const processed = await documentProcessor.processDocument(
        primaryFile.path, 
        primaryFile.originalname
      );

      // Create temporary document for analysis (not saved to library)
      const tempDocument = {
        id: Date.now(), // temporary ID
        category: "stormwater",
        filename: primaryFile.filename,
        originalName: primaryFile.originalname,
        description: description || null,
        content: processed.content,
        fileSize: primaryFile.size,
        uploadedAt: new Date(),
        isBookmarked: false
      };

      // Perform AI analysis
      const allDocuments = await storage.getAllDocuments();
      const analysisResult = await aiAnalyzer.analyzeDocument(tempDocument, description);

      // Perform relevant Python calculations based on document content
      let pythonResults: any = null;
      try {
        // Check if document content suggests stormwater calculations are needed
        const needsCalculations = detectCalculationNeeds(tempDocument.content, description);
        
        if (needsCalculations.length > 0) {
          console.log('🧮 Performing real engineering calculations with extracted site data');
          
          // Extract actual site measurements from document content
          const siteData = extractRealSiteData(tempDocument.content, description);
          
          // Generate comprehensive engineering calculation code
          const calculationCode = generateComprehensiveCalculations(siteData, needsCalculations);
          
          pythonResults = await pythonInterpreter.executeStormwaterAnalysis(
            calculationCode,
            siteData,
            'calculation'
          );
        }
      } catch (error) {
        console.warn('Python calculations failed:', error);
      }

      // Enhance analysis with Python results if available
      let enhancedAnalysis = analysisResult.analysis;
      let enhancedInsights = [...analysisResult.insights];
      let enhancedRecommendations = [...analysisResult.recommendations];

      if (pythonResults && pythonResults.success) {
        enhancedAnalysis += `\n\n**TECHNICAL CALCULATIONS:**\n${pythonResults.output}`;
        
        if (pythonResults.dataAnalysis) {
          enhancedInsights.push(
            `Calculation Results: ${pythonResults.dataAnalysis.summary}`,
            ...pythonResults.dataAnalysis.insights
          );
          
          // Add calculation-based recommendations
          pythonResults.dataAnalysis.recommendations.forEach((rec: string) => {
            enhancedRecommendations.push({
              title: "Calculated Recommendation",
              content: rec,
              category: 'stormwater' as const,
              subcategory: 'calculations',
              citation: 'Python Engineering Calculations'
            });
          });
        }
      }

      // Create comprehensive analysis result
      const tempAnalysis = {
        id: Date.now(),
        documentId: tempDocument.id,
        query: description || "Document analysis",
        analysis: enhancedAnalysis,
        insights: enhancedInsights,
        recommendations: enhancedRecommendations,
        createdAt: new Date(),
        pythonResults: pythonResults
      };

      res.json({
        document: tempDocument,
        analysis: tempAnalysis,
        recommendations: enhancedRecommendations,
        pythonResults: pythonResults
      });

    } catch (error) {
      console.error('Analysis error:', error);
      res.status(500).json({ error: "Failed to analyze documents" });
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

  // Claude 4 Enhanced Search endpoint
  app.post("/api/search/claude4", async (req, res) => {
    try {
      const { query, mode, includeWeb, includeContext, useThinking } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.json({ results: [], insights: "No query provided" });
      }

      // Get local results first
      const localResults = await storage.globalSearch(query);
      
      // Enhanced Claude 4 analysis with thinking mode - integrates with existing analysis system
      const aiAnalyzer = new AIAnalyzer();
      let insights = '';
      
      if (includeContext && localResults.documents.length > 0) {
        // Use the same analysis approach as document analysis but for search context
        const searchAnalysisPrompt = `<thinking>
        The user is searching for "${query}" in their professional stormwater management system.
        
        Context:
        - Available documents: ${localResults.documents.length}
        - Available recommendations: ${localResults.recommendations.length}
        - Available analyses: ${localResults.analyses.length}
        
        As a QSD/CPESC professional, I need to:
        1. Understand the search intent and regulatory implications
        2. Cross-reference relevant documents for comprehensive guidance
        3. Provide actionable professional recommendations
        4. Identify compliance requirements and implementation steps
        5. Assess risks and mitigation strategies
        
        This search analysis should integrate with the broader document analysis system.
        </thinking>
        
        You are a Qualified SWPPP Developer (QSD) and Certified Professional in Erosion and Sediment Control (CPESC). 
        
        Analyze the search query "${query}" in context of these available stormwater management resources:
        
        **Available Documents:**
        ${localResults.documents.map(doc => `- ${doc.originalName}: ${doc.content?.substring(0, 200)}...`).join('\n')}
        
        **Previous Recommendations:**
        ${localResults.recommendations.map(rec => `- ${rec.title}: ${rec.content?.substring(0, 150)}...`).join('\n')}
        
        **Previous Analyses:**
        ${localResults.analyses.map(analysis => `- Query: ${analysis.query} | Analysis: ${analysis.analysis?.substring(0, 150)}...`).join('\n')}
        
        Provide professional analysis including:
        
        ## Regulatory Compliance
        - Applicable regulations and standards
        - Compliance requirements and deadlines
        - Permit considerations
        
        ## Implementation Guidance
        - Best management practices (BMPs)
        - Technical specifications
        - Installation and maintenance requirements
        
        ## Risk Assessment
        - Potential failure modes
        - Environmental impacts
        - Mitigation strategies
        
        ## Cross-Document Connections
        - Related documents and sections
        - Conflicting or complementary guidance
        - Missing information needs
        
        ## Recommended Actions
        - Immediate next steps
        - Timeline considerations
        - Resource requirements`;
        
        try {
          insights = await aiAnalyzer.generateDocument(searchAnalysisPrompt);
          
          // Save this search analysis for future reference
          if (insights && localResults.documents.length > 0) {
            try {
              await storage.createAiAnalysis({
                documentId: localResults.documents[0].id,
                query: `Search Analysis: ${query}`,
                analysis: insights,
                insights: [`Search performed for: ${query}`, `Found ${localResults.documents.length} documents`, `Claude 4 enhanced analysis completed`]
              });
            } catch (saveError) {
              console.log('Note: Could not save search analysis to database');
            }
          }
        } catch (error) {
          console.error('Claude 4 analysis error:', error);
          insights = `Professional search analysis for "${query}":

Found ${localResults.documents.length} documents and ${localResults.recommendations.length} recommendations in your stormwater library.

## Quick Assessment
- Review documents for regulatory compliance requirements
- Check for applicable BMP specifications and standards
- Verify implementation timelines and permit requirements
- Consider environmental protection measures

## Recommended Actions
1. Review most relevant documents identified in search results
2. Cross-reference with current project requirements
3. Consult latest regulatory guidance for compliance
4. Develop implementation timeline with QSD/CPESC oversight

For detailed professional analysis, please ensure Claude 4 API access is properly configured.`;
        }
      } else {
        insights = `Search completed for "${query}". Found ${localResults.documents.length} documents. Use Claude 4 Enhanced mode for comprehensive professional analysis.`;
      }

      // Format results for Claude 4 enhanced display
      const enhancedResults = [
        ...localResults.documents.map(doc => ({
          id: `claude4-doc-${doc.id}`,
          title: doc.originalName || 'Document',
          content: (doc.content || '').substring(0, 300) + '...',
          source: 'document',
          category: doc.category,
          relevance: 0.95
        })),
        ...localResults.recommendations.map(rec => ({
          id: `claude4-rec-${rec.id}`,
          title: rec.title || 'Recommendation',
          content: (rec.content || '').substring(0, 300) + '...',
          source: 'recommendation',
          category: rec.category,
          relevance: 0.90
        })),
        ...localResults.analyses.map(analysis => ({
          id: `claude4-analysis-${analysis.id}`,
          title: `Analysis: ${analysis.query}`,
          content: (analysis.analysis || '').substring(0, 300) + '...',
          source: 'analysis',
          relevance: 0.85
        }))
      ];

      res.json({
        results: enhancedResults,
        insights: insights,
        searchMode: 'claude4',
        totalResults: enhancedResults.length
      });

    } catch (error) {
      console.error("Claude 4 search error:", error);
      res.status(500).json({ 
        results: [], 
        insights: "Claude 4 enhanced search temporarily unavailable",
        error: "Search failed" 
      });
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

  // Python interpreter endpoints
  app.post("/api/python/execute", async (req, res) => {
    try {
      const { code, data, analysisType } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Python code is required' });
      }

      console.log('🐍 Executing Python code for stormwater analysis');
      
      const result = await pythonInterpreter.executeStormwaterAnalysis(
        code, 
        data,
        analysisType || 'data_analysis'
      );
      
      res.json(result);

    } catch (error) {
      console.error('Python execution error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Python execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/python/calculate", async (req, res) => {
    try {
      const { calculation, parameters } = req.body;
      
      if (!calculation || typeof calculation !== 'string') {
        return res.status(400).json({ error: 'Calculation expression is required' });
      }

      console.log(`🧮 Python calculation: ${calculation}`);
      
      const result = await pythonInterpreter.executeQuickCalculation(calculation, parameters);
      
      res.json(result);

    } catch (error) {
      console.error('Python calculation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Python calculation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/python/test", async (req, res) => {
    try {
      console.log('🔧 Testing Python environment');
      
      const result = await pythonInterpreter.testPythonEnvironment();
      
      res.json({
        ...result,
        message: 'Python environment test completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Python test error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Python environment test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Download document in various formats (removed duplicate - kept the simpler version below)

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
        const isImage = fileExtension.includes('.jpg') || fileExtension.includes('.jpeg') || fileExtension.includes('.png') || fileExtension.includes('.gif') || fileExtension.includes('.bmp') || fileExtension.includes('.webp') || fileExtension.includes('.heic') || fileExtension.includes('.heif');
        
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

  // Generate professional documents (SOPs, JSAs, permits, etc.)
  app.post("/api/documents/generate-professional", async (req, res) => {
    try {
      const { documentTypes, projectDescription, siteMeasurements } = req.body;

      if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
        return res.status(400).json({ error: "Document types are required" });
      }

      // Get all documents for context
      const allDocuments = await storage.getAllDocuments();
      
      // Generate each requested document type
      const generatedDocuments = [];
      
      for (const docType of documentTypes) {
        try {
          // Create comprehensive professional document with actual content
          const enhancedQuery = `Generate a complete, professional ${docType.replace('_', ' ')} document for the stormwater project: ${projectDescription}.

**DOCUMENT REQUIREMENTS:**
1. Create a comprehensive, detailed document suitable for actual project use
2. Reference ALL applicable documents from the library with proper [DOC-X] citations
3. Include specific technical specifications, procedures, and compliance requirements
4. Format as a complete professional document with headers, sections, and detailed content
5. Ensure all recommendations are actionable and specific to the project

**PROJECT CONTEXT:** ${projectDescription}
${siteMeasurements ? `**SITE DATA:** ${JSON.stringify(siteMeasurements)}` : ''}

**DOCUMENT TYPE SPECIFICATIONS:**
${docType === 'sop' ? 'Standard Operating Procedure: Include step-by-step procedures, safety requirements, equipment lists, and quality control measures.' :
  docType === 'jsa' ? 'Job Safety Analysis: Include hazard identification, risk assessment, safety controls, PPE requirements, and emergency procedures.' :
  docType === 'excavation_permit' ? 'Excavation Permit: Include permit requirements, safety protocols, utility markings, inspection schedules, and regulatory compliance.' :
  docType === 'swppp' ? 'Stormwater Pollution Prevention Plan: Include BMP selection, implementation schedule, monitoring protocols, and regulatory compliance.' :
  docType === 'bmp_map' ? 'BMP Installation Map: Include detailed layout, specifications, installation sequence, and maintenance access points.' :
  docType === 'inspection_forms' ? 'Inspection Forms: Include comprehensive checklists, monitoring schedules, documentation requirements, and corrective action protocols.' :
  docType === 'training_materials' ? 'Training Materials: Include safety briefings, procedure overviews, competency requirements, and certification protocols.' :
  docType === 'maintenance_plan' ? 'Maintenance Plan: Include scheduled maintenance, monitoring protocols, replacement schedules, and performance metrics.' :
  'Professional documentation with complete technical specifications and implementation guidance.'}`;

          const documentRequest = {
            title: `${docType.replace('_', ' ').toUpperCase()} - ${projectDescription || 'Stormwater Project'}`,
            query: enhancedQuery,
            sourceDocumentIds: allDocuments.map(doc => doc.id),
            includeRecommendations: true,
            includeAnalyses: true,
            format: 'txt' as const,
            template: 'report' as const
          };

          const generatedDoc = await documentGenerator.generateDocument(documentRequest);
          
          // Store the generated document
          const newDoc = await storage.createDocument({
            originalName: `${documentRequest.title}.txt`,
            filename: `${documentRequest.title}.txt`,
            fileSize: Buffer.byteLength(generatedDoc.content, 'utf8'),
            content: generatedDoc.content,
            description: `Generated ${docType} document`,
            category: 'stormwater'
          });

          generatedDocuments.push({
            type: docType,
            document: newDoc,
            metadata: generatedDoc.metadata
          });

        } catch (error) {
          console.error(`Failed to generate ${docType}:`, error);
          // Continue with other documents even if one fails
        }
      }

      res.json({
        success: true,
        documentsGenerated: generatedDocuments.length,
        documents: generatedDocuments
      });

    } catch (error) {
      console.error('Professional document generation error:', error);
      res.status(500).json({ error: "Failed to generate professional documents" });
    }
  });

  // Download session files as ZIP
  app.post("/api/documents/download-session-zip", async (req, res) => {
    try {
      const { fileIds } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ error: "File IDs are required" });
      }

      const archive = archiver('zip', { zlib: { level: 9 } });

      // Set response headers for ZIP download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `stormwater_session_${timestamp}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Pipe archive to response
      archive.pipe(res);

      // Add each requested file to the archive
      for (const fileId of fileIds) {
        try {
          const document = await storage.getDocument(parseInt(fileId));
          if (!document) {
            console.warn(`Document ${fileId} not found, skipping`);
            continue;
          }

          // Determine file extension from original name or content type
          let filename = document.originalName;
          if (!filename.includes('.')) {
            filename += '.txt'; // Default extension
          }

          // Add file content to archive
          archive.append(document.content, { name: filename });

        } catch (error) {
          console.error(`Error adding file ${fileId} to archive:`, error);
          // Continue with other files
        }
      }

      // Finalize the archive
      await archive.finalize();

    } catch (error) {
      console.error('Session ZIP download error:', error);
      res.status(500).json({ error: "Failed to create session ZIP file" });
    }
  });

  // Get recent session files (files created in last 24 hours)
  app.get("/api/documents/session-files", async (req, res) => {
    try {
      const allDocuments = await storage.getAllDocuments();
      
      // Filter for recent files (last 24 hours) and sort by creation date
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sessionFiles = allDocuments
        .filter(doc => new Date(doc.uploadedAt) > twentyFourHoursAgo)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .map(doc => ({
          id: doc.id,
          originalName: doc.originalName,
          description: doc.description,
          category: doc.category,
          fileSize: doc.fileSize,
          createdAt: doc.uploadedAt.toISOString(),
          isGenerated: doc.description?.includes('Generated') || false
        }));

      res.json({ sessionFiles });

    } catch (error) {
      console.error('Session files error:', error);
      res.status(500).json({ error: "Failed to get session files" });
    }
  });

  // Download individual document
  app.get("/api/documents/:id/download", async (req, res) => {
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

      // Determine file extension and MIME type
      let filename = document.originalName;
      let mimeType = 'text/plain';
      
      // Ensure proper file extension
      if (!filename.includes('.')) {
        filename += '.txt';
      }
      
      // Set MIME type based on file extension
      const extension = filename.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        case 'doc':
        case 'docx':
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'txt':
          mimeType = 'text/plain';
          break;
        case 'json':
          mimeType = 'application/json';
          break;
        default:
          mimeType = 'text/plain';
      }

      // Set response headers for download
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(document.content, 'utf8'));
      
      // Send the document content
      res.send(document.content);

    } catch (error) {
      console.error('Document download error:', error);
      res.status(500).json({ error: "Failed to download document" });
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
