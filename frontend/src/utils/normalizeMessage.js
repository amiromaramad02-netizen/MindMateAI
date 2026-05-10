/**
 * Normalize a raw DB message to the frontend shape.
 * Handles both new shape { role, content, timestamp } and
 * legacy shape { role, text, createdAt }.
 *
 * DB stores role as "assistant"; frontend uses "bot".
 */
export function normalizeMessage(msg) {
  return {
    id: msg.id || `db-${msg.timestamp || msg.createdAt || Math.random()}`,
    role: msg.role === "assistant" ? "bot" : msg.role,
    content: msg.content || msg.text || "",
    timestamp: msg.timestamp || msg.createdAt || null,
  };
}
