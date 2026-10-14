from typing import Dict, List

# 4 Standard Central Hospital Questions
CENTRAL_QUESTIONS: List[Dict[str, any]] = [
    {
        "id": 1,
        "text": "How would you rate the cleanliness of the hospital and the basic facilities provided?",
        "category": "cleanliness_facilities",
        "categories": ["cleanliness_facilities"],
    },
    {
        "id": 2,
        "text": "How would you rate the behaviour of the hospital staff and the timeliness of your medicine doses?",
        "category": "staff_behaviour",
        "categories": ["staff_behaviour", "medicine_timeliness"],
    },
    {
        "id": 3,
        "text": "How satisfied are you with the treatment given by the doctors and the overall service you received?",
        "category": "doctor_treatment",
        "categories": ["doctor_treatment", "overall_service"],
    },
    {
        "id": 4,
        "text": "Which staff member's service did you appreciate most, and with whose service were you dissatisfied (names, if any)? Please also share any suggestions to improve the hospital?",
        "category": "suggestions",
        "categories": ["staff_appreciation", "staff_dissatisfaction", "suggestions"],
    },
]

SYSTEM_PROMPT = """You are an AI assistant analyzing anonymous hospital patient feedback.

Analyze the patient's feedback objectively.
Do not diagnose medical conditions.
Do not make medical recommendations.
Do not invent information.
Extract only information supported by the patient's responses.

Return ONLY valid JSON with no conversational text or markdown code fences.

The JSON MUST have this EXACT structure:
{
    "overall_sentiment": "positive | neutral | negative | mixed",
    "category_scores": {
        "cleanliness_facilities": <integer 0-100>,
        "staff_behaviour": <integer 0-100>,
        "medicine_timeliness": <integer 0-100>,
        "doctor_treatment": <integer 0-100>,
        "overall_service": <integer 0-100>
    },
    "positive_feedback": ["<string>", ...],
    "negative_feedback": ["<string>", ...],
    "key_issues": ["<string>", ...],
    "improvement_areas": ["<string>", ...],
    "patient_suggestions": ["<string>", ...],
    "appreciated_staff": ["<string>", ...],
    "dissatisfied_staff": ["<string>", ...],
    "summary": "<Concise 2-3 sentence executive summary of the feedback>"
}
"""


def build_analysis_user_prompt(language: str, answers_dict: Dict[int, str]) -> str:
    """Build the structured user prompt containing all 4 answers in their original language."""
    q1 = answers_dict.get(1, "No response provided.")
    q2 = answers_dict.get(2, "No response provided.")
    q3 = answers_dict.get(3, "No response provided.")
    q4 = answers_dict.get(4, "No response provided.")

    return f"""Language used by patient: {language}

Patient Responses:
- Question 1 (Cleanliness & Basic Facilities):
"{q1}"

- Question 2 (Staff Behaviour & Timeliness of Medicine Doses):
"{q2}"

- Question 3 (Doctor Treatment & Overall Hospital Service):
"{q3}"

- Question 4 (Staff Appreciation / Dissatisfaction & Improvement Suggestions):
"{q4}"

Analyze the above feedback and generate the structured JSON evaluation. Translate observations into English for the report fields."""
