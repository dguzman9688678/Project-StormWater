import { 
  documents, 
  recommendations, 
  aiAnalyses,
  adminSessions,
  type Document, 
  type InsertDocument, 
  type Recommendation, 
  type InsertRecommendation, 
  type AiAnalysis, 
  type InsertAiAnalysis,
  type AdminSession,
  type InsertAdminSession
} from "@shared/schema";
import { db } from "./db";
import { eq, like, or, desc, asc } from "drizzle-orm";

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

  // Admin Authentication
  verifyAdmin(email: string): Promise<boolean>;
  createAdminSession(email: string): Promise<string>;
  validateAdminToken(token: string): Promise<boolean>;
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
      description: doc.description || null,
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
      subcategory: rec.subcategory || null,
      sourceDocumentId: rec.sourceDocumentId || null,
      citation: rec.citation || null,
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
      insights: Array.isArray(analysis.insights) ? analysis.insights as string[] : null,
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

  // Admin Authentication - only allow Daniel Guzman
  async verifyAdmin(email: string): Promise<boolean> {
    return email === 'guzman.danield@outlook.com';
  }

  async createAdminSession(email: string): Promise<string> {
    if (await this.verifyAdmin(email)) {
      return 'admin-session-' + Date.now();
    }
    throw new Error('Unauthorized');
  }

  async validateAdminToken(token: string): Promise<boolean> {
    return token.startsWith('admin-session-');
  }
}

export class DatabaseStorage implements IStorage {
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.category, category))
      .orderBy(desc(documents.uploadedAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values({
        ...doc,
        description: doc.description || null
      })
      .returning();
    return document;
  }

  async deleteDocument(id: number): Promise<void> {
    // Delete related AI analyses first (foreign key constraint)
    await db.delete(aiAnalyses).where(eq(aiAnalyses.documentId, id));
    
    // Delete related recommendations (if they reference this document)
    await db.delete(recommendations).where(eq(recommendations.sourceDocumentId, id));
    
    // Finally delete the document
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return recommendation || undefined;
  }

  async getAllRecommendations(): Promise<Recommendation[]> {
    return await db.select().from(recommendations).orderBy(desc(recommendations.createdAt));
  }

  async getRecommendationsByCategory(category: string): Promise<Recommendation[]> {
    return await db.select().from(recommendations)
      .where(eq(recommendations.category, category))
      .orderBy(desc(recommendations.createdAt));
  }

  async getRecentRecommendations(limit: number): Promise<Recommendation[]> {
    return await db.select().from(recommendations)
      .orderBy(desc(recommendations.createdAt))
      .limit(limit);
  }

  async searchRecommendations(query: string): Promise<Recommendation[]> {
    return await db.select().from(recommendations)
      .where(or(
        like(recommendations.title, `%${query}%`),
        like(recommendations.content, `%${query}%`),
        like(recommendations.citation, `%${query}%`)
      ))
      .orderBy(desc(recommendations.createdAt));
  }

  async createRecommendation(rec: InsertRecommendation): Promise<Recommendation> {
    const [recommendation] = await db
      .insert(recommendations)
      .values({
        ...rec,
        subcategory: rec.subcategory || null,
        sourceDocumentId: rec.sourceDocumentId || null,
        citation: rec.citation || null,
        isBookmarked: rec.isBookmarked || null
      })
      .returning();
    return recommendation;
  }

  async toggleBookmark(id: number): Promise<void> {
    const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    if (recommendation) {
      await db.update(recommendations)
        .set({ isBookmarked: !recommendation.isBookmarked })
        .where(eq(recommendations.id, id));
    }
  }

  async getAiAnalysis(id: number): Promise<AiAnalysis | undefined> {
    const [analysis] = await db.select().from(aiAnalyses).where(eq(aiAnalyses.id, id));
    return analysis || undefined;
  }

  async getAnalysesByDocument(documentId: number): Promise<AiAnalysis[]> {
    return await db.select().from(aiAnalyses)
      .where(eq(aiAnalyses.documentId, documentId))
      .orderBy(desc(aiAnalyses.createdAt));
  }

  async getAllAiAnalyses(): Promise<AiAnalysis[]> {
    return await db.select().from(aiAnalyses).orderBy(desc(aiAnalyses.createdAt));
  }

  async createAiAnalysis(analysis: InsertAiAnalysis): Promise<AiAnalysis> {
    try {
      const [aiAnalysis] = await db
        .insert(aiAnalyses)
        .values({
          documentId: analysis.documentId,
          query: analysis.query,
          analysis: analysis.analysis,
          insights: analysis.insights || []
        })
        .returning();
      return aiAnalysis;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  async globalSearch(query: string): Promise<{
    documents: Document[];
    recommendations: Recommendation[];
    analyses: AiAnalysis[];
  }> {
    const [documentsResult, recommendationsResult, analysesResult] = await Promise.all([
      db.select().from(documents)
        .where(or(
          like(documents.originalName, `%${query}%`),
          like(documents.content, `%${query}%`),
          like(documents.description, `%${query}%`)
        ))
        .orderBy(desc(documents.uploadedAt)),
      
      this.searchRecommendations(query),
      
      db.select().from(aiAnalyses)
        .where(or(
          like(aiAnalyses.query, `%${query}%`),
          like(aiAnalyses.analysis, `%${query}%`)
        ))
        .orderBy(desc(aiAnalyses.createdAt))
    ]);

    return {
      documents: documentsResult,
      recommendations: recommendationsResult,
      analyses: analysesResult
    };
  }

  async getStats(): Promise<{
    documentCount: number;
    recommendationCount: number;
    analysisCount: number;
    qsdCount: number;
    swpppCount: number;
    erosionCount: number;
  }> {
    const [allDocs, allRecs, allAnalyses] = await Promise.all([
      db.select().from(documents),
      db.select().from(recommendations),
      db.select().from(aiAnalyses)
    ]);

    const qsdCount = allRecs.filter(rec => rec.category === 'qsd').length;
    const swpppCount = allRecs.filter(rec => rec.category === 'swppp').length;
    const erosionCount = allRecs.filter(rec => rec.category === 'erosion').length;

    return {
      documentCount: allDocs.length,
      recommendationCount: allRecs.length,
      analysisCount: allAnalyses.length,
      qsdCount,
      swpppCount,
      erosionCount
    };
  }

  // Admin Authentication - only allow Daniel Guzman
  async verifyAdmin(email: string): Promise<boolean> {
    return email === 'guzman.danield@outlook.com';
  }

  async createAdminSession(email: string): Promise<string> {
    if (await this.verifyAdmin(email)) {
      const sessionToken = 'admin-session-' + Date.now() + '-' + Math.random().toString(36);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await db.insert(adminSessions).values({
        email,
        isAuthenticated: true,
        sessionToken,
        expiresAt
      });
      
      return sessionToken;
    }
    throw new Error('Unauthorized');
  }

  async validateAdminToken(token: string): Promise<boolean> {
    const [session] = await db.select()
      .from(adminSessions)
      .where(eq(adminSessions.sessionToken, token));
    
    if (!session || !session.isAuthenticated) {
      return false;
    }
    
    if (session.expiresAt && session.expiresAt < new Date()) {
      return false;
    }
    
    return true;
  }
}

export const storage = new DatabaseStorage();
