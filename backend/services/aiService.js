const OpenAI = require("openai");
const logger = require("../utils/logger");

// Detect if we're using xAI or standard OpenAI
const isXAI = process.env.OPENAI_API_KEY?.startsWith("xai-");
const AI_MODEL = isXAI ? "grok-beta" : "gpt-4o-mini";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: isXAI ? "https://api.x.ai/v1" : undefined,
    })
  : null;

/**
 * Stream chat using configured AI provider (OpenAI/xAI)
 * @param {Array} messages - Chat messages array [{role, content}]
 * @param {Object} res - Express response object to write SSE stream
 * @param {Function} onToken - Optional callback for each token
 * @returns {Promise<string>} - The full response text
 */
const streamChat = async (messages, res, onToken) => {
  if (!openai) {
    throw new Error("AI provider not configured. Please set OPENAI_API_KEY.");
  }

  let fullText = "";
  
  try {
    const stream = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.8,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;
        if (onToken) onToken(content);
        
        // Standardized SSE format for the frontend
        res.write(`data: ${JSON.stringify({ token: content, done: false })}\n\n`);
      }
    }

    return fullText;
  } catch (error) {
    logger.error("Error in aiService.streamChat:", error.message);
    throw error; // Re-throw to be handled by the route's fallback logic
  }
};

module.exports = {
  streamChat,
};
