import React, { useState, useEffect } from 'react';
import { checkSystemHealth } from '../services/api';

export default function Header({ activeTab, setActiveTab, onSearchSubmit, alertCount, isProcessing }) {
  const [searchInput, setSearchInput] = useState('');
  const [health, setHealth] = useState({ server: false, ml: false });

  useEffect(() => {
    let isMounted = true;

    const updateHealth = async () => {
      try {
        const res = await checkSystemHealth();
        if (isMounted) {
          setHealth(res);
        }
      } catch (err) {
        if (isMounted) {
          setHealth({ server: false, ml: false });
        }
      }
    };

    // Immediate check on mount
    updateHealth();

    // Poll status every 4 seconds
    const intervalId = setInterval(updateHealth, 4000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchInput.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit(searchInput.trim());
      }
      setActiveTab('search');
    }
  };

  const titleMap = {
    'overview': 'Overview',
    'video-analyzer': 'Video Analyzer',
    'search': 'Plate Trajectory Search',
    'reports': 'Reports & Logs',
    'settings': 'Platform Settings',
  };

  return (
    <header className="fixed top-0 left-72 right-0 h-16 bg-surface/80 backdrop-blur-xl z-40 flex items-center justify-between px-space-lg border-b border-outline-variant/10">
      <div className="flex items-center gap-space-md">
        <span className="text-headline-sm font-headline-sm text-on-surface font-semibold">
          {titleMap[activeTab] || 'Video Analyzer'}
        </span>

        {/* Live System Status Indicators (Server & ML) */}
        <div className="flex items-center gap-2">
          {/* Server Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-[11px] font-mono select-none transition-all duration-300"
            title={`API Server (Port 5000): ${health.server ? 'Active & Healthy' : 'Offline / Unreachable'}`}
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {health.server && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-300 ${
                  health.server
                    ? 'bg-cyan-400 shadow-[0_0_8px_#00f2fe]'
                    : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                }`}
              ></span>
            </span>
            <span className="text-outline">SERVER:</span>
            <span className={`font-semibold tracking-wider ${health.server ? 'text-cyan-400' : 'text-red-400'}`}>
              {health.server ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* ML Service Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-[11px] font-mono select-none transition-all duration-300"
            title={`ML Service (Port 8000): ${health.ml ? 'Active & Ready for Inference' : 'Offline / Unreachable'}`}
          >
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              {health.ml && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 transition-colors duration-300 ${
                  health.ml
                    ? 'bg-cyan-400 shadow-[0_0_8px_#00f2fe]'
                    : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                }`}
              ></span>
            </span>
            <span className="text-outline">ML:</span>
            <span className={`font-semibold tracking-wider ${health.ml ? 'text-cyan-400' : 'text-red-400'}`}>
              {health.ml ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-space-lg">
        {/* Global Search Bar (Phase 5 - Trajectory Search Trigger) */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">search</span>
          <input
            type="text"
            className="bg-surface-container border border-outline-variant rounded-lg pl-10 pr-4 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary-container w-64 transition-all"
            placeholder="Search plates (Press Enter)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex items-center gap-space-md">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setActiveTab('search')}
              className="relative p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Alert Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-error animate-pulse border border-surface flex items-center justify-center text-[8px] text-on-error font-bold"></span>
              )}
            </button>
          </div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-space-xs px-2 py-1 rounded-lg bg-surface-container border border-outline-variant/30">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-body-sm font-medium text-on-surface leading-tight">Cmdr. Alex Vance</div>
              <div className="text-label-sm text-outline font-mono">OPERATOR</div>
            </div>
          </div>

          {/* Active Processing Indicator */}
          <div className="flex items-center gap-2 pl-2 border-l border-outline-variant/30">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-label-sm font-label-sm font-mono border ${
                isProcessing
                  ? 'bg-primary-container/20 text-primary border-primary-container/40 animate-pulse'
                  : 'bg-surface-container text-outline border-outline-variant/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isProcessing ? 'bg-primary-container animate-ping' : 'bg-primary-fixed'
                }`}
              ></span>
              {isProcessing ? 'PROCESSING VIDEO...' : 'PROCESSING ACTIVE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
