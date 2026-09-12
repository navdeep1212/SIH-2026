import React, { useState, useEffect } from 'react';
import { getDetectionEvents } from '../services/api';

export default function TrajectorySearchView({ initialPlateQuery }) {
  const [searchPlate, setSearchPlate] = useState(initialPlateQuery || '');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialPlateQuery) {
      setSearchPlate(initialPlateQuery);
      performSearch(initialPlateQuery);
    } else {
      // Load latest detection events by default
      performSearch('');
    }
  }, [initialPlateQuery]);

  const performSearch = async (plateQuery) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      // GET /api/events?plate=PLATE_NUMBER
      const data = await getDetectionEvents(plateQuery.trim());
      // Sort chronologically
      data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      setEvents(data);
    } catch (err) {
      console.error('Failed to search events trajectory:', err);
      setError(err.message || 'Failed to search events');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(searchPlate);
  };

  const formatTime = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString();
  };

  return (
    <div className="flex flex-col w-full p-space-lg space-y-space-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md pt-space-md">
        <div>
          <h2 className="text-display-lg font-display-lg text-on-surface font-bold">Plate Trajectory Search</h2>
          <p className="text-body-sm text-outline font-mono mt-1">
            Chronological multi-camera trajectory mapping via GET /api/events?plate=PLATE_NUMBER
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-space-md bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20 shadow-lg">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-3 text-outline text-[20px]">search</span>
          <input
            type="text"
            className="w-full bg-surface-container border border-outline-variant rounded-lg pl-10 pr-4 py-2 text-body-md text-on-surface font-mono focus:outline-none focus:border-primary-container"
            placeholder="Enter license plate number (e.g. DL 01 AB 1234)..."
            value={searchPlate}
            onChange={(e) => setSearchPlate(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-space-xl py-2 bg-primary-container text-on-primary-container font-bold font-mono rounded-lg hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">location_searching</span>
          )}
          <span>Search Trajectory</span>
        </button>
      </form>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-error/15 text-error font-mono text-body-sm border border-error/30 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-outline font-mono space-y-2">
          <span className="material-symbols-outlined text-[32px] text-primary-container animate-spin">sync</span>
          <span>Querying MongoDB detection events for trajectory...</span>
        </div>
      )}

      {/* Chronological Trajectory Results Timeline */}
      {!loading && hasSearched && (
        <div className="bg-surface-container-low rounded-xl p-space-lg flex flex-col gap-space-lg shadow-xl border border-outline-variant/20">
          <div className="flex items-center justify-between border-b border-surface-container-high pb-space-md">
            <div>
              <h3 className="text-headline-md font-headline-md text-on-surface font-bold">
                Chronological Detection Trajectory
              </h3>
              <p className="text-body-sm text-outline font-mono">
                Found {events.length} chronological sightings matching plate query "{searchPlate || 'ALL'}"
              </p>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center text-outline font-mono">
              No detection events recorded for plate "{searchPlate}" in MongoDB database.
            </div>
          ) : (
            <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary-container/40">
              {events.map((evt, idx) => (
                <div key={evt._id || idx} className="relative flex items-start gap-4 group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-primary-container border-2 border-surface shadow-[0_0_10px_rgba(0,242,254,0.8)] flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-surface"></span>
                  </div>

                  {/* Event Card */}
                  <div className="bg-surface-container p-space-md rounded-xl flex-1 border border-outline-variant/20 hover:border-primary-container/40 transition-all font-mono">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-container-high pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[18px]">videocam</span>
                        <span className="text-on-surface font-bold text-headline-sm">Camera: {evt.camera_id}</span>
                      </div>
                      <span className="text-label-sm text-primary-fixed bg-primary-container/10 px-2 py-0.5 rounded font-bold">
                        {formatTime(evt.timestamp)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-body-sm">
                      <div>
                        <span className="text-outline text-xs block">PLATE NUMBER</span>
                        <span className="text-primary-fixed font-bold tracking-wider">{evt.plate_number}</span>
                      </div>
                      <div>
                        <span className="text-outline text-xs block">OCR CONFIDENCE</span>
                        <span className="text-primary font-bold">
                          {typeof evt.confidence === 'number'
                            ? evt.confidence <= 1
                              ? (evt.confidence * 100).toFixed(1) + '%'
                              : evt.confidence.toFixed(1) + '%'
                            : evt.confidence}
                        </span>
                      </div>
                      <div>
                        <span className="text-outline text-xs block">FORMAT MATCHED</span>
                        <span className={`font-bold ${evt.matched_format ? 'text-primary' : 'text-outline'}`}>
                          {evt.matched_format ? 'TRUE' : 'FALSE'}
                        </span>
                      </div>
                      <div>
                        <span className="text-outline text-xs block">DATABASE ID</span>
                        <span className="text-xs text-outline font-mono truncate">{evt._id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
