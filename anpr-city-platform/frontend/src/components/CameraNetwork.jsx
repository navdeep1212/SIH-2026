import React, { useState, useEffect } from 'react';
import { getCameras, createCamera } from '../services/api';

export default function CameraNetwork() {
  const [cameras, setCameras] = useState([
    {
      camera_id: 'CAM_01',
      name: 'NH48 Highway North (KM 24.2)',
      latitude: 28.4595,
      longitude: 77.0266,
      status: 'active'
    },
    {
      camera_id: 'CAM_02',
      name: 'Expressway Toll Plaza Gate 4',
      latitude: 28.4089,
      longitude: 76.9904,
      status: 'active'
    },
    {
      camera_id: 'CAM_03',
      name: 'City Center Ring Junction 04',
      latitude: 28.4721,
      longitude: 77.0812,
      status: 'active'
    },
    {
      camera_id: 'CAM_04',
      name: 'Ring Road South Bypass Interchange',
      latitude: 28.3842,
      longitude: 76.9721,
      status: 'active'
    }
  ]);

  const [cameraId, setCameraId] = useState('');
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchCameras = async () => {
    try {
      const data = await getCameras();
      if (data && Array.isArray(data) && data.length > 0) {
        setCameras(data);
      }
    } catch {
      // Keep defaults
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleAddCamera = async (e) => {
    e.preventDefault();
    if (!cameraId.trim() || !name.trim()) return;

    setLoading(true);
    const newCam = {
      camera_id: cameraId.trim().toUpperCase(),
      name: name.trim(),
      latitude: parseFloat(latitude) || 28.4595,
      longitude: parseFloat(longitude) || 77.0266,
      status: 'active'
    };

    try {
      const saved = await createCamera(newCam);
      setCameras(prev => [...prev, saved]);
      setMsg({ type: 'success', text: `Camera node ${newCam.camera_id} registered successfully!` });
    } catch {
      setCameras(prev => [...prev, newCam]);
      setMsg({ type: 'success', text: `Camera node ${newCam.camera_id} registered locally!` });
    }

    setCameraId('');
    setName('');
    setLatitude('');
    setLongitude('');
    setLoading(false);
    setTimeout(() => setMsg(null), 4000);
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
            <h2 className="text-xl font-bold text-text-primary tracking-wide">
              CAMERA NETWORK TOPOLOGY &amp; NODES
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Municipal surveillance nodes, geospatial coordinates, and edge pipeline telemetry
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-status-green">
          <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
          <span>{cameras.length} NODES CONNECTED</span>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-status-green/10 border border-status-green/40 text-status-green rounded-xl text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-bg-card border border-border-main rounded-2xl p-6 shadow-xl h-fit">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-main">
            <span className="material-symbols-outlined text-primary text-[18px]">add</span>
            <h3 className="font-bold text-sm text-text-primary">Register New Node</h3>
          </div>

          <form onSubmit={handleAddCamera} className="space-y-3 text-xs">
            <div>
              <label className="block text-text-secondary mb-1 uppercase">Camera ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. CAM_05"
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1 uppercase">Node Location / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cyber City Metro Cross"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-text-secondary mb-1 uppercase">Latitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="28.4595"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary"
                />
              </div>
              <div>
                <label className="block text-text-secondary mb-1 uppercase">Longitude</label>
                <input
                  type="number"
                  step="any"
                  placeholder="77.0266"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl bg-primary text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[16px]">add</span> Register Node
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 bg-bg-card border border-border-main rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-text-primary">Configured Camera Nodes</h3>
            <span className="text-xs text-text-secondary font-mono">Syncing with `/api/cameras`</span>
          </div>

          <div className="space-y-3">
            {cameras.map((cam) => (
              <div
                key={cam.camera_id}
                className="bg-bg-sidebar border border-border-main hover:border-primary/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    <span className="material-symbols-outlined text-[20px]">videocam</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{cam.camera_id}</span>
                      <span className="text-text-secondary">•</span>
                      <span className="text-xs font-medium text-text-secondary">{cam.name}</span>
                    </div>
                    <div className="text-[11px] text-text-secondary/70 mt-1 flex items-center gap-3">
                      <span>Coordinates: <strong className="text-text-primary">{cam.latitude}° N, {cam.longitude}° E</strong></span>
                      <span>Protocol: RTSP / H.264</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-status-green/10 text-status-green border border-status-green/30 px-2.5 py-1 rounded flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-green animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

