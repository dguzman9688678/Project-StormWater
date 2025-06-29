import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SessionFile {
  id: number;
  originalName: string;
  description?: string;
  category: string;
  fileSize: number;
  createdAt: string;
  isGenerated?: boolean;
}

interface SessionDownloadProps {
  sessionFiles: SessionFile[];
  onRefreshFiles: () => void;
}

export function SessionDownload({ sessionFiles, onRefreshFiles }: SessionDownloadProps) {
  const [downloadFormat, setDownloadFormat] = useState<'individual' | 'zip'>('zip');
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = () => {
    if (selectedFiles.length === sessionFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(sessionFiles.map(file => file.id));
    }
  };

  const handleFileToggle = (fileId: number) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const downloadIndividualFiles = async (fileIds: number[]) => {
    for (const fileId of fileIds) {
      try {
        const response = await fetch(`/api/documents/${fileId}/download`);
        if (!response.ok) throw new Error('Download failed');
        
        const blob = await response.blob();
        const file = sessionFiles.find(f => f.id === fileId);
        if (!file) continue;
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = file.originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to download file ${fileId}:`, error);
      }
    }
  };

  const downloadSessionZip = async (fileIds: number[]) => {
    try {
      const response = await fetch('/api/documents/download-session-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds })
      });
      
      if (!response.ok) throw new Error('ZIP download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `stormwater_session_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      throw error;
    }
  };

  const handleDownload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to download.",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);

    try {
      if (downloadFormat === 'zip') {
        await downloadSessionZip(selectedFiles);
        toast({
          title: "Session Downloaded",
          description: `Successfully downloaded ${selectedFiles.length} files as ZIP archive.`,
        });
      } else {
        await downloadIndividualFiles(selectedFiles);
        toast({
          title: "Files Downloaded",
          description: `Successfully downloaded ${selectedFiles.length} individual files.`,
        });
      }
      
      setShowDialog(false);
      setSelectedFiles([]);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download session files. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalSize = selectedFiles.reduce((sum, fileId) => {
    const file = sessionFiles.find(f => f.id === fileId);
    return sum + (file?.fileSize || 0);
  }, 0);

  const generatedFiles = sessionFiles.filter(f => f.isGenerated);
  const uploadedFiles = sessionFiles.filter(f => !f.isGenerated);

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={() => {
            onRefreshFiles();
            setShowDialog(true);
          }}
          disabled={sessionFiles.length === 0}
        >
          <Package className="w-4 h-4 mr-2" />
          Download Session ({sessionFiles.length})
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Download Session Files
          </DialogTitle>
          <DialogDescription>
            Select files from your current session to download. Includes both uploaded documents and generated professional documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Download Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select value={downloadFormat} onValueChange={(value: 'individual' | 'zip') => setDownloadFormat(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zip">ZIP Archive</SelectItem>
                    <SelectItem value="individual">Individual Files</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedFiles.length === sessionFiles.length ? 'Deselect All' : 'Select All'}
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  {selectedFiles.length} selected • {formatFileSize(totalSize)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Generated Documents */}
            {generatedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Generated Documents ({generatedFiles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {generatedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center space-x-3 p-2 rounded border hover:bg-accent/50 cursor-pointer"
                          onClick={() => handleFileToggle(file.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={() => handleFileToggle(file.id)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {file.originalName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {file.description}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.fileSize)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Uploaded Documents */}
            {uploadedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Uploaded Documents ({uploadedFiles.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center space-x-3 p-2 rounded border hover:bg-accent/50 cursor-pointer"
                          onClick={() => handleFileToggle(file.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={() => handleFileToggle(file.id)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {file.originalName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {file.category} • {new Date(file.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(file.fileSize)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Download Button */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedFiles.length > 0 && (
                <>Download {selectedFiles.length} files as {downloadFormat === 'zip' ? 'ZIP archive' : 'individual files'}</>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleDownload}
                disabled={isDownloading || selectedFiles.length === 0}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}