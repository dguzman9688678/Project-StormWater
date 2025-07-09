import logging
from typing import Dict, Any, List
from datetime import datetime

class BaseCommands:
    def __init__(self, vader_instance):
        self.logger = logging.getLogger('BaseCommands')
        self.vader = vader_instance

    def help(self) -> Dict[str, Any]:
        """Get help information about available commands"""
        commands = {
            "help": "Display this help message",
            "status": "Get system status",
            "start": "Start a task or process",
            "stop": "Stop a task or process",
            "restart": "Restart a component or process",
            "list": "List available resources or tasks",
            "config": "View or modify configuration"
        }
        
        return {
            "status": "success",
            "commands": commands
        }

    def status(self) -> Dict[str, Any]:
        """Get current system status"""
        try:
            status_info = {
                "timestamp": datetime.now().isoformat(),
                "system_status": self.vader.get_status(),
                "active_tasks": self.vader.get_active_tasks(),
                "memory_usage": self.vader.get_memory_usage(),
                "uptime": self.vader.get_uptime()
            }
            return {
                "status": "success",
                "status_info": status_info
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def start(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Start a task or process"""
        try:
            task_type = params.get('type')
            task_params = params.get('params', {})
            
            task_id = self.vader.start_task(task_type, task_params)
            return {
                "status": "success",
                "task_id": task_id
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def stop(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Stop a task or process"""
        try:
            task_id = params.get('task_id')
            force = params.get('force', False)
            
            result = self.vader.stop_task(task_id, force)
            return {
                "status": "success",
                "stopped": result
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def restart(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Restart a component or process"""
        try:
            component = params.get('component')
            clean = params.get('clean', False)
            
            result = self.vader.restart_component(component, clean)
            return {
                "status": "success",
                "restarted": result
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """List available resources or tasks"""
        try:
            resource_type = params.get('type', 'all')
            filter_params = params.get('filter', {})
            
            items = self.vader.list_resources(resource_type, filter_params)
            return {
                "status": "success",
                "items": items
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def config(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """View or modify configuration"""
        try:
            action = params.get('action', 'view')
            config_path = params.get('path', '')
            value = params.get('value')
            
            if action == 'view':
                config = self.vader.get_config(config_path)
                return {
                    "status": "success",
                    "config": config
                }
            elif action == 'set':
                result = self.vader.set_config(config_path, value)
                return {
                    "status": "success",
                    "updated": result
                }
            else:
                return {"status": "error", "message": "Invalid action"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
