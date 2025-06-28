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
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
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
      
      if (!response.ok) throw new Error('Web search failed');
      
      const data = await response.json();
      setWebResults(data.results || []);
      setAiInsights(data.aiSummary || "");
      
    } catch (error) {
      toast({
        title: "Search Error",
        description: "Failed to perform web search",
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
      const response = await fetch('/api/search/ai-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: debouncedQuery,
          searchLibrary: true,
          generateInsights: true,
          includeRecommendations: true
        })
      });
      
      if (!response.ok) throw new Error('AI search failed');
      
      const data = await response.json();
      setResults(data.results || []);
      setAiInsights(data.insights || "");
      
    } catch (error) {
      toast({
        title: "Search Error", 
        description: "Failed to perform AI search",
        variant: "destructive",
      });
      setResults([]);
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
          title: doc.originalName,
          content: doc.content?.substring(0, 200) + "...",
          source: 'document' as const,
          category: doc.category,
          relevance: 0.9
        })) || [],
        ...localResults.recommendations?.map((rec: any) => ({
          id: `rec-${rec.id}`,
          title: rec.title,
          content: rec.content?.substring(0, 200) + "...",
          source: 'recommendation' as const,
          category: rec.category,
          relevance: 0.8
        })) || [],
        ...localResults.analyses?.map((analysis: any) => ({
          id: `analysis-${analysis.id}`,
          title: `Analysis: ${analysis.query}`,
          content: analysis.analysis?.substring(0, 200) + "...",
          source: 'analysis' as const,
          relevance: 0.7
        })) || []
      ];
      setResults(formattedResults);
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
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search stormwater regulations, BMPs, compliance guidance..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-4"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>
        <Select value={searchMode} onValueChange={(value: 'local' | 'web' | 'ai') => setSearchMode(value)}>
          <SelectTrigger className="w-32">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Local
              </div>
            </SelectItem>
            <SelectItem value="web">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Web
              </div>
            </SelectItem>
            <SelectItem value="ai">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Enhanced
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Search Results */}
      {debouncedQuery.length >= 2 && (
        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="results" className="w-full">
              <div className="p-4 pb-0">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="results">
                    Results ({displayResults.length})
                  </TabsTrigger>
                  <TabsTrigger value="insights" disabled={!aiInsights}>
                    AI Insights
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="results" className="p-4 pt-2">
                <ScrollArea className="max-h-96">
                  {displayResults.length === 0 && !isLoading ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No results found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs ${getSourceColor(result.source)}`}>
                                  <span className="flex items-center gap-1">
                                    {getSourceIcon(result.source)}
                                    {result.source}
                                  </span>
                                </Badge>
                                {result.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.category}
                                  </Badge>
                                )}
                                {result.url && (
                                  <ExternalLink className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
                              <h4 className="font-medium text-sm mb-1 truncate">
                                {result.title}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {result.content}
                              </p>
                            </div>
                            <div className="text-xs text-gray-400 flex-shrink-0">
                              {Math.round(result.relevance * 100)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="insights" className="p-4 pt-2">
                <ScrollArea className="max-h-96">
                  {aiInsights ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm">AI Analysis</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{aiInsights}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No AI insights available</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}