import { useState, useCallback } from "react";
import { Upload, FileText, Brain, Loader2, Plus, X, MessageSquare, Send, Code } from "lucide-react";
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
    </div>
  );
}