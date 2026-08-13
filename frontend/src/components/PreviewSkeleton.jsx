export default function PreviewSkeleton() {
  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-full px-3 py-2 shadow-lg backdrop-blur-sm">
        <div className="w-3 h-3 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-200 font-medium">
          Updating preview
        </span>
      </div>
    </div>
  );
}
