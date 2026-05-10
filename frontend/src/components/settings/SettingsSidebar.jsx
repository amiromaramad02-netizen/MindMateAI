import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SettingsSidebar({ activeSection, setActiveSection }) {
  const navigate = useNavigate();

  const sections = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'account', label: 'Account', icon: '🔒' },
    { id: 'personalization', label: 'Personalization', icon: '🎨' },
    { id: 'privacy', label: 'Privacy & Security', icon: '🛡️' },
    { id: 'support', label: 'Help & Support', icon: '❓' },
    { id: 'legal', label: 'Legal', icon: '📄' },
  ];

  return (
    <aside className="settings-sidebar">
      <h2>Settings</h2>
      <nav className="settings-nav">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`settings-nav-item ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </nav>
      <button className="back-to-home" onClick={() => navigate('/home')}>
        ← Back to Chat
      </button>
    </aside>
  );
}
