import { useState, useEffect, useCallback } from "react";
import { Search, Globe, FileText, Sparkles, Loader2, ExternalLink, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: 'document' | 'recommendation' | 'analysis' | 'web';
  url?: string;
  category?: string;
  relevance: number;
}

interface EnhancedSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function EnhancedSearch({ onResultSelect, className = "" }: EnhancedSearchProps) {
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<'local' | 'web' | 'ai'>('local');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [webResults, setWebResults] = useState<SearchResult[]>([]);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { toast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Local document search
  const { data: localResults, isLoading: isLocalLoading } = useQuery({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { documents: [], recommendations: [], analyses: [] };
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedQuery.length >= 2 && searchMode === 'local',
  });

  // Enhanced web search with Claude 4
  const performWebSearch = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 3) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/search/web-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: debouncedQuery,
          context: 'stormwater engineering',
          includeRegulations: true,
          includeGuidance: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Web search failed');
      }
      
      const data = await response.json();
      
      // Format web results properly
      const formattedWebResults = (data.results || []).map((result: any, index: number) => ({
        id: `web-${index}`,
        title: result.title || `Web Result ${index + 1}`,
        content: result.description || result.content || "",
        source: 'web' as const,
        url: result.url,
        relevance: result.relevance || 0.5
      }));
      
      setWebResults(formattedWebResults);
      setAiInsights(data.aiSummary || "");
      
    } catch (error: any) {
      console.error('Web search error:', error);
      toast({
        title: "Web Search Error",
        description: error.message || "Failed to perform web search",
        variant: "destructive",
      });
      setWebResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, toast]);

  // AI-powered contextual search  
  const performAISearch = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 3) return;
    
    setIsSearching(true);
    try {
      // Use regular search endpoint with AI enhancement flag
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&enhance=true`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI search failed');
      }
      
      const data = await response.json();
      
      // Format AI results properly
      const formattedResults: SearchResult[] = [
        ...data.documents?.map((doc: any) => ({
          id: `ai-doc-${doc.id}`,
          title: doc.originalName || doc.filename,
          content: doc.content?.substring(0, 300) + "...",
          source: 'document' as const,
          category: doc.category,
          relevance: 0.9
        })) || [],
        ...data.recommendations?.map((rec: any) => ({
          id: `ai-rec-${rec.id}`,
          title: rec.title,
          content: rec.content?.substring(0, 300) + "...",
          source: 'recommendation' as const,
          category: rec.category,
          relevance: 0.8
        })) || [],
        ...data.analyses?.map((analysis: any) => ({
          id: `ai-analysis-${analysis.id}`,
          title: `Analysis: ${analysis.query}`,
          content: analysis.analysis?.substring(0, 300) + "...",
          source: 'analysis' as const,
          relevance: 0.7
        })) || []
      ];
      
      setResults(formattedResults);
      setAiInsights(`Found ${formattedResults.length} relevant results for "${debouncedQuery}"`);
      
    } catch (error: any) {
      console.error('AI search error:', error);
      toast({
        title: "AI Search Error", 
        description: error.message || "Failed to perform AI search",
        variant: "destructive",
      });
      setResults([]);
      setAiInsights("");
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, toast]);

  // Trigger searches based on mode
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      if (searchMode === 'web') {
        performWebSearch();
      } else if (searchMode === 'ai') {
        performAISearch();
      }
    }
  }, [debouncedQuery, searchMode, performWebSearch, performAISearch]);

  // Update local results
  useEffect(() => {
    if (searchMode === 'local' && localResults) {
      const formattedResults: SearchResult[] = [
        ...localResults.documents?.map((doc: any) => ({
          id: `doc-${doc.id}`,
          title: doc.originalName || doc.filename || 'Untitled Document',
          content: (doc.content || doc.description || '').substring(0, 200) + "...",
          source: 'document' as const,
          category: doc.category || 'stormwater',
          relevance: 0.9
        })) || [],
        ...localResults.recommendations?.map((rec: any) => ({
          id: `rec-${rec.id}`,
          title: rec.title || 'Untitled Recommendation',
          content: (rec.content || '').substring(0, 200) + "...",
          source: 'recommendation' as const,
          category: rec.category || 'stormwater',
          relevance: 0.8
        })) || [],
        ...localResults.analyses?.map((analysis: any) => ({
          id: `analysis-${analysis.id}`,
          title: `Analysis: ${analysis.query || 'Document Analysis'}`,
          content: (analysis.analysis || '').substring(0, 200) + "...",
          source: 'analysis' as const,
          relevance: 0.7
        })) || []
      ];
      setResults(formattedResults);
      setAiInsights(`Found ${formattedResults.length} local results`);
    }
  }, [localResults, searchMode]);

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result);
    if (result.url) {
      window.open(result.url, '_blank');
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'document': return <FileText className="w-4 h-4" />;
      case 'web': return <Globe className="w-4 h-4" />;
      case 'analysis': return <Sparkles className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'document': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'web': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'analysis': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const displayResults = searchMode === 'web' ? webResults : results;
  const isLoading = isLocalLoading || isSearching;

  return (
    <div className={`${className}`}>
      {/* Simple Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents and recommendations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim().length >= 2) {
              // Trigger search on Enter
              if (searchMode === 'web') {
                performWebSearch();
              } else if (searchMode === 'ai') {
                performAISearch();
              }
              // Local search happens automatically via useQuery
            }
          }}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}