import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lock, Shield, FileText, BarChart3, Database, Brain, Trash2, Download, LogOut, MessageCircle, Send, User, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const { toast } = useToast();

  // Fetch admin data when authenticated
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
    enabled: isAuthenticated,
  });

  const { data: documents = [], refetch: refetchDocuments } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => api.getDocuments(),
    enabled: isAuthenticated,
  });

  const { data: analyses = [], refetch: refetchAnalyses } = useQuery({
    queryKey: ["/api/analyses"],
    queryFn: () => api.getAnalyses(),
    enabled: isAuthenticated,
  });

  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch("/api/admin/verify", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setAdminToken(token);
      } else {
        localStorage.removeItem("adminToken");
        setIsAuthenticated(false);
      }
    } catch (error) {
      localStorage.removeItem("adminToken");
      setIsAuthenticated(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setIsAuthenticated(false);
    setAdminToken("");
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const handleDeleteDocument = async (id: number) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });

      if (response.ok) {
        toast({
          title: "Document Deleted",
          description: "Document has been removed from the library",
        });
        refetchDocuments();
        refetchStats();
      } else {
        throw new Error("Failed to delete document");
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Could not delete the document",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ 
          message: currentMessage,
          adminMode: true
        })
      });

      if (!response.ok) throw new Error('Chat failed');
      
      const data = await response.json();
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: data.response || data.message || 'I encountered an issue processing your message.',
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    toast({
      title: "Chat Cleared",
      description: "Conversation history has been cleared",
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("adminToken", data.token);
        
        toast({
          title: "Authentication Successful",
          description: "Welcome to the administration panel",
        });

        setIsAuthenticated(true);
        setAdminToken(data.token);
      } else {
        toast({
          title: "Authentication Failed",
          description: "Invalid credentials provided",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Unable to connect to authentication service",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show admin dashboard if authenticated
  if (isAuthenticated) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Administration Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Stormwater AI System Management
            </p>
          </div>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="chat">Claude Chat</TabsTrigger>
            <TabsTrigger value="documents">Source Library</TabsTrigger>
            <TabsTrigger value="analyses">AI Analyses</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.documentCount || 0}</div>
                  <p className="text-xs text-muted-foreground">In reference library</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Analyses</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.analysisCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Claude 4 analyses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">QSD Documents</CardTitle>
                  <Badge variant="secondary" className="h-4 text-xs">QSD</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.qsdCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Professional grade</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SWPPP Items</CardTitle>
                  <Badge variant="secondary" className="h-4 text-xs">SWPPP</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.swpppCount || 0}</div>
                  <p className="text-xs text-muted-foreground">Compliance docs</p>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Administrator: Daniel Guzman (guzman.danield@outlook.com) | Claude 4 AI Integration Active | Database Connected
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="chat" className="space-y-6">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Personal Chat with Claude 4
                  </CardTitle>
                  <CardDescription>
                    Direct conversation with Claude 4 AI with full administrative capabilities
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={clearChat}>
                  Clear Chat
                </Button>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-4">
                    {chatMessages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Start a conversation with Claude 4</p>
                        <p className="text-sm mt-1">Ask anything about stormwater management, system administration, or general topics</p>
                      </div>
                    )}
                    
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                            msg.role === 'user' ? 'bg-blue-600' : 'bg-green-600'
                          }`}>
                            {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                          <div className={`rounded-lg p-3 ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                          }`}>
                            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                            <div className={`text-xs mt-1 opacity-70 ${
                              msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {msg.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {isChatting && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                <div className="flex gap-2">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Claude 4 anything..."
                    disabled={isChatting}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || isChatting}
                    className="px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reference Document Library</CardTitle>
                <CardDescription>
                  Manage the permanent document library used by Claude 4 for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{doc.originalName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Category: {doc.category} | Size: {(doc.fileSize / 1024).toFixed(1)} KB
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{doc.category}</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                    {documents.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No documents in library. Upload documents through the main interface.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analyses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis History</CardTitle>
                <CardDescription>
                  Claude 4 analysis results and system intelligence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {analyses.map((analysis: any) => (
                      <div key={analysis.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">Analysis #{analysis.id}</h3>
                            <p className="text-sm text-muted-foreground">
                              Query: {analysis.query}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(analysis.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="secondary">Claude 4</Badge>
                        </div>
                        <div className="mt-2 text-sm">
                          {analysis.analysis.substring(0, 200)}...
                        </div>
                      </div>
                    ))}
                    {analyses.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No AI analyses yet. Analyses will appear here after document uploads.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Application status and configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <h4 className="font-medium text-green-800 dark:text-green-200">AI System</h4>
                    <p className="text-sm text-green-600 dark:text-green-400">Claude 4 Active</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">Database</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">PostgreSQL Connected</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <h4 className="font-medium text-purple-800 dark:text-purple-200">Application</h4>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Stormwater AI v1.0</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <h4 className="font-medium text-orange-800 dark:text-orange-200">Owner</h4>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Daniel Guzman</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Show login form if not authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Administrator Access
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Secure authentication required for system administration
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Administrator Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="h-12"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12"
                  required
                  disabled={isLoading}
                />
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Only authorized personnel can access administrative functions.
                  Contact Daniel Guzman for access credentials.
                </AlertDescription>
              </Alert>

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? "Authenticating..." : "Access Administration Panel"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Stormwater AI Administration Portal</p>
          <p className="mt-1">© 2025 Daniel Guzman. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}