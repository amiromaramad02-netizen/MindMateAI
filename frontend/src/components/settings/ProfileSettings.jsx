import React, { useState } from 'react';
import api from '../../api';

export default function ProfileSettings({ profile, onUpdate }) {
  const [formData, setFormData] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    profilePic: profile.profilePic || '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.put('/user/profile', formData);
      if (res.data.success) {
        setMsg({ type: 'success', text: 'Profile updated successfully!' });
        onUpdate(); // Refresh parent state
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h1>Profile</h1>
      <p className="section-desc">Manage your public identity on MindMate AI.</p>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-group">
          <label>Profile Picture URL</label>
          <div className="profile-pic-uploader">
            {formData.profilePic ? (
              <img src={formData.profilePic} alt="Profile" className="current-pic" />
            ) : (
              <div className="pic-placeholder">👤</div>
            )}
            <input 
              type="text" 
              placeholder="https://example.com/photo.jpg" 
              value={formData.profilePic}
              onChange={(e) => setFormData({...formData, profilePic: e.target.value})}
            />
          </div>
          <small>Paste an image URL to update your avatar.</small>
        </div>

        <div className="settings-group">
          <label>Display Name</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div className="settings-group">
          <label>Bio</label>
          <textarea 
            rows={4}
            placeholder="Tell us a bit about yourself..."
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
          />
        </div>

        <button type="submit" className="settings-btn primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </button>

        {msg && <div className={`settings-msg ${msg.type}`}>{msg.text}</div>}
      </form>
    </div>
  );
}
