import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Download, Brain, CheckCircle, AlertCircle, Clock, FileText, Target, Lightbulb } from "lucide-react";

interface Recommendation {
  id?: number;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  citation: string;
  priority?: 'high' | 'medium' | 'low';
  estimatedHours?: number;
  status?: 'pending' | 'in-progress' | 'completed';
}

interface AnalysisData {
  analysis: string;
  insights: string[];
  recommendations: Recommendation[];
}

interface AnalysisResult {
  document: {
    id: number;
    originalName: string;
    contentType?: string;
  };
  analysis?: AnalysisData;
  recommendations: Recommendation[];
}

interface AnalysisResultsProps {
  analysisResult: AnalysisResult | null;
  onDownloadReport?: () => void;
  onUpdateRecommendation?: (id: number, status: string) => void;
  className?: string;
}

export function AnalysisResults({ 
  analysisResult, 
  onDownloadReport, 
  onUpdateRecommendation,
  className 
}: AnalysisResultsProps) {
  const [selectedTab, setSelectedTab] = useState("overview");

  if (!analysisResult) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Analysis Results</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle className="h-16 w-16 mx-auto mb-4" />
            <p className="text-lg font-medium">Ready for Analysis</p>
            <p className="text-sm">Upload a document to see expert analysis results</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recommendations = analysisResult.recommendations || [];
  const highPriorityItems = recommendations.filter(r => r.priority === 'high' || r.title.toLowerCase().includes('urgent') || r.title.toLowerCase().includes('immediate'));
  const completedItems = recommendations.filter(r => r.status === 'completed');
  const totalEstimatedHours = recommendations.reduce((sum, r) => sum + (r.estimatedHours || 2), 0);

  const getPriorityColor = (rec: Recommendation) => {
    if (rec.priority === 'high' || rec.title.toLowerCase().includes('urgent') || rec.title.toLowerCase().includes('immediate')) {
      return 'destructive';
    }
    if (rec.priority === 'medium' || rec.title.toLowerCase().includes('moderate')) {
      return 'default';
    }
    return 'secondary';
  };

  const getPriorityIcon = (rec: Recommendation) => {
    if (rec.priority === 'high' || rec.title.toLowerCase().includes('urgent') || rec.title.toLowerCase().includes('immediate')) {
      return <AlertCircle className="h-4 w-4" />;
    }
    if (rec.priority === 'medium' || rec.title.toLowerCase().includes('moderate')) {
      return <Clock className="h-4 w-4" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Professional Analysis Results</span>
          </div>
          {onDownloadReport && (
            <Button variant="outline" size="sm" onClick={onDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Full Report
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recommendations">Actions</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Action Items</p>
                    <p className="text-2xl font-bold">{recommendations.length}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">High Priority</p>
                    <p className="text-2xl font-bold">{highPriorityItems.length}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Completed</p>
                    <p className="text-2xl font-bold">{completedItems.length}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Est. Hours</p>
                    <p className="text-2xl font-bold">{totalEstimatedHours}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <h4 className="font-medium mb-2">Progress Overview</h4>
              <Progress 
                value={recommendations.length ? (completedItems.length / recommendations.length) * 100 : 0} 
                className="w-full" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                {completedItems.length} of {recommendations.length} recommendations completed
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">Executive Summary</h4>
              <p className="text-sm p-3 bg-muted rounded-lg">
                {analysisResult.analysis?.analysis || 'Professional stormwater analysis completed with actionable recommendations for implementation.'}
              </p>
            </div>
          </TabsContent>

          {/* Recommendations/Actions Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Action Items ({recommendations.length})</h4>
              <Badge variant="outline">Professional Recommendations</Badge>
            </div>
            
            <ScrollArea className="h-96 space-y-3">
              {recommendations.map((rec, index) => (
                <Card key={index} className="p-4 mb-3">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2">
                        {getPriorityIcon(rec)}
                        <div className="flex-1">
                          <h5 className="font-medium text-sm">{rec.title}</h5>
                          <p className="text-xs text-muted-foreground mt-1">{rec.content}</p>
                        </div>
                      </div>
                      <Badge variant={getPriorityColor(rec)} className="text-xs">
                        {rec.priority || 'standard'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <span>Category: {rec.category}</span>
                        {rec.subcategory && <span>• {rec.subcategory}</span>}
                        <span>• Est. {rec.estimatedHours || 2}h</span>
                      </div>
                      {onUpdateRecommendation && rec.id && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onUpdateRecommendation(rec.id!, rec.status === 'completed' ? 'pending' : 'completed')}
                        >
                          {rec.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
                        </Button>
                      )}
                    </div>
                    
                    {rec.citation && (
                      <div className="text-xs p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                        <strong>Reference:</strong> {rec.citation}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </ScrollArea>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <h4 className="font-medium">Expert Insights</h4>
            </div>
            
            <ScrollArea className="h-96">
              {analysisResult.analysis?.insights && analysisResult.analysis.insights.length > 0 ? (
                <div className="space-y-3">
                  {analysisResult.analysis.insights.map((insight, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        <p className="text-sm">{insight}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-3" />
                  <p>Key insights will appear here after analysis</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium mb-2">Document Information</h5>
                <div className="space-y-1 text-muted-foreground">
                  <p><strong>Name:</strong> {analysisResult.document.originalName}</p>
                  <p><strong>Type:</strong> {analysisResult.document.contentType || 'Unknown'}</p>
                  <p><strong>Analysis Date:</strong> {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">Analysis Statistics</h5>
                <div className="space-y-1 text-muted-foreground">
                  <p><strong>Recommendations:</strong> {recommendations.length}</p>
                  <p><strong>High Priority:</strong> {highPriorityItems.length}</p>
                  <p><strong>Total Est. Hours:</strong> {totalEstimatedHours}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h5 className="font-medium mb-2">Full Analysis Report</h5>
              <ScrollArea className="h-64 p-4 bg-muted rounded text-sm">
                <pre className="whitespace-pre-wrap">
                  {analysisResult.analysis?.analysis || 'Detailed analysis report will appear here.'}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}