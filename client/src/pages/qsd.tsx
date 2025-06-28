import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecommendationCard } from "@/components/recommendation-card";
import { api } from "@/lib/api";

export default function QSDPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["/api/recommendations", "qsd"],
    queryFn: () => api.getRecommendations("qsd"),
  });

  const filteredRecommendations = recommendations?.filter((rec: any) => {
    if (activeFilter === "all") return true;
    return rec.subcategory?.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const subcategories = [
    { value: "all", label: "All Guidelines" },
    { value: "inspection", label: "Site Inspection" },
    { value: "documentation", label: "Documentation" },
    { value: "training", label: "Training" },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center">
          <BookOpen className="h-5 w-5 md:h-6 md:w-6 mr-2" />
          Developer Recommendations
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          SWPPP development guidelines and best practices
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
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No QSD recommendations found
            </h3>
            <p className="text-muted-foreground">
              Upload QSD-related documents to generate recommendations automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
