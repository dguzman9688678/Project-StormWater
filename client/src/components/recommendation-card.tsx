import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ExternalLink, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type Recommendation } from "@shared/schema";
import { api } from "@/lib/api";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const queryClient = useQueryClient();

  const bookmarkMutation = useMutation({
    mutationFn: () => api.toggleBookmark(recommendation.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Recent';
    }
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.floor((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'qsd': return 'QSD';
      case 'swppp': return 'SWPPP';
      case 'erosion': return 'Erosion Control';
      default: return category.toUpperCase();
    }
  };

  return (
    <Card className="recommendation-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <Badge className={`category-badge ${recommendation.category}`}>
            {recommendation.subcategory || getCategoryLabel(recommendation.category)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => bookmarkMutation.mutate()}
            disabled={bookmarkMutation.isPending}
          >
            <Bookmark 
              className={`h-4 w-4 ${
                recommendation.isBookmarked 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : 'text-muted-foreground hover:text-yellow-500'
              }`} 
            />
          </Button>
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2">
          {recommendation.title}
        </h3>
        
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {recommendation.content}
        </p>

        <div className="border-t pt-4">
          {recommendation.citation && (
            <div className="flex items-center text-xs text-muted-foreground mb-2">
              <FileText className="h-3 w-3 mr-1" />
              <span>{recommendation.citation}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatDate(recommendation.createdAt)}
            </span>
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              View Details
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
