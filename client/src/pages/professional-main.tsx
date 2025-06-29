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
import { Claude4Search } from "@/components/claude4-search";
import { SessionDownload } from "@/components/session-download";

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
  const [sessionFiles, setSessionFiles] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // System statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
    refetchInterval: 120000, // Reduced from 30s to 2 minutes for better performance
  });

  // Analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async ({ files, description }: { files: File[], description?: string }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (description) formData.append('description', description);

      const response = await fetch('/api/documents/upload-analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setFiles([]);
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Analysis Complete",
        description: "Documents processed and analyzed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze documents",
        variant: "destructive",
      });
    },
  });

  // Admin upload mutation
  const adminUploadMutation = useMutation({
    mutationFn: async ({ files, description }: { files: File[], description?: string }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (description) formData.append('description', description);

      const response = await fetch('/api/documents/admin-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Upload successful",
        description: "Documents added to reference library",
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

  // Fetch session files
  const fetchSessionFiles = async () => {
    try {
      const response = await fetch('/api/documents/session-files');
      if (!response.ok) throw new Error('Failed to fetch session files');
      const data = await response.json();
      setSessionFiles(data.sessionFiles || []);
    } catch (error) {
      console.error('Error fetching session files:', error);
      toast({
        title: "Session Fetch Failed",
        description: "Could not load session files",
        variant: "destructive",
      });
    }
  };

  // Analysis function
  const performAnalysis = () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to analyze",
        variant: "destructive",
      });
      return;
    }
    
    // Show loading status
    toast({
      title: "Analysis Starting",
      description: "Processing documents with AI... Please wait.",
    });
    
    analysisMutation.mutate({ files, description });
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
          
          {/* Claude 4 Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden lg:block">
            <Claude4Search 
              onResultSelect={(result) => {
                toast({
                  title: "Search Result Selected",
                  description: result.title,
                });
              }}
            />
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-4">

            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/api/documents/download-session-zip'}
            >
              <Download className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
              Download Session
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdminPanel(true)}
            >
              <Settings className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
              Admin
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
            <AnalysisPreview 
              analysisResult={analysisResult ? {
                analysis: analysisResult.analysis?.analysis || "",
                insights: analysisResult.analysis?.insights || [],
                recommendations: analysisResult.recommendations || [],
                document: analysisResult.document ? {
                  name: analysisResult.document.originalName || "Unknown",
                  type: analysisResult.document.contentType || "application/octet-stream"
                } : undefined
              } : null} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}