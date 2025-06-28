import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface PythonExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  plots?: string[];
  dataAnalysis?: {
    summary: string;
    insights: string[];
    recommendations: string[];
  };
}

export class PythonInterpreter {
  private tempDir: string;

  constructor() {
    this.tempDir = join(process.cwd(), 'uploads', 'python_temp');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async executeStormwaterAnalysis(
    code: string, 
    data?: any,
    analysisType: 'data_analysis' | 'visualization' | 'calculation' | 'modeling' = 'data_analysis'
  ): Promise<PythonExecutionResult> {
    const sessionId = uuidv4();
    const scriptPath = join(this.tempDir, `script_${sessionId}.py`);
    const dataPath = join(this.tempDir, `data_${sessionId}.json`);
    const outputPath = join(this.tempDir, `output_${sessionId}.json`);

    try {
      // Prepare enhanced Python environment for stormwater analysis
      const enhancedCode = this.prepareStormwaterEnvironment(code, dataPath, outputPath, analysisType);
      
      // Write data file if provided
      if (data) {
        writeFileSync(dataPath, JSON.stringify(data, null, 2));
      }

      // Write Python script
      writeFileSync(scriptPath, enhancedCode);

      // Execute Python script
      const result = await this.executePythonScript(scriptPath);

      // Parse enhanced output
      let analysisResults: any = {};
      if (existsSync(outputPath)) {
        const outputContent = readFileSync(outputPath, 'utf8');
        try {
          analysisResults = JSON.parse(outputContent);
        } catch (e) {
          console.warn('Could not parse Python analysis output:', e);
        }
      }

      // Clean up temporary files
      this.cleanup([scriptPath, dataPath, outputPath]);

      return {
        success: result.success,
        output: result.output,
        error: result.error,
        plots: analysisResults.plots || [],
        dataAnalysis: analysisResults.analysis || {
          summary: result.success ? "Python execution completed successfully" : "Execution failed",
          insights: [],
          recommendations: []
        }
      };

    } catch (error) {
      this.cleanup([scriptPath, dataPath, outputPath]);
      return {
        success: false,
        error: `Python interpreter error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        dataAnalysis: {
          summary: "Failed to execute Python analysis",
          insights: [],
          recommendations: []
        }
      };
    }
  }

  private prepareStormwaterEnvironment(
    userCode: string, 
    dataPath: string, 
    outputPath: string,
    analysisType: string
  ): string {
    return `
import sys
import json
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

# Stormwater-specific imports
try:
    import scipy.stats as stats
    import sklearn.linear_model as linear_model
    from sklearn.preprocessing import StandardScaler
except ImportError:
    print("Advanced analysis libraries not available. Basic analysis only.")

# Initialize analysis results
analysis_results = {
    "plots": [],
    "analysis": {
        "summary": "",
        "insights": [],
        "recommendations": []
    }
}

# Load data if available
data = None
try:
    with open("${dataPath}", 'r') as f:
        data = json.load(f)
    if data:
        print(f"Loaded data with {len(data) if isinstance(data, list) else 'N/A'} records")
except FileNotFoundError:
    print("No input data provided")
except Exception as e:
    print(f"Error loading data: {e}")

# Stormwater analysis utilities
def analyze_runoff_coefficient(land_use_data):
    """Calculate runoff coefficients for different land uses"""
    coefficients = {
        'residential': 0.3,
        'commercial': 0.7,
        'industrial': 0.8,
        'forest': 0.1,
        'agriculture': 0.2,
        'paved': 0.9
    }
    
    results = {}
    for land_use, area in land_use_data.items():
        coeff = coefficients.get(land_use.lower(), 0.5)
        results[land_use] = {
            'area': area,
            'coefficient': coeff,
            'effective_area': area * coeff
        }
    
    return results

def calculate_peak_flow(rainfall_intensity, area_acres, runoff_coefficient):
    """Calculate peak flow using rational method (Q = CiA)"""
    # Q in cfs, i in in/hr, A in acres
    return runoff_coefficient * rainfall_intensity * area_acres

def bmp_sizing_calculator(runoff_volume, bmp_type='bioretention'):
    """Calculate BMP sizing requirements"""
    sizing_factors = {
        'bioretention': 0.05,  # 5% of drainage area
        'wet_pond': 0.02,      # 2% of drainage area  
        'dry_pond': 0.03,      # 3% of drainage area
        'constructed_wetland': 0.02
    }
    
    factor = sizing_factors.get(bmp_type, 0.03)
    required_area = runoff_volume * factor
    
    return {
        'bmp_type': bmp_type,
        'required_area_sf': required_area,
        'sizing_factor': factor,
        'design_guidance': f"Size {bmp_type} to {factor*100}% of contributing drainage area"
    }

def water_quality_analysis(data_points):
    """Analyze water quality parameters"""
    if not data_points:
        return {"error": "No data provided for analysis"}
    
    df = pd.DataFrame(data_points)
    
    # Standard water quality parameters
    parameters = ['TSS', 'TP', 'TN', 'BOD', 'Metals', 'pH']
    analysis = {}
    
    for param in parameters:
        if param in df.columns:
            values = df[param].dropna()
            if len(values) > 0:
                analysis[param] = {
                    'mean': float(values.mean()),
                    'median': float(values.median()),
                    'std': float(values.std()),
                    'min': float(values.min()),
                    'max': float(values.max()),
                    'exceedances': len(values[values > get_regulatory_limit(param)])
                }
    
    return analysis

def get_regulatory_limit(parameter):
    """Get typical regulatory limits for water quality parameters"""
    limits = {
        'TSS': 80,    # mg/L
        'TP': 0.1,    # mg/L
        'TN': 10,     # mg/L  
        'BOD': 30,    # mg/L
        'pH': 8.5,    # upper limit
        'Metals': 0.1 # mg/L (general)
    }
    return limits.get(parameter, float('inf'))

# Enhanced plotting for stormwater analysis
def create_stormwater_plots():
    """Create standard stormwater analysis plots"""
    plots_created = []
    
    try:
        # Plot 1: Rainfall vs Runoff
        plt.figure(figsize=(10, 6))
        rainfall = np.array([0.5, 1.0, 1.5, 2.0, 2.5, 3.0])
        runoff_urban = rainfall * 0.7  # Urban runoff coefficient
        runoff_rural = rainfall * 0.3  # Rural runoff coefficient
        
        plt.plot(rainfall, runoff_urban, 'b-', label='Urban (C=0.7)', linewidth=2)
        plt.plot(rainfall, runoff_rural, 'g-', label='Rural (C=0.3)', linewidth=2)
        plt.xlabel('Rainfall (inches)')
        plt.ylabel('Runoff (inches)')
        plt.title('Rainfall-Runoff Relationship by Land Use')
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plot1_path = f"${this.tempDir}/rainfall_runoff_{uuidv4()}.png"
        plt.savefig(plot1_path, dpi=300, bbox_inches='tight')
        plt.close()
        plots_created.append(plot1_path)
        
        # Plot 2: BMP Effectiveness
        plt.figure(figsize=(12, 8))
        bmps = ['Bioretention', 'Wet Pond', 'Constructed\\nWetland', 'Dry Pond', 'Sand Filter']
        tss_removal = [85, 80, 75, 70, 85]
        tp_removal = [65, 60, 70, 40, 50]
        tn_removal = [45, 35, 55, 25, 30]
        
        x = np.arange(len(bmps))
        width = 0.25
        
        plt.bar(x - width, tss_removal, width, label='TSS Removal %', alpha=0.8)
        plt.bar(x, tp_removal, width, label='TP Removal %', alpha=0.8)
        plt.bar(x + width, tn_removal, width, label='TN Removal %', alpha=0.8)
        
        plt.xlabel('BMP Type')
        plt.ylabel('Pollutant Removal Efficiency (%)')
        plt.title('BMP Pollutant Removal Effectiveness')
        plt.xticks(x, bmps)
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        plot2_path = f"${this.tempDir}/bmp_effectiveness_{uuidv4()}.png"
        plt.savefig(plot2_path, dpi=300, bbox_inches='tight')
        plt.close()
        plots_created.append(plot2_path)
        
    except Exception as e:
        print(f"Error creating plots: {e}")
    
    return plots_created

# Analysis type-specific setup
if "${analysisType}" == "visualization":
    analysis_results["plots"] = create_stormwater_plots()
    analysis_results["analysis"]["summary"] = "Generated standard stormwater analysis visualizations"

print("Python stormwater analysis environment initialized")
print(f"Analysis type: ${analysisType}")
print("Available utilities: analyze_runoff_coefficient, calculate_peak_flow, bmp_sizing_calculator, water_quality_analysis")

# Execute user code
try:
${userCode.split('\n').map(line => '    ' + line).join('\n')}
    
    # Update analysis results
    if 'analysis_results' in locals():
        if not analysis_results["analysis"]["summary"]:
            analysis_results["analysis"]["summary"] = "Custom Python analysis completed successfully"
        
        if hasattr(locals().get('results', None), '__dict__'):
            analysis_results["analysis"]["insights"].append(str(results))
            
except Exception as e:
    print(f"Error in user code execution: {e}")
    analysis_results["analysis"]["summary"] = f"Error: {e}"
    analysis_results["analysis"]["insights"].append(f"Execution failed: {e}")

# Save results
try:
    with open("${outputPath}", 'w') as f:
        json.dump(analysis_results, f, indent=2, default=str)
    print("Analysis results saved successfully")
except Exception as e:
    print(f"Error saving results: {e}")

print("Python analysis complete")
`;
  }

  private async executePythonScript(scriptPath: string): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      let output = '';
      let error = '';

      const pythonProcess = spawn('python3', [scriptPath], {
        cwd: this.tempDir,
        env: { ...process.env, PYTHONPATH: this.tempDir }
      });

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim() || undefined
        });
      });

      pythonProcess.on('error', (err) => {
        resolve({
          success: false,
          error: `Failed to start Python process: ${err.message}`
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        pythonProcess.kill();
        resolve({
          success: false,
          error: 'Python execution timed out after 30 seconds'
        });
      }, 30000);
    });
  }

  private cleanup(files: string[]): void {
    files.forEach(file => {
      try {
        if (existsSync(file)) {
          unlinkSync(file);
        }
      } catch (error) {
        console.warn(`Failed to cleanup file ${file}:`, error);
      }
    });
  }

  async executeQuickCalculation(calculation: string, parameters: any = {}): Promise<PythonExecutionResult> {
    const code = `
# Quick stormwater calculation
import math

# Input parameters
params = ${JSON.stringify(parameters)}
print(f"Parameters: {params}")

# Calculation: ${calculation}
try:
    result = ${calculation}
    print(f"Result: {result}")
    
    analysis_results["analysis"]["summary"] = f"Calculation completed: {result}"
    analysis_results["analysis"]["insights"].append(f"Input: ${calculation}")
    analysis_results["analysis"]["insights"].append(f"Output: {result}")
    
except Exception as e:
    print(f"Calculation error: {e}")
    analysis_results["analysis"]["summary"] = f"Calculation failed: {e}"
`;

    return this.executeStormwaterAnalysis(code, parameters, 'calculation');
  }

  async testPythonEnvironment(): Promise<PythonExecutionResult> {
    const testCode = `
# Test Python environment for stormwater analysis
print("Testing Python environment...")

# Test basic libraries
try:
    import pandas as pd
    print("✓ Pandas available")
except ImportError:
    print("✗ Pandas not available")

try:
    import numpy as np
    print("✓ NumPy available")
except ImportError:
    print("✗ NumPy not available")

try:
    import matplotlib.pyplot as plt
    print("✓ Matplotlib available")
except ImportError:
    print("✗ Matplotlib not available")

# Test stormwater utilities
try:
    # Test runoff calculation
    test_data = {"residential": 10, "commercial": 5}
    runoff_analysis = analyze_runoff_coefficient(test_data)
    print(f"✓ Runoff analysis: {runoff_analysis}")
    
    # Test peak flow calculation
    peak_flow = calculate_peak_flow(2.0, 100, 0.5)
    print(f"✓ Peak flow calculation: {peak_flow} cfs")
    
    # Test BMP sizing
    bmp_size = bmp_sizing_calculator(1000, 'bioretention')
    print(f"✓ BMP sizing: {bmp_size}")
    
    analysis_results["analysis"]["summary"] = "Python stormwater environment test successful"
    analysis_results["analysis"]["insights"] = [
        f"Runoff coefficient analysis working: {len(runoff_analysis)} land uses processed",
        f"Peak flow calculation: {peak_flow} cfs for 100-acre site",
        f"BMP sizing calculator: {bmp_size['required_area_sf']:.1f} sf required"
    ]
    analysis_results["analysis"]["recommendations"] = [
        "Python interpreter ready for stormwater analysis",
        "All core calculation utilities functional",
        "Visualization capabilities available"
    ]
    
except Exception as e:
    print(f"✗ Stormwater utilities error: {e}")
    analysis_results["analysis"]["summary"] = f"Environment test failed: {e}"

print("Environment test complete")
`;

    return this.executeStormwaterAnalysis(testCode, {}, 'data_analysis');
  }
}