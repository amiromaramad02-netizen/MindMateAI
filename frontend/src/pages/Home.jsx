import { useState, useCallback, useEffect } from "react";
import api from "../api";
import Header from "../components/Header";
import Chat from "../components/Chat";
import Sidebar from "../components/Sidebar";
import "./Home.css";

export default function Home() {
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages]         = useState([]);
  const [chats, setChats]               = useState([]);
  const [refreshKey, setRefreshKey]      = useState(0);
  const [toneMode, setToneMode]         = useState("normal");

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await api.get("/api/user/settings");
        if (res.data.success) {
          const { theme, toneMode } = res.data.data.preferences;
          setToneMode(toneMode);
          // Apply theme to body
          document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
        }
      } catch (err) {
        console.error("Failed to load prefs", err);
      }
    }
    loadPrefs();
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleChatPreviewUpdate = useCallback((chatId, lastMessage) => {
    setChats((prev) =>
      prev.map((c) =>
        c.chatId === chatId
          ? { ...c, lastMessage, updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const toggleTone = () => {
    setToneMode((m) => (m === "normal" ? "genz" : "normal"));
  };

  return (
    <div className="app-container">
      <Header toneMode={toneMode} toggleTone={toggleTone} />
      <div className="main-container">
        <Sidebar
          activeChatId={activeChatId}
          setActiveChatId={setActiveChatId}
          setMessages={setMessages}
          chats={chats}
          setChats={setChats}
          refreshKey={refreshKey}
        />
        <div className="chat-area">
          <Chat
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            messages={messages}
            setMessages={setMessages}
            onChatCreated={triggerRefresh}
            onChatPreviewUpdate={handleChatPreviewUpdate}
            toneMode={toneMode}
          />
        </div>
      </div>
    </div>
  );
}