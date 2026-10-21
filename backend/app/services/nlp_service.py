"""Local, evidence-based text scoring helpers for HealSense.

Compatible with app.services.scoring_service:
- score_text(text) -> score, sentiment, positive_evidence, negative_evidence
- analyze_feedback(text) -> flagged_topics, sentence_analysis

This is a lightweight lexicon scorer, not a medical diagnostic tool.
"""
from __future__ import annotations

import re
from typing import Any

POSITIVE_PHRASES: dict[str, float] = {
    "excellent": 2.2, "outstanding": 2.2, "amazing": 2.0, "wonderful": 2.0,
    "very good": 2.0, "very clean": 2.0, "very helpful": 2.0, "very polite": 2.0,
    "good": 1.2, "clean": 1.2, "hygienic": 1.3, "helpful": 1.2, "polite": 1.2,
    "kind": 1.2, "caring": 1.3, "satisfied": 1.5, "happy": 1.3, "timely": 1.2,
    "on time": 1.4, "prompt": 1.1, "quick": 1.1, "cured": 1.6,
    "improved": 1.2, "appreciate": 1.4, "appreciated": 1.4, "professional": 1.2,
    "respectful": 1.2, "thank": 1.0, "comfortable": 1.1, "supportive": 1.2,
    "clear": 0.7, "well maintained": 1.5, "effective": 1.4, "recovered": 1.5,
}

NEGATIVE_PHRASES: dict[str, float] = {
    "terrible": 2.4, "horrible": 2.3, "worst": 2.2, "awful": 2.2,
    "very bad": 2.0, "very dirty": 2.0, "very rude": 2.0, "poor": 1.6,
    "bad": 1.3, "dirty": 1.4, "unclean": 1.5, "rude": 1.4, "unhelpful": 1.4,
    "uncaring": 1.3, "dissatisfied": 1.7, "unhappy": 1.4, "late": 1.2,
    "delayed": 1.4, "delay": 1.2, "forgot": 1.2, "pain": 1.0, "neglect": 1.8,
    "ignored": 1.5, "problem": 1.0, "issue": 1.0, "complaint": 1.2,
    "overcharged": 1.8, "mistake": 1.5, "uncomfortable": 1.2, "unsafe": 2.0,
    "infection": 1.4, "wrong medicine": 2.2, "not clean": 1.7, "not helpful": 1.6,
    "not satisfied": 1.7, "not on time": 1.5, "unprofessional": 1.6,
}

NEGATORS = {"not", "never", "no", "isn't", "wasn't", "weren't", "didn't", "doesn't", "don't", "hardly"}
TOPIC_KEYWORDS = {
    "cleanliness": ("clean", "dirty", "hygien", "washroom", "facility", "facilities"),
    "staff_behavior": ("staff", "nurse", "doctor", "rude", "polite", "helpful", "behaviour", "behavior"),
    "medicine_timeliness": ("medicine", "dose", "tablet", "injection", "late", "delay", "timely"),
    "doctor_treatment": ("treatment", "doctor", "cured", "pain", "recovery", "diagnosis"),
    "billing": ("bill", "billing", "overcharged", "payment", "cost"),
    "safety": ("unsafe", "wrong medicine", "infection", "neglect", "emergency"),
}


def _clamp(value: float, low: float = 1.0, high: float = 10.0) -> float:
    return round(max(low, min(high, value)), 1)


def _contains_phrase(text: str, phrase: str) -> bool:
    return re.search(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", text, flags=re.I) is not None


def _phrase_evidence(text: str, phrases: dict[str, float]) -> list[tuple[str, float]]:
    found: list[tuple[str, float]] = []
    lower = text.lower()
    # Prefer longer phrases first, then avoid counting a shorter phrase inside
    # an already matched phrase (e.g. "very good" and "good").
    occupied: list[tuple[int, int]] = []
    for phrase, weight in sorted(phrases.items(), key=lambda item: len(item[0]), reverse=True):
        for match in re.finditer(r"(?<!\w)" + re.escape(phrase) + r"(?!\w)", lower):
            start, end = match.span()
            if any(start < old_end and end > old_start for old_start, old_end in occupied):
                continue
            occupied.append((start, end))
            before = lower[max(0, start - 24):start]
            # Negated positive words count as negative; negated negative words
            # count as positive. Keep the detected phrase visible in evidence.
            is_negated = any(re.search(r"\b" + re.escape(n) + r"\b(?:\s+\w+){0,2}\s*$", before) for n in NEGATORS)
            effective_weight = -weight if is_negated else weight
            found.append((phrase, effective_weight))
    return found


def score_text(text: Any) -> dict[str, Any]:
    """Score actual text on a 1-10 scale, returning evidence used."""
    raw = str(text or "").strip()
    if not raw:
        return {
            "score": 5.0, "sentiment": "NEUTRAL",
            "positive_evidence": [], "negative_evidence": [],
            "evidence_count": 0,
        }

    # Explicit ratings such as "8/10", "8 out of 10", or "rating is 7".
    rating_match = re.search(
        r"\b(10|[1-9])\s*(?:/|out of)\s*10\b|\brating\s*(?:is|of|:)?\s*(10|[1-9])\b",
        raw, flags=re.I,
    )
    if rating_match:
        number = next((g for g in rating_match.groups() if g is not None), None)
        if number:
            explicit = float(number)
            positive = [m.group(0).lower() for m in re.finditer(r"\b(?:excellent|good|clean|helpful|polite|satisfied|timely)\b", raw, re.I)]
            negative = [m.group(0).lower() for m in re.finditer(r"\b(?:bad|poor|dirty|rude|delayed|dissatisfied|ignored)\b", raw, re.I)]
            sentiment = "POSITIVE" if explicit >= 7 else "NEGATIVE" if explicit <= 4 else "NEUTRAL"
            return {
                "score": _clamp(explicit), "sentiment": sentiment,
                "positive_evidence": list(dict.fromkeys(positive)),
                "negative_evidence": list(dict.fromkeys(negative)),
                "evidence_count": 1,
            }

    pos = _phrase_evidence(raw, POSITIVE_PHRASES)
    neg = _phrase_evidence(raw, NEGATIVE_PHRASES)

    # Positive lexicon entries have positive weights; negative lexicon entries
    # must be treated as negative weights. A negator reverses the polarity.
    positive_hits = [(phrase, weight) for phrase, weight in pos if weight > 0]
    negative_hits = [(phrase, abs(weight)) for phrase, weight in pos if weight < 0]
    negative_hits.extend((phrase, weight) for phrase, weight in neg if weight > 0)
    positive_hits.extend((phrase, abs(weight)) for phrase, weight in neg if weight < 0)

    positive_evidence = list(dict.fromkeys(phrase for phrase, _ in positive_hits))
    negative_evidence = list(dict.fromkeys(phrase for phrase, _ in negative_hits))
    positive_total = sum(weight for _, weight in positive_hits)
    negative_total = sum(weight for _, weight in negative_hits)

    # A restrained baseline: evidence shifts the score around a neutral 5.5.
    # Stronger negative evidence lowers the score; stronger positive evidence raises it.
    net = positive_total - negative_total
    strength = positive_total + negative_total
    score = _clamp(5.5 + 1.1 * net / max(1.0, strength ** 0.35))
    if positive_total > negative_total:
        sentiment = "POSITIVE"
    elif negative_total > positive_total:
        sentiment = "NEGATIVE"
    else:
        sentiment = "NEUTRAL"

    return {
        "score": score,
        "sentiment": sentiment,
        "positive_evidence": list(dict.fromkeys(positive_evidence)),
        "negative_evidence": list(dict.fromkeys(negative_evidence)),
        "evidence_count": len(pos) + len(neg),
    }


def analyze_feedback(text: Any) -> dict[str, Any]:
    """Return a compact topic and sentence analysis for existing report code."""
    raw = str(text or "").strip()
    sentences = [part.strip() for part in re.split(r"(?<=[.!?])\s+", raw) if part.strip()]
    sentence_analysis = []
    flagged_topics: list[str] = []

    for sentence in sentences:
        result = score_text(sentence)
        sentence_analysis.append({
            "sentence": sentence,
            "sentiment": result["sentiment"],
            "score": result["score"],
            "positive_evidence": result["positive_evidence"],
            "negative_evidence": result["negative_evidence"],
        })
        low = sentence.lower()
        for topic, keywords in TOPIC_KEYWORDS.items():
            if any(keyword in low for keyword in keywords):
                if topic not in flagged_topics:
                    flagged_topics.append(topic)

    return {
        "flagged_topics": flagged_topics,
        "sentence_analysis": sentence_analysis,
        "overall": score_text(raw),
    }
