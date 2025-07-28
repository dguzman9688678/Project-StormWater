import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Camera, Brain, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface AnalysisResult {
  document: any;
  analysis?: any;
  recommendations: any[];
}

export default function UnifiedAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [description, setDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Document uploaded successfully",
        description: "Analyzing document and generating recommendations...",
      });
      
      // Wait a moment then fetch analysis and recommendations
      setTimeout(async () => {
        try {
          const [analysis, recommendations] = await Promise.all([
            api.getAnalysesByDocument(data.document.id),
            api.getRecommendations()
          ]);
          
          setAnalysisResult({
            document: data.document,
            analysis: analysis[0], // Get the latest analysis
            recommendations: recommendations.filter((rec: any) => 
              rec.sourceDocumentId === data.document.id
            )
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        } catch (error) {
          console.error('Failed to fetch analysis results:', error);
        }
      }, 3000); // Wait 3 seconds for AI processing
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml',
      'application/rtf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'text/html',
      'text/markdown',
      'text/x-log'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Unsupported file type",
        description: "Please upload PDF, DOCX, TXT, images, or other supported formats.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'stormwater');
    formData.append('description', description);

    // Clear previous results
    setAnalysisResult(null);
    
    uploadMutation.mutate(formData);
  };

  const downloadRecommendation = (rec: any) => {
    const content = `# ${rec.title}

**Category:** ${rec.category}
**Subcategory:** ${rec.subcategory || 'General'}
**Created:** ${new Date(rec.createdAt).toLocaleDateString()}

## Content
${rec.content}

## Citation
${rec.citation}

## Material Calculations & BMP Analysis
${rec.content.includes('MATERIAL CALCULATIONS') ? 
  'Detailed calculations included in content above.' : 
  'Material calculations available upon request.'}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Stormwater AI - Instant Analysis
        </h1>
        <p className="text-muted-foreground">
          Upload any document or image and get immediate engineering analysis with material calculations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Document or Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Drag and Drop Area */}
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
                  ${dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.md,.log"
                />
                
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium">Drop files here or click to browse</p>
                    <p className="text-sm text-muted-foreground">
                      Supports PDF, DOCX, TXT, Excel, images, and more
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the document content..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={uploadMutation.isPending || !file}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing & Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Upload & Analyze
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uploadMutation.isPending && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Analyzing document...</p>
                <p className="text-sm text-muted-foreground">
                  Generating engineering recommendations with material calculations
                </p>
              </div>
            )}

            {analysisResult && (
              <div className="space-y-4">
                {/* Document Info */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Document Processed</h3>
                  <p className="text-sm text-muted-foreground">
                    {analysisResult.document.originalName}
                  </p>
                  <Badge className="mt-2">
                    {analysisResult.document.category}
                  </Badge>
                </div>

                {/* Analysis */}
                {analysisResult.analysis && (
                  <div className="space-y-2">
                    <h3 className="font-medium">AI Analysis</h3>
                    <div className="bg-muted/30 rounded-lg p-4">
                      <p className="text-sm whitespace-pre-wrap">
                        {analysisResult.analysis.analysis.substring(0, 500)}...
                      </p>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {analysisResult.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">
                      Generated Recommendations ({analysisResult.recommendations.length})
                    </h3>
                    {analysisResult.recommendations.map((rec: any) => (
                      <div key={rec.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{rec.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {rec.content.substring(0, 150)}...
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {rec.subcategory || 'General'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(rec.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadRecommendation(rec)}
                            className="ml-2"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!uploadMutation.isPending && !analysisResult && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Upload a document to see analysis results here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}