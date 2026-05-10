import React, { useState } from 'react';
import api from '../../api';

export default function HelpSupport() {
  const [ticket, setTicket] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.post('/support/ticket', ticket);
      if (res.data.success) {
        setMsg({ type: 'success', text: res.data.message });
        setTicket({ subject: '', message: '' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to send ticket. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h1>Help & Support</h1>
      <p className="section-desc">Need help? Send us a message and we'll get back to you.</p>

      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="settings-group">
          <label>Subject</label>
          <input 
            type="text" 
            placeholder="What do you need help with?"
            value={ticket.subject}
            onChange={(e) => setTicket({...ticket, subject: e.target.value})}
            required
          />
        </div>

        <div className="settings-group">
          <label>Message</label>
          <textarea 
            rows={6}
            placeholder="Describe your issue in detail..."
            value={ticket.message}
            onChange={(e) => setTicket({...ticket, message: e.target.value})}
            required
          />
        </div>

        <button type="submit" className="settings-btn primary" disabled={loading}>
          {loading ? 'Sending...' : 'Submit Ticket'}
        </button>

        {msg && <div className={`settings-msg ${msg.type}`}>{msg.text}</div>}
      </form>
    </div>
  );
}
