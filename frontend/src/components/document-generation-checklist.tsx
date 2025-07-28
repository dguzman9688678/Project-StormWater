import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Shield, ClipboardList, MapPin, ScrollText, AlertTriangle, Users, Wrench, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DownloadHelper } from "@/components/download-helper";

interface DocumentGenerationChecklistProps {
  projectDescription: string;
  siteMeasurements?: any;
  onGenerate: (selectedTypes: string[]) => Promise<any>;
  isGenerating?: boolean;
}

const DOCUMENT_TYPES = [
  {
    id: 'sop',
    title: 'Standard Operating Procedures',
    description: 'Detailed procedures for construction activities',
    icon: ScrollText,
    category: 'Operations',
    priority: 'high'
  },
  {
    id: 'jsa',
    title: 'Job Safety Analysis',
    description: 'Safety analysis and hazard identification',
    icon: Shield,
    category: 'Safety',
    priority: 'high'
  },
  {
    id: 'excavation_permit',
    title: 'Excavation Permits',
    description: 'Required permits and documentation',
    icon: AlertTriangle,
    category: 'Permits',
    priority: 'medium'
  },
  {
    id: 'swppp',
    title: 'SWPPP Document',
    description: 'Stormwater Pollution Prevention Plan',
    icon: FileText,
    category: 'Environmental',
    priority: 'high'
  },
  {
    id: 'bmp_map',
    title: 'BMP Installation Map',
    description: 'Best Management Practices layout',
    icon: MapPin,
    category: 'Technical',
    priority: 'medium'
  },
  {
    id: 'inspection_forms',
    title: 'Inspection Forms',
    description: 'Regular monitoring checklists',
    icon: ClipboardList,
    category: 'Quality Control',
    priority: 'medium'
  },
  {
    id: 'training_materials',
    title: 'Training Materials',
    description: 'Crew training and safety briefings',
    icon: Users,
    category: 'Training',
    priority: 'low'
  },
  {
    id: 'maintenance_plan',
    title: 'Maintenance Plan',
    description: 'Long-term monitoring protocols',
    icon: Wrench,
    category: 'Maintenance',
    priority: 'medium'
  }
];

export function DocumentGenerationChecklist({ 
  projectDescription, 
  siteMeasurements,
  onGenerate,
  isGenerating = false
}: DocumentGenerationChecklistProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [generatedDocuments, setGeneratedDocuments] = useState<Array<{id: number; originalName: string; type: string}>>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<string>('');
  const { toast } = useToast();

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSelectByPriority = (priority: 'high' | 'medium' | 'low') => {
    const priorityDocs = DOCUMENT_TYPES
      .filter(doc => doc.priority === priority)
      .map(doc => doc.id);
    
    setSelectedDocuments(prev => {
      const newSelection = [...prev];
      priorityDocs.forEach(docId => {
        if (!newSelection.includes(docId)) {
          newSelection.push(docId);
        }
      });
      return newSelection;
    });
  };

  const handleGenerate = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document type to generate.",
        variant: "destructive"
      });
      return;
    }

    setGenerationProgress(0);
    setCurrentlyGenerating('Initializing document generation...');
    
    try {
      // Simulate progress updates during generation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await onGenerate(selectedDocuments);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      setCurrentlyGenerating('Generation complete!');
      setHasGenerated(true);
      
      // Extract generated document info from the result if available
      if (result && result.documents) {
        const docs = result.documents.map((doc: any) => ({
          id: doc.document.id,
          originalName: doc.document.originalName,
          type: doc.type
        }));
        setGeneratedDocuments(docs);
      }
      
      toast({
        title: "Documents Generated Successfully", 
        description: `Generated ${selectedDocuments.length} professional documents. Download links available below.`,
      });
      
      // Reset progress after showing completion
      setTimeout(() => {
        setCurrentlyGenerating('');
        setGenerationProgress(0);
      }, 2000);
      
    } catch (error) {
      setGenerationProgress(0);
      setCurrentlyGenerating('');
      toast({
        title: "Generation Failed",
        description: "Failed to generate documents. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const highPriorityDocs = DOCUMENT_TYPES.filter(doc => doc.priority === 'high');
  const mediumPriorityDocs = DOCUMENT_TYPES.filter(doc => doc.priority === 'medium');
  const lowPriorityDocs = DOCUMENT_TYPES.filter(doc => doc.priority === 'low');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-5 h-5" />
          Professional Document Generation
          {hasGenerated && <CheckCircle className="w-4 h-4 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Select the professional documents you need for: {projectDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Selection Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSelectByPriority('high')}
          >
            Select Critical Documents
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDocuments(DOCUMENT_TYPES.map(d => d.id))}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDocuments([])}
          >
            Clear All
          </Button>
        </div>

        {/* High Priority Documents */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">Critical</Badge>
            <span className="text-sm font-medium text-muted-foreground">Required for most projects</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {highPriorityDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                onClick={() => handleDocumentToggle(doc.id)}
              >
                <Checkbox
                  checked={selectedDocuments.includes(doc.id)}
                  onChange={() => handleDocumentToggle(doc.id)}
                />
                <doc.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{doc.title}</div>
                  <div className="text-xs text-muted-foreground">{doc.description}</div>
                </div>
                <Badge variant={getPriorityColor(doc.priority)} className="text-xs">
                  {doc.category}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Medium Priority Documents */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">Standard</Badge>
            <span className="text-sm font-medium text-muted-foreground">Commonly needed documents</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {mediumPriorityDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                onClick={() => handleDocumentToggle(doc.id)}
              >
                <Checkbox
                  checked={selectedDocuments.includes(doc.id)}
                  onChange={() => handleDocumentToggle(doc.id)}
                />
                <doc.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{doc.title}</div>
                  <div className="text-xs text-muted-foreground">{doc.description}</div>
                </div>
                <Badge variant={getPriorityColor(doc.priority)} className="text-xs">
                  {doc.category}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Low Priority Documents */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">Optional</Badge>
            <span className="text-sm font-medium text-muted-foreground">Additional documentation</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {lowPriorityDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                onClick={() => handleDocumentToggle(doc.id)}
              >
                <Checkbox
                  checked={selectedDocuments.includes(doc.id)}
                  onChange={() => handleDocumentToggle(doc.id)}
                />
                <doc.icon className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{doc.title}</div>
                  <div className="text-xs text-muted-foreground">{doc.description}</div>
                </div>
                <Badge variant={getPriorityColor(doc.priority)} className="text-xs">
                  {doc.category}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
          </div>
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || selectedDocuments.length === 0}
            className="min-w-32"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Selected
              </>
            )}
          </Button>
        </div>

        {/* Progress Indicator */}
        {(isGenerating || currentlyGenerating) && (
          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium">
                {currentlyGenerating ? `Generating: ${currentlyGenerating}` : 'Processing document generation...'}
              </span>
            </div>
            {generationProgress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
                <Progress value={generationProgress} className="h-2" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Creating professional documents with proper citations and formatting. This may take a few moments.
            </p>
          </div>
        )}

        {/* Generated Documents Download Section */}
        {hasGenerated && generatedDocuments.length > 0 && (
          <div className="pt-4 border-t">
            <DownloadHelper documents={generatedDocuments} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}