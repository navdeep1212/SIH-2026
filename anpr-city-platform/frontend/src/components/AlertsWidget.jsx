import React from 'react';

export default function AlertsWidget({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-3 max-w-md w-full pointer-events-auto">
      {alerts.map((alert, index) => (
        <div
          key={alert._id || index}
          className="bg-error-container/90 backdrop-blur-md text-on-error-container p-4 rounded-xl shadow-2xl border border-error/50 flex items-start justify-between animate-bounce"
        >
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[28px] text-error shrink-0 animate-pulse">warning</span>
            <div>
              <div className="font-bold text-headline-sm font-mono tracking-wider text-error">
                REAL-TIME BLACKLIST ALERT!
              </div>
              <div className="text-body-sm font-mono mt-1">
                Matched Blacklisted Vehicle Plate: <span className="font-bold underline">{alert.event_id?.plate_number || alert.plate_number || 'ALERT MATCH'}</span>
              </div>
              <div className="text-xs text-outline opacity-80 mt-1 font-mono">
                Event ID: {alert.event_id?._id || alert._id || 'LIVE_SOCKET_IO'}
              </div>
            </div>
          </div>
          <button
            onClick={() => onDismiss(index)}
            className="text-outline hover:text-on-surface p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
