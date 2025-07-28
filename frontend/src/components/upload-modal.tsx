import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Upload, CloudUpload, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("stormwater");
  const [description, setDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [documentTitle, setDocumentTitle] = useState("");
  const [createFromDescription, setCreateFromDescription] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadDocument(formData),
    onSuccess: () => {
      toast({
        title: "Document uploaded successfully",
        description: "Your document is being processed and analyzed.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const createFromTextMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; category: string }) => {
      const response = await fetch('/api/documents/text', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document created successfully",
        description: "Your text document is being analyzed for recommendations.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create document",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFile(null);
    setCategory("stormwater");
    setDescription("");
    setDocumentTitle("");
    setCreateFromDescription(false);
    setDragActive(false);
    onClose();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const allowedTypes = [
      '.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.csv', '.json', '.xml', '.rtf',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.html', '.htm', '.md', '.log'
    ];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a supported format: Documents (PDF, DOCX, TXT, Excel, CSV, JSON, XML, RTF, HTML, MD) or Images (JPG, PNG, GIF, BMP, WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      toast({
        title: "Category required",
        description: "Please select a category.",
        variant: "destructive",
      });
      return;
    }

    if (createFromDescription) {
      // Text-only document creation
      if (!documentTitle.trim() || !description.trim()) {
        toast({
          title: "Title and description required",
          description: "Please provide both a title and description for your document.",
          variant: "destructive",
        });
        return;
      }

      createFromTextMutation.mutate({
        title: documentTitle.trim(),
        description: description.trim(),
        category
      });
    } else {
      // File upload
      if (!file) {
        toast({
          title: "No file selected",
          description: "Please select a file to upload or switch to text mode.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('description', description);

      uploadMutation.mutate(formData);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createFromDescription ? "Add Problem Description" : "Upload Source Document"}
          </DialogTitle>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex space-x-2 p-1 bg-muted rounded-lg">
          <Button
            type="button"
            variant={!createFromDescription ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setCreateFromDescription(false)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
          <Button
            type="button"
            variant={createFromDescription ? "default" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setCreateFromDescription(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Text Only
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {createFromDescription ? (
            // Text-Only Mode
            <div className="space-y-4">
              <div>
                <Label htmlFor="document-title">Document Title</Label>
                <Input
                  id="document-title"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Enter a descriptive title for your document"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="document-description">Document Description</Label>
                <Textarea
                  id="document-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your engineering scenario, project requirements, site conditions, or any specific stormwater challenges you need recommendations for..."
                  rows={6}
                  required
                />
              </div>
            </div>
          ) : (
            // File Upload Mode
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
            {file ? (
              <div className="space-y-2">
                <FileText className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <CloudUpload className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <Label htmlFor="file-upload" className="cursor-pointer text-primary hover:text-primary/80">
                    Upload a file
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv,.json,.xml,.rtf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.html,.htm,.md,.log"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) handleFileSelect(selectedFile);
                    }}
                  />
                  <span className="text-muted-foreground"> or drag and drop</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Documents: PDF, DOCX, TXT, Excel, CSV, JSON, XML, RTF, HTML, MD<br/>
                  Images: JPG, PNG, GIF, BMP, WEBP - All formats up to 50MB
                </p>
              </div>
            )}
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stormwater">Stormwater Engineering</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description (only show in file upload mode) */}
          {!createFromDescription && (
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document content..."
                rows={3}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                (createFromDescription ? createFromTextMutation.isPending : uploadMutation.isPending) ||
                (!createFromDescription && !file) ||
                (createFromDescription && (!documentTitle.trim() || !description.trim())) ||
                !category
              }
            >
              {createFromDescription ? (
                createFromTextMutation.isPending ? (
                  <>
                    <FileText className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Create & Analyze
                  </>
                )
              ) : (
                uploadMutation.isPending ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
