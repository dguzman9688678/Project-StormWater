import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Brain, Download, CheckCircle, AlertCircle, Loader2, Search, BarChart3, Eye, Trash2, Settings, Database } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { AdminPage } from "./admin";
import { DocumentPreview } from "@/components/document-preview";
import { AnalysisResults } from "@/components/analysis-results";
import { AdminControls } from "@/components/admin-controls";
import { WorkbenchPanel } from "@/components/workbench-panel";
import { AnalysisPreview } from "@/components/analysis-preview";
import { EnhancedSearch } from "@/components/enhanced-search";

interface AnalysisResult {
  document: any;
  analysis?: any;
  recommendations: any[];
}

interface DocumentPreview {
  id: number;
  name: string;
  type: string;
  content: string;
  url?: string;
}

export default function ProfessionalMainPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedDocument, setSelectedDocument] = useState<DocumentPreview | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // System statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
  });

  // Document library
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => api.getDocuments(),
  });

  // Current session analyses
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

  // Upload mutation with professional error handling
  const uploadMutation = useMutation({
    mutationFn: async (filesData: { files: File[], description?: string }) => {
      const results = [];
      const totalFiles = filesData.files.length;
      
      for (let i = 0; i < filesData.files.length; i++) {
        const file = filesData.files[i];
        const formData = new FormData();
        formData.append('file', file);
        if (filesData.description) {
          formData.append('description', filesData.description);
        }
        formData.append('saveToLibrary', 'false');

        const progressKey = file.name;
        setUploadProgress(prev => ({ ...prev, [progressKey]: 0 }));

        try {
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${await response.text()}`);
          }
          
          const result = await response.json();
          results.push(result);
          
          setUploadProgress(prev => ({ ...prev, [progressKey]: 100 }));
          
        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          setUploadProgress(prev => ({ ...prev, [progressKey]: -1 }));
          throw error;
        }
      }
      
      return { results, totalUploaded: results.length };
    },
    onSuccess: async (data) => {
      const { results, totalUploaded } = data;
      
      toast({
        title: "Upload Successful",
        description: `${totalUploaded} document(s) uploaded and analyzed`,
      });
      
      // Clear files and reset progress
      setTimeout(() => {
        setFiles([]);
        setUploadProgress({});
      }, 2000);
      
      // Set analysis result for preview
      if (results.length > 0) {
        const lastResult = results[results.length - 1];
        
        if (lastResult.analysis) {
          setAnalysisResult({
            document: lastResult.document,
            analysis: lastResult.analysis,
            recommendations: lastResult.analysis.recommendations || []
          });
          
          // Set document for preview
          setSelectedDocument({
            id: lastResult.document.id,
            name: lastResult.document.originalName,
            type: lastResult.document.contentType || 'application/octet-stream',
            content: lastResult.document.content || '',
            url: lastResult.document.filePath
          });
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
      setUploadProgress({});
    },
  });

  // Admin-specific mutations
  const adminUploadMutation = useMutation({
    mutationFn: async (data: { files: File[], description?: string }) => {
      const results = [];
      
      for (const file of data.files) {
        const formData = new FormData();
        formData.append('file', file);
        if (data.description) {
          formData.append('description', data.description);
        }
        formData.append('saveToLibrary', 'true');
        
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}: ${await response.text()}`);
        }
        
        const result = await response.json();
        results.push(result);
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      toast({
        title: "Documents added to library",
        description: `${results.length} document(s) successfully added to reference library`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to add documents to library",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete document');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Document deleted",
        description: "Document removed from reference library",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete document from library",
        variant: "destructive",
      });
    },
  });

  // Admin handler functions
  const handleAdminUpload = (files: File[], description?: string) => {
    adminUploadMutation.mutate({
      files,
      description
    });
  };

  const handleDeleteDocument = (id: number) => {
    if (window.confirm('Are you sure you want to delete this document from the reference library? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  // File handling
  const handleFileSelect = (selectedFiles: File[]) => {
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  }, []);

  const handleUploadSubmit = () => {
    if (files.length === 0) return;
    
    uploadMutation.mutate({
      files: files,
      description: description || undefined
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      performSearch();
    }
  };

  const previewDocument = (doc: any) => {
    setSelectedDocument({
      id: doc.id,
      name: doc.originalName,
      type: doc.contentType || 'application/octet-stream',
      content: doc.content || '',
      url: doc.filePath
    });
  };

  const downloadReport = () => {
    if (!analysisResult) return;

    const reportContent = `
STORMWATER ANALYSIS REPORT
Generated: ${new Date().toLocaleDateString()}

DOCUMENT: ${analysisResult.document.originalName}
ANALYSIS: ${analysisResult.analysis?.analysis || 'N/A'}

RECOMMENDATIONS:
${analysisResult.recommendations.map((rec, i) => `${i + 1}. ${rec.title}\n   ${rec.content}`).join('\n\n')}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stormwater_analysis_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Downloaded",
      description: "Analysis report saved successfully",
    });
  };

  if (showAdminPanel) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <Button
              variant="ghost"
              onClick={() => setShowAdminPanel(false)}
              className="mr-4"
            >
              ← Back to Main
            </Button>
            <h1 className="text-xl font-semibold">System Administration</h1>
          </div>
        </div>
        <div className="p-6">
          <AdminControls 
            onUploadToLibrary={(files, description) => {
              adminUploadMutation.mutate({ files, description });
            }}
            onDeleteDocument={(id) => {
              if (window.confirm('Are you sure you want to delete this document from the reference library? This action cannot be undone.')) {
                deleteMutation.mutate(id);
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Header */}
      <header className="border-b bg-card">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              <h1 className="text-lg lg:text-2xl font-bold">Stormwater AI</h1>
            </div>
            <Badge variant="secondary" className="hidden sm:block">Professional Platform</Badge>
          </div>
          
          {/* Enhanced Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden lg:block">
            <EnhancedSearch 
              onResultSelect={(result) => {
                toast({
                  title: "Search Result Selected",
                  description: result.title,
                });
              }}
            />
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-4">
            {stats && (
              <div className="hidden md:flex items-center space-x-2 lg:space-x-4 text-xs lg:text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <FileText className="h-3 w-3 lg:h-4 lg:w-4" />
                  <span className="hidden lg:inline">{stats.documentCount} Documents</span>
                  <span className="lg:hidden">{stats.documentCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4" />
                  <span className="hidden lg:inline">{stats.recommendationCount} Recommendations</span>
                  <span className="lg:hidden">{stats.recommendationCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Brain className="h-3 w-3 lg:h-4 lg:w-4" />
                  <span className="hidden lg:inline">{stats.analysisCount} Analyses</span>
                  <span className="lg:hidden">{stats.analysisCount}</span>
                </div>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdminPanel(true)}
              className="flex items-center space-x-1 lg:space-x-2"
            >
              <Settings className="h-3 w-3 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Left Panel - Workbench */}
          <div className="w-full lg:w-1/2 border-r border-b lg:border-b-0 p-4 lg:p-6">
            <WorkbenchPanel
              files={files}
              setFiles={setFiles}
              description={description}
              setDescription={setDescription}
              onAnalyze={performAnalysis}
              isAnalyzing={analysisMutation.isPending}
              uploadProgress={uploadProgress}
            />
          </div>

          {/* Right Panel - Analysis Preview */}
          <div className="w-full lg:w-1/2 p-4 lg:p-6">
            <AnalysisPreview analysisResult={analysisResult} />
          </div>
        </div>
      </div>
    </div>
  );
}
                  <Upload className="h-5 w-5" />
                  <span>Document Upload</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drag & Drop Area */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports PDF, DOCX, TXT, images, and more
                  </p>
                  
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
                    className="mt-4"
                    accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.htm,.md,.log"
                  />
                </div>

                {/* Description Input */}
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the document content or specific analysis requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Selected Files */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Files ({files.length})</Label>
                    <ScrollArea className="h-32 border rounded p-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between py-1">
                          <span className="text-sm truncate">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                {/* Upload Progress */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-2">
                    <Label>Upload Progress</Label>
                    {Object.entries(uploadProgress).map(([filename, progress]) => (
                      <div key={filename} className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="truncate">{filename}</span>
                          <span>
                            {progress === -1 ? "Failed" : progress === 100 ? "Complete" : `${progress}%`}
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              progress === -1 ? "bg-destructive" : "bg-primary"
                            }`}
                            style={{ width: `${progress === -1 ? 100 : progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={handleUploadSubmit}
                  disabled={files.length === 0 || uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Upload & Analyze
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Search Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Document Search</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search documents, analyses, and recommendations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {searchResults && (
                  <div className="mt-4 space-y-2">
                    <Label>Search Results</Label>
                    <ScrollArea className="h-40 border rounded p-2">
                      {searchResults.documents?.map((doc: any) => (
                        <div key={doc.id} className="p-2 hover:bg-muted rounded cursor-pointer" onClick={() => previewDocument(doc)}>
                          <div className="font-medium text-sm">{doc.originalName}</div>
                          <div className="text-xs text-muted-foreground truncate">{doc.content?.substring(0, 100)}...</div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Document Preview & Analysis */}
          <div className="w-full lg:w-1/2 p-4 lg:p-6 space-y-4 lg:space-y-6">
            {/* Document Preview */}
            <DocumentPreview 
              document={selectedDocument ? {
                id: selectedDocument.id,
                originalName: selectedDocument.name,
                contentType: selectedDocument.type,
                content: selectedDocument.content,
                filePath: selectedDocument.url
              } : null}
              onDownload={(doc) => {
                // Handle document download
                toast({
                  title: "Download",
                  description: `Downloading ${doc.originalName}`,
                });
              }}
            />

            {/* Analysis Results */}
            <AnalysisResults 
              analysisResult={analysisResult}
              onDownloadReport={downloadReport}
              onUpdateRecommendation={(id, status) => {
                // Handle recommendation status updates
                toast({
                  title: "Status Updated",
                  description: `Recommendation marked as ${status}`,
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}