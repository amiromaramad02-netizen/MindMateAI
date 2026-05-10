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
const { generateResponse } = require("../services/aiRouter");
const { checkAndSummarize } = require("../services/memoryManager");
const OpenAI = require("openai");

const isXAI = process.env.OPENAI_API_KEY?.startsWith("xai-");
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: isXAI ? "https://api.x.ai/v1" : undefined,
    })
  : null;

const AI_MODEL = isXAI ? "grok-beta" : "gpt-4o-mini";

// Keywords that trigger Gen Z tone mode automatically
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

/**
 * Builds the adaptive system prompt based on emotion, memory, and tone mode.
 */
function buildSystemPrompt(emotion, confidence, memoryContext, isGenZ) {
  let prompt = `You are MindMate, an empathetic and supportive mental health chatbot. You provide compassionate, thoughtful responses. You talk as a professional therapist with 10+ years of experience. Don't act as AI, act as a human therapist.`;

  if (emotion && emotion !== "neutral" && emotion !== "greeting") {
    prompt += `\n\nDetected emotional state: ${emotion} (${(confidence * 100).toFixed(0)}% confidence).
Respond with awareness of this emotional state — acknowledge it naturally without being clinical.`;
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
- You are a professional therapist with 10+ years of experience.
- Don't act as AI, act as human therapist.
- Be warm, empathetic, and non-judgmental
- Don't over ask follow up questions. Make it conversational and natural.
- Don't over use the phrase "it sounds like". Instead use "I hear you", "I understand" etc..
- For crisis situations, always provide crisis hotline numbers
- Make sure the questions don't sound generic.
- Don't repeat yourself.
- Give suggestions to solve the user's problem when appropriate.
- Don't diagnose or prescribe — suggest professional help when appropriate
- Keep responses concise but caring (2-4 sentences)`;

  return prompt;
}

/**
 * Detects whether Gen Z tone is appropriate for this conversation.
 * Returns true if toneMode is "genz" OR user messages contain Gen Z keywords.
 */
function detectGenZTone(toneMode, recentMessages) {
  if (toneMode === "genz") return true;
  return recentMessages
    .filter(m => m.role === "user")
    .some(m => GEN_Z_TRIGGERS.some(trigger => m.text.toLowerCase().includes(trigger)));
}

// ── Send message and get AI response ────────────────────────────
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

    // Store user message if allowed
    if (shouldSave && currentChatId) {
      await addMessage(currentChatId, "user", message);
    }

    const cleanMessage = message.toLowerCase().trim();

    if (CREATOR_TRIGGERS.some(t => cleanMessage.includes(t))) {
      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", CREATOR_RESPONSE, "neutral");
      }
      return res.json({ success: true, data: { response: CREATOR_RESPONSE, chatId: currentChatId, emotion: "neutral" } });
    }

    const GREETINGS = ["hi", "hello", "hey", "yo", "hi there", "hey there", "greetings", "sup", "heyy"];

    let aiResponse = "";
    let finalEmotion = "neutral";
    let finalConfidence = 1.0;

    const { predictEmotion } = require("../services/emotionDetector");
    const { getLocalResponse } = require("../utils/localResponses");
    const { getConversationContext } = require("../services/memoryManager");
    const { getRecentMessages } = require("../models/Message");

    if (GREETINGS.includes(cleanMessage)) {
      aiResponse = getLocalResponse("greeting");
      finalEmotion = "greeting";
    } else {
      // 1. Detect emotion via TFLite
      const detection = await predictEmotion(message);
      finalEmotion = detection.emotion;
      finalConfidence = detection.confidence;

      if (finalEmotion === "crisis") {
        aiResponse = getLocalResponse("crisis");
      } else {
        // Fetch context and recent messages (includes the user msg we just stored)
        const memoryContext = await getConversationContext(currentChatId, userId);
        const recentMessages = await getRecentMessages(currentChatId, 12);

        // Detect Gen Z tone from toneMode param or message keywords
        const isGenZ = detectGenZTone(toneMode, recentMessages);

        // Build adaptive system prompt
        const systemPrompt = buildSystemPrompt(finalEmotion, finalConfidence, memoryContext, isGenZ);

        // Build messages payload — ensure the new user message is always the last entry
        // recentMessages from DB already includes the newly added user message
        const historyPayload = recentMessages.map(msg => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.text,
        }));

        // Guarantee no duplication: if history already ends with the new user message, use as-is
        const lastEntry = historyPayload[historyPayload.length - 1];
        if (!lastEntry || lastEntry.role !== "user" || lastEntry.content !== message) {
          historyPayload.push({ role: "user", content: message });
        }

        const messagesPayload = [
          { role: "system", content: systemPrompt },
          ...historyPayload,
        ];

        // Primary: Local Ollama LLM
        try {
          const ollamaRes = await fetch("http://localhost:11434/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "llama3",
              messages: messagesPayload,
              stream: false,
            }),
          });

          if (!ollamaRes.ok) throw new Error(`Ollama returned ${ollamaRes.status}`);
          const ollamaData = await ollamaRes.json();
          aiResponse = ollamaData.message?.content || "";
          if (!aiResponse) throw new Error("Empty response from Ollama");
        } catch (ollamaErr) {
          console.log("Ollama failed, falling back:", ollamaErr.message);

          // Secondary: OpenAI fallback
          if (openai) {
            try {
              const completion = await openai.chat.completions.create({
                model: AI_MODEL,
                messages: messagesPayload,
                max_tokens: 350,
                temperature: 0.82,
              });
              aiResponse = completion.choices[0].message.content;
            } catch (gptErr) {
              console.error("GPT fallback failed:", gptErr.message);
              aiResponse = getLocalResponse(finalEmotion);
            }
          } else {
            aiResponse = getLocalResponse(finalEmotion);
          }
        }
      }
    }

    // Store AI response if allowed
    if (shouldSave && currentChatId) {
      await addMessage(currentChatId, "assistant", aiResponse, finalEmotion);
      // Bump chat timestamp so it sorts to top in sidebar
      await updateChatTimestamp(currentChatId);
    }

    // Trigger memory summarization (non-blocking)
    checkAndSummarize(currentChatId).catch(err =>
      console.error("Memory check error:", err.message)
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
    console.error("Chat send error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── SSE Streaming endpoint ──────────────────────────────────────
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

    const sendSSE = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    if (CREATOR_TRIGGERS.some(t => cleanMessage.includes(t))) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", CREATOR_RESPONSE, "neutral");
      }
      sendSSE({ token: CREATOR_RESPONSE, done: false });
      sendSSE({ done: true, chatId: currentChatId, emotion: "neutral" });
      res.end();
      return;
    }

    const GREETINGS = ["hi", "hello", "hey", "yo", "hi there", "hey there", "greetings", "sup", "heyy"];
    const { predictEmotion } = require("../services/emotionDetector");
    const { getLocalResponse } = require("../utils/localResponses");
    const { getRecentMessages } = require("../models/Message");
    const { getConversationContext } = require("../services/memoryManager");

    let finalEmotion = "neutral";
    let finalConfidence = 1.0;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Handle greeting fast path
    if (GREETINGS.includes(cleanMessage)) {
      finalEmotion = "greeting";
      const greetingResp = getLocalResponse("greeting");
      await addMessage(currentChatId, "assistant", greetingResp, "greeting");
      sendSSE({ token: greetingResp, done: false });
      sendSSE({ done: true, chatId: currentChatId, emotion: "greeting" });
      res.end();
      return;
    }

    const detection = await predictEmotion(message);
    finalEmotion = detection.emotion;
    finalConfidence = detection.confidence;

    // Crisis fast path
    if (finalEmotion === "crisis") {
      const crisisResp = getLocalResponse("crisis");
      if (shouldSave && currentChatId) {
        await addMessage(currentChatId, "assistant", crisisResp, "crisis");
      }
      sendSSE({ token: crisisResp, done: false });
      sendSSE({ done: true, chatId: currentChatId, emotion: "crisis" });
      res.end();
      return;
    }

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

    // ── Primary: Ollama Streaming ──────────────────────────────
    try {
      const ollamaRes = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3",
          messages: messagesPayload,
          stream: true,
        }),
      });

      if (ollamaRes.ok) {
        let fullResponse = "";
        const decoder = new TextDecoder();

        for await (const chunk of ollamaRes.body) {
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split('\n').filter(l => l.trim());
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              const token = data.message?.content || "";
              if (token) {
                fullResponse += token;
                sendSSE({ token, done: false });
              }
            } catch (err) { }
          }
        }

        if (shouldSave && currentChatId) {
          await addMessage(currentChatId, "assistant", fullResponse, finalEmotion);
          await updateChatTimestamp(currentChatId);
        }
        checkAndSummarize(currentChatId).catch(() => { });
        sendSSE({ done: true, chatId: currentChatId, emotion: finalEmotion });
        res.end();
        return;
      }
    } catch (ollamaErr) {
      console.log("Ollama streaming failed, falling back:", ollamaErr.message);
    }

    // ── Secondary: OpenAI Streaming ────────────────────────────
    if (openai) {
      try {
        const stream = await openai.chat.completions.create({
          model: AI_MODEL,
          stream: true,
          messages: messagesPayload,
          max_tokens: 350,
          temperature: 0.82,
        });

        let fullResponse = "";
        for await (const chunk of stream) {
          const token = chunk.choices[0]?.delta?.content || "";
          if (token) {
            fullResponse += token;
            sendSSE({ token, done: false });
          }
        }

        if (shouldSave && currentChatId) {
          await addMessage(currentChatId, "assistant", fullResponse, finalEmotion);
          await updateChatTimestamp(currentChatId);
        }
        checkAndSummarize(currentChatId).catch(() => { });
        sendSSE({ done: true, chatId: currentChatId, emotion: finalEmotion });
        res.end();
        return;
      } catch (gptErr) {
        console.error("OpenAI stream failed, falling back to local:", gptErr.message);
      }
    }

    // ── Fallback: Local Response ───────────────────────────────
    const localResp = getLocalResponse(finalEmotion);
    if (shouldSave && currentChatId) {
      await addMessage(currentChatId, "assistant", localResp, finalEmotion);
    }
    sendSSE({ token: localResp, done: false });
    sendSSE({ done: true, chatId: currentChatId, emotion: finalEmotion });
    res.end();
  } catch (error) {
    console.error("Stream error:", error.message);
    res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
    res.end();
  }
});

// ── Create new chat ─────────────────────────────────────────────
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

// ── Get all chats for current user ──────────────────────────────
router.get("/history", async (req, res) => {
  try {
    const chats = await getChatsByUser(req.user.uid);
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Search messages ─────────────────────────────────────────────
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

// ── Get specific chat ───────────────────────────────────────────
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

// ── Delete chat ─────────────────────────────────────────────────
router.delete("/:chatId", async (req, res) => {
  try {
    await deleteChat(req.params.chatId, req.user.uid);
    res.json({ success: true, data: { message: "Chat deleted." } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Edit message ────────────────────────────────────────────────
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

// ── Generate AI title for chat ──────────────────────────────────
router.post("/:chatId/title", async (req, res) => {
  try {
    if (!openai) {
      return res.json({ success: true, data: { title: "Chat" } });
    }
    const messages = await getMessagesByChatId(req.params.chatId);
    const preview = messages.slice(0, 4).map(m => `${m.role}: ${m.text}`).join("\n");

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: "Generate a short title (3-6 words) for this conversation. Return ONLY the title, no quotes." },
        { role: "user", content: preview },
      ],
      max_tokens: 20,
    });

    const title = completion.choices[0].message.content.trim();
    const { pool } = require("../db");
    await pool.execute("UPDATE Chat SET chatTitle = ? WHERE chatId = ?", [title, req.params.chatId]);

    res.json({ success: true, data: { title } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;