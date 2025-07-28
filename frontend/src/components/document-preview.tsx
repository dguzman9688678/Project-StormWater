import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Image, File, Eye, ZoomIn, ZoomOut } from "lucide-react";

interface Document {
  id: number;
  originalName: string;
  contentType?: string;
  content?: string;
  filePath?: string;
  fileSize?: number;
  createdAt?: string;
}

interface DocumentPreviewProps {
  document: Document | null;
  onDownload?: (document: Document) => void;
  className?: string;
}

export function DocumentPreview({ document, onDownload, className }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(100);

  if (!document) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Document Preview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-16 w-16 mx-auto mb-4" />
            <p className="text-lg font-medium">No Document Selected</p>
            <p className="text-sm">Upload or select a document to preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isImage = document.contentType?.startsWith('image/');
  const isPdf = document.contentType === 'application/pdf';
  const isText = document.contentType?.startsWith('text/') || 
                 document.contentType === 'application/json' ||
                 document.originalName.endsWith('.txt') ||
                 document.originalName.endsWith('.md');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = () => {
    if (isImage) return <Image className="h-5 w-5" />;
    if (isPdf) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const getFileTypeLabel = () => {
    if (isImage) return 'Image';
    if (isPdf) return 'PDF Document';
    if (isText) return 'Text Document';
    return document.contentType || 'Unknown';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Document Preview</span>
          </div>
          {onDownload && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(document)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getFileIcon()}
              <span className="font-medium truncate">{document.originalName}</span>
            </div>
            <Badge variant="secondary">{getFileTypeLabel()}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatFileSize(document.fileSize)}</span>
            {document.createdAt && (
              <span>Uploaded {new Date(document.createdAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Preview Controls for Images */}
        {isImage && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Preview Controls</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(25, zoom - 25))}
                disabled={zoom <= 25}
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-xs px-2">{zoom}%</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(200, zoom + 25))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Preview Content */}
        <ScrollArea className="h-96 border rounded">
          {isImage ? (
            <div className="p-4">
              <div className="text-center">
                <div 
                  className="inline-block p-4 bg-muted rounded-lg"
                  style={{ transform: `scale(${zoom / 100})` }}
                >
                  <Image className="h-32 w-32 text-muted-foreground" />
                  <p className="text-sm mt-2 text-muted-foreground">
                    Image Preview: {document.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {document.contentType}
                  </p>
                </div>
              </div>
            </div>
          ) : isPdf ? (
            <div className="p-4 text-center">
              <FileText className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">PDF Document</p>
              <p className="text-sm text-muted-foreground mt-2">
                {document.originalName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF preview not available - download to view
              </p>
            </div>
          ) : isText && document.content ? (
            <div className="p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {document.content.substring(0, 5000)}
                {document.content.length > 5000 && (
                  <div className="text-muted-foreground italic mt-4">
                    ... content truncated (showing first 5000 characters)
                  </div>
                )}
              </pre>
            </div>
          ) : (
            <div className="p-4 text-center">
              <File className="h-24 w-24 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium">File Preview</p>
              <p className="text-sm text-muted-foreground mt-2">
                {document.originalName}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Preview not available for this file type
              </p>
            </div>
          )}
        </ScrollArea>

        {/* Document Stats */}
        {document.content && (
          <div className="text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Characters: {document.content.length.toLocaleString()}</span>
              <span>Words: {document.content.split(/\s+/).filter(w => w.length > 0).length.toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}