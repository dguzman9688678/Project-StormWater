import logging
from typing import Dict, Any, List
from datetime import datetime
import json
import markdown
import csv
from pathlib import Path

class ReportGenerator:
    def __init__(self):
        self.logger = logging.getLogger('ReportGenerator')
        self.supported_formats = ['txt', 'md', 'html', 'json', 'csv']
        self.report_templates = self._load_templates()

    def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if operation == 'generate':
                return self.generate_report(
                    params['data'],
                    params.get('format', 'txt'),
                    params.get('template', 'default')
                )
            elif operation == 'list_templates':
                return self.list_templates()
            elif operation == 'preview':
                return self.preview_report(params['data'], params.get('template', 'default'))
        except Exception as e:
            self.logger.error(f"Report generation error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def generate_report(self, data: Dict[str, Any], format: str, template: str) -> Dict[str, Any]:
        if format not in self.supported_formats:
            return {"status": "error", "message": f"Unsupported format: {format}"}

        try:
            content = self._apply_template(data, template)
            formatted_content = self._format_content(content, format)
            report_path = self._save_report(formatted_content, format)
            
            return {
                "status": "success",
                "report_path": str(report_path),
                "format": format,
                "template_used": template
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_templates(self) -> Dict[str, Any]:
        return {
            "status": "success",
            "templates": list(self.report_templates.keys())
        }

    def preview_report(self, data: Dict[str, Any], template: str) -> Dict[str, Any]:
        try:
            content = self._apply_template(data, template)
            return {
                "status": "success",
                "preview": content[:1000] + "..." if len(content) > 1000 else content
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _load_templates(self) -> Dict[str, str]:
        templates_dir = Path('config/report_templates')
        templates = {}
        if templates_dir.exists():
            for template_file in templates_dir.glob('*.template'):
                templates[template_file.stem] = template_file.read_text()
        return templates

    def _apply_template(self, data: Dict[str, Any], template: str) -> str:
        if template not in self.report_templates:
            template = 'default'
        
        template_content = self.report_templates[template]
        # Simple template substitution
        for key, value in data.items():
            template_content = template_content.replace(f"{{{key}}}", str(value))
        return template_content

    def _format_content(self, content: str, format: str) -> str:
        if format == 'md':
            return content
        elif format == 'html':
            return markdown.markdown(content)
        elif format == 'json':
            return json.dumps({"content": content}, indent=2)
        elif format == 'csv':
            # Convert content to CSV format if possible
            return self._convert_to_csv(content)
        return content  # txt format

    def _save_report(self, content: str, format: str) -> Path:
        reports_dir = Path('data/reports')
        reports_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_path = reports_dir / f"report_{timestamp}.{format}"
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return report_path

    def _convert_to_csv(self, content: str) -> str:
        # Simple conversion - assumes content is convertible to CSV
        try:
            data = json.loads(content)
            output = []
            if isinstance(data, dict):
                output.append(','.join(data.keys()))
                output.append(','.join(str(v) for v in data.values()))
            elif isinstance(data, list):
                if data and isinstance(data[0], dict):
                    headers = list(data[0].keys())
                    output.append(','.join(headers))
                    for item in data:
                        output.append(','.join(str(item.get(h, '')) for h in headers))
            return '\n'.join(output)
        except:
            return content
