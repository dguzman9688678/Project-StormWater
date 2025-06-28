import { useState } from "react";
import { Search, Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadModal } from "@/components/upload-modal";
import { ImageAnalyzer } from "@/components/image-analyzer";
import { SearchResults } from "@/components/search-results";
import { useSearch } from "@/hooks/use-search";

export function Header() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImageAnalyzer, setShowImageAnalyzer] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { query, setQuery, results, isLoading } = useSearch();

  const handleSearchChange = (value: string) => {
    setQuery(value);
    setShowSearchResults(value.length >= 2);
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => setShowSearchResults(false), 200);
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-primary">🌊 Stormwater-AI</h1>
              </div>
              <div className="ml-4 text-sm text-muted-foreground">
                Engineering Recommendations System
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-lg mx-8 relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Search recommendations, documents, citations..."
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onBlur={handleSearchBlur}
                  className="pl-10"
                />
              </div>
              {showSearchResults && (
                <SearchResults 
                  results={results} 
                  isLoading={isLoading} 
                  query={query}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button onClick={() => setShowUploadModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
              <Button onClick={() => setShowImageAnalyzer(true)} variant="outline">
                <Camera className="h-4 w-4 mr-2" />
                Analyze Image
              </Button>
              <div className="text-xs text-muted-foreground">© Daniel Guzman</div>
            </div>
          </div>
        </div>
      </header>

      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)} 
      />
      
      <ImageAnalyzer
        isOpen={showImageAnalyzer}
        onClose={() => setShowImageAnalyzer(false)}
      />
    </>
  );
}
