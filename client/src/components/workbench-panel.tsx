import { useState, useCallback } from "react";
import { Upload, FileText, Brain, Loader2, Plus, X, MessageSquare, Send, Code, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { PythonInterpreter } from "@/components/python-interpreter";

interface WorkbenchPanelProps {
  files: File[];
  setFiles: (files: File[]) => void;
  description: string;
  setDescription: (desc: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  uploadProgress: Record<string, number>;
}

interface SiteMeasurements {
  totalAreaAcres?: number;
  slopePercent?: number;
  flowLengthFt?: number;
  culvertDiameterInches?: number;
  rainfallInches?: number;
  landUse: {
    residential?: number;
    commercial?: number;
    industrial?: number;
    paved?: number;
    forest?: number;
  };
  soilType?: 'A' | 'B' | 'C' | 'D';
  stormFrequency?: '2-year' | '10-year' | '25-year' | '100-year';
  location?: 'california_northern' | 'california_central' | 'california_southern';
  costData?: {
    materialBudget?: number;
    laborBudget?: number;
    equipmentBudget?: number;
    totalProjectBudget?: number;
    costSource?: string;
  };
}

export function WorkbenchPanel({
  files,
  setFiles,
  description,
  setDescription,
  onAnalyze,
  isAnalyzing,
  uploadProgress
}: WorkbenchPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [aiChat, setAiChat] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [siteMeasurements, setSiteMeasurements] = useState<SiteMeasurements>({
    landUse: {},
    soilType: 'B',
    stormFrequency: '10-year',
    location: 'california_central'
  });
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setFiles([...files, ...validFiles]);
  }, [files, setFiles, toast]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles([...files, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput;
    setChatInput("");
    setAiChat(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      
      const data = await response.json();
      setAiChat(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      toast({
        title: "Chat Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Document Upload Section */}
      <Card className="flex-shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Document Workbench
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Drop stormwater documents here or
            </p>
            <Input
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
              accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.htm,.md,.log"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Select Files
            </Button>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Uploaded Documents:</Label>
              <ScrollArea className="max-h-32">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {(file.size / 1024 / 1024).toFixed(1)}MB
                      </Badge>
                    </div>
                    {uploadProgress[file.name] && (
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 mx-2">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${uploadProgress[file.name]}%` }}
                        />
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Site Measurements Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMeasurements(true)}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Site Measurements
            </Button>
            {(siteMeasurements.totalAreaAcres || siteMeasurements.slopePercent || Object.values(siteMeasurements.landUse).some(v => v)) && (
              <Badge variant="secondary" className="px-2 py-1 text-xs">
                Measurements Added
              </Badge>
            )}
          </div>

          {/* Problem Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Problem Description:</Label>
            <Textarea
              id="description"
              placeholder="Describe the stormwater issue you need help with..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Analyze Button */}
          <Button
            onClick={onAnalyze}
            disabled={files.length === 0 || isAnalyzing}
            className="w-full"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Analyze Documents
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* AI Tools */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="python" className="flex items-center gap-1">
                <Code className="w-4 h-4" />
                Python
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 flex flex-col min-h-0 mt-3">
              {/* Chat Messages */}
              <ScrollArea className="flex-1 min-h-0 pr-4">
                {aiChat.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Ask me anything about stormwater management</p>
                    <p className="text-xs mt-1">I can execute Python calculations and analysis</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiChat.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg max-w-[85%] ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white ml-auto'
                            : 'bg-gray-100 dark:bg-gray-800 mr-auto'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                    {isChatting && (
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg max-w-[85%]">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-gray-500">AI is thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex gap-2 flex-shrink-0 mt-3">
                <Input
                  placeholder="Ask about calculations, regulations, BMPs..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || isChatting}
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="python" className="flex-1 min-h-0 mt-3">
              <PythonInterpreter className="h-full" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Site Measurements Dialog */}
      {showMeasurements && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Site Measurements & Parameters</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowMeasurements(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                {/* Site Area */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="totalArea">Total Site Area (acres)</Label>
                    <Input
                      id="totalArea"
                      type="number"
                      step="0.1"
                      placeholder="25.0"
                      value={siteMeasurements.totalAreaAcres || ''}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        totalAreaAcres: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="slope">Average Slope (%)</Label>
                    <Input
                      id="slope"
                      type="number"
                      step="0.1"
                      placeholder="3.0"
                      value={siteMeasurements.slopePercent || ''}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        slopePercent: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                    />
                  </div>
                </div>

                {/* Flow Length and Culvert */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="flowLength">Flow Length (feet)</Label>
                    <Input
                      id="flowLength"
                      type="number"
                      placeholder="1200"
                      value={siteMeasurements.flowLengthFt || ''}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        flowLengthFt: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="culvertDiameter">Culvert Diameter (inches)</Label>
                    <Input
                      id="culvertDiameter"
                      type="number"
                      placeholder="36"
                      value={siteMeasurements.culvertDiameterInches || ''}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        culvertDiameterInches: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                    />
                  </div>
                </div>

                {/* Land Use Breakdown */}
                <div>
                  <Label className="text-base font-medium">Land Use Breakdown (acres)</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label htmlFor="residential" className="text-sm">Residential</Label>
                      <Input
                        id="residential"
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={siteMeasurements.landUse.residential || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          landUse: {
                            ...prev.landUse,
                            residential: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="commercial" className="text-sm">Commercial</Label>
                      <Input
                        id="commercial"
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={siteMeasurements.landUse.commercial || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          landUse: {
                            ...prev.landUse,
                            commercial: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="industrial" className="text-sm">Industrial</Label>
                      <Input
                        id="industrial"
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={siteMeasurements.landUse.industrial || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          landUse: {
                            ...prev.landUse,
                            industrial: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paved" className="text-sm">Paved Areas</Label>
                      <Input
                        id="paved"
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={siteMeasurements.landUse.paved || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          landUse: {
                            ...prev.landUse,
                            paved: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="forest" className="text-sm">Forest/Open Space</Label>
                      <Input
                        id="forest"
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={siteMeasurements.landUse.forest || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          landUse: {
                            ...prev.landUse,
                            forest: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Engineering Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="soilType">Soil Type (Hydrologic Group)</Label>
                    <select
                      id="soilType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={siteMeasurements.soilType}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        soilType: e.target.value as 'A' | 'B' | 'C' | 'D'
                      }))}
                    >
                      <option value="A">A - Well Drained (Sand, Gravel)</option>
                      <option value="B">B - Moderate Infiltration (Silt Loam)</option>
                      <option value="C">C - Slow Infiltration (Clay Loam)</option>
                      <option value="D">D - Very Slow Infiltration (Clay)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="stormFreq">Design Storm Frequency</Label>
                    <select
                      id="stormFreq"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={siteMeasurements.stormFrequency}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        stormFrequency: e.target.value as '2-year' | '10-year' | '25-year' | '100-year'
                      }))}
                    >
                      <option value="2-year">2-Year Storm</option>
                      <option value="10-year">10-Year Storm</option>
                      <option value="25-year">25-Year Storm</option>
                      <option value="100-year">100-Year Storm</option>
                    </select>
                  </div>
                </div>

                {/* Location and Rainfall */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">California Region</Label>
                    <select
                      id="location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={siteMeasurements.location}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        location: e.target.value as 'california_northern' | 'california_central' | 'california_southern'
                      }))}
                    >
                      <option value="california_northern">Northern California</option>
                      <option value="california_central">Central California</option>
                      <option value="california_southern">Southern California</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="rainfall">Custom Rainfall (inches)</Label>
                    <Input
                      id="rainfall"
                      type="number"
                      step="0.1"
                      placeholder="Auto from IDF curves"
                      value={siteMeasurements.rainfallInches || ''}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        rainfallInches: e.target.value ? parseFloat(e.target.value) : undefined
                      }))}
                    />
                  </div>
                </div>

                {/* Cost Data Section */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-green-600" />
                    <h4 className="font-medium">Project Cost Data (Optional)</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provide your own cost data for authentic pricing analysis. Leave blank if not available.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="materialBudget">Material Budget ($)</Label>
                      <Input
                        id="materialBudget"
                        type="number"
                        placeholder="0"
                        value={siteMeasurements.costData?.materialBudget || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          costData: {
                            ...prev.costData,
                            materialBudget: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="laborBudget">Labor Budget ($)</Label>
                      <Input
                        id="laborBudget"
                        type="number"
                        placeholder="0"
                        value={siteMeasurements.costData?.laborBudget || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          costData: {
                            ...prev.costData,
                            laborBudget: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="equipmentBudget">Equipment Budget ($)</Label>
                      <Input
                        id="equipmentBudget"
                        type="number"
                        placeholder="0"
                        value={siteMeasurements.costData?.equipmentBudget || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          costData: {
                            ...prev.costData,
                            equipmentBudget: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="totalBudget">Total Project Budget ($)</Label>
                      <Input
                        id="totalBudget"
                        type="number"
                        placeholder="0"
                        value={siteMeasurements.costData?.totalProjectBudget || ''}
                        onChange={(e) => setSiteMeasurements(prev => ({
                          ...prev,
                          costData: {
                            ...prev.costData,
                            totalProjectBudget: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="costSource">Cost Data Source</Label>
                    <Input
                      id="costSource"
                      placeholder="e.g., Local contractor quote, vendor pricing, historical data"
                      value={siteMeasurements.costData?.costSource || ''}
                      onChange={(e) => setSiteMeasurements(prev => ({
                        ...prev,
                        costData: {
                          ...prev.costData,
                          costSource: e.target.value
                        }
                      }))}
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      // Add measurements to description
                      const measurementsText = generateMeasurementsText();
                      const currentDesc = description;
                      const newDesc = currentDesc ? `${currentDesc}\n\n${measurementsText}` : measurementsText;
                      setDescription(newDesc);
                      setShowMeasurements(false);
                      toast({
                        title: "Measurements Added",
                        description: "Site measurements added for precise engineering calculations."
                      });
                    }}
                    className="flex-1"
                  >
                    Add to Analysis
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSiteMeasurements({
                        landUse: {},
                        soilType: 'B',
                        stormFrequency: '10-year',
                        location: 'california_central'
                      });
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function to generate measurements text
  function generateMeasurementsText() {
    const parts = [];
    
    if (siteMeasurements.totalAreaAcres) {
      parts.push(`Total site area: ${siteMeasurements.totalAreaAcres} acres`);
    }
    
    if (siteMeasurements.slopePercent) {
      parts.push(`Site slope: ${siteMeasurements.slopePercent}%`);
    }
    
    if (siteMeasurements.flowLengthFt) {
      parts.push(`Flow length: ${siteMeasurements.flowLengthFt} feet`);
    }
    
    if (siteMeasurements.culvertDiameterInches) {
      parts.push(`Culvert diameter: ${siteMeasurements.culvertDiameterInches} inches`);
    }
    
    if (siteMeasurements.rainfallInches) {
      parts.push(`Design rainfall: ${siteMeasurements.rainfallInches} inches`);
    }
    
    const landUseEntries = Object.entries(siteMeasurements.landUse).filter(([_, value]) => value && value > 0);
    if (landUseEntries.length > 0) {
      parts.push(`Land use breakdown: ${landUseEntries.map(([type, acres]) => `${type} ${acres} acres`).join(', ')}`);
    }
    
    parts.push(`Soil type: ${siteMeasurements.soilType} (Hydrologic Soil Group)`);
    parts.push(`Design storm: ${siteMeasurements.stormFrequency}`);
    parts.push(`Location: ${siteMeasurements.location?.replace(/_/g, ' ')}`);
    
    // Add cost data if provided
    if (siteMeasurements.costData) {
      const costParts = [];
      if (siteMeasurements.costData.totalProjectBudget) {
        costParts.push(`Total project budget: $${siteMeasurements.costData.totalProjectBudget.toLocaleString()}`);
      }
      if (siteMeasurements.costData.materialBudget) {
        costParts.push(`Material budget: $${siteMeasurements.costData.materialBudget.toLocaleString()}`);
      }
      if (siteMeasurements.costData.laborBudget) {
        costParts.push(`Labor budget: $${siteMeasurements.costData.laborBudget.toLocaleString()}`);
      }
      if (siteMeasurements.costData.equipmentBudget) {
        costParts.push(`Equipment budget: $${siteMeasurements.costData.equipmentBudget.toLocaleString()}`);
      }
      if (siteMeasurements.costData.costSource) {
        costParts.push(`Cost data source: ${siteMeasurements.costData.costSource}`);
      }
      
      if (costParts.length > 0) {
        parts.push(`**USER-PROVIDED COST DATA:**\n${costParts.join('\n')}`);
      }
    }
    
    return `**SITE MEASUREMENTS FOR ENGINEERING CALCULATIONS:**\n${parts.join('\n')}`;
  }
}