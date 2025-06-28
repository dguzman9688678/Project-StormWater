import { FileText, BookOpen, Brain, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SearchResultsProps {
  results?: {
    documents: any[];
    recommendations: any[];
    analyses: any[];
  };
  isLoading: boolean;
  query: string;
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  if (!query || query.length < 2) return null;

  return (
    <Card className="absolute top-full left-0 right-0 mt-1 max-h-96 overflow-y-auto z-50">
      <CardContent className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Searching...</span>
          </div>
        ) : results ? (
          <div className="space-y-4">
            {/* Documents */}
            {results.documents.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  Documents ({results.documents.length})
                </h4>
                <div className="space-y-2">
                  {results.documents.slice(0, 3).map((doc) => (
                    <div key={doc.id} className="p-2 rounded hover:bg-muted cursor-pointer">
                      <div className="font-medium text-sm">{doc.originalName}</div>
                      <div className="text-xs text-muted-foreground">{doc.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {results.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  Recommendations ({results.recommendations.length})
                </h4>
                <div className="space-y-2">
                  {results.recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="p-2 rounded hover:bg-muted cursor-pointer">
                      <div className="font-medium text-sm">{rec.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {rec.category.toUpperCase()}
                        </Badge>
                        {rec.citation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Analyses */}
            {results.analyses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <Brain className="h-4 w-4 mr-1" />
                  AI Analyses ({results.analyses.length})
                </h4>
                <div className="space-y-2">
                  {results.analyses.slice(0, 3).map((analysis) => (
                    <div key={analysis.id} className="p-2 rounded hover:bg-muted cursor-pointer">
                      <div className="font-medium text-sm">{analysis.query}</div>
                      <div className="text-xs text-muted-foreground">
                        {analysis.analysis.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {results.documents.length === 0 && 
             results.recommendations.length === 0 && 
             results.analyses.length === 0 && (
              <div className="text-center py-4">
                <div className="text-sm text-muted-foreground">
                  No results found for "{query}"
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
