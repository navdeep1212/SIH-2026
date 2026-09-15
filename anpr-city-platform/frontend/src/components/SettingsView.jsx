import React, { useState } from 'react';

export default function SettingsView() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000');
  const [mlServiceUrl, setMlServiceUrl] = useState('http://127.0.0.1:8000');
  const [defaultCamera, setDefaultCamera] = useState('CAM_01');
  const [minConfidence, setMinConfidence] = useState(75);
  const [autoAlerts, setAutoAlerts] = useState(true);
  const [msg, setMsg] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    setMsg('Settings saved successfully!');
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="space-y-6 font-mono max-w-4xl">
      <div className="border-b border-border-main pb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[24px]">settings</span>
          <h2 className="text-xl font-bold text-text-primary tracking-wide">
            PLATFORM CONFIGURATION &amp; ENVIRONMENT SETTINGS
          </h2>
        </div>
        <p className="text-xs text-text-secondary mt-0.5 font-sans">
          Manage API connectivity endpoints, default camera ingestion, and automated blacklist triggers
        </p>
      </div>

      {msg && (
        <div className="p-3 bg-status-green/10 border border-status-green/40 text-status-green rounded-xl text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{msg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-bg-card border border-border-main rounded-2xl p-6 shadow-xl space-y-6 text-xs">
        <div>
          <h3 className="font-bold text-sm text-text-primary mb-4 pb-2 border-b border-border-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">dns</span>
            Service Endpoints
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-1 uppercase">Node.js / Express Backend</label>
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary"
              />
            </div>
            <div>
              <label className="block text-text-secondary mb-1 uppercase">Python FastAPI ML Service (YOLO + OCR)</label>
              <input
                type="text"
                value={mlServiceUrl}
                onChange={(e) => setMlServiceUrl(e.target.value)}
                className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary"
              />
              <span className="text-[10px] text-text-secondary mt-1 block">Configured for 127.0.0.1:8000</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-text-primary mb-4 pb-2 border-b border-border-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
            Detection &amp; OCR Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-text-secondary mb-1 uppercase">Default Ingestion Camera</label>
              <select
                value={defaultCamera}
                onChange={(e) => setDefaultCamera(e.target.value)}
                className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary"
              >
                <option value="CAM_01">CAM_01 - NH48 Highway North</option>
                <option value="CAM_02">CAM_02 - Expressway Toll Plaza</option>
                <option value="CAM_03">CAM_03 - City Center Ring Junction</option>
                <option value="CAM_04">CAM_04 - Ring Road South Bypass</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between text-text-secondary mb-1">
                <span className="uppercase">Min. OCR Accuracy Filter</span>
                <span className="text-primary font-bold">{minConfidence}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm text-text-primary mb-4 pb-2 border-b border-border-main flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">notifications_active</span>
            Real-time Alert Dispatch
          </h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoAlerts}
              onChange={(e) => setAutoAlerts(e.target.checked)}
              className="accent-primary w-4 h-4 rounded"
            />
            <span className="text-text-primary">
              Automatically broadcast Socket.io notifications upon Blacklist plate match
            </span>
          </label>
        </div>

        <div className="pt-4 border-t border-border-main flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-primary text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[16px]">save</span> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}

