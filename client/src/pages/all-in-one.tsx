import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Brain, Download, CheckCircle, AlertCircle, Loader2, Search, BarChart3, Bookmark, BookmarkCheck, Trash2, X } from "lucide-react";
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
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [saveToLibrary, setSaveToLibrary] = useState(false);
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

  const { data: recommendations = [] } = useQuery({
    queryKey: ["/api/recommendations"],
    queryFn: () => api.getRecommendations(),
  });

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
          setAnalysisResult({
            document: lastResult.document,
            analysis: lastResult.analysis,
            recommendations: lastResult.analysis.recommendations || []
          });
          
          toast({
            title: "Analysis complete!",
            description: `${totalUploaded} documents analyzed using reference library.`,
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
              queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
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

  const filteredDocuments = documents.filter((doc: any) => 
    !searchQuery || doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecommendations = recommendations.filter((rec: any) => 
    !searchQuery || rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rec.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
            <TabsTrigger value="documents">Source Library</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="analyses">AI Analyses</TabsTrigger>
          </TabsList>

          {/* Upload & Analyze Tab */}
          <TabsContent value="upload" className="space-y-6">
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
                            {analysisResult.recommendations.slice(0, 3).map((rec: any) => (
                              <div key={rec.id} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-500">
                                <div className="font-medium text-sm">{rec.title}</div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {rec.content.substring(0, 150)}...
                                </p>
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {rec.subcategory || 'General'}
                                </Badge>
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
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Source Document Library</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredDocuments.map((doc: any) => (
                      <div key={doc.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{doc.originalName}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {doc.content.substring(0, 200)}...
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
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {filteredRecommendations.map((rec: any) => (
                      <div key={rec.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{rec.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {rec.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{rec.subcategory || 'General'}</Badge>
                              <span className="text-xs text-gray-500">{rec.citation}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => bookmarkMutation.mutate(rec.id)}
                          >
                            {rec.isBookmarked ? (
                              <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analyses Tab */}
          <TabsContent value="analyses">
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
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
                              {analysis.analysis.substring(0, 200)}...
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}