import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DownloadHelperProps {
  documents: Array<{
    id: number;
    originalName: string;
    type: string;
  }>;
}

export function DownloadHelper({ documents }: DownloadHelperProps) {
  const { toast } = useToast();

  const downloadDocument = async (documentId: number, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      });
      
    } catch (error) {
      toast({
        title: "Download Failed",
        description: `Could not download ${filename}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-green-600">
        ✅ Generated Documents Ready for Download:
      </div>
      <div className="grid gap-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded border">
            <span className="text-sm truncate flex-1">
              {doc.originalName}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadDocument(doc.id, doc.originalName)}
              className="ml-2 flex-shrink-0"
            >
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        💡 You can also access all files via "Download Session" button in the header
      </div>
    </div>
  );
}