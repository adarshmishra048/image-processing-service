export const RATIOS = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

export default function AspectRatioSelector({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RATIOS.map((ratio) => {
        const active = value === ratio.value;

        return (
          <button
            key={ratio.label}
            type="button"
            onClick={() => onChange(ratio.value)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {ratio.label}
          </button>
        );
      })}
    </div>
  );
}
