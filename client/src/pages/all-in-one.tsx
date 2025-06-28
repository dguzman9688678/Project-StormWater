import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Brain, Download, CheckCircle, AlertCircle, Loader2, Search, BarChart3, Bookmark, BookmarkCheck, Trash2, X, Database, RefreshCw, Sparkles, Shield, Award, Zap, MessageSquare, TrendingUp } from "lucide-react";
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
  const [bulkOperationMode, setBulkOperationMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [autoAnalysisEnabled, setAutoAnalysisEnabled] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: '',
    dateRange: '',
    fileType: '',
    sizeRange: ''
  });
  const [exportInProgress, setExportInProgress] = useState(false);
  const [templateMode, setTemplateMode] = useState<'standard' | 'professional' | 'compliance'>('standard');
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
        body: JSON.stringify({ 
          message,
          currentDocument: analysisResult?.document || null
        })
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
          const fileExtension = lastResult.document.originalName.toLowerCase();
          const isImage = fileExtension.includes('.jpg') || fileExtension.includes('.jpeg') || fileExtension.includes('.png') || fileExtension.includes('.gif') || fileExtension.includes('.bmp') || fileExtension.includes('.webp');
          
          const descriptionText = description.trim() ? `\n\nAdditional context: ${description}` : '';
          
          const initialMessage = isImage 
            ? `I've uploaded an image called "${lastResult.document.originalName}". Please analyze this image to identify any stormwater management issues, problems, or conditions visible in the photo. Then use the documents in your reference library to provide specific solutions, recommendations, and guidance for addressing what you see in the image.${descriptionText}`
            : `I've uploaded a document called "${lastResult.document.originalName}". Can you analyze this document and tell me what stormwater issues or solutions it contains? Please reference information from your knowledge library to provide comprehensive guidance.${descriptionText}`;
          
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
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

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

  const handleDeleteDocument = (id: number) => {
    if (window.confirm('Are you sure you want to delete this document from the reference library? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const adminUploadMutation = useMutation({
    mutationFn: async (data: { files: File[], description?: string }) => {
      const results = [];
      
      for (const file of data.files) {
        const formData = new FormData();
        formData.append('file', file);
        if (data.description) {
          formData.append('description', data.description);
        }
        formData.append('saveToLibrary', 'true'); // Force save to library for admin
        
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
      setDescription(''); // Clear description
      
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

  const handleAdminUpload = (files: File[]) => {
    if (files.length > 0) {
      adminUploadMutation.mutate({
        files,
        description: description || undefined
      });
    }
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
    if (!analysisResult?.recommendations?.length && chatMessages.length === 0) return;

    const documentName = analysisResult?.document?.originalName || 'Document';
    const content = generateCompleteReportContent(format);
    const mimeType = getMimeType(format);
    const extension = getFileExtension(format);

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${documentName.replace(/\.[^/.]+$/, "")}_complete_stormwater_report.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const totalItems = (analysisResult?.recommendations?.length || 0) + chatMessages.length;
    toast({
      title: "Complete report downloaded",
      description: `Full report with ${analysisResult?.recommendations?.length || 0} recommendations and ${chatMessages.length} chat messages downloaded as ${format.toUpperCase()}.`,
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

      case 'csv':
        return `Title,Category,Content,Citation,Generated Date,System
"${recommendation.title}","${recommendation.subcategory || recommendation.category || 'Stormwater'}","${recommendation.content.replace(/"/g, '""')}","${recommendation.citation || 'N/A'}","${new Date().toLocaleDateString()}","Stormwater AI"`;

      case 'json':
        return JSON.stringify({
          title: recommendation.title,
          category: recommendation.subcategory || recommendation.category || 'Stormwater',
          content: recommendation.content,
          citation: recommendation.citation || null,
          generatedDate: new Date().toLocaleDateString(),
          system: 'Stormwater AI',
          metadata: {
            session: 'Current analysis session',
            type: 'Single recommendation'
          }
        }, null, 2);

      case 'rtf':
        return `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 {\\b ${recommendation.title}}\\par
\\par
{\\b Category:} ${recommendation.subcategory || recommendation.category || 'Stormwater'}\\par
\\par
{\\b Recommendation Details:}\\par
${recommendation.content.replace(/\n/g, '\\par ')}\\par
\\par
${recommendation.citation ? `{\\b Source Citation:} ${recommendation.citation}\\par\\par` : ''}
{\\b Generated Information:}\\par
Generated: ${new Date().toLocaleDateString()}\\par
Session: Current analysis session\\par
System: Stormwater AI\\par
\\par
This recommendation was generated by Stormwater AI based on analysis of uploaded documents and reference library content.\\par
}`;

      case 'pdf':
      case 'docx':
      case 'xlsx':
        // For complex formats, fall back to text for now
        // These would need server-side libraries to generate properly
        toast({
          title: "Format Notice",
          description: `${format.toUpperCase()} format will be generated as text. Professional document generation requires server processing.`,
        });
        return generateSingleContent(recommendation, 'text');

      default:
        return generateSingleContent(recommendation, 'text');
    }
  };

  const generateCompleteReportContent = (format: string) => {
    const documentName = analysisResult?.document?.originalName || 'Document';
    const hasRecommendations = analysisResult?.recommendations && analysisResult.recommendations.length > 0;
    const hasChat = chatMessages.length > 0;

    switch (format) {
      case 'markdown':
        return `# Complete Stormwater AI Report

## Document Information
**File:** ${documentName}
**Analysis Date:** ${new Date().toLocaleDateString()}
**Generated by:** Stormwater AI

${analysisResult?.analysis ? `## AI Analysis Summary
${analysisResult.analysis.analysis}` : ''}

${hasRecommendations ? `## Initial Recommendations (${analysisResult!.recommendations.length})

${analysisResult!.recommendations.map((rec: any, index: number) => `
### ${index + 1}. ${rec.title}

**Category:** ${rec.subcategory || rec.category || 'Stormwater'}

**Details:**
${rec.content}

${rec.citation ? `**Source:** ${rec.citation}` : ''}

---
`).join('')}` : ''}

${hasChat ? `## Discussion with Claude

${chatMessages.map((msg, index) => `
### ${msg.role === 'user' ? 'Your Question' : 'Claude\'s Response'} ${index + 1}
**Time:** ${msg.timestamp.toLocaleString()}

${msg.content}

---
`).join('')}` : ''}

## Report Summary
- **Total Recommendations:** ${analysisResult?.recommendations?.length || 0}
- **Discussion Messages:** ${chatMessages.length}
- **Generated:** ${new Date().toLocaleString()}
- **System:** Stormwater AI

*This comprehensive report includes initial analysis, recommendations, and complete discussion history.*
`;

      case 'text':
        return `COMPLETE STORMWATER AI REPORT

Document Information:
File: ${documentName}
Analysis Date: ${new Date().toLocaleDateString()}
Generated by: Stormwater AI

${analysisResult?.analysis ? `AI ANALYSIS SUMMARY
${analysisResult.analysis.analysis}

` : ''}${hasRecommendations ? `INITIAL RECOMMENDATIONS (${analysisResult.recommendations.length})

${analysisResult.recommendations.map((rec: any, index: number) => `
${index + 1}. ${rec.title}

Category: ${rec.subcategory || rec.category || 'Stormwater'}

Details:
${rec.content}

${rec.citation ? `Source: ${rec.citation}` : ''}

----------------------------------------
`).join('')}` : ''}

${hasChat ? `DISCUSSION WITH CLAUDE

${chatMessages.map((msg, index) => `
${msg.role === 'user' ? 'YOUR QUESTION' : 'CLAUDE\'S RESPONSE'} ${index + 1}
Time: ${msg.timestamp.toLocaleString()}

${msg.content}

----------------------------------------
`).join('')}` : ''}

REPORT SUMMARY
- Total Recommendations: ${analysisResult?.recommendations?.length || 0}
- Discussion Messages: ${chatMessages.length}
- Generated: ${new Date().toLocaleString()}
- System: Stormwater AI

This comprehensive report includes initial analysis, recommendations, and complete discussion history.
`;

      case 'html':
        return `<!DOCTYPE html>
<html>
<head>
    <title>Complete Stormwater AI Report - ${documentName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; }
        h2 { color: #1e40af; margin-top: 30px; }
        h3 { color: #1e3a8a; }
        .document-info { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; margin: 20px 0; }
        .recommendation { background: #f0f9ff; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .chat-message { background: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 8px; }
        .user-message { background: #eff6ff; border-left: 4px solid #3b82f6; }
        .assistant-message { background: #f0fdf4; border-left: 4px solid #10b981; }
        .citation { background: #ecfdf5; padding: 10px; border-left: 4px solid #10b981; margin: 10px 0; }
        .summary { background: #fef3c7; padding: 20px; border: 1px solid #f59e0b; margin-top: 40px; }
    </style>
</head>
<body>
    <h1>Complete Stormwater AI Report</h1>
    
    <div class="document-info">
        <h2>Document Information</h2>
        <p><strong>File:</strong> ${documentName}</p>
        <p><strong>Analysis Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Generated by:</strong> Stormwater AI</p>
    </div>
    
    ${analysisResult?.analysis ? `<h2>AI Analysis Summary</h2>
    <p>${analysisResult.analysis.analysis.replace(/\n/g, '<br>')}</p>` : ''}
    
    ${hasRecommendations ? `<h2>Initial Recommendations (${analysisResult.recommendations.length})</h2>
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
    `).join('')}` : ''}
    
    ${hasChat ? `<h2>Discussion with Claude</h2>
    ${chatMessages.map((msg, index) => `
    <div class="chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}">
        <h3>${msg.role === 'user' ? 'Your Question' : 'Claude\'s Response'} ${index + 1}</h3>
        <p><small><strong>Time:</strong> ${msg.timestamp.toLocaleString()}</small></p>
        <p>${msg.content.replace(/\n/g, '<br>')}</p>
    </div>
    `).join('')}` : ''}
    
    <div class="summary">
        <h2>Report Summary</h2>
        <ul>
            <li><strong>Total Recommendations:</strong> ${analysisResult?.recommendations?.length || 0}</li>
            <li><strong>Discussion Messages:</strong> ${chatMessages.length}</li>
            <li><strong>Generated:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>System:</strong> Stormwater AI</li>
        </ul>
        <p><em>This comprehensive report includes initial analysis, recommendations, and complete discussion history.</em></p>
    </div>
</body>
</html>`;

      case 'csv':
        const csvHeader = 'Type,Number,Title/Role,Category,Content,Citation,Timestamp,System';
        const rows: string[] = [];
        
        // Add recommendations
        if (hasRecommendations) {
          analysisResult!.recommendations.forEach((rec: any, index: number) => {
            rows.push(`"Recommendation","${index + 1}","${rec.title}","${rec.subcategory || rec.category || 'Stormwater'}","${rec.content.replace(/"/g, '""')}","${rec.citation || 'N/A'}","${new Date().toLocaleDateString()}","Stormwater AI"`);
          });
        }
        
        // Add chat messages
        if (hasChat) {
          chatMessages.forEach((msg, index) => {
            rows.push(`"Chat Message","${index + 1}","${msg.role === 'user' ? 'User' : 'Claude'}","Discussion","${msg.content.replace(/"/g, '""')}","N/A","${msg.timestamp.toLocaleString()}","Stormwater AI"`);
          });
        }
        
        return [csvHeader, ...rows].join('\n');

      case 'json':
        return JSON.stringify({
          document: {
            name: documentName,
            analysisDate: new Date().toLocaleDateString(),
            generatedBy: 'Stormwater AI'
          },
          analysis: analysisResult?.analysis ? {
            summary: analysisResult.analysis.analysis,
            insights: analysisResult.analysis.insights || []
          } : null,
          initialRecommendations: hasRecommendations ? analysisResult.recommendations.map((rec: any, index: number) => ({
            number: index + 1,
            title: rec.title,
            category: rec.subcategory || rec.category || 'Stormwater',
            content: rec.content,
            citation: rec.citation || null
          })) : [],
          chatDiscussion: hasChat ? chatMessages.map((msg, index) => ({
            messageNumber: index + 1,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
          })) : [],
          summary: {
            totalRecommendations: analysisResult?.recommendations?.length || 0,
            totalChatMessages: chatMessages.length,
            generatedAt: new Date().toISOString(),
            system: 'Stormwater AI'
          }
        }, null, 2);

      case 'rtf':
        const rtfContent = [
          '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}',
          '\\f0\\fs24 {\\b\\fs32 Complete Stormwater AI Report}\\par',
          '\\par',
          '{\\b Document Information:}\\par',
          `File: ${documentName}\\par`,
          `Analysis Date: ${new Date().toLocaleDateString()}\\par`,
          'Generated by: Stormwater AI\\par',
          '\\par'
        ];

        if (analysisResult?.analysis) {
          rtfContent.push('{\\b AI Analysis Summary:}\\par');
          rtfContent.push(analysisResult.analysis.analysis.replace(/\n/g, '\\par '));
          rtfContent.push('\\par');
          rtfContent.push('\\par');
        }

        if (hasRecommendations) {
          rtfContent.push(`{\\b Initial Recommendations (${analysisResult.recommendations.length}):}\\par`);
          rtfContent.push('\\par');
          analysisResult.recommendations.forEach((rec: any, index: number) => {
            rtfContent.push(`{\\b ${index + 1}. ${rec.title}}\\par`);
            rtfContent.push(`Category: ${rec.subcategory || rec.category || 'Stormwater'}\\par`);
            rtfContent.push(`Details: ${rec.content.replace(/\n/g, '\\par ')}\\par`);
            if (rec.citation) {
              rtfContent.push(`Source: ${rec.citation}\\par`);
            }
            rtfContent.push('\\par');
          });
        }

        if (hasChat) {
          rtfContent.push('{\\b Discussion with Claude:}\\par');
          rtfContent.push('\\par');
          chatMessages.forEach((msg, index) => {
            const role = msg.role === 'user' ? 'Your Question' : 'Claude Response';
            rtfContent.push(`{\\b ${role} ${index + 1}}\\par`);
            rtfContent.push(`Time: ${msg.timestamp.toLocaleString()}\\par`);
            rtfContent.push(msg.content.replace(/\n/g, '\\par '));
            rtfContent.push('\\par');
            rtfContent.push('\\par');
          });
        }

        rtfContent.push('{\\b Report Summary:}\\par');
        rtfContent.push(`Total Recommendations: ${analysisResult?.recommendations?.length || 0}\\par`);
        rtfContent.push(`Discussion Messages: ${chatMessages.length}\\par`);
        rtfContent.push(`Generated: ${new Date().toLocaleString()}\\par`);
        rtfContent.push('System: Stormwater AI\\par');
        rtfContent.push('\\par');
        rtfContent.push('This comprehensive report includes initial analysis, recommendations, and complete discussion history.\\par');
        rtfContent.push('}');

        return rtfContent.join('\n');

      default:
        return generateCompleteReportContent('text');
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

      case 'csv':
        const csvHeader = 'Document,Analysis Date,Recommendation Number,Title,Category,Content,Citation,System';
        const csvRows = analysisResult.recommendations.map((rec: any, index: number) => 
          `"${documentName}","${new Date().toLocaleDateString()}","${index + 1}","${rec.title}","${rec.subcategory || rec.category || 'Stormwater'}","${rec.content.replace(/"/g, '""')}","${rec.citation || 'N/A'}","Stormwater AI"`
        );
        return [csvHeader, ...csvRows].join('\n');

      case 'json':
        return JSON.stringify({
          document: {
            name: documentName,
            analysisDate: new Date().toLocaleDateString(),
            generatedBy: 'Stormwater AI'
          },
          analysis: {
            summary: analysisResult.analysis?.analysis || 'Analysis completed successfully.',
            totalRecommendations: analysisResult.recommendations.length
          },
          recommendations: analysisResult.recommendations.map((rec: any, index: number) => ({
            number: index + 1,
            title: rec.title,
            category: rec.subcategory || rec.category || 'Stormwater',
            content: rec.content,
            citation: rec.citation || null
          })),
          metadata: {
            system: 'Stormwater AI',
            session: 'Current analysis session',
            reportType: 'Complete analysis report'
          }
        }, null, 2);

      case 'rtf':
        return `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24 {\\b\\fs32 Stormwater AI Analysis Report}\\par
\\par
{\\b Analyzed Document:} ${documentName}\\par
{\\b Analysis Date:} ${new Date().toLocaleDateString()}\\par
{\\b Generated by:} Stormwater AI\\par
\\par
{\\b AI Analysis Summary:}\\par
${(analysisResult.analysis?.analysis || 'Analysis completed successfully.').replace(/\n/g, '\\par ')}\\par
\\par
{\\b Recommendations (${analysisResult.recommendations.length}):}\\par
\\par
${analysisResult.recommendations.map((rec: any, index: number) => `
{\\b ${index + 1}. ${rec.title}}\\par
{\\b Category:} ${rec.subcategory || rec.category || 'Stormwater'}\\par
{\\b Details:} ${rec.content.replace(/\n/g, '\\par ')}\\par
${rec.citation ? `{\\b Source:} ${rec.citation}\\par` : ''}\\par
`).join('')}
{\\b Additional Information:}\\par
This report was generated by Stormwater AI\\par
Recommendations are based on analysis of uploaded documents and reference library\\par
\\par
End of Report\\par
}`;

      case 'pdf':
      case 'docx':
      case 'xlsx':
        // For complex formats, fall back to text for now
        toast({
          title: "Format Notice",
          description: `${format.toUpperCase()} format will be generated as text. Professional document generation requires server processing.`,
        });
        return generateAllContent('text');

      default:
        return generateAllContent('text');
    }
  };

  const getMimeType = (format: string) => {
    switch (format) {
      case 'markdown': return 'text/markdown';
      case 'html': return 'text/html';
      case 'text': return 'text/plain';
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      case 'rtf': return 'application/rtf';
      default: return 'text/plain';
    }
  };

  const getFileExtension = (format: string) => {
    switch (format) {
      case 'markdown': return 'md';
      case 'html': return 'html';
      case 'text': return 'txt';
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'xlsx': return 'xlsx';
      case 'csv': return 'csv';
      case 'json': return 'json';
      case 'rtf': return 'rtf';
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

  // Enhanced document filtering with advanced filters
  const filteredDocuments = documents.filter((doc: any) => {
    const matchesSearch = !searchQuery || 
      doc.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !advancedFilters.category || doc.category === advancedFilters.category;
    const matchesFileType = !advancedFilters.fileType || doc.originalName.toLowerCase().endsWith(advancedFilters.fileType);
    
    return matchesSearch && matchesCategory && matchesFileType;
  });

  // Bulk operations functionality
  const handleBulkSelect = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleBulkAnalysis = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select documents for bulk analysis",
        variant: "destructive"
      });
      return;
    }

    setExportInProgress(true);
    try {
      const analysisPromises = selectedDocuments.map(async (docId) => {
        const response = await fetch(`/api/documents/${docId}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateMode, autoGenerate: true })
        });
        return response.json();
      });

      await Promise.all(analysisPromises);
      
      toast({
        title: "Bulk Analysis Complete",
        description: `Successfully analyzed ${selectedDocuments.length} documents`,
      });
      
      queryClient.invalidateQueries();
      setSelectedDocuments([]);
    } catch (error) {
      toast({
        title: "Bulk Analysis Failed", 
        description: "Some documents could not be analyzed",
        variant: "destructive"
      });
    } finally {
      setExportInProgress(false);
    }
  };

  // Advanced export functionality
  const handleAdvancedExport = async (format: string) => {
    setExportInProgress(true);
    try {
      const exportData = {
        documents: selectedDocuments.length > 0 ? selectedDocuments : documents.map((d: any) => d.id),
        format,
        templateMode,
        includeAnalyses: true,
        includeRecommendations: true,
        includeChats: chatMessages.length > 0
      };

      const response = await fetch('/api/export/comprehensive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stormwater-export-${new Date().getTime()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate export file",
        variant: "destructive"
      });
    } finally {
      setExportInProgress(false);
    }
  };

  // Smart recommendations based on uploaded content
  const generateSmartRecommendations = async () => {
    if (!analysisResult) return;

    try {
      const response = await fetch('/api/smart-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: analysisResult.document.id,
          analysisContext: analysisResult.analysis,
          templateMode
        })
      });

      const recommendations = await response.json();
      setAnalysisResult(prev => ({
        ...prev,
        recommendations: [...(prev?.recommendations || []), ...recommendations]
      }));

      toast({
        title: "Smart Recommendations Generated",
        description: `Added ${recommendations.length} intelligent recommendations`,
      });
    } catch (error) {
      toast({
        title: "Smart Recommendations Failed",
        description: "Could not generate additional recommendations",
        variant: "destructive"
      });
    }
  };

  // Current session recommendations are managed through analysisResult state

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Enhanced Header with Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-blue-600" />
              Stormwater AI
            </h1>
            <p className="text-gray-600 dark:text-gray-300">Professional stormwater analysis with Claude 4 AI</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Template Mode Selector */}
            <Select value={templateMode} onValueChange={(value: any) => setTemplateMode(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Standard
                  </div>
                </SelectItem>
                <SelectItem value="professional">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Professional
                  </div>
                </SelectItem>
                <SelectItem value="compliance">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Compliance
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Operations Toggle */}
            <Button
              variant={bulkOperationMode ? "default" : "outline"}
              onClick={() => setBulkOperationMode(!bulkOperationMode)}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Bulk Mode
            </Button>

            {/* Auto Analysis Toggle */}
            <Button
              variant={autoAnalysisEnabled ? "default" : "outline"}
              onClick={() => setAutoAnalysisEnabled(!autoAnalysisEnabled)}
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Auto AI
            </Button>
          </div>
        </div>

        {/* Advanced Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.documentCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {selectedDocuments.length > 0 && `${selectedDocuments.length} selected`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Analyses</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.analysisCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Claude 4 powered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.recommendationCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analysisResult?.recommendations?.length > 0 && `${analysisResult.recommendations.length} current session`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{chatMessages.length}</div>
              <p className="text-xs text-muted-foreground">
                Current conversation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Search and Filtering */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
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

              {/* Advanced Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Select 
                  value={advancedFilters.category} 
                  onValueChange={(value) => setAdvancedFilters(prev => ({...prev, category: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="qsd">QSD</SelectItem>
                    <SelectItem value="swppp">SWPPP</SelectItem>
                    <SelectItem value="erosion">Erosion Control</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={advancedFilters.fileType} 
                  onValueChange={(value) => setAdvancedFilters(prev => ({...prev, fileType: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="File Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value=".pdf">PDF</SelectItem>
                    <SelectItem value=".docx">Word</SelectItem>
                    <SelectItem value=".txt">Text</SelectItem>
                    <SelectItem value=".xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={advancedFilters.dateRange} 
                  onValueChange={(value) => setAdvancedFilters(prev => ({...prev, dateRange: value}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  onClick={() => setAdvancedFilters({category: '', dateRange: '', fileType: '', sizeRange: ''})}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>

              {/* Bulk Operations Bar */}
              {bulkOperationMode && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Bulk Operations Mode Active
                      </span>
                      <Badge variant="secondary">
                        {selectedDocuments.length} selected
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleBulkAnalysis}
                        disabled={selectedDocuments.length === 0 || exportInProgress}
                        className="flex items-center gap-2"
                      >
                        {exportInProgress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Brain className="h-4 w-4" />
                        )}
                        Analyze Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdvancedExport('pdf')}
                        disabled={exportInProgress}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export Selected
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
                        if (selectedFiles.length > 0) {
                          setFiles(prev => [...prev, ...selectedFiles]);
                        }
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

                  {/* Upload Button */}
                  {files.length > 0 && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleUploadSubmit}
                        disabled={uploadMutation.isPending}
                        className="flex-1"
                      >
                        {uploadMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading & Analyzing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload & Analyze {files.length} File{files.length > 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                      
                      {!uploadMutation.isPending && (
                        <Button 
                          variant="outline"
                          onClick={() => setFiles([])}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Document Preview and Analysis Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Document Preview & Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Document Preview Section */}
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2 mb-3">
                            <CheckCircle className="h-4 w-4" />
                            Uploaded Document
                          </h3>
                          
                          {/* Document Info */}
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <FileText className="h-8 w-8 text-blue-500" />
                              <div>
                                <p className="font-medium">{analysisResult.document.originalName}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {analysisResult.document.fileSize ? `${(analysisResult.document.fileSize / 1024 / 1024).toFixed(1)}MB` : ''} • 
                                  {analysisResult.document.category || 'Stormwater'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Image Preview */}
                            {analysisResult.document.imageData && (
                              <div className="mb-3">
                                <img 
                                  src={`data:image/jpeg;base64,${analysisResult.document.imageData}`}
                                  alt={analysisResult.document.originalName}
                                  className="w-full max-h-64 object-contain rounded border"
                                />
                              </div>
                            )}
                            
                            {/* Document Description */}
                            {analysisResult.document.description && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Description:</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                  {analysisResult.document.description}
                                </p>
                              </div>
                            )}
                            
                            {/* Content Preview */}
                            {analysisResult.document.content && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Preview:</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 p-2 rounded border max-h-32 overflow-y-auto">
                                  {analysisResult.document.content.substring(0, 300)}...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* AI Analysis and Recommendations */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          QSD/CPESC Professional Analysis
                        </h3>

                        {analysisResult.analysis && (
                          <div>
                            <h4 className="font-medium mb-2">Professional Assessment</h4>
                            <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded max-h-40 overflow-y-auto">
                              {analysisResult.analysis.analysis}
                            </div>
                          </div>
                        )}

                        {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Professional Recommendations ({analysisResult.recommendations.length})</h4>
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                              {analysisResult.recommendations.map((rec: any, index: number) => (
                                <div key={rec.id || `rec-preview-${index}`} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-500">
                                  <div className="font-medium text-sm text-blue-900 dark:text-blue-100">{rec.title}</div>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 line-clamp-3">
                                    {rec.content}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {rec.subcategory || rec.category || 'General'}
                                    </Badge>
                                    {rec.citation && (
                                      <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                        📚 Source Available
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Upload a document to see preview and analysis</p>
                      <p className="text-sm">Get professional QSD/CPESC recommendations with visual preview</p>
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
                    
                    <div className="space-y-2">
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
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>Upload files for analysis:</span>
                        <input
                          type="file"
                          onChange={(e) => {
                            const selectedFiles = Array.from(e.target.files || []);
                            if (selectedFiles.length > 0) {
                              setFiles(selectedFiles);
                              uploadMutation.mutate({ files: selectedFiles, description: undefined });
                            }
                          }}
                          multiple
                          accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.htm,.md,.log"
                          className="hidden"
                          id="chat-file-upload"
                          disabled={uploadMutation.isPending}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('chat-file-upload')?.click()}
                          disabled={uploadMutation.isPending}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          {uploadMutation.isPending ? 'Uploading...' : 'Choose Files'}
                        </Button>
                      </div>
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
            
            {/* Library Management Upload Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Add Documents to Reference Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="admin-description">Description (optional)</Label>
                    <Textarea
                      id="admin-description"
                      placeholder="Describe the document purpose and contents..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                      ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
                      hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800`}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const droppedFiles = Array.from(e.dataTransfer.files);
                      handleAdminUpload(droppedFiles);
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => document.getElementById('admin-file-input')?.click()}
                  >
                    <input
                      id="admin-file-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const selectedFiles = Array.from(e.target.files || []);
                        handleAdminUpload(selectedFiles);
                      }}
                      accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.htm,.md,.log"
                    />
                    
                    {adminUploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-spin" />
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          Uploading documents to reference library...
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Drop files here or click to add to reference library
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          These documents will be permanently saved and used by AI for analysis
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Source Library Management */}
            <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Reference Document Library ({filteredDocuments.length} documents)
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.reload()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {filteredDocuments.map((doc: any) => (
                        <div key={doc.id} className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                                <span className="text-xs text-gray-500">
                                  {doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(1)}MB` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteDocument(doc.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredDocuments.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No documents in reference library</p>
                          <p className="text-sm">Upload documents above to build your AI reference library</p>
                        </div>
                      )}
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
                  <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                  <SelectItem value="docx">Word Document (.docx)</SelectItem>
                  <SelectItem value="xlsx">Excel Spreadsheet (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV Data (.csv)</SelectItem>
                  <SelectItem value="json">JSON Data (.json)</SelectItem>
                  <SelectItem value="rtf">Rich Text Format (.rtf)</SelectItem>
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