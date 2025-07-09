import json
import logging
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime

class ContextManager:
    def __init__(self):
        self.logger = logging.getLogger('ContextManager')
        self.context_file = Path('data/context.json')
        self.current_context = {
            'system_state': 'initializing',
            'last_update': None,
            'active_tasks': [],
            'pending_inputs': [],
            'environment_data': {},
            'short_term_memory': []
        }

    def load_initial_state(self):
        """Load saved context if available"""
        try:
            if self.context_file.exists():
                with open(self.context_file, 'r') as f:
                    saved_context = json.load(f)
                self.current_context.update(saved_context)
                self.logger.info("Context loaded from file")
        except Exception as e:
            self.logger.error(f"Error loading context: {str(e)}")

    def save_state(self):
        """Save current context to file"""
        try:
            self.context_file.parent.mkdir(exist_ok=True)
            with open(self.context_file, 'w') as f:
                json.dump(self.current_context, f, indent=2)
            self.logger.info("Context saved to file")
        except Exception as e:
            self.logger.error(f"Error saving context: {str(e)}")

    def update(self):
        """Update context with current state"""
        self.current_context['last_update'] = datetime.now().isoformat()
        self._update_environment_data()
        self._prune_short_term_memory()

    def _update_environment_data(self):
        """Update environment-related data"""
        # Add environment monitoring logic here
        pass

    def _prune_short_term_memory(self):
        """Remove old items from short-term memory"""
        max_items = 100
        if len(self.current_context['short_term_memory']) > max_items:
            self.current_context['short_term_memory'] = \
                self.current_context['short_term_memory'][-max_items:]

    def add_to_memory(self, item: Dict[str, Any]):
        """Add an item to short-term memory"""
        self.current_context['short_term_memory'].append({
            'timestamp': datetime.now().isoformat(),
            'data': item
        })

    def get_pending_inputs(self) -> List[Dict[str, Any]]:
        """Get and clear pending inputs"""
        inputs = self.current_context['pending_inputs']
        self.current_context['pending_inputs'] = []
        return inputs

    def add_task(self, task: Dict[str, Any]):
        """Add a new task to active tasks"""
        self.current_context['active_tasks'].append(task)

    def get_active_tasks(self) -> List[Dict[str, Any]]:
        """Get list of active tasks"""
        return self.current_context['active_tasks']
