import logging
import psutil
import os
from typing import Dict, Any, List
from datetime import datetime
import json
from pathlib import Path

class SystemHealth:
    def __init__(self):
        self.logger = logging.getLogger('SystemHealth')
        self.health_data_file = Path('data/diagnostics/health_history.json')
        self.health_data_file.parent.mkdir(parents=True, exist_ok=True)
        self.health_history = self._load_health_history()
        self.alert_thresholds = {
            'cpu_percent': 80.0,
            'memory_percent': 85.0,
            'disk_percent': 90.0
        }

    def check_health(self) -> Dict[str, Any]:
        """Perform comprehensive system health check"""
        try:
            health_data = {
                'timestamp': datetime.now().isoformat(),
                'cpu': self._check_cpu(),
                'memory': self._check_memory(),
                'disk': self._check_disk(),
                'network': self._check_network(),
                'processes': self._check_processes()
            }
            
            self._update_health_history(health_data)
            alerts = self._generate_alerts(health_data)
            
            return {
                "status": "success",
                "health_data": health_data,
                "alerts": alerts
            }
        except Exception as e:
            self.logger.error(f"Health check failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    def generate_report(self) -> Dict[str, Any]:
        """Generate detailed health report"""
        try:
            current_health = self.check_health()
            historical_analysis = self._analyze_history()
            
            report = {
                "timestamp": datetime.now().isoformat(),
                "current_health": current_health,
                "historical_analysis": historical_analysis,
                "recommendations": self._generate_recommendations(current_health, historical_analysis)
            }
            
            return {"status": "success", "report": report}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _check_cpu(self) -> Dict[str, Any]:
        """Check CPU status"""
        cpu_times = psutil.cpu_times_percent()
        return {
            "usage_percent": psutil.cpu_percent(interval=1),
            "per_cpu_percent": psutil.cpu_percent(interval=1, percpu=True),
            "times": {
                "user": cpu_times.user,
                "system": cpu_times.system,
                "idle": cpu_times.idle
            }
        }

    def _check_memory(self) -> Dict[str, Any]:
        """Check memory status"""
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "swap": {
                "total": swap.total,
                "used": swap.used,
                "percent": swap.percent
            }
        }

    def _check_disk(self) -> Dict[str, Any]:
        """Check disk status"""
        disk_usage = psutil.disk_usage('/')
        return {
            "total": disk_usage.total,
            "used": disk_usage.used,
            "free": disk_usage.free,
            "percent": disk_usage.percent
        }

    def _check_network(self) -> Dict[str, Any]:
        """Check network status"""
        network_counters = psutil.net_io_counters()
        return {
            "bytes_sent": network_counters.bytes_sent,
            "bytes_recv": network_counters.bytes_recv,
            "packets_sent": network_counters.packets_sent,
            "packets_recv": network_counters.packets_recv,
            "connections": len(psutil.net_connections())
        }

    def _check_processes(self) -> Dict[str, Any]:
        """Check process status"""
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return {
            "total_count": len(processes),
            "top_cpu": sorted(processes, key=lambda x: x['cpu_percent'], reverse=True)[:5],
            "top_memory": sorted(processes, key=lambda x: x['memory_percent'], reverse=True)[:5]
        }

    def _load_health_history(self) -> List[Dict[str, Any]]:
        """Load historical health data"""
        try:
            if self.health_data_file.exists():
                with open(self.health_data_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load health history: {str(e)}")
        return []

    def _update_health_history(self, health_data: Dict[str, Any]):
        """Update health history"""
        try:
            self.health_history.append(health_data)
            # Keep last 1000 records
            if len(self.health_history) > 1000:
                self.health_history = self.health_history[-1000:]
            
            with open(self.health_data_file, 'w') as f:
                json.dump(self.health_history, f)
        except Exception as e:
            self.logger.error(f"Failed to update health history: {str(e)}")

    def _generate_alerts(self, health_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate alerts based on health data"""
        alerts = []
        
        if health_data['cpu']['usage_percent'] > self.alert_thresholds['cpu_percent']:
            alerts.append({
                "level": "warning",
                "component": "cpu",
                "message": f"High CPU usage: {health_data['cpu']['usage_percent']}%"
            })
            
        if health_data['memory']['percent'] > self.alert_thresholds['memory_percent']:
            alerts.append({
                "level": "warning",
                "component": "memory",
                "message": f"High memory usage: {health_data['memory']['percent']}%"
            })
            
        if health_data['disk']['percent'] > self.alert_thresholds['disk_percent']:
            alerts.append({
                "level": "warning",
                "component": "disk",
                "message": f"High disk usage: {health_data['disk']['percent']}%"
            })
            
        return alerts

    def _analyze_history(self) -> Dict[str, Any]:
        """Analyze historical health data"""
        if not self.health_history:
            return {}
            
        cpu_usage = [h['cpu']['usage_percent'] for h in self.health_history]
        memory_usage = [h['memory']['percent'] for h in self.health_history]
        
        return {
            "cpu": {
                "avg": sum(cpu_usage) / len(cpu_usage),
                "max": max(cpu_usage),
                "min": min(cpu_usage)
            },
            "memory": {
                "avg": sum(memory_usage) / len(memory_usage),
                "max": max(memory_usage),
                "min": min(memory_usage)
            }
        }

    def _generate_recommendations(self, current_health: Dict[str, Any], 
                                historical_analysis: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on health data"""
        recommendations = []
        
        # CPU recommendations
        if current_health['health_data']['cpu']['usage_percent'] > 80:
            recommendations.append(
                "Consider optimizing CPU-intensive processes or scaling resources"
            )
            
        # Memory recommendations
        if current_health['health_data']['memory']['percent'] > 85:
            recommendations.append(
                "Consider increasing available memory or optimizing memory usage"
            )
            
        # Disk recommendations
        if current_health['health_data']['disk']['percent'] > 90:
            recommendations.append(
                "Disk space is running low. Consider cleaning up unnecessary files"
            )
            
        return recommendations
