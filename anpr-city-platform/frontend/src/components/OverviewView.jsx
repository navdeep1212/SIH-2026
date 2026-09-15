import React, { useState, useEffect } from 'react';
import { getCameras, createCamera } from '../services/api';

export default function OverviewView({ onOpenAnalyzer, onNavigate }) {
  const [cameras, setCameras] = useState([]);
  const [loadingCameras, setLoadingCameras] = useState(true);
  const [cameraError, setCameraError] = useState(null);

  // New Camera Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCamId, setNewCamId] = useState('');
  const [newCamName, setNewCamName] = useState('');
  const [newLat, setNewLat] = useState('28.6139');
  const [newLng, setNewLng] = useState('77.2090');
  const [addError, setAddError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCameraList();
  }, []);

  const fetchCameraList = async () => {
    setLoadingCameras(true);
    setCameraError(null);
    try {
      const data = await getCameras();
      setCameras(data);
    } catch (err) {
      console.error('Failed to load cameras from backend:', err);
      setCameraError(err.message || 'Failed to fetch camera list from http://localhost:5000/api/cameras');
    } finally {
      setLoadingCameras(false);
    }
  };

  const handleAddCamera = async (e) => {
    e.preventDefault();
    if (!newCamId || !newCamName) {
      setAddError('Camera ID and Name are required');
      return;
    }
    setAddError(null);
    setIsSubmitting(true);
    try {
      await createCamera({
        camera_id: newCamId.trim(),
        name: newCamName.trim(),
        latitude: parseFloat(newLat) || 0,
        longitude: parseFloat(newLng) || 0,
        status: 'active',
      });
      setShowAddModal(false);
      setNewCamId('');
      setNewCamName('');
      await fetchCameraList();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full p-space-lg space-y-space-2xl">
      {/* Top KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-md">
        {/* KPI 1 */}
        <div
          onClick={onOpenAnalyzer}
          className="bg-surface-container rounded-xl p-space-lg relative overflow-hidden flex flex-col justify-between group hover:bg-surface-container-high hover:border-primary-container/40 transition-all border border-outline-variant/10 cursor-pointer shadow-lg hover:shadow-primary-container/10"
          title="Click to Open Video Analyzer"
        >
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono group-hover:text-primary transition-colors">Videos Analyzed</span>
            <span className="material-symbols-outlined text-primary-fixed text-[20px] group-hover:scale-110 transition-transform">movie</span>
          </div>
          <div>
            <div className="text-display-lg font-display-xl text-on-surface font-mono group-hover:text-primary transition-colors">128</div>
            <div className="text-label-sm font-label-sm text-primary-fixed mt-1 flex items-center font-mono">
              <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span> +12% this week
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div
          onClick={() => onNavigate && onNavigate('vehicle-tracking')}
          className="bg-surface-container rounded-xl p-space-lg relative overflow-hidden flex flex-col justify-between group hover:bg-surface-container-high hover:border-secondary-container/40 transition-all border border-outline-variant/10 cursor-pointer shadow-lg hover:shadow-secondary-container/10"
          title="Click to View Vehicle Tracking"
        >
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono group-hover:text-secondary transition-colors">Vehicles Detected</span>
            <span className="material-symbols-outlined text-secondary text-[20px] group-hover:scale-110 transition-transform">directions_car</span>
          </div>
          <div>
            <div className="text-display-lg font-display-xl text-on-surface font-mono group-hover:text-secondary transition-colors">4,382</div>
            <div className="text-label-sm font-label-sm text-secondary mt-1 flex items-center font-mono">
              <span className="material-symbols-outlined text-[14px] mr-1">trending_up</span> +340 today
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div
          onClick={() => onNavigate && onNavigate('camera-network')}
          className="bg-surface-container rounded-xl p-space-lg relative overflow-hidden flex flex-col justify-between group hover:bg-surface-container-high hover:border-primary-container/40 transition-all border border-outline-variant/10 cursor-pointer shadow-lg hover:shadow-primary-container/10"
          title="Click to Open Camera Network"
        >
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono group-hover:text-primary transition-colors">Registered Cameras</span>
            <span className="material-symbols-outlined text-primary-fixed text-[20px] group-hover:scale-110 transition-transform">videocam</span>
          </div>
          <div>
            <div className="text-display-lg font-display-xl text-on-surface font-mono group-hover:text-primary transition-colors">
              {loadingCameras ? '...' : cameras.length}
            </div>
            <div className="text-label-sm font-label-sm text-primary-fixed mt-1 flex items-center font-mono">
              <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span> Live MongoDB Data
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => onNavigate && onNavigate('reports')}
          className="bg-surface-container rounded-xl p-space-lg relative overflow-hidden flex flex-col justify-between group hover:bg-surface-container-high hover:border-tertiary-fixed/40 transition-all border border-outline-variant/10 cursor-pointer shadow-lg hover:shadow-tertiary-fixed/10"
          title="Click to View Accuracy Reports"
        >
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono group-hover:text-primary transition-colors">Avg OCR Accuracy</span>
            <span className="material-symbols-outlined text-tertiary-fixed text-[20px] group-hover:scale-110 transition-transform">analytics</span>
          </div>
          <div>
            <div className="text-display-lg font-display-xl text-on-surface font-mono group-hover:text-primary transition-colors">94.2%</div>
            <div className="text-label-sm font-label-sm text-tertiary-fixed mt-1 flex items-center font-mono">
              <span className="material-symbols-outlined text-[14px] mr-1">verified</span> Optimal range
            </div>
          </div>
        </div>

        {/* KPI 5 */}
        <div
          onClick={onOpenAnalyzer}
          className="bg-surface-container rounded-xl p-space-lg relative overflow-hidden flex flex-col justify-between group hover:bg-surface-container-high hover:border-primary-container/40 transition-all border border-outline-variant/10 cursor-pointer shadow-lg"
          title="Click to Open Video Analyzer"
        >
          <div className="flex items-center justify-between mb-space-md">
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider font-mono">Processing Queue</span>
            <span className="material-symbols-outlined text-primary-fixed text-[20px]">sync</span>
          </div>
          <div>
            <div className="text-display-lg font-display-xl text-on-surface font-mono">0</div>
            <div className="text-label-sm font-label-sm text-outline mt-1 flex items-center font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container mr-1.5"></span> Systems Idle / Ready
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Quick Action & Real Cameras Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column: Quick Action Card & ML Model Status */}
        <div className="lg:col-span-4 flex flex-col space-y-space-lg">
          {/* Quick Action Card */}
          <div className="bg-gradient-to-br from-surface-container-high to-surface-container rounded-xl p-space-xl relative overflow-hidden flex flex-col justify-between group border border-outline-variant/20 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full text-label-sm font-label-sm bg-primary-container/20 text-primary mb-space-md font-mono">
                <span className="material-symbols-outlined text-[14px] mr-1">bolt</span> PHASE 1 CORE
              </div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface mb-space-sm font-semibold">Launch Video Analyzer</h2>
              <p className="text-body-md text-on-surface-variant mb-space-lg">
                Feed local or remote transport video streams into the neural ANPR engine for real-time plate extraction and telemetry mapping.
              </p>
            </div>
            <button
              onClick={onOpenAnalyzer}
              className="inline-flex items-center justify-between px-space-lg py-space-md rounded-lg bg-primary-container text-on-primary-container font-headline-sm hover:brightness-110 transition-all shadow-lg shadow-primary-container/20 font-bold"
            >
              <span>Open Analyzer Module</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>

          {/* ML Model Status */}
          <div className="bg-surface-container rounded-xl p-space-lg flex flex-col space-y-space-md border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <span className="text-headline-sm font-headline-sm text-on-surface font-semibold">ML Model Status</span>
              <span className="text-label-sm font-label-sm text-primary-fixed font-mono">YOLOv8-ANPR</span>
            </div>
            <div className="space-y-space-sm">
              <div>
                <div className="flex justify-between text-body-sm mb-1 font-mono">
                  <span className="text-outline">GPU VRAM Allocation</span>
                  <span className="text-on-surface">6.4GB / 24GB (26%)</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full" style={{ width: '26%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-body-sm mb-1 font-mono">
                  <span className="text-outline">TensorRT Latency</span>
                  <span className="text-on-surface">14.2ms avg</span>
                </div>
                <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary h-full rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real Registered Cameras List (PHASE 1) */}
        <div className="lg:col-span-8 bg-surface-container rounded-xl p-space-lg flex flex-col border border-outline-variant/10 shadow-xl">
          <div className="flex items-center justify-between mb-space-lg">
            <div>
              <h2 className="text-headline-lg font-headline-lg text-on-surface font-semibold">Registered Cameras (MongoDB)</h2>
              <p className="text-body-sm text-outline mt-0.5 font-mono">Live feeds ingested via GET /api/cameras</p>
            </div>
            <div className="flex items-center gap-space-sm">
              <button
                onClick={fetchCameraList}
                className="px-space-md py-1.5 rounded-lg bg-surface-container-high text-on-surface text-body-sm hover:bg-surface-bright transition-colors flex items-center gap-2 font-mono"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary-container text-body-sm hover:brightness-110 transition-all font-bold flex items-center gap-1.5 font-mono"
              >
                <span className="material-symbols-outlined text-[18px]">add</span> Add Camera
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loadingCameras && (
            <div className="py-12 flex flex-col items-center justify-center text-outline font-mono space-y-2">
              <span className="material-symbols-outlined text-[32px] text-primary-container animate-spin">sync</span>
              <span>Fetching camera records from http://localhost:5000/api/cameras...</span>
            </div>
          )}

          {/* Error State */}
          {cameraError && !loadingCameras && (
            <div className="p-4 rounded-lg bg-error/10 border border-error/30 text-error text-body-sm font-mono flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] shrink-0">error</span>
              <div>
                <div className="font-bold">API Connection Error</div>
                <div className="text-xs opacity-90">{cameraError}</div>
                <button
                  onClick={fetchCameraList}
                  className="mt-2 px-3 py-1 bg-error/20 hover:bg-error/30 text-error text-xs rounded transition-colors font-bold"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* Camera List Table */}
          {!loadingCameras && !cameraError && (
            <div className="overflow-x-auto flex-1">
              {cameras.length === 0 ? (
                <div className="py-12 text-center text-outline font-mono">
                  No cameras registered in MongoDB yet. Click "Add Camera" above to register CAM_01.
                </div>
              ) : (
                <table className="w-full text-left border-collapse font-mono">
                  <thead>
                    <tr className="border-b border-surface-container-high text-label-sm text-outline uppercase tracking-wider">
                      <th className="py-3 px-4">Camera ID</th>
                      <th className="py-3 px-4">Location Name</th>
                      <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high/50 text-body-sm">
                    {cameras.map((cam) => (
                      <tr key={cam._id || cam.camera_id} className="hover:bg-surface-container-high/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-primary">{cam.camera_id}</td>
                        <td className="py-3.5 px-4 text-on-surface font-sans">{cam.name}</td>
                        <td className="py-3.5 px-4 text-outline text-xs">
                          {cam.latitude}, {cam.longitude}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-bold ${
                              cam.status === 'active'
                                ? 'bg-primary-container/15 text-primary border border-primary-container/30'
                                : 'bg-surface-container-high text-outline'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-container mr-1.5 animate-pulse"></span>
                            {cam.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-surface-dim/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-xl p-space-lg w-full max-w-md border border-outline-variant/30 shadow-2xl">
            <div className="flex items-center justify-between mb-space-md">
              <h3 className="text-headline-sm font-headline-sm text-on-surface font-bold">Register New Camera</h3>
              <button onClick={() => setShowAddModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {addError && (
              <div className="mb-4 p-2.5 bg-error/15 text-error rounded text-xs font-mono">{addError}</div>
            )}
            <form onSubmit={handleAddCamera} className="space-y-space-sm font-mono text-body-sm">
              <div>
                <label className="block text-outline text-xs mb-1">CAMERA ID (e.g. CAM_01)</label>
                <input
                  type="text"
                  required
                  className="w-full bg-surface-container-high border border-outline-variant rounded p-2 text-on-surface"
                  placeholder="CAM_01"
                  value={newCamId}
                  onChange={(e) => setNewCamId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-outline text-xs mb-1 font-sans">LOCATION NAME</label>
                <input
                  type="text"
                  required
                  className="w-full bg-surface-container-high border border-outline-variant rounded p-2 text-on-surface font-sans"
                  placeholder="NH48 Highway Toll Plaza"
                  value={newCamName}
                  onChange={(e) => setNewCamName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-outline text-xs mb-1">LATITUDE</label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-high border border-outline-variant rounded p-2 text-on-surface"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-outline text-xs mb-1">LONGITUDE</label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-high border border-outline-variant rounded p-2 text-on-surface"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-surface-container-high text-on-surface rounded hover:bg-surface-bright"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-container text-on-primary-container font-bold rounded hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
