from datetime import datetime, timezone
from typing import Dict, Any

class OnboardingService:
    @staticmethod
    def merge_data(existing: Dict[str, Any], new_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Merge new onboarding fields with existing ones, preserving existing non-null data if not present in new payload."""
        merged = dict(existing) if existing else {}
        
        for k, v in new_payload.items():
            if v is not None and v != "":
                merged[k] = v
                
        merged['updated_at'] = datetime.now(timezone.utc).isoformat()
        return merged
