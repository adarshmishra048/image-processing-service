export default function CropZoomControls({
  zoom,
  onZoomChange,
  onZoomIn,
  onZoomOut,
  onReset,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3">
      <button
        type="button"
        onClick={onZoomOut}
        className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
      >
        −
      </button>

      <div className="flex items-center gap-3 min-w-[220px] flex-1">
        <input
          type="range"
          min="1"
          max="5"
          step="0.05"
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />

        <span className="text-sm text-slate-300 w-12 text-right font-medium">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <button
        type="button"
        onClick={onZoomIn}
        className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
      >
        +
      </button>

      <button
        type="button"
        onClick={onReset}
        className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium"
      >
        Reset
      </button>
    </div>
  );
}