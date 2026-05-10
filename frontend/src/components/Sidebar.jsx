import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getChatHistory, getChatSession, deleteChat as deleteChatAPI } from "../api";
import { normalizeMessage } from "../utils/normalizeMessage";
import { useAuth } from "../contexts/AuthContext";
import "./Sidebar.css";

/**
 * Format a timestamp into a human-friendly relative string.
 */
function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Sidebar({
  activeChatId,
  setActiveChatId,
  setMessages,
  chats,
  setChats,
  refreshKey,
}) {
  const [deletingId, setDeletingId] = useState(null);
  const { user, logout } = useAuth();

  const fetchChats = async () => {
    try {
      const res = await getChatHistory();
      setChats(res.data.data || []);
    } catch (error) {
      console.error("Error fetching chat history:", error);
    }
  };

  // Fetch chats on mount and whenever refreshKey changes
  useEffect(() => {
    fetchChats();
  }, [refreshKey]);

  /** Start a fresh new chat (lazy — no API call until user sends first message) */
  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  /** Load an existing chat session from the server */
  const loadChat = async (chatId) => {
    if (chatId === activeChatId) return; // already active
    try {
      const res = await getChatSession(chatId);
      setActiveChatId(chatId);
      const rawMessages = res.data.data.messages || [];
      setMessages(rawMessages.map(normalizeMessage));
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  /** Delete a chat with confirmation */
  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;

    setDeletingId(chatId);
    try {
      await deleteChatAPI(chatId);
      setChats((prev) => prev.filter((c) => c.chatId !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="sidebar">
      {/* ── Top Section ───────────────────────────── */}
      <div className="sidebar-top">
        <button className="new-chat-button" onClick={handleNewChat}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>

        <p className="chats-label">Recent Chats</p>
      </div>
      <ul className="chat-list" role="listbox" aria-label="Chat history">
        {chats.length === 0 && (
          <li className="chat-list-empty">No chats yet. Start one above!</li>
        )}
        {chats.map((chat) => (
          <li
            key={chat.chatId}
            role="option"
            aria-selected={activeChatId === chat.chatId}
            className={`chat-item${activeChatId === chat.chatId ? " active" : ""}${deletingId === chat.chatId ? " deleting" : ""}`}
            onClick={() => loadChat(chat.chatId)}
          >
            <div className="chat-item-content">
              <span className="chat-item-title">{chat.chatTitle || "New Chat"}</span>
              {chat.lastMessage && (
                <span className="chat-item-preview">
                  {chat.lastMessage.length > 50
                    ? chat.lastMessage.substring(0, 50) + "…"
                    : chat.lastMessage}
                </span>
              )}
            </div>
            <div className="chat-item-meta">
              <span className="chat-item-time">{timeAgo(chat.updatedAt || chat.createdAt)}</span>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(e, chat.chatId)}
                title="Delete this chat"
                aria-label={`Delete chat: ${chat.chatTitle}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* ── User footer ─────────────────────── */}
      {user && (
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar-circle">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="user-details">
              <span className="user-name">{user.name || "User"}</span>
              <span className="user-email">{user.email || ""}</span>
            </div>
          </div>
          {user.role === "admin" && (
            <Link to="/admin" className="admin-link-btn" title="Admin Panel">
              <span role="img" aria-label="admin">⚙️</span>
            </Link>
          )}
          <Link to="/settings" className="admin-link-btn" title="Settings">
            <span role="img" aria-label="settings">🛠️</span>
          </Link>
          <button
            className="logout-btn"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}