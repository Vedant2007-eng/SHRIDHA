import json
import os
import re
from typing import Any

from app.services.nlp_service import analyze_feedback, score_text

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    from google import genai
except Exception:
    genai = None


POSITIVE_PHRASES = {
    "excellent": 2.2, "outstanding": 2.2, "amazing": 2.0, "wonderful": 2.0,
    "very good": 2.0, "very clean": 2.0, "very helpful": 2.0, "very polite": 2.0,
    "good": 1.2, "clean": 1.2, "hygienic": 1.3, "helpful": 1.2, "polite": 1.2,
    "kind": 1.2, "caring": 1.3, "satisfied": 1.5, "happy": 1.3, "timely": 1.2,
    "on time": 1.4, "prompt": 1.1, "quick": 1.1, "cured": 1.6,
    "improved": 1.2, "appreciate": 1.4, "appreciated": 1.4, "professional": 1.2,
    "respectful": 1.2, "thank": 1.0,
}

NEGATIVE_PHRASES = {
    "terrible": 2.4, "horrible": 2.3, "worst": 2.2, "awful": 2.2,
    "very bad": 2.0, "very dirty": 2.0, "very rude": 2.0, "poor": 1.6,
    "bad": 1.3, "dirty": 1.4, "unclean": 1.5, "rude": 1.4, "unhelpful": 1.4,
    "uncaring": 1.3, "dissatisfied": 1.7, "unhappy": 1.4, "late": 1.2,
    "delayed": 1.4, "delay": 1.2, "forgot": 1.2, "pain": 1.0, "neglect": 1.8,
    "ignored": 1.5, "problem": 1.0, "issue": 1.0, "complaint": 1.2,
    "overcharged": 1.8, "mistake": 1.5,
}


def _clamp_score(value: Any, default: float = 5.0) -> float:
    try:
        value = float(value)
    except (TypeError, ValueError):
        value = default
    return round(max(1.0, min(10.0, value)), 1)


def _find_answer(answers_list: list[dict], index: int) -> str:
    """Prefer question order over keyword matching to prevent cross-question confusion."""
    if index < len(answers_list):
        return str(answers_list[index].get("answer") or "").strip()
    return ""


def _tone_adjustment(answer: dict, sentiment: str) -> float:
    """Use vocal tone only as a small supporting signal, never as the main score."""
    tone = answer.get("tone") or {}
    try:
        distress = float(tone.get("distress_score", 0.0))
    except (TypeError, ValueError):
        distress = 0.0
    distress = max(0.0, min(1.0, distress))
    if sentiment == "NEGATIVE":
        return round(-0.6 * distress, 2)
    if sentiment == "POSITIVE":
        # Do not punish positive content simply because the voice is energetic.
        return round(min(0.2, 0.2 * distress), 2)
    return 0.0


def _aspect_evidence_text(text: str, keywords: list[str]) -> str:
    """Select transcript clauses relevant to one sub-aspect without mixing Q2 dimensions."""
    text = str(text or "").strip()
    if not text:
        return ""
    clauses = re.split(r"(?<=[.!?])\s+|\s+(?:and|but|however|although|while)\s+", text, flags=re.I)
    keyword_set = [k.lower() for k in keywords]
    selected = []
    for clause in clauses:
        low = clause.lower()
        if any(k in low for k in keyword_set):
            selected.append(clause.strip())
    if selected:
        return " ".join(selected)
    # Do not score an unrelated answer as evidence for this dimension.
    return ""


def _dynamic_aspect_score(text: str, aspect: str) -> tuple[float, str, str, dict]:
    """Return score, sentiment, explanation and evidence for one aspect."""
    result = score_text(text)
    score = result["score"]
    sentiment = result["sentiment"]
    if not text:
        return 5.0, "NEUTRAL", "No spoken response was detected for this question.", result

    if result["positive_evidence"] and result["negative_evidence"]:
        explanation = (
            f"Mixed feedback about {aspect}; positive cues: "
            f"{', '.join(result['positive_evidence'][:3])}; negative cues: "
            f"{', '.join(result['negative_evidence'][:3])}."
        )
    elif result["positive_evidence"]:
        explanation = f"Patient gave positive feedback about {aspect}, mentioning {', '.join(result['positive_evidence'][:4])}."
    elif result["negative_evidence"]:
        explanation = f"Patient gave negative feedback about {aspect}, mentioning {', '.join(result['negative_evidence'][:4])}."
    else:
        explanation = f"Patient gave limited or neutral feedback about {aspect}."

    return round(score, 1), sentiment, explanation, result


def _extract_entities_and_feedback(q4: str) -> tuple[list[str], list[str], list[str], list[str], list[str]]:
    """Extract only evidence explicitly present in the patient's Q4 answer."""
    appreciated: list[str] = []
    dissatisfied: list[str] = []
    complaints: list[str] = []
    suggestions: list[str] = []
    critical: list[str] = []

    if not q4:
        return appreciated, dissatisfied, complaints, suggestions, critical

    sentences = re.split(r"(?<=[.!?])\s+|\s+(?:and|but|however)\s+", q4, flags=re.I)
    name_pattern = re.compile(r"\b(?:Dr\.?|doctor|nurse|sister|staff|wardboy)\s+([A-Z][a-z]{2,})\b")
    for sentence in sentences:
        s = sentence.strip(" ,;:-")
        if not s:
            continue
        low = s.lower()
        names = [m.capitalize() for m in name_pattern.findall(s)]

        if any(k in low for k in ["appreciate", "appreciated", "thank", "helpful", "kind", "good", "best", "excellent"]):
            appreciated.extend(names)
        if any(k in low for k in ["dissatisfied", "rude", "bad", "poor", "unhelpful", "worst", "disappointed"]):
            dissatisfied.extend(names)

        if any(k in low for k in ["suggest", "should", "please", "improve", "need to", "add ", "better if"]):
            suggestions.append(s)
        if any(k in low for k in ["complaint", "problem", "issue", "bad", "poor", "dirty", "delay", "rude", "wrong medicine", "overcharged", "ignored"]):
            complaints.append(s)
        if any(k in low for k in ["wrong medicine", "infection", "medical emergency", "severe pain", "neglect", "unsafe"]):
            critical.append(s)

    return (
        sorted(set(appreciated)),
        sorted(set(dissatisfied)),
        sorted(set(complaints)),
        sorted(set(suggestions)),
        sorted(set(critical)),
    )


def _build_fallback_report(answers_list: list[dict], language: str) -> dict:
    q1 = _find_answer(answers_list, 0)
    q2 = _find_answer(answers_list, 1)
    q3 = _find_answer(answers_list, 2)
    q4 = _find_answer(answers_list, 3)

    # These are deliberately calculated from the actual transcript, not fixed values.
    q2_staff = _aspect_evidence_text(
        q2, ["staff", "nurse", "nurses", "sister", "wardboy", "behaviour", "behavior", "polite", "rude", "helpful", "caring", "professional", "respectful"]
    )
    q2_medicine = _aspect_evidence_text(
        q2, ["medicine", "medicines", "dose", "doses", "tablet", "tablets", "injection", "injections", "on time", "timely", "late", "delay", "delayed", "forgot"]
    )

    c_score, c_sent, c_summary, c_evidence = _dynamic_aspect_score(q1, "cleanliness and facilities")
    staff_score, staff_sent, staff_summary, staff_evidence = _dynamic_aspect_score(q2_staff, "staff behavior")
    med_score, med_sent, med_summary, med_evidence = _dynamic_aspect_score(q2_medicine, "medicine timeliness")
    doc_score, doc_sent, doc_summary, doc_evidence = _dynamic_aspect_score(q3, "doctor treatment and service")

    # Apply small tone adjustments per question. Semantic content remains dominant.
    tone_map = {
        0: (c_sent, c_score),
        1: (staff_sent, staff_score),
        2: (doc_sent, doc_score),
    }
    for idx, (sent, score) in tone_map.items():
        base_answer = answers_list[idx] if idx < len(answers_list) else {}
        adj = _tone_adjustment(base_answer, sent)
        tone_map[idx] = (sent, _clamp_score(score + adj))

    c_score = tone_map[0][1]
    staff_score = tone_map[1][1]
    doc_score = tone_map[2][1]
    # Q2 contains two dimensions; use the same actual answer but give more weight
    # to explicit medicine-timing phrases when present.
    med_score = _clamp_score(med_score + _tone_adjustment(answers_list[1] if len(answers_list) > 1 else {}, med_sent))

    appreciated, dissatisfied, complaints, suggestions, critical = _extract_entities_and_feedback(q4)

    combined = " ".join(a.get("answer", "") for a in answers_list if a.get("answer"))
    nlp_res = analyze_feedback(combined)

    # Use the same canonical evidence scorer for both Gemini and fallback paths.
    evidence_scores = _score_from_patient_evidence(answers_list)
    overall_score = evidence_scores["overall_score"]
    overall_sentiment = evidence_scores["overall_sentiment"]

    return {
        "overall_sentiment": overall_sentiment,
        "overall_score": overall_score,
        "cleanliness": evidence_scores["aspects"]["cleanliness"],
        "staff_behavior": evidence_scores["aspects"]["staff_behavior"],
        "medicine_timeliness": evidence_scores["aspects"]["medicine_timeliness"],
        "doctor_treatment": evidence_scores["aspects"]["doctor_treatment"],
        "scored_aspects": evidence_scores["scored_aspects"],
        "score_evidence": evidence_scores["score_evidence"],
        "score_method": evidence_scores["score_method"],
        "appreciated_staff": appreciated,
        "dissatisfied_staff": dissatisfied,
        "complaints": complaints,
        "suggestions": suggestions,
        "critical_issues": critical,
        "overall_summary": (
            f"Evidence-based score: {overall_score}/10 from "
            f"{len(evidence_scores['scored_aspects'])} mentioned feedback categories. "
            f"Overall sentiment: {overall_sentiment.lower()}."
        ),
        "answers_transcription": answers_list,
        "flagged_topics": nlp_res.get("flagged_topics", []),
        "sentence_analysis": nlp_res.get("sentence_analysis", []),
        "analysis_engine": "dynamic-local-nlp",
        "score_note": (
            "Numeric scores are calculated from detected evidence in the patient's transcript. "
            "Unmentioned categories display 5/10 as a placeholder and are excluded from the overall average. "
            "Voice tone is only a limited supporting signal."
        ),
    }


def _score_from_patient_evidence(answers_list: list[dict]) -> dict:
    """Calculate category and overall scores locally from the actual transcript.

    The LLM may help write summaries, but it is never the source of numeric scores.
    Unmentioned dimensions get a neutral display placeholder (5/10) and are excluded
    from the overall average so missing feedback does not distort the patient's score.
    """
    q1 = _find_answer(answers_list, 0)
    q2 = _find_answer(answers_list, 1)
    q3 = _find_answer(answers_list, 2)

    q2_staff = _aspect_evidence_text(
        q2, ["staff", "nurse", "nurses", "sister", "wardboy", "behaviour", "behavior",
             "polite", "rude", "helpful", "caring", "professional", "respectful"]
    )
    q2_medicine = _aspect_evidence_text(
        q2, ["medicine", "medicines", "dose", "doses", "tablet", "tablets",
             "injection", "injections", "on time", "timely", "late", "delay", "delayed", "forgot"]
    )

    aspect_inputs = {
        "cleanliness": (q1, "cleanliness and facilities", 0),
        "staff_behavior": (q2_staff, "staff behavior", 1),
        "medicine_timeliness": (q2_medicine, "medicine timeliness", 1),
        "doctor_treatment": (q3, "doctor treatment and service", 2),
    }
    scores = {}
    included_scores = []
    evidence_map = {}

    for key, (text, label, answer_index) in aspect_inputs.items():
        text = (text or "").strip()
        result = score_text(text)
        if not text:
            scores[key] = {
                "score": 5.0,
                "summary": f"Not enough information about {label} was provided.",
                "scored": False,
                "sentiment": "NEUTRAL",
            }
            evidence_map[key] = {"positive": [], "negative": [], "source_text": ""}
            continue

        score = result["score"]
        # Vocal tone can only make a small adjustment when the text already contains
        # positive/negative evidence; it cannot create sentiment from neutral speech.
        if result["sentiment"] in {"POSITIVE", "NEGATIVE"} and answer_index < len(answers_list):
            score = _clamp_score(score + _tone_adjustment(answers_list[answer_index], result["sentiment"]))

        positive = result["positive_evidence"]
        negative = result["negative_evidence"]
        if positive and negative:
            summary = (f"Mixed feedback about {label}; positive wording: "
                       f"{', '.join(positive[:3])}; negative wording: {', '.join(negative[:3])}.")
        elif positive:
            summary = f"Positive feedback about {label}; evidence: {', '.join(positive[:4])}."
        elif negative:
            summary = f"Negative feedback about {label}; evidence: {', '.join(negative[:4])}."
        else:
            summary = f"The response mentioned {label}, but no clear positive or negative wording was detected."

        scores[key] = {
            "score": round(score, 1),
            "summary": summary,
            "scored": True,
            "sentiment": result["sentiment"].capitalize(),
        }
        included_scores.append(round(score, 1))
        evidence_map[key] = {
            "positive": positive,
            "negative": negative,
            "source_text": text,
        }

    overall_score = round(sum(included_scores) / len(included_scores), 1) if included_scores else 5.0
    if not included_scores:
        overall_sentiment = "Neutral"
    elif overall_score >= 7.0:
        overall_sentiment = "Positive"
    elif overall_score <= 4.0:
        overall_sentiment = "Negative"
    else:
        overall_sentiment = "Neutral"

    return {
        "aspects": scores,
        "overall_score": overall_score,
        "overall_sentiment": overall_sentiment,
        "scored_aspects": [key for key, value in scores.items() if value["scored"]],
        "score_evidence": evidence_map,
        "score_method": "local_lexicon_evidence_v1",
    }


def _safe_gemini_report(report: dict, answers_list: list[dict]) -> dict:
    """Validate AI-generated report text; always replace numeric scores with evidence scores."""
    if not isinstance(report, dict):
        report = {}

    # Recalculate all scores from transcript evidence. Do not trust model-generated numbers.
    evidence_scores = _score_from_patient_evidence(answers_list)
    aspect_keys = ["cleanliness", "staff_behavior", "medicine_timeliness", "doctor_treatment"]
    for key in aspect_keys:
        section = report.get(key)
        if not isinstance(section, dict):
            section = {}
        evidence_section = evidence_scores["aspects"][key]
        section["score"] = evidence_section["score"]
        # Use deterministic evidence-based summaries to avoid a model summary claiming
        # unsupported positive/negative findings for an unmentioned dimension.
        section["summary"] = evidence_section["summary"]
        section["scored"] = evidence_section["scored"]
        section["sentiment"] = evidence_section["sentiment"]
        report[key] = section

    report["overall_score"] = evidence_scores["overall_score"]
    report["overall_sentiment"] = evidence_scores["overall_sentiment"]
    report["scored_aspects"] = evidence_scores["scored_aspects"]
    report["score_evidence"] = evidence_scores["score_evidence"]
    report["score_method"] = evidence_scores["score_method"]
    report["overall_summary"] = (
        f"Evidence-based score: {report['overall_score']}/10 from "
        f"{len(report['scored_aspects'])} mentioned feedback categories. "
        f"Overall sentiment: {report['overall_sentiment'].lower()}."
    )

    for key in ["appreciated_staff", "dissatisfied_staff", "complaints", "suggestions", "critical_issues"]:
        if not isinstance(report.get(key), list):
            report[key] = []

    # Do not expose generic placeholder names as if they were real staff names.
    report["appreciated_staff"] = [x for x in report["appreciated_staff"] if str(x).strip().lower() not in {"hospital staff", "staff"}]
    report["dissatisfied_staff"] = [x for x in report["dissatisfied_staff"] if str(x).strip().lower() not in {"hospital staff", "staff"}]
    report["answers_transcription"] = answers_list
    report["analysis_engine"] = "gemini-summary+local-evidence-scoring"
    report["score_note"] = (
        "Numeric scores are calculated from detected evidence in the patient's transcript. "
        "Unmentioned categories display 5/10 as a placeholder and are excluded from the overall average. "
        "Voice tone is only a limited supporting signal."
    )
    return report


def analyze_survey_with_gemini(answers_list, language="en-US"):
    """Analyze the actual four survey responses with Gemini, with a dynamic local fallback."""
    api_key = os.environ.get("GEMINI_API_KEY")

    if api_key and genai is not None:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""
You are the HealSense hospital feedback scoring engine.
Analyze ONLY the patient's actual transcribed answers below. Never use a fixed/template score.

Language: {language}

QUESTIONS + ACTUAL PATIENT ANSWERS:
{json.dumps(answers_list, ensure_ascii=False, indent=2)}

SCORING RULES:
1. Every numeric score MUST be derived from the wording/content of the corresponding patient answer.
2. Positive feedback (excellent, very clean, helpful, satisfied, on time, etc.) should raise the relevant score.
3. Negative feedback (dirty, rude, delayed, poor, dissatisfied, ignored, etc.) should lower the relevant score.
4. Neutral/mixed feedback should produce a middle score around 5-6, not a fixed high or low score.
5. Explicit ratings such as "8 out of 10" must be respected.
6. If an aspect is not mentioned, use 5 only as a neutral placeholder and say that it was not mentioned.
7. Q2 contains two separate dimensions: staff behavior AND medicine timeliness. Score each from the actual Q2 answer.
8. Q4 should be used to extract staff names, complaints and suggestions. Never invent names.
9. Treat the transcript text as primary evidence. The optional `tone` field is secondary context only; do not infer a negative score solely from voice energy/pitch.
10. The same score must NOT be returned for every survey unless the actual evidence supports that result.
11. Return different scores for materially different positive, negative, and neutral answers.
12. Return ONLY valid JSON.

REQUIRED JSON:
{{
  "overall_sentiment": "Positive|Negative|Neutral",
  "overall_score": 7.4,
  "cleanliness": {{"score": 1-10, "summary": "evidence-based explanation"}},
  "staff_behavior": {{"score": 1-10, "summary": "evidence-based explanation"}},
  "medicine_timeliness": {{"score": 1-10, "summary": "evidence-based explanation"}},
  "doctor_treatment": {{"score": 1-10, "summary": "evidence-based explanation"}},
  "appreciated_staff": [],
  "dissatisfied_staff": [],
  "complaints": [],
  "suggestions": [],
  "critical_issues": [],
  "overall_summary": "evidence-based summary"
}}
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            report = json.loads(response.text)
            return _safe_gemini_report(report, answers_list)
        except Exception as e:
            print(f"Gemini API error: {e}. Falling back to dynamic local analysis.")

    return _build_fallback_report(answers_list, language)
class ScoringService:
    """Compatibility class used by AnalysisService."""

    @staticmethod
    def calculate_overall_score(category_scores) -> float:
        """Calculate the overall hospital feedback score."""

        weights = {
            "cleanliness_facilities": 0.20,
            "staff_behaviour": 0.20,
            "medicine_timeliness": 0.20,
            "doctor_treatment": 0.25,
            "overall_service": 0.15,
        }

        weighted_score = sum(
            getattr(category_scores, category) * weight
            for category, weight in weights.items()
        )

        return round(weighted_score, 2)

    @staticmethod
    def get_score_status(overall_score: float) -> tuple[str, str]:
        """Return the report status and its description."""

        if overall_score >= 85:
            return "Excellent", "Very positive patient experience"
        elif overall_score >= 70:
            return "Good", "Generally positive patient experience"
        elif overall_score >= 50:
            return "Needs Improvement", "Some areas need attention"
        else:
            return "Poor", "Significant improvement is needed"