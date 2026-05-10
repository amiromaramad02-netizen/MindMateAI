import React, { useState, useEffect } from 'react';
import api from '../api';
import SettingsSidebar from '../components/settings/SettingsSidebar';
import ProfileSettings from '../components/settings/ProfileSettings';
import AccountSettings from '../components/settings/AccountSettings';
import PersonalizationSettings from '../components/settings/PersonalizationSettings';
import PrivacySettings from '../components/settings/PrivacySettings';
import HelpSupport from '../components/settings/HelpSupport';
import Legal from '../components/settings/Legal';
import './Settings.css';

export default function Settings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/user/settings');
      if (res.data.success) {
        const fetched = res.data.data;
        setData(fetched);
        // Apply theme live
        const theme = fetched.preferences?.theme || 'dark';
        document.body.className = theme === 'dark' ? 'dark-mode' : 'light-mode';
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) return <div className="settings-layout" style={{justifyContent: 'center', alignItems: 'center'}}>Loading Settings...</div>;
  if (!data) return <div className="settings-layout">Error loading settings.</div>;

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings profile={data.profile} onUpdate={fetchSettings} />;
      case 'account':
        return <AccountSettings profile={data.profile} />;
      case 'personalization':
        return <PersonalizationSettings preferences={data.preferences} onUpdate={fetchSettings} />;
      case 'privacy':
        return <PrivacySettings preferences={data.preferences} onUpdate={fetchSettings} />;
      case 'support':
        return <HelpSupport />;
      case 'legal':
        return <Legal />;
      default:
        return <ProfileSettings profile={data.profile} onUpdate={fetchSettings} />;
    }
  };

  return (
    <div className="settings-layout">
      <SettingsSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <main className="settings-content">
        {renderSection()}
      </main>
    </div>
  );
}
