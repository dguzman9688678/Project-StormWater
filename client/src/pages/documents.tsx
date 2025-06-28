import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Eye, Trash2, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";

export default function DocumentsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["/api/documents", categoryFilter],
    queryFn: () => api.getDocuments(categoryFilter || undefined),
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'qsd': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'swppp': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'erosion': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'regulatory': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center">
          <FileText className="h-6 w-6 mr-2" />
          Reference Documents
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage and review your uploaded engineering documents
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by category:</span>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            <SelectItem value="qsd">QSD Guidelines</SelectItem>
            <SelectItem value="swppp">SWPPP Documentation</SelectItem>
            <SelectItem value="erosion">Erosion Control</SelectItem>
            <SelectItem value="regulatory">Regulatory Requirements</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-full mb-4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))
        ) : documents?.length > 0 ? (
          documents.map((document: any) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Badge className={getCategoryColor(document.category)}>
                    {document.category.toUpperCase()}
                  </Badge>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
                  {document.originalName}
                </h3>

                {document.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {document.description}
                  </p>
                )}

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span>{formatDate(document.uploadedAt)}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No documents uploaded yet
            </h3>
            <p className="text-muted-foreground">
              Upload your first engineering document to get started with AI-powered analysis and recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
