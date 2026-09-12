import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'dashboard', disabled: false },
    { id: 'video-analyzer', label: 'Video Analyzer', icon: 'monitoring', disabled: false },
    { id: 'search', label: 'Plate Search', icon: 'search', disabled: false },
    { id: 'live-cameras', label: 'Live Cameras', icon: 'videocam', badge: 'SOON', disabled: true },
    { id: 'vehicle-tracking', label: 'Vehicle Tracking', icon: 'gps_fixed', badge: 'SOON', disabled: true },
    { id: 'traffic-analytics', label: 'Traffic Analytics', icon: 'bar_chart', badge: 'SOON', disabled: true },
    { id: 'alerts-watchlist', label: 'Alerts & Watchlist', icon: 'warning', badge: 'SOON', disabled: true },
    { id: 'camera-network', label: 'Camera Network', icon: 'hub', badge: 'SOON', disabled: true },
    { id: 'reports', label: 'Reports', icon: 'description', disabled: false },
    { id: 'settings', label: 'Settings', icon: 'settings', disabled: false },
  ];

  return (
    <aside class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col pt-space-lg pb-space-lg border-r border-outline-variant/10">
      <div className="px-space-lg mb-space-lg">
        <h1 className="text-headline-md font-headline-md text-primary tracking-tight uppercase font-bold">NEXUS VISION</h1>
        <p className="text-label-sm font-label-sm text-outline uppercase tracking-wider mt-1 font-mono">AI Traffic Intelligence</p>
      </div>

      <nav className="flex-1 px-space-md space-y-space-2xs overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          if (item.disabled) {
            return (
              <a
                key={item.id}
                href="#"
                onClick={(e) => e.preventDefault()}
                className="flex items-center px-space-md py-space-sm rounded-lg text-outline cursor-not-allowed opacity-60 transition-all text-body-sm"
              >
                <span className="material-symbols-outlined mr-space-sm text-[20px]">{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className="ml-auto text-label-sm font-label-sm bg-surface-container px-1.5 py-0.5 rounded text-outline font-mono">
                    {item.badge}
                  </span>
                )}
              </a>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-space-md py-space-sm rounded-lg text-body-sm transition-all font-medium ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-md shadow-primary-container/10'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined mr-space-sm text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="px-space-lg pt-space-md border-t border-surface-container-high mx-space-md">
        <div className="text-label-sm font-label-sm text-outline-variant space-y-1 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-primary-fixed">●</span> ML Engine Online (YOLOv8)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-primary-fixed">●</span> OCR Engine Online (EasyOCR)
          </div>
          <div className="text-outline">Queue: 0 active</div>
        </div>
      </div>
    </aside>
  );
}
