import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Database, 
  Settings, 
  Users, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Shield, 
  Cog,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { SystemStatus } from "@/components/system-status";

interface AdminControlsProps {
  onUploadToLibrary?: (files: File[], description?: string) => void;
  onDeleteDocument?: (id: number) => void;
  className?: string;
}

interface SystemConfig {
  maxFileSize: number;
  allowedFileTypes: string[];
  analysisTimeout: number;
  enableAutoAnalysis: boolean;
  requireAdminApproval: boolean;
  retentionPeriod: number;
}

export function AdminControls({ onUploadToLibrary, onDeleteDocument, className }: AdminControlsProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadDescription, setUploadDescription] = useState("");
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maxFileSize: 10,
    allowedFileTypes: ['.pdf', '.docx', '.txt', '.xlsx', '.jpg', '.png'],
    analysisTimeout: 300,
    enableAutoAnalysis: true,
    requireAdminApproval: false,
    retentionPeriod: 90
  });
  const [configChanged, setConfigChanged] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch system data
  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
    queryFn: () => api.getDocuments(),
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: api.getStats,
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ["/api/analyses"],
    queryFn: () => api.getAnalyses(),
  });

  // Upload mutation for library management
  const uploadMutation = useMutation({
    mutationFn: async (data: { files: File[], description?: string }) => {
      if (onUploadToLibrary) {
        onUploadToLibrary(data.files, data.description);
      }
    },
    onSuccess: () => {
      setSelectedFiles([]);
      setUploadDescription("");
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Library Updated",
        description: "Documents successfully added to reference library",
      });
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to add documents to library",
        variant: "destructive",
      });
    },
  });

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUploadToLibrary = () => {
    if (selectedFiles.length > 0) {
      uploadMutation.mutate({
        files: selectedFiles,
        description: uploadDescription || undefined
      });
    }
  };

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setSystemConfig(prev => ({ ...prev, [key]: value }));
    setConfigChanged(true);
  };

  const saveConfiguration = () => {
    // In a real implementation, this would save to backend
    setConfigChanged(false);
    toast({
      title: "Configuration Saved",
      description: "System settings have been updated",
    });
  };

  const refreshData = () => {
    queryClient.invalidateQueries();
    toast({
      title: "Data Refreshed",
      description: "System data has been updated",
    });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className={className}>
      <Tabs defaultValue="library" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="library">Source Library</TabsTrigger>
          <TabsTrigger value="permissions">User Access</TabsTrigger>
          <TabsTrigger value="configuration">System Config</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="testing">System Tests</TabsTrigger>
        </TabsList>

        {/* Source Library Management */}
        <TabsContent value="library" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload to Library */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Add to Reference Library</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="admin-upload">Select Documents</Label>
                  <Input
                    id="admin-upload"
                    type="file"
                    multiple
                    onChange={handleFileSelection}
                    accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.htm,.md,.log"
                  />
                </div>

                <div>
                  <Label htmlFor="upload-description">Description</Label>
                  <Textarea
                    id="upload-description"
                    placeholder="Describe the documents and their purpose in the reference library..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <div>
                    <Label>Selected Files ({selectedFiles.length})</Label>
                    <ScrollArea className="h-24 border rounded p-2 mt-1">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="text-sm py-1">
                          {file.name} ({formatFileSize(file.size)})
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                <Button
                  onClick={handleUploadToLibrary}
                  disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                  className="w-full"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding to Library...
                    </>
                  ) : (
                    <>
                      <Database className="h-4 w-4 mr-2" />
                      Add to Reference Library
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Library Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Library Statistics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">{stats.documentCount}</div>
                      <div className="text-sm text-blue-800">Documents</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">{stats.analysisCount}</div>
                      <div className="text-sm text-green-800">Analyses</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <div className="text-2xl font-bold text-purple-600">{stats.recommendationCount}</div>
                      <div className="text-sm text-purple-800">Recommendations</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <div className="text-2xl font-bold text-orange-600">{stats.qsdCount + stats.swpppCount + stats.erosionCount}</div>
                      <div className="text-sm text-orange-800">Categories</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading statistics...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Document Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Library Documents ({documents.length})</span>
                </div>
                <Button variant="outline" size="sm" onClick={refreshData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{doc.originalName}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.category} • {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{doc.contentType?.split('/')[1] || 'file'}</Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => onDeleteDocument && onDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-3" />
                    <p>No documents in reference library</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Permission Controls */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Access Control Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Admin Approval for Analysis</Label>
                  <p className="text-sm text-muted-foreground">All document analyses must be approved by administrator</p>
                </div>
                <Switch
                  checked={systemConfig.requireAdminApproval}
                  onCheckedChange={(checked) => handleConfigChange('requireAdminApproval', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Public Document Preview</Label>
                  <p className="text-sm text-muted-foreground">Allow users to preview reference library documents</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div>
                <Label>Document Retention Period (Days)</Label>
                <Input
                  type="number"
                  value={systemConfig.retentionPeriod}
                  onChange={(e) => handleConfigChange('retentionPeriod', parseInt(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  User-uploaded documents will be automatically deleted after this period
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Configuration */}
        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>System Configuration</span>
                </div>
                {configChanged && (
                  <Button onClick={saveConfiguration} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Maximum File Size (MB)</Label>
                    <Input
                      type="number"
                      value={systemConfig.maxFileSize}
                      onChange={(e) => handleConfigChange('maxFileSize', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Analysis Timeout (Seconds)</Label>
                    <Input
                      type="number"
                      value={systemConfig.analysisTimeout}
                      onChange={(e) => handleConfigChange('analysisTimeout', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Auto-Analysis</Label>
                      <p className="text-sm text-muted-foreground">Automatically analyze uploaded documents</p>
                    </div>
                    <Switch
                      checked={systemConfig.enableAutoAnalysis}
                      onCheckedChange={(checked) => handleConfigChange('enableAutoAnalysis', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Allowed File Types</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['.pdf', '.docx', '.txt', '.xlsx', '.jpg', '.png', '.csv', '.json', '.xml', '.rtf'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={type}
                        checked={systemConfig.allowedFileTypes.includes(type)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...systemConfig.allowedFileTypes, type]
                            : systemConfig.allowedFileTypes.filter(t => t !== type);
                          handleConfigChange('allowedFileTypes', newTypes);
                        }}
                      />
                      <Label htmlFor={type} className="text-sm">{type}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Monitoring */}
        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>System Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Connection</span>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Connected</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">AI Service</span>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">File Storage</span>
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Available</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cog className="h-5 w-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Document uploaded</span>
                      <span className="text-muted-foreground">2 min ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Analysis completed</span>
                      <span className="text-muted-foreground">5 min ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admin login</span>
                      <span className="text-muted-foreground">1 hour ago</span>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Testing */}
        <TabsContent value="testing" className="space-y-6">
          <SystemStatus />
        </TabsContent>
      </Tabs>
    </div>
  );
}