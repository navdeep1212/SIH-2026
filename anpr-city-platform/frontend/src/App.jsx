import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewView from './components/OverviewView';
import VideoAnalyzerView from './components/VideoAnalyzerView';
import TrajectorySearchView from './components/TrajectorySearchView';
import LiveCameras from './components/LiveCameras';
import VehicleTracking from './components/VehicleTracking';
import TrafficAnalytics from './components/TrafficAnalytics';
import AlertsWatchlist from './components/AlertsWatchlist';
import CameraNetwork from './components/CameraNetwork';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
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
    setActiveTab('vehicle-tracking');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewView
            onOpenAnalyzer={() => setActiveTab('video-analyzer')}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
      case 'video-analyzer':
        return <VideoAnalyzerView setIsProcessingParent={setIsProcessing} />;
      case 'search':
        return <TrajectorySearchView initialPlateQuery={searchQuery} />;
      case 'live-cameras':
        return (
          <LiveCameras
            onInspectVehicle={(plate) => {
              setSearchQuery(plate);
              setActiveTab('vehicle-tracking');
            }}
          />
        );
      case 'vehicle-tracking':
        return (
          <VehicleTracking
            initialPlate={searchQuery || 'DL 01 AB 1234'}
            onNavigate={(tab, plate) => {
              if (plate) setSearchQuery(plate);
              setActiveTab(tab);
            }}
          />
        );
      case 'traffic-analytics':
        return <TrafficAnalytics />;
      case 'alerts-watchlist':
        return (
          <AlertsWatchlist
            onTrackPlate={(plate) => {
              setSearchQuery(plate);
              setActiveTab('vehicle-tracking');
            }}
          />
        );
      case 'camera-network':
        return <CameraNetwork />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return (
          <OverviewView
            onOpenAnalyzer={() => setActiveTab('video-analyzer')}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        );
    }
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
        <main className="relative pt-16 min-h-screen bg-surface p-space-lg">
          {renderContent()}
        </main>
      </div>

      {/* Socket.io Real-Time Blacklist Alerts Banner (Phase 4) */}
      <AlertsWidget alerts={alertsList} onDismiss={handleDismissAlert} />
    </div>
  );
}

export default App;
