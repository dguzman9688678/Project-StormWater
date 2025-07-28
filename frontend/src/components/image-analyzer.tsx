import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ImageAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageAnalyzer({ isOpen, onClose }: ImageAnalyzerProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisQuery, setAnalysisQuery] = useState('');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const { toast } = useToast();

  const analyzeImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: (response) => {
      setAnalysisResult(response.analysis);
      toast({
        title: "Image Analysis Complete",
        description: "Claude has analyzed your image for stormwater engineering insights.",
      });
    },
    onError: (error) => {
      console.error('Image analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = () => {
    if (!selectedImage) {
      toast({
        title: "No Image Selected",
        description: "Please select an image to analyze",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedImage);
    if (analysisQuery.trim()) {
      formData.append('message', analysisQuery);
    }

    analyzeImageMutation.mutate(formData);
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setAnalysisQuery('');
    setAnalysisResult(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              <CardTitle>Image Analysis - Stormwater Engineering</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">
                  Upload site photos, erosion images, or engineering drawings
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports JPG, PNG, GIF (max 10MB)
                </p>
              </div>
            </label>

            {imagePreview && (
              <div className="space-y-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-64 object-contain rounded-lg border"
                />
                <p className="text-sm text-gray-600">
                  Selected: {selectedImage?.name}
                </p>
              </div>
            )}
          </div>

          {/* Analysis Query */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Analysis Focus (Optional)
            </label>
            <Textarea
              value={analysisQuery}
              onChange={(e) => setAnalysisQuery(e.target.value)}
              placeholder="What specific aspects should I analyze? (e.g., 'Check erosion severity and recommend BMPs', 'Evaluate SWPPP compliance', 'Assess drainage patterns')"
              className="min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={!selectedImage || analyzeImageMutation.isPending}
              className="flex-1"
            >
              {analyzeImageMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing Image...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Analyze with Claude
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={analyzeImageMutation.isPending}
            >
              Reset
            </Button>
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Analysis Results</h3>
              <div className="bg-muted p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {analysisResult}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}