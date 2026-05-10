import React, { useState, useEffect } from "react";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api";
import "./AdminDashboard.css";

function AdminStats() {
  const [stats, setStats] = useState({ totalUsers: 0, totalChats: 0, totalMessages: 0, crisisCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get("/api/admin/stats");
        if (res.data.success) setStats(res.data.data);
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div className="admin-loading">Loading stats...</div>;

  return (
    <div className="admin-view">
      <h1 className="admin-page-title">Platform Overview</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats.totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Total Chats</h3>
          <p className="stat-value">{stats.totalChats}</p>
        </div>
        <div className="stat-card">
          <h3>Total Messages</h3>
          <p className="stat-value">{stats.totalMessages}</p>
        </div>
        <div className="stat-card crisis">
          <h3>Crisis Interventions</h3>
          <p className="stat-value">{stats.crisisCount}</p>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get("/api/admin/users");
        if (res.data.success) setUsers(res.data.data);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  if (loading) return <div className="admin-loading">Loading users...</div>;

  return (
    <div className="admin-view">
      <h1 className="admin-page-title">User Management</h1>
      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Chats</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.name || "N/A"}</td>
              <td>{u.email}</td>
              <td><span className={`role-badge ${u.role}`}>{u.role}</span></td>
              <td>{u.chatCount}</td>
              <td>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminSettings() {
  const [settings, setSettings] = useState({ primary_model: "ollama", system_prompt: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await api.get("/api/admin/settings");
        if (res.data.success) setSettings(res.data.data);
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await api.put("/api/admin/settings", { settings });
      if (res.data.success) setMsg("Settings saved successfully!");
    } catch (err) {
      console.error("Failed to save settings", err);
      setMsg("Error saving settings.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  if (loading) return <div className="admin-loading">Loading settings...</div>;

  return (
    <div className="admin-view">
      <h1 className="admin-page-title">Bot Configuration</h1>
      <form onSubmit={handleSubmit} className="admin-form">
        <div className="form-group">
          <label>Primary AI Model</label>
          <select 
            value={settings.primary_model || "ollama"} 
            onChange={(e) => setSettings({...settings, primary_model: e.target.value})}
          >
            <option value="ollama">Ollama (Local)</option>
            <option value="gpt-4o-mini">GPT-4o-mini (Cloud)</option>
            <option value="gpt-4">GPT-4 (Cloud)</option>
          </select>
          <small>Select which AI engine handles the main chat routing.</small>
        </div>

        <div className="form-group">
          <label>Global System Prompt</label>
          <textarea 
            rows={6}
            value={settings.system_prompt || ""}
            onChange={(e) => setSettings({...settings, system_prompt: e.target.value})}
            placeholder="You are MindMate, an empathetic..."
          />
          <small>This forms the core personality of the bot before emotion and memory are injected.</small>
        </div>

        <button type="submit" className="admin-btn primary" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
        {msg && <p className="admin-msg">{msg}</p>}
      </form>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redundant safety check
  if (!user || user.role !== "admin") {
    return <div className="admin-loading">Unauthorized</div>;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="icon">⚙️</span>
          <h2>Admin Panel</h2>
        </div>
        <nav className="admin-nav">
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/users">Users</Link>
          <Link to="/admin/settings">Bot Settings</Link>
        </nav>
        <div className="admin-bottom">
          <button className="admin-btn secondary outline" onClick={() => navigate("/home")}>
            Exit to Chat
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Routes>
          <Route path="/" element={<AdminStats />} />
          <Route path="/users" element={<AdminUsers />} />
          <Route path="/settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  );
}
