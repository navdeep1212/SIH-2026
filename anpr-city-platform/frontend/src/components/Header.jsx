import React, { useState } from 'react';

export default function Header({ activeTab, setActiveTab, onSearchSubmit, alertCount, isProcessing }) {
  const [searchInput, setSearchInput] = useState('');

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
        <span className="px-space-xs py-0.5 rounded bg-surface-container-high text-primary text-label-sm font-label-sm border border-outline-variant/30 font-mono">
          LOCAL / DEMO
        </span>
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
