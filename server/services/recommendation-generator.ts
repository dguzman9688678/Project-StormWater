import { storage } from "../storage";
import { type InsertRecommendation } from "@shared/schema";
import { type AnalysisResult } from "./ai-analyzer";

export class RecommendationGenerator {
  async generateFromAnalysis(analysisResult: AnalysisResult, documentId: number): Promise<void> {
    for (const rec of analysisResult.recommendations) {
      const recommendation: InsertRecommendation = {
        title: rec.title,
        content: rec.content,
        category: rec.category,
        subcategory: rec.subcategory,
        sourceDocumentId: documentId,
        citation: rec.citation,
        isBookmarked: false,
      };

      await storage.createRecommendation(recommendation);
    }
  }

  async generateTemplateRecommendations(): Promise<void> {
    // Check if recommendations already exist to avoid duplicates
    const existingRecs = await storage.getAllRecommendations();
    if (existingRecs.length > 0) {
      return; // Already seeded
    }
    // Generate some template recommendations to demonstrate the system
    const templates: InsertRecommendation[] = [
      {
        title: 'Pre-Construction Site Assessment',
        content: 'Comprehensive site evaluation checklist including soil conditions, slope analysis, and drainage patterns before construction begins.',
        category: 'qsd',
        subcategory: 'Site Inspection',
        sourceDocumentId: null,
        citation: 'EPA Construction Guidelines, Section 3.2',
        isBookmarked: false,
      },
      {
        title: 'SWPPP Maintenance Records',
        content: 'Required documentation formats and frequency for maintaining SWPPP compliance records and inspection logs.',
        category: 'qsd',
        subcategory: 'Documentation',
        sourceDocumentId: null,
        citation: 'NPDES Permit Requirements, Appendix B',
        isBookmarked: true,
      },
      {
        title: 'Sediment Basin Design Standards',
        content: 'Volume calculation methods for temporary sediment basins including sizing criteria for various catchment areas.',
        category: 'swppp',
        subcategory: 'Structural Controls',
        sourceDocumentId: null,
        citation: 'Construction BMP Manual, Chapter 5',
        isBookmarked: false,
      },
      {
        title: 'Construction Entrance Requirements',
        content: 'Specifications for stabilized construction entrances including aggregate size, depth, and maintenance procedures.',
        category: 'swppp',
        subcategory: 'Access Control',
        sourceDocumentId: null,
        citation: 'State SWPPP Guidelines, Section 4.1',
        isBookmarked: false,
      },
      {
        title: 'Slope Stabilization Techniques',
        content: 'Hydroseeding application rates for varying slope conditions including seed mix specifications and establishment timelines.',
        category: 'erosion',
        subcategory: 'Slope Protection',
        sourceDocumentId: null,
        citation: 'Erosion Control Handbook, Page 145',
        isBookmarked: false,
      },
      {
        title: 'Silt Fence Installation',
        content: 'Proper installation procedures for silt fence including trenching depth, fabric specifications, and post spacing requirements.',
        category: 'erosion',
        subcategory: 'Perimeter Controls',
        sourceDocumentId: null,
        citation: 'Standard Construction Details, Sheet E-01',
        isBookmarked: false,
      },
    ];

    for (const template of templates) {
      await storage.createRecommendation(template);
    }
  }
}
