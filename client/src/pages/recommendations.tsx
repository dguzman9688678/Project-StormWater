import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Shield, Mountain, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecommendationCard } from "@/components/recommendation-card";
import { api } from "@/lib/api";

export default function RecommendationsPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeSubfilter, setActiveSubfilter] = useState("all");

  // Fetch all recommendations
  const { data: allRecommendations, isLoading } = useQuery({
    queryKey: ["/api/recommendations"],
    queryFn: () => api.getRecommendations(),
  });

  // Filter recommendations based on active category and subfilter
  const filteredRecommendations = allRecommendations?.filter((rec: any) => {
    // First filter by category
    if (activeCategory !== "all" && rec.category !== activeCategory) {
      return false;
    }
    
    // Then filter by subcategory if applicable
    if (activeSubfilter === "all") return true;
    
    return rec.subcategory?.toLowerCase().includes(activeSubfilter.toLowerCase());
  });

  // Get subcategory options based on active category
  const getSubcategoryOptions = () => {
    const baseOptions = [{ value: "all", label: "All Guidelines" }];
    
    switch (activeCategory) {
      case "qsd":
        return [
          ...baseOptions,
          { value: "inspection", label: "Site Inspection" },
          { value: "documentation", label: "Documentation" },
          { value: "training", label: "Training" },
        ];
      case "swppp":
        return [
          ...baseOptions,
          { value: "structural", label: "Structural" },
          { value: "non-structural", label: "Non-Structural" },
          { value: "maintenance", label: "Maintenance" },
        ];
      case "erosion":
        return [
          ...baseOptions,
          { value: "structural", label: "Structural" },
          { value: "perimeter", label: "Perimeter Controls" },
          { value: "temporary", label: "Temporary Measures" },
        ];
      default:
        return baseOptions;
    }
  };

  // Reset subfilter when category changes
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setActiveSubfilter("all");
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "qsd": return BookOpen;
      case "swppp": return Shield;
      case "erosion": return Mountain;
      default: return Filter;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "qsd": return "Developer Guidelines";
      case "swppp": return "SWPPP Practices";
      case "erosion": return "Erosion Control";
      default: return "All Recommendations";
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case "qsd": return "SWPPP development guidelines and best practices";
      case "swppp": return "Stormwater Pollution Prevention Plan practices and implementation guidance";
      case "erosion": return "Erosion and sediment control techniques and specifications";
      default: return "Comprehensive stormwater management recommendations";
    }
  };

  const subcategoryOptions = getSubcategoryOptions();
  const CategoryIcon = getCategoryIcon(activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground flex items-center">
          <CategoryIcon className="h-5 w-5 md:h-6 md:w-6 mr-2" />
          {getCategoryTitle(activeCategory)}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {getCategoryDescription(activeCategory)}
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">All</span>
          </TabsTrigger>
          <TabsTrigger value="qsd" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Developer</span>
          </TabsTrigger>
          <TabsTrigger value="swppp" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">SWPPP</span>
          </TabsTrigger>
          <TabsTrigger value="erosion" className="flex items-center gap-2">
            <Mountain className="h-4 w-4" />
            <span className="hidden sm:inline">Erosion</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Subcategory Filter - Only show if not "all" category */}
      {activeCategory !== "all" && subcategoryOptions.length > 1 && (
        <Tabs value={activeSubfilter} onValueChange={setActiveSubfilter} className="mb-6">
          <TabsList>
            {subcategoryOptions.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {filteredRecommendations?.length || 0} recommendations found
        </h2>
        <div className="text-sm text-muted-foreground">
          {activeCategory === "all" ? "All categories" : getCategoryTitle(activeCategory)}
          {activeSubfilter !== "all" && ` • ${subcategoryOptions.find(opt => opt.value === activeSubfilter)?.label}`}
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
            <CategoryIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No recommendations found
            </h3>
            <p className="text-muted-foreground">
              {activeCategory === "all" 
                ? "No recommendations are available yet."
                : `No ${getCategoryTitle(activeCategory).toLowerCase()} recommendations match your filters.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}