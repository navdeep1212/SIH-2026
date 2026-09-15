import React from 'react';

export default function TrafficAnalytics() {
  const hourlyData = [
    { hour: '06 AM', count: 320, pct: 30 },
    { hour: '07 AM', count: 740, pct: 65 },
    { hour: '08 AM', count: 1420, pct: 100, peak: true },
    { hour: '09 AM', count: 1280, pct: 90 },
    { hour: '10 AM', count: 910, pct: 64 },
    { hour: '11 AM', count: 680, pct: 48 },
    { hour: '12 PM', count: 710, pct: 50 },
    { hour: '01 PM', count: 640, pct: 45 },
    { hour: '02 PM', count: 720, pct: 51 },
    { hour: '03 PM', count: 850, pct: 60 },
    { hour: '04 PM', count: 1120, pct: 79 },
    { hour: '05 PM', count: 1390, pct: 98, peak: true },
  ];

  const vehicleClasses = [
    { label: 'Sedans & Hatchbacks', pct: 48, count: '2,103', color: 'bg-primary' },
    { label: 'SUVs & Crossovers', pct: 28, count: '1,227', color: 'bg-primary-dark' },
    { label: 'Commercial Trucks', pct: 14, count: '613', color: 'bg-status-green' },
    { label: 'Buses & Transports', pct: 6, count: '263', color: 'bg-yellow-400' },
    { label: 'Two Wheelers', pct: 4, count: '176', color: 'bg-purple-400' },
  ];

  return (
    <div className="space-y-6 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">bar_chart</span>
            <h2 className="text-xl font-bold text-text-primary tracking-wide">
              MUNICIPAL TRAFFIC ANALYTICS &amp; DENSITY
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Aggregated traffic flow, congestion patterns, and classification profiles
          </p>
        </div>

        <div className="text-xs text-status-green flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">trending_up</span>
          <span>Optimal Flow Rate (+12% vs last week)</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container rounded-xl p-space-lg">
          <div className="text-[10px] text-outline uppercase font-mono">24h Vehicle Volume</div>
          <div className="text-2xl font-bold text-on-surface mt-1">14,892</div>
          <div className="text-[10px] text-primary-fixed mt-1">↑ +8.4% today</div>
        </div>
        <div className="bg-surface-container rounded-xl p-space-lg">
          <div className="text-[10px] text-outline uppercase font-mono">Peak Density Hour</div>
          <div className="text-2xl font-bold text-primary mt-1">08:00 - 09:00 AM</div>
          <div className="text-[10px] text-outline mt-1">1,420 vehicles/hr</div>
        </div>
        <div className="bg-surface-container rounded-xl p-space-lg">
          <div className="text-[10px] text-outline uppercase font-mono">Corridor Avg Speed</div>
          <div className="text-2xl font-bold text-status-green mt-1">58.6 km/h</div>
          <div className="text-[10px] text-outline mt-1">Speed limit: 80 km/h</div>
        </div>
        <div className="bg-surface-container rounded-xl p-space-lg">
          <div className="text-[10px] text-outline uppercase font-mono">Congestion Index</div>
          <div className="text-2xl font-bold text-on-surface mt-1">18.4%</div>
          <div className="text-[10px] text-primary-fixed mt-1">Low / Free flowing</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        <div className="lg:col-span-8 bg-surface-container rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-sm text-on-surface">Hourly Traffic Volume Distribution</h3>
              <p className="text-xs text-outline font-sans">Corridor: NH48 Highway North to City Center</p>
            </div>
            <span className="text-[11px] text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded">
              TODAY'S TIMELINE
            </span>
          </div>

          <div className="flex items-end justify-between h-48 gap-2 pt-6 pb-2 border-b border-surface-container-high">
            {hourlyData.map((item) => (
              <div key={item.hour} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                <div className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                  {item.count}
                </div>
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    item.peak
                      ? 'bg-primary shadow-[0_0_12px_rgba(0,242,254,0.6)]'
                      : 'bg-primary-container/40 hover:bg-primary-container/70'
                  }`}
                  style={{ height: `${item.pct}%` }}
                ></div>
                <span className="text-[10px] text-outline">{item.hour}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-surface-container rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-on-surface mb-1">Vehicle Classification Breakdown</h3>
            <p className="text-xs text-outline font-sans mb-6">Detected categories across active corridors</p>

            <div className="space-y-4 text-xs">
              {vehicleClasses.map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-on-surface">{item.label}</span>
                    <span className="text-outline">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${item.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-surface-container-high text-[11px] text-outline">
            Inference model: YOLOv8 Classification Head
          </div>
        </div>
      </div>
    </div>
  );
}

