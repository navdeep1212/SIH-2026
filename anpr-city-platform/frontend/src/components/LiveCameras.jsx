import React, { useState } from 'react';

export default function LiveCameras({ onInspectVehicle }) {
  const [selectedCam, setSelectedCam] = useState(null);

  const cameras = [
    {
      id: 'CAM_01',
      name: 'NH48 Expressway - Northbound (KM 24.2)',
      location: 'New Delhi - Gurugram Corridor',
      status: 'ONLINE',
      fps: 60,
      resolution: '1080p',
      bitrate: '8.4 Mbps',
      vehiclesNow: 18,
      latestPlate: 'DL 01 AB 1234',
      bgImg: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'CAM_02',
      name: 'Expressway Toll Plaza Gate 4',
      location: 'Kherki Daula Toll Gate',
      status: 'ONLINE',
      fps: 60,
      resolution: '4K',
      bitrate: '14.2 Mbps',
      vehiclesNow: 8,
      latestPlate: 'MH 12 DE 5678',
      bgImg: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'CAM_03',
      name: 'City Center Ring Junction 04',
      location: 'MG Road Metro Crossing',
      status: 'ONLINE',
      fps: 30,
      resolution: '1080p',
      bitrate: '6.1 Mbps',
      vehiclesNow: 27,
      latestPlate: 'HR 26 DK 8392',
      bgImg: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: 'CAM_04',
      name: 'Ring Road South Bypass Interchange',
      location: 'Sector 56 Outer Ring',
      status: 'ONLINE',
      fps: 60,
      resolution: '1080p',
      bitrate: '7.8 Mbps',
      vehiclesNow: 12,
      latestPlate: 'UP 16 BT 9921',
      isAlert: true,
      bgImg: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-status-green animate-pulse text-[22px]">sensors</span>
            <h2 className="text-xl font-bold font-mono text-text-primary tracking-wide">
              MUNICIPAL LIVE CAMERA FEEDS
            </h2>
            <span className="text-[10px] font-mono bg-status-green/10 text-status-green border border-status-green/30 px-2 py-0.5 rounded">
              4 CHANNELS ACTIVE
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-mono">
            Direct RTSP edge streams with real-time neural ANPR bounding overlays
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1 text-status-green">
            <span className="w-2 h-2 rounded-full bg-status-green"></span>
            <span>All Nodes Operational</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cameras.map((cam) => (
          <div
            key={cam.id}
            className="bg-bg-card border border-border-main hover:border-primary rounded-2xl overflow-hidden shadow-xl transition-all flex flex-col group"
          >
            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
              <div className="hud-scanline"></div>
              <img
                src={cam.bgImg}
                alt={cam.name}
                className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
              />

              <div className="absolute top-[40%] left-[30%] w-[160px] h-[90px] border border-primary bg-primary/10 rounded flex flex-col justify-between p-1 z-20">
                <div className="hud-corner hud-corner-tl"></div>
                <div className="hud-corner hud-corner-tr"></div>
                <div className="hud-corner hud-corner-bl"></div>
                <div className="hud-corner hud-corner-br"></div>
                <div className="text-[9px] font-mono bg-black/80 text-primary px-1 rounded self-start">
                  LIVE OCR: {cam.latestPlate}
                </div>
              </div>

              <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-xs font-mono z-20">
                <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-border-main flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-green animate-pulse"></span>
                  <span className="font-bold text-text-primary">{cam.id}</span>
                </div>

                <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-border-main flex items-center gap-2 text-text-secondary text-[11px]">
                  <span>{cam.resolution}</span>
                  <span>•</span>
                  <span>{cam.fps} FPS</span>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 bg-red-600/90 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded flex items-center gap-1 z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>REC // LIVE</span>
              </div>

              <button
                onClick={() => setSelectedCam(cam)}
                className="absolute bottom-3 right-3 p-1.5 rounded bg-black/70 hover:bg-primary text-text-secondary hover:text-black transition-all z-20"
                title="Expand Fullscreen"
              >
                <span className="material-symbols-outlined text-[18px]">fullscreen</span>
              </button>
            </div>

            <div className="p-4 flex items-center justify-between font-mono text-xs">
              <div>
                <h4 className="font-bold text-text-primary">{cam.name}</h4>
                <p className="text-[11px] text-text-secondary">{cam.location}</p>
              </div>

              <div className="text-right">
                <div className="text-primary font-bold cursor-pointer hover:underline" onClick={() => onInspectVehicle && onInspectVehicle(cam.latestPlate)}>
                  {cam.latestPlate}
                </div>
                <div className="text-[10px] text-text-secondary">Latest Sighting</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-bg-card border border-primary max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border-main font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-green animate-pulse"></span>
                <span className="font-bold text-text-primary text-sm">{selectedCam.name} ({selectedCam.id})</span>
              </div>
              <button
                onClick={() => setSelectedCam(null)}
                className="text-text-secondary hover:text-text-primary text-xs px-2 py-1 rounded bg-bg-sidebar border border-border-main"
              >
                Close (ESC)
              </button>
            </div>

            <div className="relative aspect-video bg-black">
              <div className="hud-scanline"></div>
              <img
                src={selectedCam.bgImg}
                alt={selectedCam.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 bg-bg-sidebar flex items-center justify-between text-xs font-mono text-text-secondary">
              <div>Location: <span className="text-text-primary">{selectedCam.location}</span></div>
              <div>Bitrate: <span className="text-primary">{selectedCam.bitrate}</span></div>
              <div>Vehicles in Frame: <span className="text-status-green font-bold">{selectedCam.vehiclesNow}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

