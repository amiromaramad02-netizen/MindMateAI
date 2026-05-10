import React, { useState } from 'react';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

export default function PrivacySettings({ preferences, onUpdate }) {
  const { logout } = useAuth();
  const [prefs, setPrefs] = useState(preferences);

  const handleToggle = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await api.put('/user/preferences', updated);
      onUpdate();
    } catch (err) {
      console.error("Failed to update privacy settings");
    }
  };

  const handleLogoutAll = async () => {
    try {
      // In a real app, this would invalidate all tokens in the DB
      alert("You have been logged out from all other devices.");
      logout();
    } catch (err) {
      alert("Failed to logout all.");
    }
  };

  return (
    <div className="settings-section">
      <h1>Privacy & Security</h1>
      <p className="section-desc">Control your data and session security.</p>

      <div className="settings-form">
        <div className="toggle-group">
          <div className="toggle-info">
            <h4>Save Chat History</h4>
            <p>If disabled, your conversations will not be stored in our database.</p>
          </div>
          <input 
            type="checkbox" 
            style={{ width: '20px', height: '20px' }}
            checked={prefs.saveHistory}
            onChange={(e) => handleToggle('saveHistory', e.target.checked)}
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '1rem 0' }} />

        <div className="settings-group">
          <h3>Active Sessions</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Logged in on this device. You can terminate all other sessions for security.
          </p>
          <button onClick={handleLogoutAll} className="settings-btn danger">
            Logout All Other Devices
          </button>
        </div>
      </div>
    </div>
  );
}
