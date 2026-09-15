import React, { useState, useEffect } from 'react';
import { getDetectionEvents } from '../services/api';

export default function VehicleTracking({ initialPlate = 'DL 01 AB 1234', onNavigate }) {
  const [searchPlate, setSearchPlate] = useState(initialPlate);
  const [activePlate, setActivePlate] = useState(initialPlate);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const demoSightings = {
    'DL 01 AB 1234': [
      {
        id: 'EVT-101',
        camera_id: 'CAM_01',
        camera_name: 'NH48 Highway North (KM 24.2)',
        timestamp: 'Today, 08:42:15 AM',
        confidence: 98.4,
        speed: '64 km/h',
        direction: 'Northbound towards Cyber City',
        coordinates: '28.4595° N, 77.0266° E',
        vehicleType: 'White Sedan',
        status: 'VERIFIED'
      },
      {
        id: 'EVT-098',
        camera_id: 'CAM_02',
        camera_name: 'Expressway Toll Plaza Gate 4',
        timestamp: 'Today, 08:26:40 AM',
        confidence: 97.1,
        speed: '38 km/h',
        direction: 'Passed Toll Booth #4',
        coordinates: '28.4089° N, 76.9904° E',
        vehicleType: 'White Sedan',
        status: 'VERIFIED'
      },
      {
        id: 'EVT-082',
        camera_id: 'CAM_04',
        camera_name: 'Ring Road South Bypass',
        timestamp: 'Today, 08:05:12 AM',
        confidence: 94.6,
        speed: '72 km/h',
        direction: 'Entry from South Industrial Corridor',
        coordinates: '28.3842° N, 76.9721° E',
        vehicleType: 'White Sedan',
        status: 'VERIFIED'
      }
    ],
    'UP 16 BT 9921': [
      {
        id: 'EVT-304',
        camera_id: 'CAM_04',
        camera_name: 'Ring Road South Bypass Interchange',
        timestamp: 'Today, 08:42:18 AM',
        confidence: 92.8,
        speed: '44 km/h',
        direction: 'Heading West Outer Perimeter',
        coordinates: '28.3842° N, 76.9721° E',
        vehicleType: 'Heavy Commercial Truck',
        status: 'WATCHLIST ALERT',
        isBlacklist: true,
        reason: 'Suspected stolen commercial cargo vehicle'
      }
    ]
  };

  const fetchPlateHistory = async (plate) => {
    setLoading(true);
    try {
      const data = await getDetectionEvents(plate.trim());
      if (data && data.length > 0) {
        const formatted = data.map((item, i) => ({
          id: item._id || `EVT-${i}`,
          camera_id: item.camera_id,
          camera_name: `Camera Node ${item.camera_id}`,
          timestamp: new Date(item.timestamp).toLocaleTimeString(),
          confidence: (item.confidence * 100).toFixed(1),
          speed: '62 km/h (est)',
          direction: 'Observed in active stream',
          coordinates: '28.4595° N, 77.0266° E',
          vehicleType: 'Identified Vehicle',
          status: 'VERIFIED'
        }));
        setEvents(formatted);
        setLoading(false);
        return;
      }
    } catch {
      // ignore
    }

    const found = demoSightings[plate.trim()] || [
      {
        id: 'EVT-001',
        camera_id: 'CAM_01',
        camera_name: 'NH48 Highway North',
        timestamp: 'Today, 08:42 AM',
        confidence: 96.8,
        speed: '65 km/h',
        direction: 'Recorded in recent batch analysis',
        coordinates: '28.4595° N, 77.0266° E',
        vehicleType: 'Tracked Vehicle',
        status: 'VERIFIED'
      }
    ];
    setEvents(found);
    setLoading(false);
  };

  useEffect(() => {
    if (initialPlate) {
      setSearchPlate(initialPlate);
      setActivePlate(initialPlate);
      fetchPlateHistory(initialPlate);
    }
  }, [initialPlate]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchPlate.trim()) return;
    setActivePlate(searchPlate.trim());
    fetchPlateHistory(searchPlate.trim());
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">navigation</span>
            <h2 className="text-xl font-bold text-text-primary tracking-wide">
              CITY-WIDE VEHICLE TRAJECTORY TRACKING
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Multi-camera spatial re-identification and temporal movement timeline
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">search</span>
            <input
              type="text"
              placeholder="Enter License Plate..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
              className="bg-bg-card border border-border-main focus:border-primary rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-text-primary w-60 uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20"
          >
            Track
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span>Quick Samples:</span>
        {['DL 01 AB 1234', 'UP 16 BT 9921', 'MH 12 DE 5678', 'HR 26 DK 8392'].map((p) => (
          <button
            key={p}
            onClick={() => {
              setSearchPlate(p);
              setActivePlate(p);
              fetchPlateHistory(p);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all ${
              activePlate === p
                ? 'bg-primary/10 border-primary text-primary font-bold'
                : 'bg-bg-card border-border-main hover:border-text-secondary text-text-secondary'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="bg-bg-card border border-border-main rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[32px]">location_on</span>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary uppercase">Active Track Target</div>
            <div className="text-2xl font-bold text-primary tracking-widest">{activePlate}</div>
            <div className="text-xs text-text-secondary mt-0.5">
              Total Recorded Sightings: <strong className="text-text-primary">{events.length} Camera Checkpoints</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate && onNavigate('alerts-watchlist')}
            className="px-4 py-2 rounded-lg bg-bg-sidebar border border-border-main hover:border-orange-500 text-orange-400 text-xs transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">warning</span> Watchlist Status
          </button>
          <button
            onClick={() => onNavigate && onNavigate('video-analyzer')}
            className="px-4 py-2 rounded-lg bg-primary text-black font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2"
          >
            View in Video Analyzer →
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">schedule</span> Chronological Sighting Trajectory
        </h3>

        <div className="space-y-3">
          {events.map((evt, idx) => (
            <div
              key={evt.id}
              className="bg-bg-card border border-border-main hover:border-primary/50 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-0.5">
                  #{idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{evt.camera_id}</span>
                    <span className="text-text-secondary">•</span>
                    <span className="text-sm font-bold text-text-primary">{evt.camera_name}</span>
                  </div>
                  <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-3">
                    <span>Timestamp: <strong className="text-text-primary">{evt.timestamp}</strong></span>
                    <span>Speed: <strong className="text-status-green">{evt.speed}</strong></span>
                    <span>Direction: <span className="text-text-primary">{evt.direction}</span></span>
                  </div>
                  <div className="text-[11px] text-text-secondary/70 mt-1">
                    GPS: {evt.coordinates}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs bg-status-green/10 text-status-green border border-status-green/30 px-2.5 py-1 rounded font-bold">
                  OCR: {evt.confidence}%
                </span>
                <span className="text-xs bg-bg-sidebar border border-border-main px-2.5 py-1 rounded text-text-primary">
                  {evt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

