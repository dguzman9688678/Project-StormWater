import logging
import socket
import requests
from typing import Dict, Any, List
import nmap

class NetScanner:
    def __init__(self):
        self.logger = logging.getLogger('NetScanner')
        self.nm = nmap.PortScanner()
        self.scan_history = []

    def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        try:
            if operation == 'scan_ports':
                return self.scan_ports(params['host'], params.get('ports', '1-1024'))
            elif operation == 'check_connectivity':
                return self.check_connectivity(params['host'])
            elif operation == 'analyze_network':
                return self.analyze_network(params['subnet'])
        except Exception as e:
            self.logger.error(f"Network scanning error: {str(e)}")
            return {"status": "error", "message": str(e)}

    def scan_ports(self, host: str, ports: str) -> Dict[str, Any]:
        try:
            scan_result = self.nm.scan(host, ports)
            return {
                "status": "success",
                "scan_result": scan_result,
                "open_ports": self._parse_scan_results(scan_result)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def check_connectivity(self, host: str) -> Dict[str, Any]:
        try:
            response = requests.get(f"http://{host}", timeout=5)
            return {
                "status": "success",
                "connectivity": {
                    "reachable": True,
                    "response_time": response.elapsed.total_seconds(),
                    "status_code": response.status_code
                }
            }
        except requests.RequestException as e:
            return {
                "status": "success",
                "connectivity": {
                    "reachable": False,
                    "error": str(e)
                }
            }

    def analyze_network(self, subnet: str) -> Dict[str, Any]:
        try:
            scan_result = self.nm.scan(hosts=subnet, arguments='-sn')
            return {
                "status": "success",
                "hosts": self._parse_network_scan(scan_result)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _parse_scan_results(self, scan_result: Dict) -> List[Dict[str, Any]]:
        open_ports = []
        for host in scan_result['scan']:
            if 'tcp' in scan_result['scan'][host]:
                for port, port_data in scan_result['scan'][host]['tcp'].items():
                    if port_data['state'] == 'open':
                        open_ports.append({
                            "port": port,
                            "service": port_data.get('name', 'unknown'),
                            "version": port_data.get('version', 'unknown')
                        })
        return open_ports

    def _parse_network_scan(self, scan_result: Dict) -> List[Dict[str, Any]]:
        hosts = []
        for host in scan_result['scan']:
            if scan_result['scan'][host]['status']['state'] == 'up':
                hosts.append({
                    "ip": host,
                    "hostname": scan_result['scan'][host].get('hostnames', []),
                    "status": "up"
                })
        return hosts
