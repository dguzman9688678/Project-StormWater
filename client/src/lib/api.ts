import { apiRequest } from "./queryClient";

export const api = {
  // Statistics
  getStats: () => fetch("/api/stats").then(res => res.json()),

  // Documents
  getDocuments: (category?: string) => {
    const params = category ? `?category=${category}` : '';
    return fetch(`/api/documents${params}`).then(res => res.json());
  },

  uploadDocument: (formData: FormData) => {
    return fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    }).then(res => res.json());
  },

  analyzeDocument: (documentId: number, query: string) => {
    return apiRequest("POST", `/api/documents/${documentId}/analyze`, { query });
  },

  // Recommendations
  getRecommendations: (category?: string, recent?: number) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (recent) params.set('recent', recent.toString());
    const queryString = params.toString();
    return fetch(`/api/recommendations${queryString ? `?${queryString}` : ''}`).then(res => res.json());
  },

  toggleBookmark: (id: number) => {
    return apiRequest("PATCH", `/api/recommendations/${id}/bookmark`);
  },

  // AI Analyses
  getAnalyses: (documentId?: number) => {
    const params = documentId ? `?documentId=${documentId}` : '';
    return fetch(`/api/analyses${params}`).then(res => res.json());
  },

  // Search
  search: (query: string) => {
    return fetch(`/api/search?q=${encodeURIComponent(query)}`).then(res => res.json());
  },
};
