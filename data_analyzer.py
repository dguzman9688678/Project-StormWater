import logging
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from scipy import stats

class DataAnalyzer:
    def __init__(self):
        self.logger = logging.getLogger('DataAnalyzer')
        self.supported_formats = ['csv', 'json', 'excel']

    def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if operation == 'analyze':
                return self.analyze_data(params['data'], params.get('format', 'csv'))
            elif operation == 'summarize':
                return self.summarize_data(params['data'])
            elif operation == 'visualize':
                return self.prepare_visualization(params['data'], params['viz_type'])
        except Exception as e:
            self.logger.error(f"Data analysis error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def analyze_data(self, data: Any, format: str) -> Dict[str, Any]:
        if format not in self.supported_formats:
            return {"status": "error", "message": f"Unsupported format: {format}"}

        try:
            df = self._load_data(data, format)
            analysis = {
                "shape": df.shape,
                "columns": df.columns.tolist(),
                "dtypes": df.dtypes.to_dict(),
                "missing_values": df.isnull().sum().to_dict(),
                "numeric_summary": df.describe().to_dict(),
                "correlations": df.corr().to_dict() if len(df.select_dtypes(include=[np.number]).columns) > 1 else {}
            }
            return {"status": "success", "analysis": analysis}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def summarize_data(self, data: Any) -> Dict[str, Any]:
        try:
            df = self._load_data(data)
            summary = {
                "basic_stats": df.describe().to_dict(),
                "skewness": df.skew().to_dict(),
                "kurtosis": df.kurtosis().to_dict(),
                "unique_counts": df.nunique().to_dict()
            }
            return {"status": "success", "summary": summary}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def prepare_visualization(self, data: Any, viz_type: str) -> Dict[str, Any]:
        supported_viz = ['histogram', 'scatter', 'boxplot', 'line']
        if viz_type not in supported_viz:
            return {"status": "error", "message": f"Unsupported visualization type: {viz_type}"}

        try:
            df = self._load_data(data)
            # Return data in a format suitable for visualization
            viz_data = self._prepare_viz_data(df, viz_type)
            return {"status": "success", "viz_data": viz_data}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _load_data(self, data: Any, format: str = 'csv') -> pd.DataFrame:
        if isinstance(data, pd.DataFrame):
            return data
        elif format == 'csv':
            return pd.read_csv(data)
        elif format == 'json':
            return pd.read_json(data)
        elif format == 'excel':
            return pd.read_excel(data)
        else:
            raise ValueError(f"Unsupported data format: {format}")

    def _prepare_viz_data(self, df: pd.DataFrame, viz_type: str) -> Dict[str, Any]:
        if viz_type == 'histogram':
            return {col: df[col].tolist() for col in df.select_dtypes(include=[np.number]).columns}
        elif viz_type == 'scatter':
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            return {
                'x': df[numeric_cols[0]].tolist(),
                'y': df[numeric_cols[1]].tolist() if len(numeric_cols) > 1 else []
            }
        # Add more visualization preparations as needed
        return {}
