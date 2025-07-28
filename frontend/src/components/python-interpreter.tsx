import { useState } from "react";
import { Play, Code, Calculator, BarChart3, Loader2, Copy, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface PythonInterpreterProps {
  className?: string;
}

export function PythonInterpreter({ className = "" }: PythonInterpreterProps) {
  const [code, setCode] = useState("");
  const [analysisType, setAnalysisType] = useState<'data_analysis' | 'visualization' | 'calculation' | 'modeling'>('data_analysis');
  const [result, setResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const executeCode = async () => {
    if (!code.trim()) {
      toast({
        title: "No code provided",
        description: "Please enter Python code to execute",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    try {
      const response = await fetch('/api/python/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          analysisType,
          data: null 
        })
      });

      const result = await response.json();
      setResult(result);

      if (result.success) {
        toast({
          title: "Code executed successfully",
          description: "Python analysis completed",
        });
      } else {
        toast({
          title: "Execution failed",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network error",
        description: "Failed to execute Python code",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const testEnvironment = async () => {
    setIsExecuting(true);
    try {
      const response = await fetch('/api/python/test');
      const result = await response.json();
      setResult(result);

      toast({
        title: result.success ? "Environment test passed" : "Environment test failed",
        description: result.success ? "Python interpreter ready" : result.error,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description: "Could not test Python environment",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const quickCalculation = async (calculation: string, description: string) => {
    setIsExecuting(true);
    try {
      const response = await fetch('/api/python/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          calculation,
          parameters: {}
        })
      });

      const result = await response.json();
      setResult(result);

      toast({
        title: result.success ? "Calculation complete" : "Calculation failed",
        description: description,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Calculation error",
        description: "Failed to execute calculation",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyOutput = () => {
    if (result?.output) {
      navigator.clipboard.writeText(result.output);
      toast({
        title: "Copied to clipboard",
        description: "Python output copied successfully",
      });
    }
  };

  const downloadResult = () => {
    if (!result) return;

    const content = `Python Stormwater Analysis Result
Generated: ${new Date().toLocaleString()}

=== CODE EXECUTED ===
${code}

=== OUTPUT ===
${result.output || 'No output'}

=== ANALYSIS ===
${result.dataAnalysis ? `
Summary: ${result.dataAnalysis.summary}

Insights:
${result.dataAnalysis.insights.map((insight: string, i: number) => `${i + 1}. ${insight}`).join('\n')}

Recommendations:
${result.dataAnalysis.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}
` : 'No analysis available'}

${result.error ? `\n=== ERROR ===\n${result.error}` : ''}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `python_analysis_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: "Python analysis results saved",
    });
  };

  const sampleCodes = {
    runoff: `# Runoff Coefficient Analysis
land_use_data = {
    "residential": 25.5,  # acres
    "commercial": 8.2,
    "parking": 12.1
}

runoff_analysis = analyze_runoff_coefficient(land_use_data)
print("Runoff Analysis Results:")
for land_use, data in runoff_analysis.items():
    print(f"{land_use}: {data['effective_area']:.1f} effective acres")
    
total_effective = sum(d['effective_area'] for d in runoff_analysis.values())
print(f"\\nTotal Effective Area: {total_effective:.1f} acres")`,

    peak_flow: `# Peak Flow Calculation (Rational Method)
rainfall_intensity = 3.2  # inches per hour (10-year storm)
drainage_area = 47.5      # acres
runoff_coefficient = 0.65 # mixed development

peak_flow = calculate_peak_flow(rainfall_intensity, drainage_area, runoff_coefficient)

print(f"Peak Flow Calculation:")
print(f"Rainfall Intensity: {rainfall_intensity} in/hr")
print(f"Drainage Area: {drainage_area} acres") 
print(f"Runoff Coefficient: {runoff_coefficient}")
print(f"Peak Flow: {peak_flow:.1f} cfs")`,

    bmp_sizing: `# BMP Sizing Calculator
runoff_volume = 2500  # cubic feet
bmp_types = ['bioretention', 'wet_pond', 'dry_pond']

print("BMP Sizing Analysis:")
for bmp_type in bmp_types:
    sizing = bmp_sizing_calculator(runoff_volume, bmp_type)
    print(f"\\n{bmp_type.title()}:")
    print(f"  Required Area: {sizing['required_area_sf']:.0f} sq ft")
    print(f"  Sizing Factor: {sizing['sizing_factor']*100}%")
    print(f"  Guidance: {sizing['design_guidance']}")`,

    visualization: `# Stormwater Data Visualization
import matplotlib.pyplot as plt
import numpy as np

# Sample rainfall data
months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
rainfall = [2.1, 2.3, 3.5, 3.8, 4.2, 3.9, 4.1, 3.7, 3.2, 2.8, 2.4, 2.0]

plt.figure(figsize=(12, 6))
plt.bar(months, rainfall, color='skyblue', alpha=0.8)
plt.title('Monthly Rainfall Distribution', fontsize=16)
plt.xlabel('Month')
plt.ylabel('Rainfall (inches)')
plt.grid(True, alpha=0.3)

# Save plot
plt.tight_layout()
plt.savefig('monthly_rainfall.png', dpi=300, bbox_inches='tight')
plt.show()

print("Rainfall visualization created successfully")`
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-5 h-5" />
          Python Interpreter
          <Badge variant="secondary" className="ml-2">Stormwater Analysis</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testEnvironment}
            disabled={isExecuting}
          >
            <FileText className="w-4 h-4 mr-1" />
            Test Environment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => quickCalculation('calculate_peak_flow(2.5, 100, 0.6)', 'Peak flow for 100-acre site')}
            disabled={isExecuting}
          >
            <Calculator className="w-4 h-4 mr-1" />
            Quick Calc
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => quickCalculation('create_stormwater_plots()', 'Standard stormwater plots')}
            disabled={isExecuting}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Visualize
          </Button>
        </div>

        {/* Code Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Python Code:</label>
            <div className="flex items-center gap-2">
              <Select value={analysisType} onValueChange={(value: any) => setAnalysisType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="data_analysis">Data Analysis</SelectItem>
                  <SelectItem value="visualization">Visualization</SelectItem>
                  <SelectItem value="calculation">Calculation</SelectItem>
                  <SelectItem value="modeling">Modeling</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={executeCode}
                disabled={isExecuting || !code.trim()}
                size="sm"
              >
                {isExecuting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                Run
              </Button>
            </div>
          </div>
          <Textarea
            placeholder="Enter Python code for stormwater analysis..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        {/* Sample Codes */}
        <Tabs defaultValue="runoff" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="runoff">Runoff</TabsTrigger>
            <TabsTrigger value="peak_flow">Peak Flow</TabsTrigger>
            <TabsTrigger value="bmp_sizing">BMP Sizing</TabsTrigger>
            <TabsTrigger value="visualization">Plots</TabsTrigger>
          </TabsList>
          {Object.entries(sampleCodes).map(([key, sampleCode]) => (
            <TabsContent key={key} value={key} className="mt-2">
              <div className="relative">
                <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                  {sampleCode}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setCode(sampleCode)}
                >
                  Use Code
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Results:</h4>
              <div className="flex gap-2">
                {result.output && (
                  <Button variant="ghost" size="sm" onClick={copyOutput}>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={downloadResult}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            <Tabs defaultValue="output" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="output">Output</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="plots">Plots ({result.plots?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="output" className="mt-2">
                <ScrollArea className="h-48">
                  <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs whitespace-pre-wrap">
                    {result.success ? (result.output || 'No output') : (result.error || 'Unknown error')}
                  </pre>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="analysis" className="mt-2">
                <ScrollArea className="h-48">
                  {result.dataAnalysis ? (
                    <div className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm">Summary:</h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {result.dataAnalysis.summary}
                        </p>
                      </div>
                      {result.dataAnalysis.insights.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm">Insights:</h5>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-4">
                            {result.dataAnalysis.insights.map((insight: string, i: number) => (
                              <li key={i}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.dataAnalysis.recommendations.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm">Recommendations:</h5>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc pl-4">
                            {result.dataAnalysis.recommendations.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No analysis data available</p>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="plots" className="mt-2">
                <ScrollArea className="h-48">
                  {result.plots && result.plots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {result.plots.map((plot: string, i: number) => (
                        <div key={i} className="border rounded p-2">
                          <p className="text-xs text-gray-500">Plot {i + 1}</p>
                          <p className="text-xs truncate">{plot}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No plots generated</p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}