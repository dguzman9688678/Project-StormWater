import logging
from typing import Dict, Any, Optional

class ModelRouter:
    def __init__(self):
        self.logger = logging.getLogger('ModelRouter')
        self.available_models = {
            'llm': None,  # LLM handler
            'vision': None,  # Vision model handler
        }

    def route_request(self, model_type: str, request_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Route request to appropriate model"""
        if model_type not in self.available_models:
            self.logger.error(f"Unknown model type: {model_type}")
            return None
            
        try:
            model = self.available_models[model_type]
            if model is None:
                self.logger.error(f"Model {model_type} not initialized")
                return None
                
            return model.process(request_data)
        except Exception as e:
            self.logger.error(f"Model processing error: {str(e)}")
            return None

    def register_model(self, model_type: str, model_handler: Any):
        """Register a new model handler"""
        self.available_models[model_type] = model_handler
        self.logger.info(f"Registered new model handler for {model_type}")
