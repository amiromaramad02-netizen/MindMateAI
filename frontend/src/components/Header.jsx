import React from "react";
import "./Header.css";

export default function Header({ toneMode, toggleTone }) {
  return (
    <div className="app-header">
      <div className="header-left">
        <div className="header-bot-avatar">🧠</div>
        <div className="header-info">
          <div className="header-title">MindMate</div>
          <div className="header-status">


            Always here for you
          </div>
        </div>
      </div>

      <div className="header-right">
        <button
          className={`tone-toggle-btn ${toneMode === "genz" ? "tone-active" : ""}`}
          onClick={toggleTone}
          title={
            toneMode === "genz"
              ? "Switch to standard tone"
              : "Switch to Chill Mode (Gen Z style)"
          }
          aria-pressed={toneMode === "genz"}
        >
          {toneMode === "genz" ? "✌️ Chill Mode On" : "💬 Chill Mode"}
        </button>
      </div>
    </div>
  );
}
