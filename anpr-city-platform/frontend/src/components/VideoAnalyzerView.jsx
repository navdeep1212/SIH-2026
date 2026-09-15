import React, { useState, useEffect, useRef } from 'react';
import { processVideo, getCameras } from '../services/api';

const VEHICLE_TYPE_ICONS = {
  sedan: 'directions_car',
  suv: 'airport_shuttle',
  bus: 'directions_bus',
  truck: 'local_shipping',
  motorcycle: 'two_wheeler',
  unknown: 'directions_car'
};

const COLOR_HEX_MAP = {
  white: '#F8FAFC',
  black: '#1E293B',
  silver: '#94A3B8',
  gray: '#64748B',
  red: '#EF4444',
  blue: '#3B82F6',
  yellow: '#EAB308',
  green: '#22C55E',
  orange: '#F97316',
  brown: '#854D0E',
  unknown: '#475569'
};

export default function VideoAnalyzerView({ setIsProcessingParent }) {
  // Processing & API State
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamId, setSelectedCamId] = useState('CAM_01');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);

  // Real Detection Events returned by backend (PHASE 2 & 3)
  const [realEvents, setRealEvents] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(14);
  const videoRef = useRef(null);

  // Review status states
  const [reviewStatuses, setReviewStatuses] = useState({});

  useEffect(() => {
    // Fetch registered cameras to populate camera select dropdown
    getCameras()
      .then((cams) => {
        setCameras(cams);
        if (cams.length > 0) {
          setSelectedCamId(cams[0].camera_id);
        }
      })
      .catch((err) => console.warn('Could not load camera list:', err));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFilePreviewUrl(URL.createObjectURL(file));
      setRealEvents(null);
      setProcessingError(null);
      setSelectedEvent(null);
    }
  };

  const handleUploadAndProcess = async (e) => {
    if (e) e.preventDefault();
    if (!selectedFile) {
      setProcessingError('Please select a video file first (e.g. test1.mp4)');
      return;
    }

    setIsProcessing(true);
    if (setIsProcessingParent) setIsProcessingParent(true);
    setProcessingError(null);

    try {
      // POST http://localhost:5000/api/videos/process
      const events = await processVideo(selectedFile, selectedCamId);
      console.log('Video processing successful! Returned events:', events);
      setRealEvents(events);
      if (events.length > 0) {
        setSelectedEvent(events[0]);
      }
    } catch (err) {
      console.error('Processing failed:', err);
      setProcessingError(err.message || 'Failed to process video');
    } finally {
      setIsProcessing(false);
      if (setIsProcessingParent) setIsProcessingParent(false);
    }
  };

  // Helper formatting for timestamps
  const formatTs = (ts) => {
    if (!ts) return '00:00:00';
    if (typeof ts === 'string') {
      if (ts.includes('T')) {
        const d = new Date(ts);
        return d.toTimeString().split(' ')[0];
      }
      return ts;
    }
    if (ts instanceof Date) return ts.toTimeString().split(' ')[0];
    return String(ts);
  };

  // Filter low confidence events (<85% or <0.85) for operator review section
  const reviewCandidates = (realEvents || []).filter((evt) => {
    const confVal = typeof evt.confidence === 'number' ? evt.confidence : parseFloat(evt.confidence || '1');
    const pct = confVal <= 1 ? confVal * 100 : confVal;
    return pct < 85;
  });

  return (
    <div className="flex flex-col w-full px-space-lg pb-space-2xl space-y-space-xl">
      {/* Header & File Metadata Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-md">
        <div className="flex items-center gap-space-md">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-ping"></span>
          <h2 className="text-display-lg font-display-lg text-on-surface tracking-tight font-bold">Analysis Results</h2>
        </div>

        {/* Video Upload & Processing Control Bar (PHASE 2) */}
        <div className="flex flex-wrap items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-xl border border-outline-variant/20 shadow-md">
          <label className="cursor-pointer flex items-center gap-space-xs text-body-sm font-mono text-primary bg-primary-container/15 border border-primary-container/30 px-3 py-1.5 rounded-lg hover:bg-primary-container/25 transition-all">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span className="font-bold">{selectedFile ? selectedFile.name : 'Select Video File (test1.mp4)'}</span>
            <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
          </label>

          <select
            className="bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-body-sm font-mono text-on-surface focus:outline-none focus:border-primary-container"
            value={selectedCamId}
            onChange={(e) => setSelectedCamId(e.target.value)}
          >
            {cameras.length > 0 ? (
              cameras.map((cam) => (
                <option key={cam.camera_id} value={cam.camera_id}>
                  {cam.camera_id} - {cam.name}
                </option>
              ))
            ) : (
              <option value="CAM_01">CAM_01 (Default)</option>
            )}
          </select>

          <button
            onClick={handleUploadAndProcess}
            disabled={!selectedFile || isProcessing}
            className="px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary-container text-body-sm font-bold font-mono hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-primary-container/20 transition-all"
          >
            {isProcessing ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Processing Video...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">play_circle</span>
                <span>Run Process Video</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active AI Processing Banner */}
      {isProcessing && (
        <div className="p-4 rounded-xl bg-primary-container/10 border border-primary-container/30 text-primary font-mono text-body-sm flex items-center gap-3 shadow-lg shadow-primary-container/5">
          <span className="material-symbols-outlined text-[24px] animate-spin text-primary-container">sync</span>
          <div className="flex-1">
            <span className="font-bold text-on-surface">AI Pipeline In Progress: </span>
            <span className="text-outline">
              Analyzing frames, executing YOLOv8 detection & EasyOCR plate recognition. Please wait...
            </span>
          </div>
        </div>
      )}

      {/* Processing Error Notice */}
      {processingError && (
        <div className="p-4 rounded-xl bg-error/15 border border-error/30 text-error font-mono text-body-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-[24px]">warning</span>
          <div className="flex-1">
            <span className="font-bold">Video Processing Error: </span>
            {processingError}
          </div>
        </div>
      )}

      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-md">
        {/* Card 1 */}
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container border border-outline-variant/20 card-glow-hover cursor-pointer transition-all">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono">Total Vehicles</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-sm font-mono">
            <span className="text-headline-lg font-headline-lg text-on-surface font-bold">
              {realEvents ? realEvents.length : 47}
            </span>
            <span className="text-label-sm text-primary-fixed flex items-center">↑ Real Data</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container border border-outline-variant/20 card-glow-hover cursor-pointer transition-all">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono">Unique Plates</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-sm font-mono">
            <span className="text-headline-lg font-headline-lg text-on-surface font-bold">
              {realEvents ? new Set(realEvents.map((e) => e.plate_number)).size : 43}
            </span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container border border-outline-variant/20 card-glow-hover cursor-pointer transition-all">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono">Plate Read Rate</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-primary-container font-mono">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>ONLINE
            </span>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-sm font-mono">
            <span className="text-headline-lg font-headline-lg text-primary-fixed font-bold">91.5%</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container border border-outline-variant/20 card-glow-hover cursor-pointer transition-all">
          <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono">Avg OCR Conf</span>
          <div className="flex items-baseline gap-space-xs mt-space-sm font-mono">
            <span className="text-headline-lg font-headline-lg text-on-surface font-bold">
              {realEvents && realEvents.length > 0
                ? (
                    (realEvents.reduce((acc, curr) => acc + (curr.confidence || 0), 0) / realEvents.length) *
                    (realEvents[0].confidence <= 1 ? 100 : 1)
                  ).toFixed(1) + '%'
                : '94.2%'}
            </span>
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container border border-outline-variant/20 card-glow-hover cursor-pointer transition-all">
          <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono">Camera Stream</span>
          <div className="flex items-baseline gap-space-xs mt-space-sm font-mono">
            <span className="text-headline-lg font-headline-lg text-on-surface font-bold">{selectedCamId}</span>
          </div>
        </div>

        {/* Card 6 */}
        <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col justify-between relative overflow-hidden group hover:bg-surface-container border border-outline-variant/20 card-glow-hover cursor-pointer transition-all">
          <div className="flex items-center justify-between">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono">Processing Time</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
          </div>
          <div className="flex items-baseline gap-space-xs mt-space-sm font-mono">
            <span className="text-headline-lg font-headline-lg font-mono text-on-surface font-bold">01:24</span>
          </div>
        </div>
      </div>

      {/* Main Layout: Video Player + Selected Vehicle Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Large Video Player (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col bg-surface-container-low rounded-xl overflow-hidden shadow-xl border border-outline-variant/20">
          <div className="relative w-full aspect-video bg-surface-container-lowest flex items-center justify-center overflow-hidden group" id="video-screen-viewport">
            <div className="hud-scanline"></div>

            {/* Render actual uploaded video if available, or fallback UI preview */}
            {filePreviewUrl ? (
              <video
                ref={videoRef}
                src={filePreviewUrl}
                controls
                className="w-full h-full object-contain"
                onTimeUpdate={(e) => setCurrentTime(Math.floor(e.target.currentTime))}
              />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAhQzoFSaUXZMHpMdEAiWEOH71VKKOznQVZptHxDGCc5zRfoEqcsqbAi5AbH3IP_9TaWbnlTqMpZZBpQFWWb8yfxw-dliF44sU_9jGLh37FbBTwqvhQOFN0ZPbfkUJ6BMPGkm0gJfV37RsTCvKesxq8nYDA5bxx6z2YCs66boGEiwV0Vn1FI_RWj2GATe5VOU6jO-fr_Zp_BoeEYyNN5urEv9bDe7AHUZc_6xR4bPEo8RtuMEOBT-HG3g')",
                }}
              >
                {/* HUD Overlay for sample bounding box */}
                <div className="absolute top-[35%] left-[42%] w-[220px] h-[130px] border-2 border-primary-container bg-primary-container/15 rounded hud-reticle-active flex flex-col justify-between p-1.5 z-30">
                  <div className="hud-corner hud-corner-tl"></div>
                  <div className="hud-corner hud-corner-tr"></div>
                  <div className="hud-corner hud-corner-bl"></div>
                  <div className="hud-corner hud-corner-br"></div>
                  <div className="flex items-center justify-between bg-surface/90 backdrop-blur-md px-1.5 py-0.5 rounded text-label-sm font-mono text-primary-container border border-primary-container/40">
                    <span className="flex items-center gap-1 font-bold">
                      <span>●</span> {selectedEvent ? selectedEvent.plate_number : 'DL 01 AB 1234'}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>
                  </div>
                  <div className="self-center mb-1 border border-primary bg-surface/90 backdrop-blur-md px-2.5 py-0.5 rounded text-label-sm font-mono text-primary font-bold shadow-md">
                    {selectedEvent ? selectedEvent.plate_number : 'DL 01 AB 1234'}
                  </div>
                </div>
              </div>
            )}

            {/* Top Left Telemetry Overlay */}
            <div className="absolute top-4 left-4 bg-surface/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-outline-variant/30 flex items-center gap-2 z-20 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
              <span className="text-label-sm font-mono text-on-surface tracking-wider font-medium">
                LIVE STREAM // CAM: <span className="text-primary-fixed">{selectedCamId}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Selected Vehicle Inspector Panel (PHASE 3) */}
        <div className="lg:col-span-4 flex flex-col bg-surface-container-low rounded-xl p-space-lg justify-between shadow-xl border border-outline-variant/20">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary-container text-[22px] animate-pulse">directions_car</span>
                <h3 className="text-headline-sm font-headline-sm text-on-surface font-semibold">Selected Detection</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-label-sm font-mono bg-primary-container/15 text-primary border border-primary-container/40 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                {selectedEvent?.matched_format ? 'VERIFIED FORMAT' : 'DETECTED'}
              </span>
            </div>

            {/* Details List displaying Phase 3 required fields */}
            <div className="space-y-space-sm font-mono text-body-sm">
              <div className="flex justify-between py-1.5 border-b border-surface-container-high">
                <span className="text-outline">PLATE TEXT</span>
                <span className="text-primary-fixed font-bold text-base tracking-wider">
                  {selectedEvent ? selectedEvent.plate_number : 'DL 01 AB 1234'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container-high">
                <span className="text-outline">VEHICLE TYPE</span>
                <span className="text-on-surface font-bold capitalize flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    {VEHICLE_TYPE_ICONS[selectedEvent?.vehicle_type || 'sedan'] || 'directions_car'}
                  </span>
                  {selectedEvent?.vehicle_type || 'Sedan'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container-high">
                <span className="text-outline">VEHICLE COLOR</span>
                <span className="text-on-surface font-bold capitalize flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border border-white/20 inline-block shadow-sm"
                    style={{ backgroundColor: COLOR_HEX_MAP[selectedEvent?.vehicle_color || 'white'] || '#94A3B8' }}
                  ></span>
                  {selectedEvent?.vehicle_color || 'White'}
                  {selectedEvent?.color_confidence ? (
                    <span className="text-[10px] text-outline font-normal">
                      ({(selectedEvent.color_confidence * 100).toFixed(0)}%)
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container-high">
                <span className="text-outline">CONFIDENCE</span>
                <span className="text-primary-container font-bold">
                  {selectedEvent
                    ? typeof selectedEvent.confidence === 'number'
                      ? selectedEvent.confidence <= 1
                        ? (selectedEvent.confidence * 100).toFixed(1) + '%'
                        : selectedEvent.confidence.toFixed(1) + '%'
                      : selectedEvent.confidence
                    : '98.4%'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container-high">
                <span className="text-outline">CAMERA ID</span>
                <span className="text-on-surface font-bold">{selectedEvent ? selectedEvent.camera_id : selectedCamId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container-high">
                <span className="text-outline">FIRST SEEN</span>
                <span className="text-on-surface">{selectedEvent ? formatTs(selectedEvent.timestamp) : '00:01:12'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-container-high">
                <span className="text-outline">MATCHED FORMAT</span>
                <span className={`font-bold ${selectedEvent?.matched_format ? 'text-primary' : 'text-outline'}`}>
                  {selectedEvent ? (selectedEvent.matched_format ? 'TRUE (Valid Pattern)' : 'FALSE') : 'TRUE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detection Results Table (PHASE 3) */}
      <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md shadow-xl border border-outline-variant/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
          <div>
            <h3 className="text-headline-md font-headline-md text-on-surface font-bold">
              Detected Vehicles {realEvents ? `(${realEvents.length} Returned Events)` : '(Sample Entries)'}
            </h3>
            <p className="text-body-sm text-outline font-mono">
              Displaying plate_text, confidence, camera_id, first_seen, matched_format
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high text-label-sm font-mono text-outline uppercase tracking-wider">
                <th className="py-3 px-4">Plate Text</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Color</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Camera ID</th>
                <th className="py-3 px-4">First Seen</th>
                <th className="py-3 px-4">Format Match</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high text-body-sm font-mono">
              {realEvents && realEvents.length > 0 ? (
                realEvents.map((evt, idx) => {
                  const confVal = typeof evt.confidence === 'number' ? evt.confidence : parseFloat(evt.confidence || '0');
                  const confPct = confVal <= 1 ? (confVal * 100).toFixed(1) : confVal.toFixed(1);
                  const isSelected = selectedEvent?._id === evt._id || selectedEvent?.plate_number === evt.plate_number;

                  return (
                    <tr
                      key={evt._id || idx}
                      onClick={() => setSelectedEvent(evt)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary-container/15 border-l-4 border-primary-container'
                          : 'hover:bg-surface-container'
                      }`}
                    >
                      <td className="py-3 px-4 text-primary-fixed font-bold tracking-wider">{evt.plate_number}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-xs font-bold capitalize text-on-surface">
                          <span className="material-symbols-outlined text-[15px] text-primary">
                            {VEHICLE_TYPE_ICONS[evt.vehicle_type || 'sedan'] || 'directions_car'}
                          </span>
                          {evt.vehicle_type || 'Sedan'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-mono capitalize text-on-surface">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block shadow-sm"
                            style={{ backgroundColor: COLOR_HEX_MAP[evt.vehicle_color || 'white'] || '#94A3B8' }}
                          ></span>
                          {evt.vehicle_color || 'White'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-primary">{confPct}%</td>
                      <td className="py-3 px-4 text-on-surface">{evt.camera_id || selectedCamId}</td>
                      <td className="py-3 px-4 text-outline">{formatTs(evt.timestamp)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-label-sm font-bold ${
                            evt.matched_format
                              ? 'bg-primary-container/15 text-primary border border-primary-container/30'
                              : 'bg-surface-container-high text-outline'
                          }`}
                        >
                          {evt.matched_format ? 'MATCHED' : 'UNMATCHED'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                          className="px-2.5 py-1 rounded bg-surface-container-high text-xs text-primary hover:bg-primary-container hover:text-on-primary-container transition-colors font-bold"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <>
                  <tr className="hover:bg-surface-container transition-colors cursor-pointer">
                    <td className="py-3 px-4 text-primary-fixed font-bold tracking-wider">DL 01 AB 1234</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-xs font-bold capitalize text-on-surface">
                        <span className="material-symbols-outlined text-[15px] text-primary">directions_car</span>
                        Sedan
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono capitalize text-on-surface">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-white/20 inline-block"></span>
                        White
                      </span>
                    </td>
                    <td className="py-3 px-4 text-primary font-bold">98.4%</td>
                    <td className="py-3 px-4 text-on-surface">{selectedCamId}</td>
                    <td className="py-3 px-4 text-outline">00:01:12</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-label-sm bg-primary-container/15 text-primary border border-primary-container/30 font-bold">
                        MATCHED
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-outline text-xs">Run process above to see real detection events</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container transition-colors cursor-pointer">
                    <td className="py-3 px-4 text-primary-fixed font-bold tracking-wider">MH 12 DE 5678</td>
                     <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high text-xs font-bold capitalize text-on-surface">
                        <span className="material-symbols-outlined text-[15px] text-primary">directions_car</span>
                        Sedan
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono capitalize text-on-surface">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-white/20 inline-block"></span>
                        White
                      </span>
                    </td>
                    <td className="py-3 px-4 text-primary font-bold">95.1%</td>
                    <td className="py-3 px-4 text-on-surface">{selectedCamId}</td>
                    <td className="py-3 px-4 text-outline">00:01:05</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-label-sm bg-primary-container/15 text-primary border border-primary-container/30 font-bold">
                        MATCHED
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-outline text-xs">Run process above to see real detection events</span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Section for Low OCR Confidence Candidates */}
      {reviewCandidates.length > 0 && (
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-md shadow-xl border border-error/30">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-error/15 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
            <div>
              <h3 className="text-headline-md font-headline-md text-on-surface font-bold">Requires Review (Low OCR Confidence &lt;85%)</h3>
              <p className="text-body-sm text-outline font-mono">{reviewCandidates.length} candidate items pending operator confirmation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {reviewCandidates.map((candidate, idx) => {
              const status = reviewStatuses[candidate._id || idx] || 'PENDING';
              return (
                <div key={candidate._id || idx} className="bg-surface-container p-space-md rounded-xl flex flex-col gap-space-md border border-error/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-label-sm font-mono text-error font-bold">
                        CONFIDENCE: {(candidate.confidence <= 1 ? candidate.confidence * 100 : candidate.confidence).toFixed(1)}%
                      </span>
                      <div className="text-headline-sm font-headline-sm text-on-surface font-mono font-bold tracking-wider">
                        {candidate.plate_number}
                      </div>
                      <span className="text-body-sm text-outline font-mono">Camera: {candidate.camera_id || selectedCamId}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-label-sm font-mono bg-error/15 text-error border border-error/30 font-bold">
                      {status}
                    </span>
                  </div>

                  <div className="flex items-center gap-space-xs pt-1">
                    <button
                      onClick={() => setReviewStatuses({ ...reviewStatuses, [candidate._id || idx]: 'CONFIRMED' })}
                      className="flex-1 py-2 px-3 rounded-lg bg-primary-container text-on-primary-container font-bold text-body-sm hover:brightness-110"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setReviewStatuses({ ...reviewStatuses, [candidate._id || idx]: 'REJECTED' })}
                      className="flex-1 py-2 px-3 rounded-lg bg-error/20 text-error border border-error/40 font-bold text-body-sm hover:bg-error hover:text-on-error"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
