const express = require("express");
const router = express.Router();
const { createChat, getChatByChatId, getChatsByUser, updateChatTimestamp, deleteChat } = require("../models/Chat");
const {
  addMessage,
  getMessagesByChatId,
  getRecentMessages,
  searchMessages,
  updateMessage,
  deleteMessagesAfter,
} = require("../models/Message");
const { getPreferences } = require("../models/User");
const { streamChat } = require("../services/aiService");
const { checkAndSummarize, getConversationContext } = require("../services/memoryManager");
const { predictEmotion } = require("../services/emotionDetector");
const logger = require("../utils/logger");

// ── Constants ───────────────────────────────────────────────────
const GREETINGS = ["hi", "hello", "hey", "yo", "hi there", "hey there", "greetings", "sup", "heyy"];

const GEN_Z_TRIGGERS = [
  "gen z", "genz", "talk like gen z", "talk like a gen z", "chill mode",
  "bruh", "no cap", "fr fr", "lowkey", "ngl", "slay", "vibe check",
  "rizz", "bestie", "periodt", "on god", "bussin", "sheesh"
];

const CREATOR_RESPONSE = "I was created by Amir Omar, a student pursuing Computer Engineering with a strong focus on Software Development and Artificial Intelligence. I was designed to help people navigate daily challenges and personal crises, while also being capable of answering a wide range of questions across different topics.";

const CREATOR_TRIGGERS = [
  "who created you", "who made you", "who built you", "who developed you",
  "who is your creator", "who developed this chatbot", "who is amir omar",
  "tell me about your creator"
];

// ── Crisis responses (no Groq needed for safety) ─────────────────
const CRISIS_RESPONSES = [
  "I'm really concerned about what you've shared. Please reach out to a crisis helpline immediately: 988 (Suicide & Crisis Lifeline). You matter, and help is available right now.",
  "What you're feeling is very serious, and I want to make sure you're safe. Please talk to someone who can help — call 988 or text HOME to 741741. You are not alone."
];

// ── Greeting responses ───────────────────────────────────────────
const GREETING_RESPONSES = [
  "Hello. I'm MindMate. I'm here to listen and support you. How are you feeling today?",
  "Hi. I'm glad you reached out. As your therapist today, what's on your mind?",
  "Hello. I'm here to provide a safe space for you. How can I help you navigate things today?",
  "Hi there. I'm ready whenever you are. What would you like to explore together today?"
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Prompt Builder ──────────────────────────────────────────────
function buildSystemPrompt(emotion, confidence, memoryContext, isGenZ) {
  let prompt = `You are MindMate, an empathetic and supportive mental health chatbot. You provide compassionate, thoughtful responses. You talk as a professional therapist with 10+ years of experience. Don't act as AI, act as a human therapist.`;

  if (emotion && emotion !== "neutral" && emotion !== "greeting") {
    prompt += `\n\nDETECTED EMOTIONAL STATE: ${emotion} (${(confidence * 100).toFixed(0)}% confidence).
Respond with deep awareness of this emotional state — acknowledge it naturally and empathetically without being clinical or robotic.`;
  }

  if (memoryContext) {
    prompt += `\n\n${memoryContext}`;
  }

  if (isGenZ) {
    prompt += `\n\nTONE DIRECTIVE: The user prefers a casual, Gen Z communication style.
Respond naturally and relatably — you can use occasional casual language (lowkey, fr, ngl, etc.) but keep it authentic, not overdone.
Most importantly: always stay empathetic and supportive. Never sacrifice emotional intelligence for slang.`;
  }

  prompt += `\n\nGuidelines:
- Be warm, empathetic, and non-judgmental
- Don't over-ask follow up questions. Make it conversational and natural.
- Don't over use the phrase "it sounds like". Instead use "I hear you", "I understand" etc.
- For crisis situations, always provide crisis hotline numbers
- Make sure the questions don't sound generic.
- Don't repeat yourself.
- Give suggestions to solve the user's problem when appropriate.
- Don't diagnose or prescribe — suggest professional help when appropriate
- Keep responses concise but caring (2-4 sentences)`;

  return prompt;
}

function detectGenZTone(toneMode, recentMessages) {
  if (toneMode === "genz") return true;
  return recentMessages
    .filter(m => m.role === "user")
    .some(m => GEN_Z_TRIGGERS.some(trigger => m.text.toLowerCase().includes(trigger)));
}

// ── Helper: set SSE headers ─────────────────────────────────────
function initSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ── POST /send (non-streaming) ──────────────────────────────────
router.post("/send", async (req, res) => {
  try {
    const userId = req.user.uid;
    const { message, chatId, toneMode } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }

    let chat;
    let currentChatId = chatId;

    if (currentChatId) {
      chat = await getChatByChatId(currentChatId);
    }

    const preferences = await getPreferences(userId);
    const shouldSave = preferences.saveHistory;

    if (!chat && shouldSave) {
      currentChatId = chatId || require("crypto").randomUUID();
      await createChat(userId, currentChatId, message.substring(0, 40));
      chat = await getChatByChatId(currentChatId);
    }

    if (shouldSave && currentChatId) {
      await addMessage(currentChatId, "user", message);
    }

    const cleanMessage = message.toLowerCase().trim();

    // ── Creator fast path ─────────────────────────────────────
    if (CREATOR_TRIGGERS.some(t => cleanMessage.includes(t))) {
      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", CREATOR_RESPONSE, "neutral");
      }
      return res.json({ success: true, data: { response: CREATOR_RESPONSE, chatId: currentChatId, emotion: "neutral" } });
    }

    let aiResponse = "";
    let finalEmotion = "neutral";
    let finalConfidence = 1.0;

    // ── Greeting fast path ────────────────────────────────────
    if (GREETINGS.includes(cleanMessage)) {
      aiResponse = pickRandom(GREETING_RESPONSES);
      finalEmotion = "greeting";
    } else {
      const detection = await predictEmotion(message);
      finalEmotion = detection.emotion;
      finalConfidence = detection.confidence;

      // ── Crisis fast path ────────────────────────────────────
      if (finalEmotion === "crisis") {
        aiResponse = pickRandom(CRISIS_RESPONSES);
      } else {
        const memoryContext = await getConversationContext(currentChatId, userId);
        const recentMessages = await getRecentMessages(currentChatId, 12);
        const isGenZ = detectGenZTone(toneMode, recentMessages);
        const systemPrompt = buildSystemPrompt(finalEmotion, finalConfidence, memoryContext, isGenZ);

        const historyPayload = recentMessages.map(msg => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.text,
        }));

        const lastEntry = historyPayload[historyPayload.length - 1];
        if (!lastEntry || lastEntry.role !== "user" || lastEntry.content !== message) {
          historyPayload.push({ role: "user", content: message });
        }

        const messagesPayload = [
          { role: "system", content: systemPrompt },
          ...historyPayload,
        ];

        try {
          // streamChat with null res returns full text for non-streaming
          aiResponse = await streamChat(messagesPayload, null);
        } catch (groqErr) {
          logger.error("Groq failed on /send:", groqErr.message);
          aiResponse = "I'm experiencing a temporary issue. Please try again in a moment.";
        }
      }
    }

    if (shouldSave && currentChatId) {
      await addMessage(currentChatId, "assistant", aiResponse, finalEmotion);
      await updateChatTimestamp(currentChatId);
    }

    checkAndSummarize(currentChatId).catch(err =>
      logger.error("Memory check error:", err.message)
    );

    res.json({
      success: true,
      data: {
        response: aiResponse,
        chatId: currentChatId,
        emotion: finalEmotion,
        confidence: finalConfidence,
      },
    });
  } catch (error) {
    logger.error("Chat send error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /stream (SSE streaming) ─────────────────────────────────
router.post("/stream", async (req, res) => {
  try {
    const userId = req.user.uid;
    const { message, chatId, toneMode } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: "Message is required." });
    }

    let chat;
    let currentChatId = chatId;

    const preferences = await getPreferences(userId);
    const shouldSave = preferences.saveHistory;

    if (currentChatId) {
      chat = await getChatByChatId(currentChatId);
    }
    if (!chat && shouldSave) {
      currentChatId = chatId || require("crypto").randomUUID();
      await createChat(userId, currentChatId, message.substring(0, 40));
    }

    if (shouldSave && currentChatId) {
      await addMessage(currentChatId, "user", message);
    }

    const cleanMessage = message.toLowerCase().trim();

    // ── Initialize SSE connection ──────────────────────────────
    initSSE(res);

    // ── Creator fast path ─────────────────────────────────────
    if (CREATOR_TRIGGERS.some(t => cleanMessage.includes(t))) {
      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", CREATOR_RESPONSE, "neutral");
      }
      sendSSE(res, { token: CREATOR_RESPONSE, done: false });
      sendSSE(res, { done: true, chatId: currentChatId, emotion: "neutral" });
      return res.end();
    }

    let finalEmotion = "neutral";
    let finalConfidence = 1.0;

    // ── Greeting fast path ────────────────────────────────────
    if (GREETINGS.includes(cleanMessage)) {
      const greetingResp = pickRandom(GREETING_RESPONSES);
      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", greetingResp, "greeting");
      }
      sendSSE(res, { token: greetingResp, done: false });
      sendSSE(res, { done: true, chatId: currentChatId, emotion: "greeting" });
      return res.end();
    }

    // ── Emotion Detection (Local TFLite) ──────────────────────
    const detection = await predictEmotion(message);
    finalEmotion = detection.emotion;
    finalConfidence = detection.confidence;

    // ── Crisis fast path ──────────────────────────────────────
    if (finalEmotion === "crisis") {
      const crisisResp = pickRandom(CRISIS_RESPONSES);
      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", crisisResp, "crisis");
      }
      sendSSE(res, { token: crisisResp, done: false });
      sendSSE(res, { done: true, chatId: currentChatId, emotion: "crisis" });
      return res.end();
    }

    // ── Build emotion-aware prompt ────────────────────────────
    const memoryContext = await getConversationContext(currentChatId, userId);
    const recentMessages = await getRecentMessages(currentChatId, 15);
    const isGenZ = detectGenZTone(toneMode, recentMessages);
    const systemPrompt = buildSystemPrompt(finalEmotion, finalConfidence, memoryContext, isGenZ);

    const historyPayload = recentMessages.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.text,
    }));

    const lastEntry = historyPayload[historyPayload.length - 1];
    if (!lastEntry || lastEntry.role !== "user" || lastEntry.content !== message) {
      historyPayload.push({ role: "user", content: message });
    }

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...historyPayload,
    ];

    // ── Stream from Groq ──────────────────────────────────────
    let fullResponse = "";
    try {
      fullResponse = await streamChat(messagesPayload, res);

      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", fullResponse, finalEmotion);
        await updateChatTimestamp(currentChatId);
      }
      checkAndSummarize(currentChatId).catch(() => {});
      sendSSE(res, { done: true, chatId: currentChatId, emotion: finalEmotion });
      return res.end();
    } catch (aiErr) {
      logger.error("Groq streaming failed:", aiErr.message);

      if (!fullResponse) {
        const errorMsg = "I'm having a moment of connection difficulty. Please try sending your message again.";
        if (shouldSave && currentChatId) {
          await addMessage(currentChatId, "assistant", errorMsg, finalEmotion);
        }
        sendSSE(res, { token: errorMsg, done: false });
      }
      sendSSE(res, { done: true, chatId: currentChatId, emotion: finalEmotion });
      return res.end();
    }
  } catch (error) {
    logger.error("Critical stream error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
    }
  }
});

// ── POST /new ────────────────────────────────────────────────────
router.post("/new", async (req, res) => {
  try {
    const userId = req.user.uid;
    const { firstMessage } = req.body;

    if (!firstMessage) {
      return res.status(400).json({ error: "First message is required." });
    }

    const chatTitle = firstMessage.slice(0, 40);
    const chatId = require("crypto").randomUUID();

    await createChat(userId, chatId, chatTitle);
    await addMessage(chatId, "user", firstMessage);

    res.status(201).json({ success: true, data: { chatId, chatTitle } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /history ─────────────────────────────────────────────────
router.get("/history", async (req, res) => {
  try {
    const chats = await getChatsByUser(req.user.uid);
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /search ──────────────────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, error: "Search query too short." });
    }
    const results = await searchMessages(req.user.uid, q);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── GET /:chatId ─────────────────────────────────────────────────
router.get("/:chatId", async (req, res) => {
  try {
    const chat = await getChatByChatId(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found." });
    }
    const messages = await getMessagesByChatId(req.params.chatId);
    chat.messages = messages;
    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── DELETE /:chatId ──────────────────────────────────────────────
router.delete("/:chatId", async (req, res) => {
  try {
    await deleteChat(req.params.chatId, req.user.uid);
    res.json({ success: true, data: { message: "Chat deleted." } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── PUT /message/:messageId ──────────────────────────────────────
router.put("/message/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text, chatId } = req.body;
    const userId = req.user.uid;

    const chat = await getChatByChatId(chatId);
    if (!chat || chat.userId !== userId) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await updateMessage(messageId, text);
    await deleteMessagesAfter(chatId, messageId);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── POST /:chatId/title ──────────────────────────────────────────
router.post("/:chatId/title", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.json({ success: true, data: { title: "Chat" } });
    }
    const messages = await getMessagesByChatId(req.params.chatId);
    const preview = messages.slice(0, 4).map(m => `${m.role}: ${m.text}`).join("\n");

    const title = await streamChat([
      { role: "system", content: "Generate a short title (3-6 words) for this conversation. Return ONLY the title, no quotes, no punctuation." },
      { role: "user", content: preview },
    ], null);

    const { pool } = require("../db");
    await pool.execute("UPDATE Chat SET chatTitle = ? WHERE chatId = ?", [title.trim(), req.params.chatId]);

    res.json({ success: true, data: { title: title.trim() } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;