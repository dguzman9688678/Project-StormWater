import { 
  documents, 
  recommendations, 
  aiAnalyses, 
  type Document, 
  type InsertDocument, 
  type Recommendation, 
  type InsertRecommendation, 
  type AiAnalysis, 
  type InsertAiAnalysis 
} from "@shared/schema";

export interface IStorage {
  // Documents
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocument(id: number): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  deleteDocument(id: number): Promise<void>;

  // Recommendations
  createRecommendation(rec: InsertRecommendation): Promise<Recommendation>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  getAllRecommendations(): Promise<Recommendation[]>;
  getRecommendationsByCategory(category: string): Promise<Recommendation[]>;
  getRecentRecommendations(limit: number): Promise<Recommendation[]>;
  searchRecommendations(query: string): Promise<Recommendation[]>;
  toggleBookmark(id: number): Promise<void>;

  // AI Analyses
  createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis>;
  getAiAnalysis(id: number): Promise<AiAnalysis | undefined>;
  getAnalysesByDocument(documentId: number): Promise<AiAnalysis[]>;
  getAllAiAnalyses(): Promise<AiAnalysis[]>;

  // Search
  globalSearch(query: string): Promise<{
    documents: Document[];
    recommendations: Recommendation[];
    analyses: AiAnalysis[];
  }>;

  // Statistics
  getStats(): Promise<{
    documentCount: number;
    recommendationCount: number;
    analysisCount: number;
    qsdCount: number;
    swpppCount: number;
    erosionCount: number;
  }>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document> = new Map();
  private recommendations: Map<number, Recommendation> = new Map();
  private aiAnalyses: Map<number, AiAnalysis> = new Map();
  private currentDocumentId = 1;
  private currentRecommendationId = 1;
  private currentAnalysisId = 1;

  async createDocument(doc: InsertDocument): Promise<Document> {
    const document: Document = {
      ...doc,
      id: this.currentDocumentId++,
      uploadedAt: new Date(),
    };
    this.documents.set(document.id, document);
    return document;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.category === category)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
  }

  async createRecommendation(rec: InsertRecommendation): Promise<Recommendation> {
    const recommendation: Recommendation = {
      ...rec,
      id: this.currentRecommendationId++,
      createdAt: new Date(),
      isBookmarked: rec.isBookmarked || false,
    };
    this.recommendations.set(recommendation.id, recommendation);
    return recommendation;
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    return this.recommendations.get(id);
  }

  async getAllRecommendations(): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async getRecommendationsByCategory(category: string): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .filter(rec => rec.category === category)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRecentRecommendations(limit: number): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async searchRecommendations(query: string): Promise<Recommendation[]> {
    const searchTerm = query.toLowerCase();
    return Array.from(this.recommendations.values())
      .filter(rec => 
        rec.title.toLowerCase().includes(searchTerm) ||
        rec.content.toLowerCase().includes(searchTerm) ||
        rec.citation?.toLowerCase().includes(searchTerm)
      );
  }

  async toggleBookmark(id: number): Promise<void> {
    const recommendation = this.recommendations.get(id);
    if (recommendation) {
      recommendation.isBookmarked = !recommendation.isBookmarked;
    }
  }

  async createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis> {
    const aiAnalysis: AiAnalysis = {
      ...analysis,
      id: this.currentAnalysisId++,
      createdAt: new Date(),
    };
    this.aiAnalyses.set(aiAnalysis.id, aiAnalysis);
    return aiAnalysis;
  }

  async getAiAnalysis(id: number): Promise<AiAnalysis | undefined> {
    return this.aiAnalyses.get(id);
  }

  async getAnalysesByDocument(documentId: number): Promise<AiAnalysis[]> {
    return Array.from(this.aiAnalyses.values())
      .filter(analysis => analysis.documentId === documentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllAiAnalyses(): Promise<AiAnalysis[]> {
    return Array.from(this.aiAnalyses.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async globalSearch(query: string): Promise<{
    documents: Document[];
    recommendations: Recommendation[];
    analyses: AiAnalysis[];
  }> {
    const searchTerm = query.toLowerCase();
    
    const documents = Array.from(this.documents.values())
      .filter(doc => 
        doc.originalName.toLowerCase().includes(searchTerm) ||
        doc.content.toLowerCase().includes(searchTerm) ||
        doc.description?.toLowerCase().includes(searchTerm)
      );

    const recommendations = await this.searchRecommendations(query);

    const analyses = Array.from(this.aiAnalyses.values())
      .filter(analysis =>
        analysis.query.toLowerCase().includes(searchTerm) ||
        analysis.analysis.toLowerCase().includes(searchTerm)
      );

    return { documents, recommendations, analyses };
  }

  async getStats(): Promise<{
    documentCount: number;
    recommendationCount: number;
    analysisCount: number;
    qsdCount: number;
    swpppCount: number;
    erosionCount: number;
  }> {
    const recommendations = Array.from(this.recommendations.values());
    
    return {
      documentCount: this.documents.size,
      recommendationCount: this.recommendations.size,
      analysisCount: this.aiAnalyses.size,
      qsdCount: recommendations.filter(r => r.category === 'qsd').length,
      swpppCount: recommendations.filter(r => r.category === 'swppp').length,
      erosionCount: recommendations.filter(r => r.category === 'erosion').length,
    };
  }
}

export const storage = new MemStorage();
