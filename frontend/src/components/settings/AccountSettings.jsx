import React, { useState } from 'react';
import api from '../../api';
import { useAuth } from '../../contexts/AuthContext';

export default function AccountSettings({ profile }) {
  const { logout } = useAuth();
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMsg({ type: 'error', text: "New passwords don't match." });
      return;
    }
    setLoading(true);
    try {
      const res = await api.put('/user/password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      if (res.data.success) {
        setMsg({ type: 'success', text: 'Password changed successfully!' });
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you ABSOLUTELY sure? This will delete all your chats and data permanently.")) return;
    try {
      await api.delete('/user');
      logout();
    } catch (err) {
      alert("Failed to delete account.");
    }
  };

  return (
    <div className="settings-section">
      <h1>Account</h1>
      <p className="section-desc">Manage your email and security preferences.</p>

      <div className="settings-form">
        <div className="settings-group">
          <label>Email Address</label>
          <input type="email" value={profile.email} disabled />
          <small>Email changes are currently handled through your login provider.</small>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '1rem 0' }} />

        <form onSubmit={handlePasswordChange} className="settings-form">
          <h3>Change Password</h3>
          <div className="settings-group">
            <label>Current Password</label>
            <input 
              type="password" 
              value={passwords.current}
              onChange={(e) => setPasswords({...passwords, current: e.target.value})}
              required
            />
          </div>
          <div className="settings-group">
            <label>New Password</label>
            <input 
              type="password" 
              value={passwords.new}
              onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              required
            />
          </div>
          <div className="settings-group">
            <label>Confirm New Password</label>
            <input 
              type="password" 
              value={passwords.confirm}
              onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="settings-btn primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {msg && <div className={`settings-msg ${msg.type}`}>{msg.text}</div>}

        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '2rem 0' }} />

        <div className="danger-zone">
          <h3>Danger Zone</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Deleting your account will remove all messages, chats, and personal data from our servers.
          </p>
          <button onClick={handleDeleteAccount} className="settings-btn danger">
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
