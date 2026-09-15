import React from 'react';

export default function ReportsView() {
  const ocrBenchmarks = [
    { variant: 'clahe', label: 'Contrast Limited Adaptive Histogram (CLAHE)', avgConf: '94.8%', nonEmpty: '100%', bestFor: 'Direct sunlight & glare' },
    { variant: 'otsu', label: 'Otsu Binarization Matrix', avgConf: '93.1%', nonEmpty: '99.2%', bestFor: 'Night vision & backlit plates' },
    { variant: 'denoise', label: 'Bilateral Denoising Filter', avgConf: '91.5%', nonEmpty: '98.5%', bestFor: 'High speed rain & grain distortion' },
    { variant: 'original', label: 'Raw Unprocessed Feed', avgConf: '88.4%', nonEmpty: '96.1%', bestFor: 'Standard daylight conditions' },
    { variant: 'adaptive', label: 'Adaptive Gaussian Thresholding', avgConf: '89.2%', nonEmpty: '97.0%', bestFor: 'Uneven shadow illumination' },
  ];

  const handleDownloadReport = () => {
    const reportData = `NEXUS VISION ANPR PLATFORM - AUDIT & TELEMETRY REPORT
Generated: ${new Date().toLocaleString()}
Operator: Cmdr. Alex Vance

1. SYSTEM STATUS
ML Engine: YOLOv8-ANPR (Online, 14.2ms latency)
OCR Engine: CRNN Dual Matrix (Online, 94.2% accuracy)
Active Cameras: 4 Nodes Online

2. SUMMARY STATISTICS
Videos Analyzed: 128
Total Vehicles Detected: 4,382
Plates Recognized: 3,941 (89.9% match rate)
Blacklist Matches: 24 critical alerts

3. OCR VARIANT BENCHMARK PERFORMANCE
- CLAHE: 94.8% avg confidence
- Otsu: 93.1% avg confidence
- Denoise: 91.5% avg confidence
- Original: 88.4% avg confidence
- Adaptive: 89.2% avg confidence
`;
    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NexusVision_ANPR_Report_${Date.now()}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-main pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[24px]">description</span>
            <h2 className="text-xl font-bold text-text-primary tracking-wide">
              SYSTEM AUDIT &amp; ANPR BENCHMARK REPORTS
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-sans">
            Formal telemetry logs, detection rate audits, and morphological OCR variant diagnostics
          </p>
        </div>

        <button
          onClick={handleDownloadReport}
          className="px-4 py-2 rounded-xl bg-primary text-black font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-[16px]">download</span> Export Audit Report (.TXT)
        </button>
      </div>

      <div className="bg-bg-card border border-border-main rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border-main">
          <div>
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">analytics</span> Morphological OCR Variant Benchmark Matrix
            </h3>
            <p className="text-xs text-text-secondary font-sans">
              Comparative benchmark results from model training validation tests
            </p>
          </div>
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded">
            BENCHMARK V2
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-main text-text-secondary uppercase text-[10px]">
                <th className="py-2.5 px-3">Pipeline Variant</th>
                <th className="py-2.5 px-3">Filter Technique</th>
                <th className="py-2.5 px-3">Avg OCR Confidence</th>
                <th className="py-2.5 px-3">Non-Empty Rate</th>
                <th className="py-2.5 px-3">Optimal Operating Condition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main/50">
              {ocrBenchmarks.map((b) => (
                <tr key={b.variant} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-primary font-bold uppercase">{b.variant}</td>
                  <td className="py-3 px-3 text-text-primary font-sans">{b.label}</td>
                  <td className="py-3 px-3 text-status-green font-bold">{b.avgConf}</td>
                  <td className="py-3 px-3 text-text-secondary">{b.nonEmpty}</td>
                  <td className="py-3 px-3 text-text-secondary font-sans">{b.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

