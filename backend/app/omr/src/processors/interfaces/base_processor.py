# src/processors/interfaces/base_processor.py
class BaseProcessor:
    """Abstract base class for all processors"""
    def __init__(self, *args, **kwargs):
        pass
    
    def apply_filter(self, image, filename):
        raise NotImplementedError
        
    @staticmethod
    def exclude_files():
        return []