import { useImperativeHandle, useRef, useState } from "react";

export default function UploadDropzone({
  file,
  onFileSelect,
  loading,
  progress,
  onSubmit,
  ref
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const openFilePicker = () => {
    if (loading) return;
    fileInputRef.current?.click();
  };

  useImperativeHandle(ref, () => ({
    openFilePicker,
  }));

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (loading) return;

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!droppedFile.type.startsWith("image/")) {
      alert("Please drop an image file");
      return;
    }

    onFileSelect(droppedFile);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
    >
      <div
        onClick={openFilePicker}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openFilePicker();
          }
        }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 ${
          loading
            ? "pointer-events-none opacity-60"
            : "cursor-pointer hover:border-slate-500 hover:bg-slate-950/40"
        } ${
          isDragging
            ? "border-indigo-400 bg-indigo-500/5 ring-2 ring-indigo-500/30"
            : "border-slate-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFileSelect(e.target.files[0])}
          className="hidden"
        />

        <div className="space-y-3">
          <div className="text-5xl">🖼️</div>

          <div>
            <p className="text-white font-medium text-lg">
              {isDragging
                ? "Drop image to upload"
                : "Drag & drop an image here"}
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Click anywhere to browse files
            </p>

            <p className="text-slate-500 text-xs mt-2">
              Press{" "}
              <kbd className="px-1 py-0.5 rounded bg-slate-800 border border-slate-700">
                {/mac/i.test(
                  navigator.userAgentData?.platform || navigator.platform || "",
                )
                  ? "⌘ O"
                  : "Ctrl O"}
              </kbd>{" "}
              to open files
            </p>
          </div>
        </div>
      </div>

      {file && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-slate-300 truncate">
            Selected:{" "}
            <span className="font-medium text-white">{file.name}</span>
          </p>

          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="text-slate-400 hover:text-white transition-colors ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Uploading...</span>
            <span className="text-slate-400">{progress}%</span>
          </div>

          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </form>
  );
}
