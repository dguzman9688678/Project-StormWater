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

  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: ({ documentId, query }: { documentId: number; query: string }) =>
      api.analyzeDocument(documentId, query),
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Your document has been analyzed successfully.",
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
    if (!selectedDocumentId || !question.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a document and enter your question.",
        variant: "destructive",
      });
      return;
    }

    analysisMutation.mutate({
      documentId: selectedDocumentId,
      query: question,
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

  const getDocumentTitle = (documentId: number) => {
    const doc = documents?.find((d: any) => d.id === documentId);
    return doc ? doc.originalName : `Document ${documentId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
          Document Analysis
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Upload any document and ask questions to get instant answers with citations
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
              {/* Document Selection */}
              {documents && documents.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Document to Analyze
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {documents.map((doc: any) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDocumentId(doc.id)}
                        className={`p-3 text-left border rounded transition-colors ${
                          selectedDocumentId === doc.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{doc.originalName}</span>
                          <Badge variant="outline">{doc.category}</Badge>
                        </div>
                      </button>
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
                disabled={!selectedDocumentId || !question.trim() || analysisMutation.isPending}
                className="w-full"
                size="lg"
              >
                {analysisMutation.isPending ? (
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