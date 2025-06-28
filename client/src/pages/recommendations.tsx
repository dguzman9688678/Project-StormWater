import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Shield, Mountain, Filter } from "lucide-react";
import { RecommendationCard } from "@/components/recommendation-card";
import { api } from "@/lib/api";

export default function RecommendationsPage() {
  const [activeSubfilter, setActiveSubfilter] = useState("all");

  // Fetch all recommendations - always show everything together
  const { data: allRecommendations, isLoading } = useQuery({
    queryKey: ["/api/recommendations"],
    queryFn: () => api.getRecommendations(),
  });

  // Filter recommendations based on subfilter only (no category separation)
  const filteredRecommendations = allRecommendations?.filter((rec: any) => {
    if (activeSubfilter === "all") return true;
    return rec.subcategory?.toLowerCase().includes(activeSubfilter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center">
          <Filter className="h-5 w-5 md:h-6 md:w-6 mr-2" />
          All Stormwater Engineering Guidance
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Comprehensive recommendations covering Developer (QSD), SWPPP, and Erosion Control practices - all unified in one section
        </p>
      </div>

      {/* Unified Content Description */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">
            Complete Engineering Solutions
          </h2>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              Developer
            </span>
            <span className="flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              SWPPP
            </span>
            <span className="flex items-center">
              <Mountain className="h-4 w-4 mr-1" />
              Erosion
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          All categories are shown together as one comprehensive guidance system
        </p>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {filteredRecommendations?.length || 0} recommendations found
        </h2>
        <div className="text-sm text-muted-foreground">
          All categories combined
        </div>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-48 bg-muted rounded-lg"></div>
            </div>
          ))
        ) : filteredRecommendations && filteredRecommendations.length > 0 ? (
          filteredRecommendations.map((recommendation: any) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No recommendations found
            </h3>
            <p className="text-muted-foreground">
              Upload documents to generate comprehensive recommendations automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}