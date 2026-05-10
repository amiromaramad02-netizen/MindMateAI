/**
 * AI Router — intelligent routing between local responses and GPT.
 * Injects emotion + memory context into GPT prompts.
 */

const OpenAI = require("openai");
const { predictEmotion } = require("./emotionDetector");
const { checkAndSummarize, getConversationContext } = require("./memoryManager");
const { getRecentMessages } = require("../models/Message");
const fetch = require("node-fetch");

const AI_PROVIDER = process.env.AI_PROVIDER || "openai";
const AI_API_KEY = process.env.AI_API_KEY;

const openai = AI_PROVIDER === "openai" && AI_API_KEY
  ? new OpenAI({ apiKey: AI_API_KEY })
  : null;

async function callAIProvider(messages, systemPrompt) {
  if (AI_PROVIDER === "openai" && openai) {
    return openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });
  } else if (AI_PROVIDER === "openrouter" && AI_API_KEY) {
    const response = await fetch("https://api.openrouter.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.statusText}`);
    }
    return response.json();
  } else {
    throw new Error("No valid AI provider configured.");
  }
}

// ── Fallback responses ────────────
const FALLBACK_RESPONSES = {
  sadness: [
    "I'm here with you. I hear that things have been heavy lately. Would you like to share more about what's weighing on your heart?",
    "I understand. It's perfectly okay to sit with these feelings for a while. I'm here to listen whenever you're ready.",
    "I hear the pain in your words. As we talk through this, what feels most difficult for you today?"
  ],
  anxiety: [
    "I hear you. Anxiety can feel like a storm, but we can weather it together. Let's try to focus on your breathing for a moment.",
    "I understand how overwhelming that feels. Let's break it down—what's the one thing on your mind that feels loudest right now?",
    "I'm here. You don't have to carry that tension alone. What do you feel would help you feel a bit more grounded in this moment?"
  ],
  stress: [
    "I hear that you're carrying a lot. If we were to look at everything on your plate, which piece feels the heaviest right now?",
    "I understand. Stress often signals that we're pushing ourselves too hard. Have you had a chance to breathe today?",
    "I hear that pressure. Let's take a step back together. What's one small thing we could look at first?"
  ],
  anger: [
    "I hear your frustration, and it's completely valid. What do you feel is at the root of this anger right now?",
    "I understand. Anger is often a messenger. What is it trying to tell us about what you need right now?",
    "I'm listening. It's okay to feel this way. Would it help to walk me through what triggered this?"
  ],
  joy: [
    "I'm so glad to hear that. It's important to honor these moments of light. What's brought this shift for you?",
    "That's wonderful. I can feel the shift in your energy. Tell me more about what's going well.",
    "I love hearing that. Celebrating the wins, no matter how small, is a big part of this journey. What feels best about it?"
  ],
  crisis: [
    "I'm really concerned about what you've shared. Please reach out to a crisis helpline immediately: 988 (Suicide & Crisis Lifeline). You matter, and help is available right now.",
    "What you're feeling is very serious, and I want to make sure you're safe. Please talk to someone who can help — call 988 or text HOME to 741741. You are not alone."
  ],
  neutral: [
    "I'm listening. How does it feel to talk about this today?",
    "I understand. I'm here to support you in whatever way you need. What else is on your mind?",
    "I appreciate you opening up. As we explore this, what thoughts are coming up for you?"
  ]
};

function pickFallback(emotion) {
  const options = FALLBACK_RESPONSES[emotion] || FALLBACK_RESPONSES.neutral;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Generate an AI response with intelligent routing:
 * - Crisis → immediate crisis response (no GPT)
 * - High confidence + simple query → local fallback
 * - Otherwise → GPT with enriched context
 *
 * @returns {{ response: string, emotion: string, confidence: number, method: string }}
 */
async function generateResponse(message, chatId, userId) {
  const detection = await predictEmotion(message);
  const { emotion, confidence } = detection;

  if (emotion === "crisis") {
    return {
      response: pickFallback("crisis"),
      emotion: "crisis",
      confidence: 1.0,
      method: "crisis_immediate",
    };
  }

  const wordCount = message.trim().split(/\s+/).length;
  if (confidence >= 0.7 && wordCount < 15 && !openai) {
    return {
      response: pickFallback(emotion),
      emotion,
      confidence,
      method: "local_fallback",
    };
  }

  try {
    const memoryContext = await getConversationContext(chatId, userId);
    const recentMessages = await getRecentMessages(chatId, 15);

    let systemPrompt = `You are MindMate, an empathetic and supportive mental health chatbot. Current detected emotion: ${emotion} (confidence: ${(confidence * 100).toFixed(0)}%)`;
    if (memoryContext) {
      systemPrompt += `\n\n${memoryContext}`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.text,
      })),
    ];

    const completion = await callAIProvider(messages, systemPrompt);

    return {
      response: completion.choices[0].message.content,
      emotion,
      confidence,
      method: AI_PROVIDER,
    };
  } catch (err) {
    console.error("AI provider error, falling back:", err.message);
  }

  return {
    response: pickFallback(emotion),
    emotion,
    confidence,
    method: "local_fallback",
  };
}

module.exports = { generateResponse };
