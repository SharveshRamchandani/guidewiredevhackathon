"""
AI Explanation Engine — powered by Groq (Llama 3)
Generates natural language payout explanations for the parametric trigger.
Falls back to a structured rule-based explanation if the API key is missing
or the Groq call fails, so the trigger endpoint never breaks.
"""

import os
import logging

logger = logging.getLogger(__name__)

# Lazy import — only fails at call time if groq not installed
def _get_client():
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return None
        return Groq(api_key=api_key)
    except ImportError:
        logger.warning("groq package not installed. Using fallback explanation.")
        return None


def generate_payout_explanation(
    disruption_type: str,
    temperature: float,
    rainfall: float,
    aqi: int,
    disruption_probability: float,
    income_loss: float,
    fraud_score: float,
    payout_amount: float,
    status: str,
) -> str:
    """
    Generate a natural language explanation for a payout decision.
    Returns an LLM-generated explanation if GROQ_API_KEY is set,
    otherwise returns a deterministic fallback explanation.
    """
    client = _get_client()

    if client is not None:
        return _llm_explanation(
            client, disruption_type, temperature, rainfall, aqi,
            disruption_probability, income_loss, fraud_score, payout_amount, status
        )
    else:
        return _fallback_explanation(
            disruption_type, temperature, rainfall, aqi,
            disruption_probability, income_loss, fraud_score, payout_amount, status
        )


def _llm_explanation(
    client,
    disruption_type, temperature, rainfall, aqi,
    disruption_probability, income_loss, fraud_score, payout_amount, status
) -> str:
    """Call Groq Llama 3 to generate a professional payout explanation."""
    payout_str = f"Rs.{payout_amount}" if payout_amount > 0 else "no payout"
    status_label = {
        "approved":       "PAYOUT APPROVED",
        "pending_review": "FLAGGED FOR MANUAL REVIEW",
        "rejected":       "CLAIM REJECTED",
        "no_disruption":  "NO DISRUPTION DETECTED",
    }.get(status, status.upper())

    # Build decision-specific context so the LLM understands exactly WHY the decision happened
    decision_context = {
        "approved": (
            f"The claim was approved because disruption probability ({disruption_probability:.0%}) "
            f"exceeded the trigger threshold and fraud score ({fraud_score:.2f}) was below the "
            f"auto-approve threshold of 0.30. Payout of Rs.{payout_amount} was issued."
        ),
        "pending_review": (
            f"The claim is pending manual review because disruption probability ({disruption_probability:.0%}) "
            f"confirmed a disruption, but fraud score ({fraud_score:.2f}) exceeded the "
            f"review threshold for this disruption level. No payout has been issued yet."
        ),
        "rejected": (
            f"The claim was rejected because fraud score ({fraud_score:.2f}) exceeded the "
            f"rejection threshold of 0.60. Despite a confirmed disruption ({disruption_probability:.0%}), "
            f"anomalous signals prevented payout."
        ),
        "no_disruption": (
            f"No payout was triggered because disruption probability ({disruption_probability:.0%}) "
            f"was below the minimum threshold of 0.39. Conditions did not qualify."
        ),
    }.get(status, f"Decision: {status}")

    prompt = f"""You are an insurance report writer for GigShield, a parametric insurance platform for gig delivery workers in India.

Write a 3-4 sentence professional insurance report explaining this payout decision.

DECISION: {status_label}

EXACT VALUES — reference ALL of these in your explanation, do not alter or round any number:
- Temperature: {temperature}C
- Rainfall: {rainfall} mm
- AQI: {aqi}
- Disruption type detected: {disruption_type}
- Disruption probability: {disruption_probability:.0%}
- Estimated income loss: Rs.{income_loss}
- Fraud score: {fraud_score:.2f} out of 1.0 (higher = more suspicious)
- Payout amount: {payout_str}

WHY THIS DECISION WAS MADE:
{decision_context}

Rules for your response:
- Cite every exact value listed above at least once
- Do NOT round, estimate, or paraphrase any number
- Do NOT use bullet points — write in plain paragraph form
- Do NOT add any disclaimer or note about the explanation
- Focus on factual accuracy over dramatic language
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq API call failed: {e}")
        return _fallback_explanation(
            disruption_type, temperature, rainfall, aqi,
            disruption_probability, income_loss, fraud_score, payout_amount, status
        )


def _fallback_explanation(
    disruption_type, temperature, rainfall, aqi,
    disruption_probability, income_loss, fraud_score, payout_amount, status
) -> str:
    """
    Deterministic fallback when Groq API is unavailable.
    Still produces a professional, human-readable explanation.
    """
    disruption_labels = {
        "flood":            "severe flooding",
        "heavy_rain":       "heavy rainfall",
        "heatwave":         "extreme heat",
        "poor_air_quality": "hazardous air quality",
        "storm":            "storm conditions",
        "compound":         "compound weather disruption (multiple simultaneous factors)",
        "none":             "no significant disruption",
    }
    label = disruption_labels.get(disruption_type, disruption_type)

    if status == "approved":
        return (
            f"A {label} event was detected in the worker's operating zone with a disruption "
            f"probability of {disruption_probability:.0%} (temperature: {temperature}C, "
            f"rainfall: {rainfall}mm, AQI: {aqi}). Fraud verification confirmed normal claim "
            f"behaviour with a fraud score of {fraud_score:.2f}. The estimated weekly income "
            f"loss of Rs.{income_loss} triggered an automatic parametric payout of Rs.{payout_amount} "
            f"in accordance with the worker's active policy."
        )
    elif status == "pending_review":
        return (
            f"A {label} event was confirmed ({disruption_probability:.0%} probability), however "
            f"the claim returned a fraud score of {fraud_score:.2f}, which requires manual verification "
            f"before the payout of Rs.{payout_amount} can be released. "
            f"Environmental conditions recorded: {temperature}C temperature, {rainfall}mm rainfall, AQI {aqi}."
        )
    elif status == "rejected":
        return (
            f"The claim was rejected due to a high fraud score of {fraud_score:.2f}. "
            f"Signals indicating anomalous behaviour include GPS zone mismatch or unusually "
            f"high claim velocity. A {label} event was detected ({disruption_probability:.0%} probability), "
            f"but the fraud risk prevents automatic payout approval."
        )
    else:
        return (
            f"No qualifying disruption was detected in the worker's zone. "
            f"Current conditions (temperature: {temperature}C, rainfall: {rainfall}mm, AQI: {aqi}) "
            f"produced a disruption probability of {disruption_probability:.0%}, which is below "
            f"the parametric trigger threshold. No payout has been issued."
        )
