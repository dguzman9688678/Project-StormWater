import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Plus, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface DocumentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GenerationRequest {
  title: string;
  query: string;
  sourceDocumentIds: number[];
  includeRecommendations: boolean;
  includeAnalyses: boolean;
  format: 'txt' | 'md' | 'docx' | 'pdf';
  template: 'report' | 'summary' | 'analysis' | 'recommendations';
}

export function DocumentGenerator({ isOpen, onClose }: DocumentGeneratorProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<GenerationRequest>({
    title: '',
    query: '',
    sourceDocumentIds: [],
    includeRecommendations: true,
    includeAnalyses: true,
    format: 'txt',
    template: 'report'
  });
  const [generatedDocument, setGeneratedDocument] = useState<any>(null);

  const { data: documents } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => api.getDocuments(),
  });

  const generateMutation = useMutation({
    mutationFn: async (data: GenerationRequest) => {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to generate document');
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedDocument(data);
      toast({
        title: "Document Generated",
        description: `Successfully generated ${data.title} with ${data.metadata.wordCount} words`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate document. Please try again.",
        variant: "destructive",
      });
    }
  });

  const downloadMutation = useMutation({
    mutationFn: async (data: GenerationRequest) => {
      const response = await fetch('/api/documents/generate/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to download document');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.${data.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Download Started",
        description: "Your document is being downloaded",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed", 
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerate = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate(formData);
  };

  const handleDownload = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Title Required", 
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }
    downloadMutation.mutate(formData);
  };

  const handleDocumentToggle = (documentId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      sourceDocumentIds: checked 
        ? [...prev.sourceDocumentIds, documentId]
        : prev.sourceDocumentIds.filter(id => id !== documentId)
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      query: '',
      sourceDocumentIds: [],
      includeRecommendations: true,
      includeAnalyses: true,
      format: 'txt',
      template: 'report'
    });
    setGeneratedDocument(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Generate Engineering Document
          </DialogTitle>
          <DialogDescription>
            Create comprehensive stormwater engineering reports from your uploaded documents and AI analysis
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Document Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Document Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Site Stormwater Management Plan"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="query">Focus/Query (Optional)</Label>
                  <Textarea
                    id="query"
                    placeholder="e.g., Focus on erosion control measures for steep slopes"
                    value={formData.query}
                    onChange={(e) => setFormData(prev => ({ ...prev, query: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template">Template</Label>
                    <Select value={formData.template} onValueChange={(value: any) => setFormData(prev => ({ ...prev, template: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="report">Comprehensive Report</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="analysis">Technical Analysis</SelectItem>
                        <SelectItem value="recommendations">Recommendations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="format">Format</Label>
                    <Select value={formData.format} onValueChange={(value: any) => setFormData(prev => ({ ...prev, format: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="txt">Text (.txt)</SelectItem>
                        <SelectItem value="md">Markdown (.md)</SelectItem>
                        <SelectItem value="docx">Word (.docx)</SelectItem>
                        <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeRecommendations"
                      checked={formData.includeRecommendations}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeRecommendations: checked as boolean }))}
                    />
                    <Label htmlFor="includeRecommendations">Include Recommendations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeAnalyses"
                      checked={formData.includeAnalyses}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeAnalyses: checked as boolean }))}
                    />
                    <Label htmlFor="includeAnalyses">Include AI Analyses</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Source Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source Documents</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select documents to include in the generated report
                </p>
              </CardHeader>
              <CardContent>
                {documents && documents.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          checked={formData.sourceDocumentIds.includes(doc.id)}
                          onCheckedChange={(checked) => handleDocumentToggle(doc.id, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.originalName}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {doc.category.toUpperCase()}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !formData.title.trim()}
                className="flex-1"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
              <Button
                onClick={handleDownload}
                disabled={downloadMutation.isPending || !formData.title.trim()}
                variant="outline"
                className="flex-1"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedDocument ? (
                  <div className="space-y-4">
                    <div className="border-b pb-4">
                      <h3 className="font-semibold">{generatedDocument.title}</h3>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                        <div>Words: {generatedDocument.metadata.wordCount}</div>
                        <div>Sections: {generatedDocument.metadata.sections.length}</div>
                        <div>Sources: {generatedDocument.metadata.sourceDocuments.length}</div>
                        <div>Generated: {new Date(generatedDocument.metadata.generatedAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {generatedDocument.content.substring(0, 2000)}
                        {generatedDocument.content.length > 2000 && '\n\n... (truncated for preview)'}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Generate a document to see the preview</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}