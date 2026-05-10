import React, { useState, useEffect } from "react";
import "./Message.css";

/**
 * Format an ISO timestamp to a friendly "hh:mm AM/PM" string.
 */
function formatTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Message component — renders a single chat bubble with avatar and timestamp.
 */
export default function Message({
  id,
  role,
  content,
  timestamp,
  isStreaming,
  isEditing,
  onEdit,
  onSaveEdit,
  onCancelEdit,
}) {
  const [editValue, setEditValue] = useState(content);
  const isUser = role === "user";
  const time = formatTime(timestamp);

  useEffect(() => {
    if (isEditing) setEditValue(content);
  }, [isEditing, content]);

  const handleSave = () => {
    if (editValue.trim() && editValue !== content) {
      onSaveEdit(id, editValue);
    } else {
      onCancelEdit(id);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onCancelEdit(id);
    }
  };

  return (
    <div className={`message-row ${isUser ? "user-row" : "bot-row"} ${isEditing ? "editing-row" : ""}`}>
      {/* Bot avatar (left side) */}
      {!isUser && (
        <div className="avatar bot-avatar" aria-label="MindMate">
          <span role="img" aria-label="brain">🧠</span>
        </div>
      )}

      <div className="bubble-group">
        <div className={`message-bubble ${isUser ? "user-bubble" : "bot-bubble"}`}>
          {isEditing ? (
            <div className="edit-container">
              <textarea
                className="edit-textarea"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className="edit-actions">
                <button className="edit-btn save" onClick={handleSave}>Save</button>
                <button className="edit-btn cancel" onClick={() => onCancelEdit(id)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* Render with newline support */}
              {content.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < content.split("\n").length - 1 && <br />}
                </React.Fragment>
              ))}
              {isStreaming && <span className="typing-cursor">|</span>}
              
              {isUser && !isEditing && (
                <button 
                  className="message-edit-icon" 
                  onClick={() => onEdit(id)}
                  title="Edit message"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
        {time && !isEditing && (
          <span className={`message-time ${isUser ? "time-right" : "time-left"}`}>
            {time}
          </span>
        )}
      </div>

      {/* User avatar (right side) */}
      {isUser && (
        <div className="avatar user-avatar" aria-label="You">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>
  );
}
