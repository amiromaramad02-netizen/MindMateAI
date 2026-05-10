const { OpenAI } = require("openai");
const logger = require("../utils/logger");

const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

/**
 * Stream chat using Groq
 * @param {Array} messages - Chat messages array [{role, content}]
 * @param {Object} res - Express response object to write SSE stream
 */
const streamChat = async (messages, res) => {
  try {
    const stream = await openai.chat.completions.create({
      model: "llama3-8b-8192", // Groq model
      messages: messages,
      stream: true,
      max_tokens: 1024,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error("Error in streamChat:", error);
    res.write(`data: ${JSON.stringify({ error: "Failed to fetch response" })}\n\n`);
    res.end();
  }
};

module.exports = {
  streamChat,
};
