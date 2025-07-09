import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, List

class FileManager:
    def __init__(self):
        self.logger = logging.getLogger('FileManager')
        self.allowed_operations = ['read', 'write', 'list', 'delete', 'move']

    def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        if operation not in self.allowed_operations:
            return {"status": "error", "message": f"Operation {operation} not allowed"}
        
        try:
            if operation == 'read':
                return self.read_file(params['path'])
            elif operation == 'write':
                return self.write_file(params['path'], params['content'])
            elif operation == 'list':
                return self.list_directory(params['path'])
            elif operation == 'delete':
                return self.delete_file(params['path'])
            elif operation == 'move':
                return self.move_file(params['source'], params['destination'])
        except Exception as e:
            self.logger.error(f"File operation error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def read_file(self, path: str) -> Dict[str, Any]:
        with open(path, 'r') as f:
            content = f.read()
        return {"status": "success", "content": content}

    def write_file(self, path: str, content: str) -> Dict[str, Any]:
        with open(path, 'w') as f:
            f.write(content)
        return {"status": "success"}

    def list_directory(self, path: str) -> Dict[str, Any]:
        items = os.listdir(path)
        return {"status": "success", "items": items}

    def delete_file(self, path: str) -> Dict[str, Any]:
        os.remove(path)
        return {"status": "success"}

    def move_file(self, source: str, destination: str) -> Dict[str, Any]:
        shutil.move(source, destination)
        return {"status": "success"}
