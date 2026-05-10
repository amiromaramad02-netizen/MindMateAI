import React, { useState } from 'react';
import api from '../../api';

export default function PersonalizationSettings({ preferences, onUpdate }) {
  const [prefs, setPrefs] = useState(preferences);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setLoading(true);
    try {
      await api.put('/user/preferences', updated);
      onUpdate();
    } catch (err) {
      console.error("Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h1>Personalization</h1>
      <p className="section-desc">Customize how MindMate AI looks and speaks.</p>

      <div className="settings-form">
        <div className="toggle-group">
          <div className="toggle-info">
            <h4>Dark Mode</h4>
            <p>Switch between light and dark themes.</p>
          </div>
          <select 
            value={prefs.theme} 
            onChange={(e) => handleToggle('theme', e.target.value)}
            disabled={loading}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="toggle-group">
          <div className="toggle-info">
            <h4>Tone Mode</h4>
            <p>Switch between standard and Gen Z "Chill" communication styles.</p>
          </div>
          <select 
            value={prefs.toneMode} 
            onChange={(e) => handleToggle('toneMode', e.target.value)}
            disabled={loading}
          >
            <option value="normal">Normal</option>
            <option value="genz">Gen Z (Chill)</option>
          </select>
        </div>

        <div className="toggle-group">
          <div className="toggle-info">
            <h4>Email Notifications</h4>
            <p>Receive updates about your account and privacy.</p>
          </div>
          <input 
            type="checkbox" 
            style={{ width: '20px', height: '20px' }}
            checked={prefs.notifications}
            onChange={(e) => handleToggle('notifications', e.target.checked)}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
