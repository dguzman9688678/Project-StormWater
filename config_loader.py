import logging
from typing import Dict, Any, Optional
import json
import yaml
from pathlib import Path
import os

class ConfigLoader:
    def __init__(self):
        self.logger = logging.getLogger('ConfigLoader')
        self.config_dir = Path('config')
        self.cached_configs = {}
        self.supported_formats = {'.json', '.yaml', '.yml', '.env'}

    def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if operation == 'load':
                return self.load_config(params['name'])
            elif operation == 'save':
                return self.save_config(params['name'], params['data'])
            elif operation == 'list':
                return self.list_configs()
            elif operation == 'validate':
                return self.validate_config(params['name'], params['schema'])
        except Exception as e:
            self.logger.error(f"Config operation error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def load_config(self, name: str) -> Dict[str, Any]:
        try:
            if name in self.cached_configs:
                return {"status": "success", "config": self.cached_configs[name]}

            config_path = self._find_config_file(name)
            if not config_path:
                return {"status": "error", "message": f"Config '{name}' not found"}

            config_data = self._read_config_file(config_path)
            self.cached_configs[name] = config_data
            
            return {"status": "success", "config": config_data}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def save_config(self, name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            config_path = self.config_dir / f"{name}.json"
            config_path.parent.mkdir(exist_ok=True)
            
            with open(config_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.cached_configs[name] = data
            return {"status": "success", "path": str(config_path)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_configs(self) -> Dict[str, Any]:
        configs = []
        for ext in self.supported_formats:
            configs.extend(self.config_dir.glob(f"*{ext}"))
        
        return {
            "status": "success",
            "configs": [f.stem for f in configs]
        }

    def validate_config(self, name: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        try:
            config_data = self.load_config(name)
            if config_data["status"] != "success":
                return config_data
            
            validation_result = self._validate_against_schema(
                config_data["config"],
                schema
            )
            
            return {
                "status": "success",
                "valid": validation_result["valid"],
                "errors": validation_result.get("errors", [])
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _find_config_file(self, name: str) -> Optional[Path]:
        for ext in self.supported_formats:
            path = self.config_dir / f"{name}{ext}"
            if path.exists():
                return path
        return None

    def _read_config_file(self, path: Path) -> Dict[str, Any]:
        with open(path, 'r') as f:
            if path.suffix in {'.yaml', '.yml'}:
                return yaml.safe_load(f)
            elif path.suffix == '.json':
                return json.load(f)
            elif path.suffix == '.env':
                return self._parse_env_file(f)
            else:
                raise ValueError(f"Unsupported config format: {path.suffix}")

    def _parse_env_file(self, file) -> Dict[str, str]:
        config = {}
        for line in file:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                config[key.strip()] = value.strip()
        return config

    def _validate_against_schema(self, data: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
        errors = []
        
        for key, requirements in schema.items():
            if requirements.get('required', False) and key not in data:
                errors.append(f"Missing required field: {key}")
            elif key in data:
                if 'type' in requirements:
                    if not isinstance(data[key], eval(requirements['type'])):
                        errors.append(f"Invalid type for {key}")
                if 'values' in requirements and data[key] not in requirements['values']:
                    errors.append(f"Invalid value for {key}")

        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
