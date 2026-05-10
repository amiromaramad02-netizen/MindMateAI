/**
 * Unified emotion detection service.
 * Connects directly to the TFLite Deep Learning model.
 * Includes a pre-filter for crisis keywords.
 */

const tfliteService = require("./tfliteService");

// ── Crisis keywords (highest priority — checked first) ──────────
const CRISIS_KEYWORDS = [
  "suicide", "kill myself", "end my life", "want to die",
  "give up", "no reason to live", "better off dead", "self harm",
];

// ── Main predict function ───────────────────────────────────────
async function predictEmotion(message) {
  const msg = (message || "").toLowerCase();

  // Priority 1: Crisis detection (Always immediate, bypasses model)
  for (const kw of CRISIS_KEYWORDS) {
    if (msg.includes(kw)) {
      return { emotion: "crisis", confidence: 1.0, method: "crisis_keyword" };
    }
  }

  // Priority 2: Deep Learning Inference (TFLite)
  try {
    const { emotion, confidence } = await tfliteService.predict(msg);
    return {
      emotion,
      confidence,
      method: "tflite_model"
    };
  } catch (error) {
    console.error("Emotion detection failed, falling back to neutral:", error.message);
    return { emotion: "neutral", confidence: 0.1, method: "error_fallback" };
  }
}

module.exports = { predictEmotion };
