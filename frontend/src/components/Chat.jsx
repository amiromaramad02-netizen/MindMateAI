import { useState, useEffect, useRef, useCallback } from "react";
import { sendMessage as sendMessageAPI, streamMessage, editMessage as editMessageAPI } from "../api";
import "./Chat.css";
import Message from "./Message";

// Suggested prompts shown in the empty state
const SUGGESTIONS = [
  { icon: "💭", text: "I've been feeling really anxious lately" },
  { icon: "🌱", text: "Help me understand my emotions better" },
  { icon: "💙", text: "I need someone to talk to right now" },
  { icon: "😔", text: "I've been struggling to stay motivated" },
];

export default function Chat({
  activeChatId,
  setActiveChatId,
  messages,
  setMessages,
  onChatCreated,
  onChatPreviewUpdate,
  toneMode,
}) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Focus input on mount and when switching chats
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeChatId]);

  const handleSend = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    await executeStreaming(text, activeChatId, newMessages);
  };

  const executeStreaming = async (text, chatId, currentMessages) => {
    setIsTyping(true);
    const botMsgId = `bot-${Date.now()}`;
    const botMsg = {
      id: botMsgId,
      role: "bot",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true
    };
    
    setMessages([...currentMessages, botMsg]);

    let fullText = "";
    try {
      const response = await streamMessage(text, chatId, toneMode);
      if (!response.ok) throw new Error("Connection failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              fullText += data.token;
              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, content: fullText } : m))
              );
            }
            if (data.done) {
              if (!chatId && data.chatId) {
                setActiveChatId(data.chatId);
                onChatCreated?.();
              }
              const chatIdToUpdate = data.chatId || chatId;
              if (chatIdToUpdate) {
                onChatPreviewUpdate?.(chatIdToUpdate, fullText);
              }
              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, isStreaming: false } : m))
              );
            }
          } catch (e) { }
        }
      }
    } catch (error) {
      console.error("Error streaming:", error);
      const errorText = "⚠️ Response interrupted. Please retry.";
      setMessages((prev) =>
        prev.map((m) => (m.id === botMsgId ? { ...m, content: fullText + "\n\n" + errorText, isStreaming: false } : m))
      );
    } finally {
      setIsTyping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleEdit = (id) => {
    if (isTyping) return;
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isEditing: true } : m));
  };

  const handleCancelEdit = (id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isEditing: false } : m));
  };

  const handleSaveEdit = async (id, newContent) => {
    if (!newContent.trim() || isTyping) return;

    try {
      const index = messages.findIndex(m => m.id === id);
      if (index === -1) return;

      // Update backend & truncate history
      await editMessageAPI(id, activeChatId, newContent);

      // Truncate frontend messages
      const truncated = messages.slice(0, index + 1).map((m, i) =>
        i === index ? { ...m, content: newContent, isEditing: false, timestamp: new Date().toISOString() } : m
      );
      
      setMessages(truncated);
      
      // Re-trigger streaming for the edited message
      await executeStreaming(newContent, activeChatId, truncated);
    } catch (error) {
      console.error("Edit failed:", error);
    }
  };

  const handleSuggestion = (text) => {
    handleSend(text);
  };

  /** Auto-resize textarea to fit content */
  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    // Reset height to auto so shrinking works
    e.target.style.height = "auto";
    // Set to scrollHeight but cap at ~120px (roughly 5 lines)
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-container">
      {/* ── Message area ────────────────────────────────────── */}
      <div className="chat-box" ref={chatBoxRef}>
        <div className="chat-messages-inner">
          {isEmpty ? (
            /* ── Empty / Welcome state ── */
            <div className="empty-state">
              <h2 className="empty-title">Hey, I'm MindMate</h2>
              <p className="empty-subtitle">
                Your safe space to talk, reflect, and feel better.
                <br />
                What's on your mind today?
              </p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    className="suggestion-pill"
                    onClick={() => handleSuggestion(s.text)}
                  >
                    <span className="suggestion-icon">{s.icon}</span>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <Message
                key={m.id}
                id={m.id}
                role={m.role}
                content={m.content}
                timestamp={m.timestamp}
                isStreaming={m.isStreaming}
                isEditing={m.isEditing}
                onEdit={handleEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
              />
            ))
          )}

        </div>
      </div>

      {/* ── Input bar ───────────────────────────────────────── */}
      <div className="chat-input-bar">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isTyping) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Share what's on your mind…"
            disabled={isTyping}
            aria-label="Type your message"
            autoComplete="off"
            rows={1}
          />

          <button
            id="send-button"
            className={`send-btn${isTyping ? " loading" : ""}${!input.trim() ? " empty" : ""}`}
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
          >
            {isTyping ? (
              /* Spinner icon */
              <svg
                className="spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            ) : (
              /* Paper-plane icon */
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
        <p className="input-hint">MindMate can make mistakes, Always make sure to check important info</p>
        <p className="input-hint">Engineered by AmirOmar</p>
      </div>
    </div>
  );
}