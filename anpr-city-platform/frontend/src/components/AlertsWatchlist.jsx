import React, { useState, useEffect } from 'react';

export default function AlertsWatchlist({ onTrackPlate }) {
  const [blacklist, setBlacklist] = useState([
    {
      _id: 'bl-1',
      plate_number: 'UP 16 BT 9921',
      reason: 'Suspected stolen commercial cargo vehicle (FIR #492/2026)',
      added_by: 'Highway Patrol HQ',
      createdAt: '2026-09-10'
    },
    {
      _id: 'bl-2',
      plate_number: 'DL 08 CZ 4099',
      reason: 'Repeated toll evasion & fake registration tag',
      added_by: 'Toll Authority',
      createdAt: '2026-09-08'
    },
    {
      _id: 'bl-3',
      plate_number: 'HR 55 AX 1022',
      reason: 'Hit and run incident Sector 29',
      added_by: 'City Police Dispatch',
      createdAt: '2026-09-05'
    }
  ]);

  const [newPlate, setNewPlate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchBlacklist = async () => {
    try {
      const res = await fetch('/api/blacklist');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data) && data.length > 0) {
          setBlacklist(data);
        }
      }
    } catch {
      // Keep initial entries
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAddBlacklist = async (e) => {
    e.preventDefault();
    if (!newPlate.trim()) return;

    setLoading(true);
    const cleanPlate = newPlate.trim().toUpperCase();
    const reasonText = newReason.trim() || 'Flagged by Operator';

    try {
      const res = await fetch('/api/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plate_number: cleanPlate,
          reason: reasonText,
          added_by: 'Cmdr. Alex Vance'
        })
      });

      if (res.ok) {
        const saved = await res.json();
        setBlacklist(prev => [saved, ...prev]);
        setMsg({ type: 'success', text: `Plate ${cleanPlate} added to Watchlist successfully!` });
      } else {
        const localEntry = {
          _id: `bl-local-${Date.now()}`,
          plate_number: cleanPlate,
          reason: reasonText,
          added_by: 'Cmdr. Alex Vance',
          createdAt: new Date().toISOString()
        };
        setBlacklist(prev => [localEntry, ...prev]);
        setMsg({ type: 'success', text: `Plate ${cleanPlate} added to Local Watchlist!` });
      }
    } catch {
      const localEntry = {
        _id: `bl-local-${Date.now()}`,
        plate_number: cleanPlate,
        reason: reasonText,
        added_by: 'Cmdr. Alex Vance',
        createdAt: new Date().toISOString()
      };
      setBlacklist(prev => [localEntry, ...prev]);
      setMsg({ type: 'success', text: `Plate ${cleanPlate} added to Local Watchlist!` });
    }

    setNewPlate('');
    setNewReason('');
    setLoading(false);
    setTimeout(() => setMsg(null), 4000);
  };

  const handleRemove = (id) => {
    setBlacklist(prev => prev.filter(b => b._id !== id));
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-400 text-[24px]">warning</span>
            <h2 className="text-xl font-bold text-text-primary tracking-wide">
              SECURITY ALERTS &amp; WATCHLIST
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Hotlist enforcement database and automated blacklist intercept dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
          <span className="text-orange-400 font-bold">{blacklist.length} PLATES WATCHED</span>
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
            <h3 className="font-bold text-sm text-text-primary">Add Target to Watchlist</h3>
          </div>

          <form onSubmit={handleAddBlacklist} className="space-y-4 text-xs">
            <div>
              <label className="block text-text-secondary mb-1 uppercase">License Plate *</label>
              <input
                type="text"
                required
                placeholder="e.g. DL 01 AB 9999"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-text-secondary mb-1 uppercase">Flag Reason *</label>
              <textarea
                rows="3"
                required
                placeholder="Specify offense or reason (stolen, toll evasion, suspect)..."
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full bg-bg-sidebar border border-border-main focus:border-primary rounded-lg px-3 py-2 text-text-primary font-sans"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-orange-500 text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <span className="material-symbols-outlined text-[16px]">shield</span> Add to Watchlist
            </button>
          </form>
        </div>

        <div className="lg:col-span-8 bg-bg-card border border-border-main rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-text-primary">Active Blacklist Records</h3>
            <span className="text-xs text-text-secondary font-mono">Syncing with `/api/blacklist`</span>
          </div>

          <div className="space-y-3">
            {blacklist.map((item) => (
              <div
                key={item._id}
                className="bg-bg-sidebar border border-border-main hover:border-orange-500/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-orange-400 tracking-wider">
                      {item.plate_number}
                    </span>
                    <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-bold">
                      ACTIVE HOTLIST
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 font-sans">{item.reason}</p>
                  <div className="text-[11px] text-text-secondary/70 mt-1">
                    Added by: {item.added_by || 'HQ'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onTrackPlate && (
                    <button
                      onClick={() => onTrackPlate(item.plate_number)}
                      className="px-3 py-1.5 rounded-lg bg-bg-card border border-border-main hover:border-primary text-text-primary hover:text-primary text-xs flex items-center gap-1.5 transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">search</span> Track
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(item._id)}
                    className="p-1.5 rounded-lg bg-bg-card border border-border-main hover:border-red-500 text-text-secondary hover:text-red-400 transition-all"
                    title="Remove from Watchlist"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

