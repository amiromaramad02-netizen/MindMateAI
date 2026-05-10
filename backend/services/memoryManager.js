/**
 * Memory Manager — auto-summarizes conversations using GPT
 * and stores summaries in ConversationMemory table.
 */

const OpenAI = require("openai");
const { getMemory, upsertMemory } = require("../models/ConversationMemory");
const { getMessagesByChatId, getMessageCount } = require("../models/Message");

const isXAI = process.env.OPENAI_API_KEY?.startsWith("xai-");
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: isXAI ? "https://api.x.ai/v1" : undefined,
    })
  : null;

const AI_MODEL = isXAI ? "grok-beta" : "gpt-4o-mini";

const SUMMARIZE_THRESHOLD = 10; // Summarize every 10 messages

/**
 * Check if a conversation needs summarization and do it.
 * Called after each message is added.
 */
async function checkAndSummarize(chatId) {
  try {
    const count = await getMessageCount(chatId);
    const existing = await getMemory(chatId);

    // Only summarize every SUMMARIZE_THRESHOLD messages
    const lastSummarizedAt = existing ? existing.messageCount : 0;
    if (count - lastSummarizedAt < SUMMARIZE_THRESHOLD) return;

    if (!openai) {
      // Without OpenAI, create a basic extractive summary
      const messages = await getMessagesByChatId(chatId);
      const userMsgs = messages.filter(m => m.role === "user").slice(-5);
      const summary = userMsgs.map(m => m.text.substring(0, 80)).join(" | ");
      const emotions = messages.filter(m => m.emotion).map(m => m.emotion);
      const trend = getMostCommon(emotions) || "neutral";

      await upsertMemory(chatId, summary, trend, count);
      return;
    }

    // Use GPT to summarize
    const messages = await getMessagesByChatId(chatId);
    const conversationText = messages
      .slice(-20) // Last 20 messages max
      .map(m => `${m.role}: ${m.text}`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "Summarize this conversation in 2-3 sentences. Focus on the user's main concerns, emotional state, and any progress. Be concise."
        },
        { role: "user", content: conversationText }
      ],
      max_tokens: 150,
    });

    const summary = completion.choices[0].message.content;

    // Track emotion trend
    const emotions = messages.filter(m => m.emotion).map(m => m.emotion);
    const trend = getMostCommon(emotions) || "neutral";

    await upsertMemory(chatId, summary, trend, count);
    console.log(`Memory updated for chat ${chatId} (${count} messages)`);
  } catch (err) {
    console.error("Memory summarization error:", err.message);
    // Non-fatal — don't break the chat flow
  }
}

/**
 * Get conversation context for GPT prompt injection.
 */
async function getConversationContext(chatId, userId) {
  const memory = await getMemory(chatId);
  if (!memory) return "";

  return `[Previous conversation summary: ${memory.summary}] [Emotional trend: ${memory.emotionTrend}]`;
}

function getMostCommon(arr) {
  if (!arr.length) return null;
  const freq = {};
  arr.forEach(item => { freq[item] = (freq[item] || 0) + 1; });
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
}

module.exports = { checkAndSummarize, getConversationContext };
