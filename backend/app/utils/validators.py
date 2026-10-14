import json
import random
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def generate_feedback_id() -> str:
    """
    Generate unique feedback ID in format: CV + YYMMDD + 4 random digits
    Example: CV2610058492
    """
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%y%m%d")
    random_digits = f"{random.randint(1000, 9999)}"
    return f"CV{date_str}{random_digits}"


def is_valid_feedback_id(feedback_id: str) -> bool:
    """Validate format of feedback ID (CV + 6 digits + 4 digits = 12 chars)."""
    if not isinstance(feedback_id, str):
        return False
    return bool(re.match(r"^CV\d{10}$", feedback_id.strip()))


def extract_json_from_text(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract and parse JSON from raw LLM output, stripping markdown code blocks,
    preceding explanations, or trailing commentary.
    """
    if not text or not isinstance(text, str):
        return None

    cleaned = text.strip()

    # If wrapped in markdown code blocks: ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()

    # Try direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try searching for outermost { ... }
    bracket_match = re.search(r"(\{[\s\S]*\})", cleaned)
    if bracket_match:
        candidate = bracket_match.group(1).strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    return None
