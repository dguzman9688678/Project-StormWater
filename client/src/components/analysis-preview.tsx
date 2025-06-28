import { useState } from "react";
import { Download, Copy, FileText, Check, Share, Save, Eye, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AnalysisPreviewProps {
  analysisResult: {
    analysis: string;
    insights: string[];
    recommendations: Array<{
      title: string;
      content: string;
      category: string;
      subcategory?: string;
      citation: string;
    }>;
    document?: {
      name: string;
      type: string;
    };
  } | null;
}

export function AnalysisPreview({ analysisResult }: AnalysisPreviewProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [downloadFormat, setDownloadFormat] = useState("txt");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  if (!analysisResult) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Analysis Available
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload and analyze documents to see results here
          </p>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully`,
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const downloadAnalysis = () => {
    const content = formatAnalysisForDownload();
    const blob = new Blob([content], { type: getContentType() });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stormwater-analysis-${Date.now()}.${downloadFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download started",
      description: `Analysis downloaded as ${downloadFormat.toUpperCase()}`,
    });
  };

  const formatAnalysisForDownload = (): string => {
    const timestamp = new Date().toLocaleString();
    const documentName = analysisResult.document?.name || "Unknown Document";
    
    let content = "";
    
    if (downloadFormat === "html") {
      content = `
<!DOCTYPE html>
<html>
<head>
    <title>Stormwater Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .recommendation { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .insight { color: #0066cc; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Stormwater AI Analysis Report</h1>
        <p><strong>Document:</strong> ${documentName}</p>
        <p><strong>Generated:</strong> ${timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Analysis Summary</h2>
        <p>${analysisResult.analysis}</p>
    </div>
    
    <div class="section">
        <h2>Key Insights</h2>
        <ul>
            ${analysisResult.insights.map(insight => `<li class="insight">${insight}</li>`).join('')}
        </ul>
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        ${analysisResult.recommendations.map(rec => `
            <div class="recommendation">
                <h3>${rec.title}</h3>
                <p>${rec.content}</p>
                <p><small><strong>Category:</strong> ${rec.category}${rec.subcategory ? ` - ${rec.subcategory}` : ''}</small></p>
                <p><small><strong>Citation:</strong> ${rec.citation}</small></p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    } else if (downloadFormat === "md") {
      content = `# Stormwater AI Analysis Report

**Document:** ${documentName}  
**Generated:** ${timestamp}

## Analysis Summary

${analysisResult.analysis}

## Key Insights

${analysisResult.insights.map(insight => `- ${insight}`).join('\n')}

## Recommendations

${analysisResult.recommendations.map(rec => `
### ${rec.title}

${rec.content}

**Category:** ${rec.category}${rec.subcategory ? ` - ${rec.subcategory}` : ''}  
**Citation:** ${rec.citation}

---
`).join('')}`;
    } else {
      // Plain text format
      content = `STORMWATER AI ANALYSIS REPORT

Document: ${documentName}
Generated: ${timestamp}

ANALYSIS SUMMARY
================
${analysisResult.analysis}

KEY INSIGHTS
============
${analysisResult.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

RECOMMENDATIONS
===============
${analysisResult.recommendations.map((rec, i) => `
${i + 1}. ${rec.title}
   ${rec.content}
   Category: ${rec.category}${rec.subcategory ? ` - ${rec.subcategory}` : ''}
   Citation: ${rec.citation}
`).join('\n')}`;
    }
    
    return content;
  };

  const getContentType = (): string => {
    switch (downloadFormat) {
      case "html": return "text/html";
      case "md": return "text/markdown";
      default: return "text/plain";
    }
  };

  const analysisText = `${analysisResult.analysis}\n\nKey Insights:\n${analysisResult.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}`;
  const recommendationsText = analysisResult.recommendations.map(rec => `${rec.title}\n${rec.content}\n(${rec.category}${rec.subcategory ? ` - ${rec.subcategory}` : ''})`).join('\n\n');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Analysis Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={downloadFormat} onValueChange={setDownloadFormat}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">TXT</SelectItem>
                <SelectItem value="md">MD</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAnalysis}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Full Analysis Report</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[70vh]">
                  <div className="space-y-4 pr-4">
                    <Textarea
                      value={formatAnalysisForDownload()}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {analysisResult.document && (
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="secondary">
              {analysisResult.document.name}
            </Badge>
            <Badge variant="outline">
              {analysisResult.document.type}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 min-h-0">
        <Tabs defaultValue="analysis" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="formatted">Formatted</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analysis" className="flex-1 min-h-0 mt-4">
            <div className="space-y-4 h-full">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Analysis & Insights</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(analysisText, "Analysis")}
                >
                  {copiedText === "Analysis" ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <Textarea
                  value={analysisText}
                  readOnly
                  className="min-h-[300px] resize-none border-none bg-transparent focus:ring-0"
                />
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations" className="flex-1 min-h-0 mt-4">
            <div className="space-y-4 h-full">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Recommendations ({analysisResult.recommendations.length})</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(recommendationsText, "Recommendations")}
                >
                  {copiedText === "Recommendations" ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <Textarea
                  value={recommendationsText}
                  readOnly
                  className="min-h-[300px] resize-none border-none bg-transparent focus:ring-0"
                />
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="formatted" className="flex-1 min-h-0 mt-4">
            <div className="space-y-4 h-full">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Complete Report</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(formatAnalysisForDownload(), "Complete Report")}
                >
                  {copiedText === "Complete Report" ? (
                    <Check className="w-4 h-4 mr-1" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  Copy
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <Textarea
                  value={formatAnalysisForDownload()}
                  readOnly
                  className="min-h-[300px] resize-none font-mono text-sm border-none bg-transparent focus:ring-0"
                />
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}