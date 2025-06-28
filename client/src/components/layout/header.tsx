import { useState } from "react";
import { Search, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadModal } from "@/components/upload-modal";
import { DocumentGenerator } from "@/components/document-generator";
import { SearchResults } from "@/components/search-results";
import { useSearch } from "@/hooks/use-search";

export function Header() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentGenerator, setShowDocumentGenerator] = useState(false);
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
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center h-auto lg:h-16 py-2 lg:py-0 gap-4 lg:gap-0">
            {/* Logo */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-lg md:text-xl font-bold text-primary">🌊 Stormwater-AI</h1>
                </div>
                <div className="ml-2 md:ml-4 text-xs md:text-sm text-muted-foreground hidden sm:block">
                  Engineering Recommendations System
                </div>
              </div>
              
              {/* Mobile Actions */}
              <div className="flex items-center space-x-1 lg:hidden">
                <Button size="sm" onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={() => setShowDocumentGenerator(true)} variant="outline">
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-none lg:max-w-lg lg:mx-8 relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  type="text"
                  placeholder="Search recommendations, documents..."
                  value={query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onBlur={handleSearchBlur}
                  className="pl-10 text-sm"
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

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-2">
              <Button onClick={() => setShowUploadModal(true)} className="text-sm">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files & Images
              </Button>
              <Button onClick={() => setShowDocumentGenerator(true)} variant="outline" className="text-sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <div className="text-xs text-muted-foreground hidden xl:block">© Daniel Guzman</div>
            </div>
          </div>
        </div>
      </header>

      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)} 
      />
      
      <DocumentGenerator
        isOpen={showDocumentGenerator}
        onClose={() => setShowDocumentGenerator(false)}
      />
    </>
  );
}
