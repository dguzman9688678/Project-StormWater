import logging
from typing import Dict, Any
import requests
from bs4 import BeautifulSoup

class WebScraper:
    def __init__(self):
        self.logger = logging.getLogger('WebScraper')
        self.session = requests.Session()
        self.headers = {
            'User-Agent': 'Vader-AI-Agent/1.0'
        }

    def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if operation == 'fetch_page':
                return self.fetch_page(params['url'])
            elif operation == 'extract_text':
                return self.extract_text(params['html'])
            elif operation == 'extract_links':
                return self.extract_links(params['html'])
        except Exception as e:
            self.logger.error(f"Scraping error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def fetch_page(self, url: str) -> Dict[str, Any]:
        response = self.session.get(url, headers=self.headers)
        return {
            "status": "success",
            "html": response.text,
            "status_code": response.status_code
        }

    def extract_text(self, html: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text(separator='\n', strip=True)
        return {"status": "success", "text": text}

    def extract_links(self, html: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, 'html.parser')
        links = [a.get('href') for a in soup.find_all('a', href=True)]
        return {"status": "success", "links": links}
