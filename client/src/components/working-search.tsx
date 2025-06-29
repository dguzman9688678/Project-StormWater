import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: 'document' | 'recommendation' | 'analysis';
}

interface WorkingSearchProps {
  onResultSelect?: (result: SearchResult) => void;
  className?: string;
}

export function WorkingSearch({ onResultSelect, className = "" }: WorkingSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['/api/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return { documents: [], recommendations: [], analyses: [] };
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000
  });

  const searchResults: SearchResult[] = results ? [
    ...(results.documents?.map((doc: any) => ({
      id: `doc-${doc.id}`,
      title: doc.originalName || 'Document',
      content: (doc.content || '').substring(0, 150) + '...',
      source: 'document' as const
    })) || []),
    ...(results.recommendations?.map((rec: any) => ({
      id: `rec-${rec.id}`,
      title: rec.title || 'Recommendation',
      content: (rec.content || '').substring(0, 150) + '...',
      source: 'recommendation' as const
    })) || [])
  ] : [];

  const handleResultClick = (result: SearchResult) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents and recommendations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      
      {query.length >= 2 && searchResults.length > 0 && (
        <div className="mt-2 border rounded-lg bg-background max-h-64 overflow-y-auto">
          {searchResults.map((result) => (
            <div
              key={result.id}
              className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
              onClick={() => handleResultClick(result)}
            >
              <div className="font-medium text-sm truncate">{result.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{result.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}