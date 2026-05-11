const Groq = require("groq-sdk");
const logger = require("../utils/logger");

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const AI_MODEL = "llama3-8b-8192";

/**
 * Stream or collect chat using Groq API.
 *
 * When `res` is provided → streams tokens via SSE to the client.
 * When `res` is null    → collects and returns the full response text.
 *
 * @param {Array}  messages - Chat messages [{role, content}]
 * @param {Object|null} res - Express response object (null for non-streaming)
 * @returns {Promise<string>} The full response text
 */
const streamChat = async (messages, res) => {
  if (!groq) {
    throw new Error("Groq is not configured. Please set the GROQ_API_KEY environment variable.");
  }

  let fullText = "";

  try {
    const stream = await groq.chat.completions.create({
      model: AI_MODEL,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullText += content;

        // Only write to SSE if a response object was provided
        if (res) {
          res.write(`data: ${JSON.stringify({ token: content, done: false })}\n\n`);
        }
      }
    }

    return fullText;
  } catch (error) {
    logger.error(`[aiService] Groq stream error: ${error.message}`);
    throw error;
  }
};

module.exports = { streamChat };
