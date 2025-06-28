import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Brain, Download, CheckCircle, AlertCircle, Loader2, Search, BarChart3, Bookmark, BookmarkCheck, Trash2, X, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface AnalysisResult {
  document: any;
  analysis?: any;
  recommendations: any[];
}

export default function AllInOnePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Clear analysis results when component mounts (new session)
  useState(() => {
    setAnalysisResult(null);
  });
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [downloadType, setDownloadType] = useState<"single" | "all">("single");
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => api.getDocuments(),
  });

  // Remove historical recommendations - only show current session recommendations

  const { data: analyses = [] } = useQuery({
    queryKey: ["/api/analyses"],
    queryFn: () => api.getAnalyses(),
  });

  // Search functionality
  const { data: searchResults, refetch: performSearch } = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => searchQuery ? api.search(searchQuery) : null,
    enabled: false,
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!response.ok) throw new Error('Failed to send message');
      return response.json();
    },
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }]);
      setIsChatting(false);
    },
    onError: () => {
      toast({
        title: "Chat Error",
        description: "Failed to get response from Claude. Please try again.",
        variant: "destructive",
      });
      setIsChatting(false);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async (filesData: { files: File[], description?: string, saveToLibrary?: boolean }) => {
      const results = [];
      const totalFiles = filesData.files.length;
      
      for (let i = 0; i < filesData.files.length; i++) {
        const file = filesData.files[i];
        const formData = new FormData();
        formData.append('file', file);
        if (filesData.description) {
          formData.append('description', filesData.description);
        }
        formData.append('saveToLibrary', 'false'); // Only admin can save to library

        // Update progress
        const progressKey = file.name;
        setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));

        try {
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Failed to upload ${file.name}: ${await response.text()}`);
          }
          
          const result = await response.json();
          results.push(result);
          
          // Update progress to completed
          setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
          
          toast({
            title: `File ${i + 1}/${totalFiles} uploaded`,
            description: `${file.name} uploaded successfully`,
          });
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          setUploadProgress(prev => ({ ...prev, [progressKey]: -1 })); // Mark as failed
          toast({
            title: "Upload failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
        }
      }
      
      return { results, totalUploaded: results.length };
    },
    onSuccess: async (data) => {
      const { results, totalUploaded } = data;
      
      toast({
        title: `${totalUploaded} documents uploaded`,
        description: "Analyzing documents and generating recommendations...",
      });
      
      // Clear files and reset progress after a delay
      setTimeout(() => {
        setFiles([]);
        setUploadProgress({});
      }, 3000);
      
      // Show analysis result for the last uploaded document
      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        
        // If document has immediate analysis (temporary mode), show it
        if (lastResult.analysis) {
          console.log('Analysis result received:', lastResult.analysis);
          console.log('Recommendations found:', lastResult.analysis.recommendations);
          setAnalysisResult({
            document: lastResult.document,
            analysis: lastResult.analysis,
            recommendations: lastResult.analysis.recommendations || []
          });

          // Auto-start conversation with Claude about the uploaded document
          const initialMessage = `I've uploaded a document called "${lastResult.document.originalName}". Can you analyze this document and tell me what stormwater issues or solutions it contains? Please reference information from your knowledge library to provide comprehensive guidance.`;
          
          setChatMessages([{
            id: Date.now().toString(),
            role: 'user',
            content: initialMessage,
            timestamp: new Date()
          }]);
          
          setIsChatting(true);
          chatMutation.mutate(initialMessage);
          
          toast({
            title: "Analysis complete!",
            description: `${totalUploaded} documents analyzed using reference library. Claude is ready to discuss!`,
          });
        } else if (lastResult.savedToLibrary) {
          // For library documents, wait for background analysis
          setTimeout(async () => {
            try {
              const [analysis, recs] = await Promise.all([
                api.getAnalysesByDocument(lastResult.document.id),
                api.getRecommendations()
              ]);
              
              setAnalysisResult({
                document: lastResult.document,
                analysis: analysis[0],
                recommendations: recs.slice(0, 5)
              });

              queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
              // No need to invalidate recommendations - using current session only
              queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
              queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

              toast({
                title: "Analysis complete!",
                description: `${totalUploaded} documents saved to library and analyzed.`,
              });
            } catch (error) {
              console.error('Analysis error:', error);
              toast({
                title: "Documents saved",
                description: `${totalUploaded} documents saved to library.`,
                variant: "default",
              });
            }
          }, 2000);
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Batch upload failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
      setUploadProgress({});
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (id: number) => api.toggleBookmark(id),
    onSuccess: () => {
      // No need to invalidate recommendations - using current session only
      toast({
        title: "Bookmark updated",
        description: "Recommendation bookmark status changed.",
      });
    },
  });

  const handleFileSelect = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    
    uploadMutation.mutate({
      files: selectedFiles,
      description: description || undefined
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const downloadRecommendation = (recommendation: any, index: number) => {
    setSelectedRecommendation(recommendation);
    setDownloadType("single");
    setDownloadDialogOpen(true);
  };

  const downloadAllRecommendations = () => {
    setDownloadType("all");
    setDownloadDialogOpen(true);
  };

  const handleDownload = () => {
    if (!selectedFormat) return;

    if (downloadType === "single" && selectedRecommendation) {
      downloadSingleFile(selectedRecommendation, selectedFormat);
    } else if (downloadType === "all") {
      downloadAllFiles(selectedFormat);
    }

    setDownloadDialogOpen(false);
    setSelectedFormat("");
  };

  const downloadSingleFile = (recommendation: any, format: string) => {
    const content = generateSingleContent(recommendation, format);
    const mimeType = getMimeType(format);
    const extension = getFileExtension(format);

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recommendation.title.replace(/[^a-zA-Z0-9]/g, '_')}_recommendation.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `${recommendation.title} downloaded as ${format.toUpperCase()} file.`,
    });
  };

  const downloadAllFiles = (format: string) => {
    if (!analysisResult?.recommendations?.length) return;

    const documentName = analysisResult.document?.originalName || 'Document';
    const content = generateAllContent(format);
    const mimeType = getMimeType(format);
    const extension = getFileExtension(format);

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName.replace(/\.[^/.]+$/, "")}_stormwater_analysis_report.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Complete report downloaded",
      description: `Full analysis report with ${analysisResult.recommendations.length} recommendations downloaded as ${format.toUpperCase()}.`,
    });
  };

  const generateSingleContent = (recommendation: any, format: string) => {
    switch (format) {
      case 'markdown':
        return `# ${recommendation.title}

## Category
${recommendation.subcategory || recommendation.category || 'Stormwater'}

## Recommendation Details
${recommendation.content}

${recommendation.citation ? `## Source Citation
${recommendation.citation}` : ''}

## Generated Information
- Generated: ${new Date().toLocaleDateString()}
- Session: Current analysis session
- System: Stormwater AI

---
This recommendation was generated by Stormwater AI based on analysis of uploaded documents and reference library content.
`;

      case 'text':
        return `${recommendation.title}

Category: ${recommendation.subcategory || recommendation.category || 'Stormwater'}

Recommendation Details:
${recommendation.content}

${recommendation.citation ? `Source Citation: ${recommendation.citation}` : ''}

Generated Information:
- Generated: ${new Date().toLocaleDateString()}
- Session: Current analysis session
- System: Stormwater AI

This recommendation was generated by Stormwater AI based on analysis of uploaded documents and reference library content.
`;

      case 'html':
        return `<!DOCTYPE html>
<html>
<head>
    <title>${recommendation.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; }
        h2 { color: #1e40af; margin-top: 30px; }
        .citation { background: #f0f9ff; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; }
        .metadata { background: #f9fafb; padding: 15px; border: 1px solid #e5e7eb; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>${recommendation.title}</h1>
    
    <h2>Category</h2>
    <p>${recommendation.subcategory || recommendation.category || 'Stormwater'}</p>
    
    <h2>Recommendation Details</h2>
    <p>${recommendation.content.replace(/\n/g, '<br>')}</p>
    
    ${recommendation.citation ? `<div class="citation">
        <h2>Source Citation</h2>
        <p>${recommendation.citation}</p>
    </div>` : ''}
    
    <div class="metadata">
        <h2>Generated Information</h2>
        <ul>
            <li>Generated: ${new Date().toLocaleDateString()}</li>
            <li>Session: Current analysis session</li>
            <li>System: Stormwater AI</li>
        </ul>
        <p><em>This recommendation was generated by Stormwater AI based on analysis of uploaded documents and reference library content.</em></p>
    </div>
</body>
</html>`;

      default:
        return generateSingleContent(recommendation, 'text');
    }
  };

  const generateAllContent = (format: string) => {
    if (!analysisResult?.recommendations?.length) return '';

    const documentName = analysisResult.document?.originalName || 'Document';

    switch (format) {
      case 'markdown':
        return `# Stormwater AI Analysis Report

## Analyzed Document
**File:** ${documentName}
**Analysis Date:** ${new Date().toLocaleDateString()}
**Generated by:** Stormwater AI

## AI Analysis Summary
${analysisResult.analysis?.analysis || 'Analysis completed successfully.'}

## Recommendations (${analysisResult.recommendations.length})

${analysisResult.recommendations.map((rec: any, index: number) => `
### ${index + 1}. ${rec.title}

**Category:** ${rec.subcategory || rec.category || 'Stormwater'}

**Details:**
${rec.content}

${rec.citation ? `**Source:** ${rec.citation}` : ''}

---
`).join('')}

## Additional Information
- This report was generated by Stormwater AI
- Recommendations are based on analysis of uploaded documents and reference library
- For technical support or questions, contact the system administrator

*End of Report*
`;

      case 'text':
        return `STORMWATER AI ANALYSIS REPORT

Analyzed Document: ${documentName}
Analysis Date: ${new Date().toLocaleDateString()}
Generated by: Stormwater AI

AI ANALYSIS SUMMARY
${analysisResult.analysis?.analysis || 'Analysis completed successfully.'}

RECOMMENDATIONS (${analysisResult.recommendations.length})

${analysisResult.recommendations.map((rec: any, index: number) => `
${index + 1}. ${rec.title}

Category: ${rec.subcategory || rec.category || 'Stormwater'}

Details:
${rec.content}

${rec.citation ? `Source: ${rec.citation}` : ''}

----------------------------------------
`).join('')}

ADDITIONAL INFORMATION
- This report was generated by Stormwater AI
- Recommendations are based on analysis of uploaded documents and reference library
- For technical support or questions, contact the system administrator

End of Report
`;

      case 'html':
        return `<!DOCTYPE html>
<html>
<head>
    <title>Stormwater AI Analysis Report - ${documentName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; }
        h2 { color: #1e40af; margin-top: 30px; }
        h3 { color: #1e3a8a; }
        .document-info { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; margin: 20px 0; }
        .recommendation { background: #f0f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .citation { background: #ecfdf5; padding: 10px; border-left: 4px solid #10b981; margin: 10px 0; }
        .footer { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; margin-top: 40px; }
    </style>
</head>
<body>
    <h1>Stormwater AI Analysis Report</h1>
    
    <div class="document-info">
        <h2>Analyzed Document</h2>
        <p><strong>File:</strong> ${documentName}</p>
        <p><strong>Analysis Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Generated by:</strong> Stormwater AI</p>
    </div>
    
    <h2>AI Analysis Summary</h2>
    <p>${(analysisResult.analysis?.analysis || 'Analysis completed successfully.').replace(/\n/g, '<br>')}</p>
    
    <h2>Recommendations (${analysisResult.recommendations.length})</h2>
    
    ${analysisResult.recommendations.map((rec: any, index: number) => `
    <div class="recommendation">
        <h3>${index + 1}. ${rec.title}</h3>
        <p><strong>Category:</strong> ${rec.subcategory || rec.category || 'Stormwater'}</p>
        <p><strong>Details:</strong></p>
        <p>${rec.content.replace(/\n/g, '<br>')}</p>
        ${rec.citation ? `<div class="citation">
            <strong>Source:</strong> ${rec.citation}
        </div>` : ''}
    </div>
    `).join('')}
    
    <div class="footer">
        <h2>Additional Information</h2>
        <ul>
            <li>This report was generated by Stormwater AI</li>
            <li>Recommendations are based on analysis of uploaded documents and reference library</li>
            <li>For technical support or questions, contact the system administrator</li>
        </ul>
        <p><em>End of Report</em></p>
    </div>
</body>
</html>`;

      default:
        return generateAllContent('text');
    }
  };

  const getMimeType = (format: string) => {
    switch (format) {
      case 'markdown': return 'text/markdown';
      case 'html': return 'text/html';
      case 'text': return 'text/plain';
      default: return 'text/plain';
    }
  };

  const getFileExtension = (format: string) => {
    switch (format) {
      case 'markdown': return 'md';
      case 'html': return 'html';
      case 'text': return 'txt';
      default: return 'txt';
    }
  };

  const sendMessage = () => {
    if (!currentMessage.trim() || isChatting) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: currentMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsChatting(true);
    chatMutation.mutate(currentMessage);
  };

  const filteredDocuments = documents.filter((doc: any) => 
    !searchQuery || doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Current session recommendations are managed through analysisResult state

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Stormwater AI</h1>
            <p className="text-gray-600 dark:text-gray-300">Complete stormwater analysis and document management</p>
          </div>
        </div>

        {/* Global Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search documents, recommendations, and analyses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => performSearch()} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="main" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main">Upload, Analyze & Recommendations</TabsTrigger>
            <TabsTrigger value="admin">Administrator</TabsTrigger>
          </TabsList>

          {/* Main Tab - Upload, Analyze & Recommendations */}
          <TabsContent value="main" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Document or Image
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the documents or problem you're uploading..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Analysis Mode:</strong> Documents will be analyzed against the reference library but not permanently stored. Only the system administrator can add documents to the reference library.
                    </p>
                  </div>

                  {/* File Preview Section */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <Label>Selected Files ({files.length})</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {files.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="truncate">{file.name}</span>
                              <span className="text-gray-500 flex-shrink-0">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {uploadProgress[file.name] !== undefined && (
                                <div className="flex items-center gap-1">
                                  {uploadProgress[file.name] === 100 ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : uploadProgress[file.name] === -1 ? (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                  )}
                                </div>
                              )}
                              {!uploadMutation.isPending && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                      ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
                      hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        if (selectedFiles.length > 0) handleFileSelect(selectedFiles);
                      }}
                      accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.htm,.md,.log"
                    />
                    
                    {uploadMutation.isPending ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">Uploading and analyzing...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Drop multiple files here or click to upload
                        </p>
                        <p className="text-xs text-gray-500">
                          Supports PDF, DOCX, TXT, images, and more • Multiple files supported
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Instant Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Instant Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Analysis Complete
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          Document: {analysisResult.document.originalName}
                        </p>
                      </div>

                      {analysisResult.analysis && (
                        <div>
                          <h4 className="font-medium mb-2">AI Analysis</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                            {analysisResult.analysis.analysis}
                          </p>
                        </div>
                      )}

                      {analysisResult.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Key Recommendations</h4>
                          <div className="space-y-2">
                            {analysisResult.recommendations.slice(0, 3).map((rec: any, index: number) => (
                              <div key={rec.id || `rec-preview-${index}`} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-500">
                                <div className="font-medium text-sm">{rec.title}</div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {rec.content.substring(0, 150)}...
                                </p>
                                <div className="mt-2 space-y-1">
                                  <Badge variant="outline" className="text-xs">
                                    {rec.subcategory || rec.category || 'General'}
                                  </Badge>
                                  {rec.citation && (
                                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                                      📚 {rec.citation.substring(0, 50)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Upload a document to see instant analysis results</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chat Interface */}
              {chatMessages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-blue-600" />
                      Discussion with Claude about Your Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.role === 'user'
                              ? 'bg-blue-50 dark:bg-blue-900/20 ml-8'
                              : 'bg-gray-50 dark:bg-gray-800 mr-8'
                          }`}
                        >
                          <div className="text-sm font-medium mb-1">
                            {message.role === 'user' ? 'You' : 'Claude'}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                      {isChatting && (
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 mr-8">
                          <div className="text-sm font-medium mb-1">Claude</div>
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Analyzing and responding...</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask Claude about your documents or stormwater guidance..."
                        className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isChatting}
                      />
                      <Button 
                        onClick={sendMessage} 
                        disabled={!currentMessage.trim() || isChatting}
                        className="px-4"
                      >
                        Send
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Current Session Recommendations */}
            {analysisResult && analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Current Session Recommendations
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAllRecommendations()}
                      className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {analysisResult.recommendations.map((rec: any, index: number) => (
                      <div key={rec.id || `rec-${index}`} className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-blue-900 dark:text-blue-100">{rec.title}</h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                              {rec.content}
                            </p>
                            <div className="space-y-2 mt-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300">
                                  {rec.subcategory || rec.category || 'Stormwater'}
                                </Badge>
                              </div>
                              {rec.citation && (
                                <div className="p-2 bg-white dark:bg-gray-800 rounded border-l-2 border-green-500">
                                  <div className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                    📚 Source Reference:
                                  </div>
                                  <div className="text-xs text-gray-700 dark:text-gray-300">
                                    {rec.citation}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                            onClick={() => downloadRecommendation(rec, index)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>



          {/* Administrator Tab */}
          <TabsContent value="admin" className="space-y-6">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Administrator Access:</strong> This section is for managing the reference library that AI uses for analysis. Only authorized administrators can add documents to the permanent library.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Library Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Reference Document Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {filteredDocuments.map((doc: any) => (
                        <div key={doc.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium">{doc.originalName}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {doc.content.substring(0, 150)}...
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline">{doc.category}</Badge>
                                <span className="text-xs text-gray-500">
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* AI Analysis History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Analysis History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {analyses.map((analysis: any) => (
                        <div key={analysis.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium">Analysis #{analysis.id}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                Query: {analysis.query}
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                                {analysis.analysis.substring(0, 150)}...
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500">
                                  {new Date(analysis.createdAt).toLocaleDateString()}
                                </span>
                                {analysis.insights && analysis.insights.length > 0 && (
                                  <Badge variant="outline">{analysis.insights.length} insights</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Download Format Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Choose Download Format
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select file format for download:
              </label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose format..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text File (.txt)</SelectItem>
                  <SelectItem value="markdown">Markdown (.md)</SelectItem>
                  <SelectItem value="html">HTML (.html)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {downloadType === "single" && selectedRecommendation ? (
                <p>Downloading: <strong>{selectedRecommendation.title}</strong></p>
              ) : downloadType === "all" ? (
                <p>Downloading: <strong>Complete analysis report with all recommendations</strong></p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDownloadDialogOpen(false);
                setSelectedFormat("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!selectedFormat}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}