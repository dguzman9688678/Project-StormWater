import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Shield, ClipboardList, MapPin, ScrollText, AlertTriangle, Users, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DocumentGenerationPromptProps {
  projectDescription: string;
  onGenerateDocuments: (selectedTypes: string[]) => void;
  isVisible: boolean;
  onClose: () => void;
}

const DOCUMENT_TYPES = [
  {
    id: 'sop',
    title: 'Standard Operating Procedures (SOP)',
    description: 'Detailed procedures for construction activities',
    icon: ScrollText,
    category: 'Operations'
  },
  {
    id: 'jsa',
    title: 'Job Safety Analysis (JSA)',
    description: 'Safety analysis and hazard identification',
    icon: Shield,
    category: 'Safety'
  },
  {
    id: 'excavation_permit',
    title: 'Excavation Permits',
    description: 'Required permits and documentation for excavation',
    icon: AlertTriangle,
    category: 'Permits'
  },
  {
    id: 'swppp',
    title: 'SWPPP Document',
    description: 'Stormwater Pollution Prevention Plan',
    icon: FileText,
    category: 'Environmental'
  },
  {
    id: 'bmp_map',
    title: 'BMP Installation Map',
    description: 'Best Management Practices layout and specifications',
    icon: MapPin,
    category: 'Technical'
  },
  {
    id: 'inspection_forms',
    title: 'Inspection Forms',
    description: 'Regular monitoring and inspection checklists',
    icon: ClipboardList,
    category: 'Quality Control'
  },
  {
    id: 'training_materials',
    title: 'Training Materials',
    description: 'Crew training documents and safety briefings',
    icon: Users,
    category: 'Training'
  },
  {
    id: 'maintenance_plan',
    title: 'Maintenance Plan',
    description: 'Long-term maintenance and monitoring protocols',
    icon: Wrench,
    category: 'Maintenance'
  }
];

export function DocumentGenerationPrompt({ 
  projectDescription, 
  onGenerateDocuments, 
  isVisible, 
  onClose 
}: DocumentGenerationPromptProps) {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleGenerateSelected = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document type to generate.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateDocuments(selectedDocuments);
      toast({
        title: "Documents Generated",
        description: `Successfully generated ${selectedDocuments.length} professional documents.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const groupedDocuments = DOCUMENT_TYPES.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, typeof DOCUMENT_TYPES>);

  if (!isVisible) return null;

  return (
    <Dialog open={isVisible} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Professional Document Generation
          </DialogTitle>
          <DialogDescription>
            Based on your analysis, would you like to generate professional documents for your stormwater project?
            Select the document types you need for your project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Project Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{projectDescription}</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Document Types</h3>
            
            {Object.entries(groupedDocuments).map(([category, documents]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-sm">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                        onClick={() => handleDocumentToggle(doc.id)}
                      >
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onChange={() => handleDocumentToggle(doc.id)}
                        />
                        <doc.icon className="w-5 h-5 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium">{doc.title}</h4>
                          <p className="text-xs text-muted-foreground">{doc.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Skip for Now
              </Button>
              <Button 
                onClick={handleGenerateSelected}
                disabled={isGenerating || selectedDocuments.length === 0}
              >
                {isGenerating ? "Generating..." : "Generate Selected Documents"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}