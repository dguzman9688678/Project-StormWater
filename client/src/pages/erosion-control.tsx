import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mountain, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecommendationCard } from "@/components/recommendation-card";
import { api } from "@/lib/api";

export default function ErosionControlPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["/api/recommendations", "erosion"],
    queryFn: () => api.getRecommendations("erosion"),
  });

  const filteredRecommendations = recommendations?.filter((rec: any) => {
    if (activeFilter === "all") return true;
    return rec.subcategory?.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const subcategories = [
    { value: "all", label: "All Techniques" },
    { value: "slope", label: "Slope Protection" },
    { value: "perimeter", label: "Perimeter Controls" },
    { value: "temporary", label: "Temporary Measures" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center">
          <Mountain className="h-5 w-5 md:h-6 md:w-6 mr-2" />
          Erosion Control
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Erosion and sediment control techniques and specifications
        </p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="mb-6">
        <TabsList>
          {subcategories.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3"></div>
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-full mb-1"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          ))
        ) : filteredRecommendations?.length > 0 ? (
          filteredRecommendations.map((recommendation: any) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <Mountain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No erosion control recommendations found
            </h3>
            <p className="text-muted-foreground">
              Upload erosion control documents to generate recommendations automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
