import axios from "axios";
import { auth } from "../firebase/config";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json"
  },
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.error("Failed to get token for request:", err);
    }
  }
  return config;
}, (error) => Promise.reject(error));

// ── Chat APIs ──────────────────────────────────────────────────
// toneMode: "normal" | "genz"
export const sendMessage = (message, chatId, toneMode = "normal") =>
  api.post("/chat/send", { message, chatId: chatId || undefined, toneMode });

export const streamMessage = async (message, chatId, toneMode = "normal") => {
  // Use native fetch for streaming, but still attach the Bearer token
  const currentUser = auth.currentUser;
  let token = "";
  if (currentUser) {
    token = await currentUser.getIdToken();
  }
  return fetch(`${API_BASE}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, chatId, toneMode }),
  });
};

export const createNewChat = (firstMessage) =>
  api.post("/chat/new", { firstMessage });

export const getChatHistory = () =>
  api.get("/chat/history");

export const getChatSession = (chatId) =>
  api.get(`/chat/${chatId}`);

export const deleteChat = (chatId) =>
  api.delete(`/chat/${chatId}`);

export const editMessage = (messageId, chatId, text) =>
  api.put(`/chat/message/${messageId}`, { chatId, text });

// ── Mood APIs ────────────────────────────────────────────────────
export const saveMood = (mood) =>
  api.post("/mood", { mood });

export const getMoodHistory = () =>
  api.get("/mood/history");

// ── Analytics APIs ───────────────────────────────────────────────
export const trackEvent = (event, payload = {}) =>
  api.post("/analytics", { event, payload }).catch(() => {}); // fire-and-forget

export default api;

