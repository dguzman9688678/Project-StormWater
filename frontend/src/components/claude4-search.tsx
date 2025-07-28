import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Globe, FileText, Sparkles, Brain, Filter, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: 'document' | 'recommendation' | 'analysis' | 'web' | 'ai';
  url?: string;
  category?: string;
  relevance: number;
}

interface Claude4SearchProps {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function Claude4Search({ onResultSelect, className = "" }: Claude4SearchProps) {
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'local' | 'web' | 'ai' | 'claude4'>('local');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [webResults, setWebResults] = useState<SearchResult[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Local search with React Query
  const { data: localResults, isLoading: isLocalLoading } = useQuery({
    queryKey: ['/api/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { documents: [], recommendations: [], analyses: [] };
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedQuery.length >= 2 && searchMode === 'local',
    staleTime: 30000
  });

  // Claude 4 Enhanced Web Search
  const performClaude4Search = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/search/claude4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: debouncedQuery,
          mode: 'enhanced',
          includeWeb: true,
          includeContext: true,
          useThinking: true // Claude 4 thinking mode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setWebResults(data.results || []);
        setAiInsights(data.insights || '');
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Claude 4 search error:', error);
      setAiInsights('Claude 4 enhanced search temporarily unavailable');
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery]);

  // Advanced Web Search with Claude 4 Integration
  const performWebSearch = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/search/web-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: debouncedQuery,
          useAI: true,
          contextual: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const formattedResults = data.results?.map((result: any, index: number) => ({
          id: `web-${index}`,
          title: result.title || 'Web Result',
          content: result.snippet || result.content || 'No description available',
          source: 'web' as const,
          url: result.url,
          relevance: result.relevance || 0.8
        })) || [];
        
        setWebResults(formattedResults);
        setAiInsights(data.analysis || 'Web search completed');
      }
    } catch (error) {
      console.error('Web search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery]);

  // AI Context Search
  const performAISearch = useCallback(async () => {
    if (!debouncedQuery || debouncedQuery.length < 2) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: debouncedQuery, 
          enhance: true,
          contextual: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const aiResults = [
          ...(data.documents?.map((doc: any) => ({
            id: `ai-doc-${doc.id}`,
            title: doc.originalName || 'Document',
            content: (doc.content || '').substring(0, 200) + '...',
            source: 'ai' as const,
            category: doc.category,
            relevance: 0.9
          })) || []),
          ...(data.recommendations?.map((rec: any) => ({
            id: `ai-rec-${rec.id}`,
            title: rec.title || 'Recommendation',
            content: (rec.content || '').substring(0, 200) + '...',
            source: 'ai' as const,
            category: rec.category,
            relevance: 0.8
          })) || [])
        ];
        
        setResults(aiResults);
        setAiInsights(data.analysis || 'AI contextual search completed');
      }
    } catch (error) {
      console.error('AI search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery]);

  // Auto-trigger search based on mode
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      switch (searchMode) {
        case 'web':
          performWebSearch();
          break;
        case 'ai':
          performAISearch();
          break;
        case 'claude4':
          performClaude4Search();
          break;
      }
    }
  }, [debouncedQuery, searchMode, performWebSearch, performAISearch, performClaude4Search]);

  // Update local results
  useEffect(() => {
    if (searchMode === 'local' && localResults) {
      const formattedResults: SearchResult[] = [
        ...((localResults as any)?.documents?.map((doc: any) => ({
          id: `doc-${doc.id}`,
          title: doc.originalName || doc.filename || 'Document',
          content: (doc.content || '').substring(0, 200) + '...',
          source: 'document' as const,
          category: doc.category || 'stormwater',
          relevance: 0.9
        })) || []),
        ...((localResults as any)?.recommendations?.map((rec: any) => ({
          id: `rec-${rec.id}`,
          title: rec.title || 'Recommendation',
          content: (rec.content || '').substring(0, 200) + '...',
          source: 'recommendation' as const,
          category: rec.category || 'stormwater',
          relevance: 0.8
        })) || [])
      ];
      setResults(formattedResults);
      setAiInsights(`Found ${formattedResults.length} local results`);
    }
  }, [localResults, searchMode]);

  const handleResultClick = (result: SearchResult) => {
    if (result.url) {
      window.open(result.url, '_blank');
    }
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'document': return <FileText className="w-4 h-4" />;
      case 'web': return <Globe className="w-4 h-4" />;
      case 'analysis': return <Sparkles className="w-4 h-4" />;
      case 'ai': return <Brain className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'document': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'web': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'analysis': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ai': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const displayResults = searchMode === 'web' || searchMode === 'claude4' ? webResults : results;
  const isLoading = isLocalLoading || isSearching;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input with Mode Selector */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search with Claude 4 enhanced capabilities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={searchMode} onValueChange={(value: 'local' | 'web' | 'ai' | 'claude4') => setSearchMode(value)}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local Search</SelectItem>
            <SelectItem value="web">Web Enhanced</SelectItem>
            <SelectItem value="ai">AI Context</SelectItem>
            <SelectItem value="claude4">Claude 4 Pro</SelectItem>
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
                    Claude 4 Insights
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="results" className="p-4 pt-2">
                <ScrollArea className="max-h-96">
                  {displayResults.length === 0 && !isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No results found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {displayResults.map((result) => (
                        <div
                          key={result.id}
                          className="p-3 rounded-lg border hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs ${getSourceColor(result.source)}`}>
                                  <span className="flex items-center gap-1">
                                    {getSourceIcon(result.source)}
                                    {searchMode === 'claude4' ? 'Claude 4' : result.source}
                                  </span>
                                </Badge>
                                {result.category && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.category}
                                  </Badge>
                                )}
                                {result.url && (
                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                              <h4 className="font-medium text-sm mb-1 truncate">
                                {result.title}
                              </h4>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {result.content}
                              </p>
                            </div>
                            <div className="text-xs text-muted-foreground flex-shrink-0">
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
                          <Brain className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm">Claude 4 Enhanced Analysis</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{aiInsights}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No Claude 4 insights available</p>
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