import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Brain, Search, Loader2, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadModal } from "@/components/upload-modal";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function SimpleAnalysisPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [analysisMode, setAnalysisMode] = useState<'all' | 'single'>('all');
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch documents and analyses
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => api.getDocuments(),
  });

  const { data: analyses, isLoading: analysesLoading } = useQuery({
    queryKey: ["/api/analyses"],
    queryFn: () => api.getAnalyses(),
  });

  // Analysis mutation for comprehensive analysis
  const comprehensiveAnalysisMutation = useMutation({
    mutationFn: (query: string) => api.analyzeAllDocuments(query),
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "All documents have been analyzed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      setQuestion("");
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze documents",
        variant: "destructive",
      });
    },
  });

  // Single document analysis mutation (backup option)
  const singleAnalysisMutation = useMutation({
    mutationFn: ({ documentId, query }: { documentId: number; query: string }) =>
      api.analyzeDocument(documentId, query),
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Document has been analyzed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      setQuestion("");
      setSelectedDocumentId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze document",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!question.trim()) {
      toast({
        title: "Question Required",
        description: "Please enter a question to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (analysisMode === 'single' && !selectedDocumentId) {
      toast({
        title: "Document Required",
        description: "Please select a document to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (analysisMode === 'all') {
      comprehensiveAnalysisMutation.mutate(question);
    } else {
      singleAnalysisMutation.mutate({
        documentId: selectedDocumentId,
        query: question,
      });
    }
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

  const getDocumentTitle = (documentId: number | null) => {
    if (!documentId) return "All Documents";
    const doc = documents?.find((d: any) => d.id === documentId);
    return doc ? doc.originalName : `Document ${documentId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
          Stormwater AI
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Upload any problem document (e.g., "collapsing culvert") → AI analyzes your entire library → Auto-generates inspection forms, JSAs, maintenance plans with proper citations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload and Ask Section */}
        <div className="space-y-6">
          {/* Upload Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Documents
              </CardTitle>
              <CardDescription>
                Upload any format: PDF, DOCX, TXT, Excel, CSV, JSON, XML
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsUploadOpen(true)}
                className="w-full"
                size="lg"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New Document
              </Button>
              
              {documents && documents.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
                  </p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {documents.slice(0, 3).map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate">{doc.originalName}</span>
                        <Badge variant="outline" className="text-xs">
                          {doc.category}
                        </Badge>
                      </div>
                    ))}
                    {documents.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{documents.length - 3} more documents
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ask Question */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Ask Your Question
              </CardTitle>
              <CardDescription>
                Ask any question about your uploaded documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!documents || documents.length === 0) && (
                <Alert>
                  <AlertDescription>
                    Upload documents first to start asking questions.
                  </AlertDescription>
                </Alert>
              )}

              {/* Analysis Mode Selection */}
              {documents && documents.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Analysis Mode</label>
                  <div className="flex space-x-2">
                    <Button
                      variant={analysisMode === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAnalysisMode('all')}
                      className="flex-1"
                    >
                      All Documents
                    </Button>
                    <Button
                      variant={analysisMode === 'single' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setAnalysisMode('single')}
                      className="flex-1"
                    >
                      Single Document
                    </Button>
                  </div>
                  {analysisMode === 'all' && (
                    <p className="text-xs text-muted-foreground">
                      Analyzes all {documents.length} documents together for comprehensive answers
                    </p>
                  )}
                </div>
              )}

              {/* Single Document Selection */}
              {analysisMode === 'single' && documents && documents.length > 0 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Select Document</label>
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div 
                        key={doc.id}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          selectedDocumentId === doc.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedDocumentId(doc.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{doc.originalName}</span>
                          <Badge variant="outline" className="text-xs ml-2">
                            {doc.category}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your Question
                </label>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What specific information are you looking for? Be as detailed as possible..."
                  className="min-h-[100px]"
                />
              </div>

              <Button 
                onClick={handleAnalyze}
                disabled={(!selectedDocumentId && analysisMode === 'single') || !question.trim() || comprehensiveAnalysisMutation.isPending || singleAnalysisMutation.isPending}
                className="w-full"
                size="lg"
              >
                {(comprehensiveAnalysisMutation.isPending || singleAnalysisMutation.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Get Answer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Analysis Results
              </CardTitle>
              <CardDescription>
                Answers to your questions with source citations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : analyses && analyses.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {analyses.slice(0, 5).map((analysis: any) => (
                    <div key={analysis.id} className="border rounded-lg p-4 space-y-3">
                      {/* Question */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                          Question:
                        </h4>
                        <p className="text-sm font-medium">{analysis.query}</p>
                      </div>

                      {/* Answer */}
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                          Answer:
                        </h4>
                        <p className="text-sm text-foreground leading-relaxed">
                          {analysis.analysis}
                        </p>
                      </div>

                      {/* Source */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            Source: {getDocumentTitle(analysis.documentId)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(analysis.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Analysis Yet
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Upload a document and ask a question to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}