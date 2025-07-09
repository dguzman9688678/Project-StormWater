from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import logging

class RequestModel(BaseModel):
    skill: str
    params: Dict[str, Any]

class VaderAPI:
    def __init__(self, vader_instance):
        self.app = FastAPI()
        self.vader = vader_instance
        self.logger = logging.getLogger('VaderAPI')
        self.setup_routes()

    def setup_routes(self):
        @self.app.post("/execute")
        async def execute_skill(request: RequestModel):
            try:
                result = self.vader.execute_skill(request.skill, request.params)
                return {"status": "success", "result": result}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/status")
        async def get_status():
            try:
                status = self.vader.get_status()
                return {"status": "success", "vader_status": status}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

    def start(self):
        """Start the API server"""
        import uvicorn
        uvicorn.run(self.app, host="0.0.0.0", port=8000)
