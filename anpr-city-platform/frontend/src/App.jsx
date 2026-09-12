import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewView from './components/OverviewView';
import VideoAnalyzerView from './components/VideoAnalyzerView';
import TrajectorySearchView from './components/TrajectorySearchView';
import AlertsWidget from './components/AlertsWidget';
import { connectAlertsSocket } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [alertsList, setAlertsList] = useState([]);

  // Connect to Socket.io for Phase 4 Real-time Blacklist Alerts
  useEffect(() => {
    const socket = connectAlertsSocket((newAlert) => {
      console.log('[App] New blacklist alert event received via Socket.io:', newAlert);
      setAlertsList((prev) => [newAlert, ...prev]);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const handleDismissAlert = (index) => {
    setAlertsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSearchSubmit = (query) => {
    setSearchQuery(query);
    setActiveTab('search');
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Container */}
      <div className="pl-72 flex-1 flex flex-col min-h-screen">
        {/* Top Fixed Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSearchSubmit={handleSearchSubmit}
          alertCount={alertsList.length}
          isProcessing={isProcessing}
        />

        {/* Dynamic View Rendering */}
        <main className="relative pt-16 min-h-screen bg-surface">
          {activeTab === 'overview' && (
            <OverviewView onOpenAnalyzer={() => setActiveTab('video-analyzer')} />
          )}

          {activeTab === 'video-analyzer' && (
            <VideoAnalyzerView setIsProcessingParent={setIsProcessing} />
          )}

          {activeTab === 'search' && (
            <TrajectorySearchView initialPlateQuery={searchQuery} />
          )}

          {(activeTab === 'reports' || activeTab === 'settings') && (
            <div className="p-space-lg font-mono text-outline">
              <h2 className="text-headline-lg font-bold text-on-surface mb-2">
                {activeTab === 'reports' ? 'Reports & Analytical Logs' : 'Platform Settings'}
              </h2>
              <p>Section ready for Phase 2 configuration.</p>
            </div>
          )}
        </main>
      </div>

      {/* Socket.io Real-Time Blacklist Alerts Banner (Phase 4) */}
      <AlertsWidget alerts={alertsList} onDismiss={handleDismissAlert} />
    </div>
  );
}

export default App;
