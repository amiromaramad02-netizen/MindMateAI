import React from 'react';

export default function Legal() {
  return (
    <div className="settings-section">
      <h1>Legal</h1>
      <p className="section-desc">Privacy Policy and Terms of Service.</p>

      <div className="settings-form">
        <div className="settings-group">
          <h3>Privacy Policy</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6' }}>
            At MindMate AI, we value your privacy. Your conversations are processed locally where possible and encrypted in transit. 
            If you choose to save history, your data is stored in a secure MySQL environment. 
            We do not sell your personal data to third parties.
          </p>
        </div>

        <div className="settings-group">
          <h3>Terms of Service</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6' }}>
            By using MindMate AI, you agree to use the service responsibly. 
            The AI provides wellness companionship but is not a replacement for professional medical or psychiatric help. 
            In case of emergency, please contact professional emergency services immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
