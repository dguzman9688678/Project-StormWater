import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, FileText, MessageSquare, Send, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function AIAnalysisPage() {
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [query, setQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => api.getDocuments(),
  });

  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analyses"],
    queryFn: () => api.getAnalyses(),
  });

  const analysisMutation = useMutation({
    mutationFn: ({ documentId, query }: { documentId: number; query: string }) =>
      api.analyzeDocument(documentId, query),
    onSuccess: () => {
      toast({
        title: "Analysis started",
        description: "Your document is being analyzed. Results will appear shortly.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      setQuery("");
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze document",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!selectedDocument || !query.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a document and enter your question.",
        variant: "destructive",
      });
      return;
    }

    analysisMutation.mutate({
      documentId: parseInt(selectedDocument),
      query: query.trim(),
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <Brain className="h-6 w-6 mr-2" />
          AI Analysis
        </h1>
        <p className="mt-2 text-muted-foreground">
          Ask questions about your documents and get AI-powered stormwater insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analysis Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              New Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Select Document
              </label>
              <Select value={selectedDocument} onValueChange={setSelectedDocument}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a document to analyze..." />
                </SelectTrigger>
                <SelectContent>
                  {documents?.map((doc: any) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{doc.originalName}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {doc.category.toUpperCase()}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Your Question
              </label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like to know about this document? For example:
- What are the key stormwater requirements?
- Summarize the erosion control measures
- What inspection protocols are mentioned?"
                rows={4}
              />
            </div>

            <Button 
              onClick={handleAnalyze}
              disabled={analysisMutation.isPending || !selectedDocument || !query.trim()}
              className="w-full"
            >
              {analysisMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Analyze Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Analyses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              Recent Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : analyses?.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {analyses.map((analysis: any) => (
                  <div key={analysis.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-foreground mb-1">
                          {analysis.query}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(analysis.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-3">
                      {analysis.analysis}
                    </div>
                    {analysis.insights && analysis.insights.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-foreground mb-1">Key Insights:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {analysis.insights.slice(0, 2).map((insight: string, idx: number) => (
                            <li key={idx} className="line-clamp-1">• {insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No analyses yet</p>
                <p className="text-xs">Start by selecting a document and asking a question</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
