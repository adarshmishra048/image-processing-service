import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const API_BASE = "https://image-processing-service-8wui.onrender.com";

const defaultTransform = {
  width: 300,
  height: 300,
  rotate: 0,
  grayscale: false,
  sepia: false,
  blur: "",
  format: "webp",
};

export default function DashboardPage() {
  const { logout } = useAuth();

  const [groups, setGroups] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compareVersion, setCompareVersion] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [transform, setTransform] = useState({ ...defaultTransform });
  const [operations, setOperations] = useState([]);
  const [history, setHistory] = useState([
    { transform: defaultTransform, operations: [] },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const sliderRef = useRef(null);
  const isDraggingRef = useRef(false);
  const cropContainerRef = useRef(null);
  const cropDragRef = useRef(null);
  const originalImageRef = useRef(null);
  const [cropMode, setCropMode] = useState(false);
  const [cropBox, setCropBox] = useState({
    x: 80,
    y: 60,
    width: 240,
    height: 240,
  });

  const pushHistory = (next, ops) => {
    const current = history[historyIndex];
    const snapshot = { transform: next, operations: ops || [] };
    if (JSON.stringify(current) === JSON.stringify(snapshot)) return;
    const updated = history.slice(0, historyIndex + 1);
    updated.push(snapshot);
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
  };

  const addOperation = (op) => {
    setOperations((prev) => [...prev, op]);
  };
  const removeOperation = (index) => {
    setOperations((prev) => prev.filter((_, i) => i !== index));
  };
  const clearOperations = () => {
    setOperations([]);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    const entry = history[idx];
    if (entry) {
      setTransform(entry.transform);
      setOperations(entry.operations || []);
    }
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    const entry = history[idx];
    if (entry) {
      setTransform(entry.transform);
      setOperations(entry.operations || []);
    }
  };

  // Fetch grouped images
  const fetchImages = async () => {
    try {
      const res = await api.get("/images/grouped");
      setGroups(res.data.groups || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        setError("Session expired. Please log in again.");
        logout();
        return;
      }
      setError("Failed to load images");
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Format date
  const formatDate = (date) => {
    if (!date) return "Unknown date";

    return new Date(date).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Transformation badges
  const getTransformationBadges = (params = {}) => {
    const badges = [];
    const ops = params.operations || [];
    ops.forEach((op) => {
      if (op.type === "crop") {
        badges.push(`crop ${op.width}×${op.height}`);
      }
      if (op.type === "resize") {
        badges.push(`${op.width}×${op.height}`);
      }
      if (op.type === "rotate") {
        badges.push(`rotate ${op.angle}°`);
      }
      if (op.type === "grayscale") {
        badges.push("grayscale");
      }
      if (op.type === "sepia") {
        badges.push("sepia");
      }
      if (op.type === "blur") {
        badges.push(`blur ${op.value}`);
      }
      if (op.type === "format") {
        badges.push(op.value);
      }
    });
    return badges;
  };

  const makeHolePolygon = (box) => {
    const l = Math.max(0, box.x);
    const t = Math.max(0, box.y);
    const r = Math.max(0, l + box.width);
    const b = Math.max(0, t + box.height);
    return `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px)`;
  };

  const getCropInImagePixels = () => {
    const container = cropContainerRef.current;
    const img = originalImageRef.current;
    if (!container || !img || !selectedImage) return null;

    const containerRect = container.getBoundingClientRect();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return null;

    const scale = Math.min(containerRect.width / nw, containerRect.height / nh);
    const contentLeft = (containerRect.width - nw * scale) / 2;
    const contentTop = (containerRect.height - nh * scale) / 2;

    let x = (cropBox.x - contentLeft) / scale;
    let y = (cropBox.y - contentTop) / scale;

    x = Math.max(0, Math.min(x, nw - 1));
    y = Math.max(0, Math.min(y, nh - 1));

    const rx = Math.round(x);
    const ry = Math.round(y);

    return {
      x: rx,
      y: ry,
      width: Math.max(1, Math.round(Math.min(cropBox.width / scale, nw - rx))),
      height: Math.max(
        1,
        Math.round(Math.min(cropBox.height / scale, nh - ry)),
      ),
    };
  };

  // Live preview
  useEffect(() => {
    if (!selectedImage) return;
    const controller = new AbortController();

    const params = new URLSearchParams();
    const previewOperations = cropMode
      ? operations.filter((op) => op.type !== "rotate" && op.type !== "resize")
      : operations;
    params.set("operations", JSON.stringify(previewOperations));
    const loadPreview = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE}/api/images/${selectedImage._id}/preview?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (!res.ok) {
          const message = await res.text().catch(() => "");
          setError(
            message ||
              `Preview failed (${res.status}). Check operation values.`,
          );
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
          });
          return;
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
        }
      }
    };
    const timer = setTimeout(loadPreview, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [operations, transform, selectedImage, cropMode]);

  // Upload
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      await api.post("/images", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setFile(null);
      await fetchImages();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this image?")) return;

    try {
      await api.delete(`/images/${id}`);
      await fetchImages();
    } catch (err) {
      console.error(err);
      setError("Delete failed");
    }
  };

  // Download (Render-safe)
  const handleDownload = async (image) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE}/${image.path.replace(/^\//, "")}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = image.originalName || "image";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError("Failed to download image");
    }
  };

  // Open transform panel
  const openTransformPanel = (image) => {
    setSelectedImage(image);
    setSliderPosition(50);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setPreviewUrl(null);
    setTransform({ ...defaultTransform });
    setHistory([{ ...defaultTransform }]);
    setHistoryIndex(0);
    setError("");
  };

  // Close transform panel
  const closeTransformPanel = () => {
    setSelectedImage(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setPreviewUrl(null);
    setTransform({ ...defaultTransform });
    setCropMode(false);
    setCropBox({ x: 80, y: 60, width: 240, height: 240 });
  };

  const updateSlider = (clientX) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;

    setSliderPosition(Math.min(100, Math.max(0, percent)));
  };

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    updateSlider(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    updateSlider(e.clientX);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // ---- Crop dragging ----
  const getImageBounds = () => {
    const container = cropContainerRef.current;
    const img = container?.querySelector("img");
    if (!container || !img) return null;

    const containerRect = container.getBoundingClientRect();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return null;

    const scale = Math.min(containerRect.width / nw, containerRect.height / nh);
    const contentW = nw * scale;
    const contentH = nh * scale;

    return {
      left: (containerRect.width - contentW) / 2,
      top: (containerRect.height - contentH) / 2,
      right: (containerRect.width + contentW) / 2,
      bottom: (containerRect.height + contentH) / 2,
    };
  };

  const getInitialCropBox = () => {
    const bounds = getImageBounds();
    if (!bounds) return { x: 80, y: 60, width: 240, height: 240 };

    const w = bounds.right - bounds.left;
    const h = bounds.bottom - bounds.top;
    const boxW = Math.min(240, w);
    const boxH = Math.min(240, h);

    return {
      x: bounds.left + (w - boxW) / 2,
      y: bounds.top + (h - boxH) / 2,
      width: boxW,
      height: boxH,
    };
  };

  const startCropDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = cropContainerRef.current?.getBoundingClientRect();

    if (!rect) return;
    cropDragRef.current = {
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      initial: { ...cropBox },
      rect,
    };

    window.addEventListener("pointermove", onCropMove);
    window.addEventListener("pointerup", stopCropDrag);
  };

  const startCropResize = (handle) => (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = cropContainerRef.current?.getBoundingClientRect();

    if (!rect) return;
    cropDragRef.current = {
      type: handle,
      startX: e.clientX,
      startY: e.clientY,
      initial: { ...cropBox },
      rect,
    };

    window.addEventListener("pointermove", onCropMove);
    window.addEventListener("pointerup", stopCropDrag);
  };

  const onCropMove = (e) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const next = { ...drag.initial };
    const bounds = getImageBounds();
    if (!bounds) return;

    if (drag.type === "move") {
      next.x = Math.max(
        bounds.left,
        Math.min(bounds.right - next.width, drag.initial.x + dx),
      );
      next.y = Math.max(
        bounds.top,
        Math.min(bounds.bottom - next.height, drag.initial.y + dy),
      );
    }

    if (drag.type === "se") {
      next.width = Math.min(
        bounds.right - next.x,
        Math.max(40, drag.initial.width + dx),
      );
      next.height = Math.min(
        bounds.bottom - next.y,
        Math.max(40, drag.initial.height + dy),
      );
    }

    if (drag.type === "sw") {
      next.x = Math.max(
        bounds.left,
        Math.min(drag.initial.x + dx, drag.initial.x + drag.initial.width - 40),
      );
      next.width = drag.initial.width - (next.x - drag.initial.x);
      next.height = Math.min(
        bounds.bottom - next.y,
        Math.max(40, drag.initial.height + dy),
      );
    }

    if (drag.type === "ne") {
      next.y = Math.max(
        bounds.top,
        Math.min(
          drag.initial.y + dy,
          drag.initial.y + drag.initial.height - 40,
        ),
      );
      next.height = drag.initial.height - (next.y - drag.initial.y);
      next.width = Math.min(
        bounds.right - next.x,
        Math.max(40, drag.initial.width + dx),
      );
    }

    if (drag.type === "nw") {
      next.x = Math.max(
        bounds.left,
        Math.min(drag.initial.x + dx, drag.initial.x + drag.initial.width - 40),
      );
      next.y = Math.max(
        bounds.top,
        Math.min(
          drag.initial.y + dy,
          drag.initial.y + drag.initial.height - 40,
        ),
      );
      next.width = drag.initial.width - (next.x - drag.initial.x);
      next.height = drag.initial.height - (next.y - drag.initial.y);
    }

    if (bounds) {
      next.x = Math.max(bounds.left, next.x);
      next.y = Math.max(bounds.top, next.y);
      next.width = Math.max(40, Math.min(bounds.right - next.x, next.width));
      next.height = Math.max(40, Math.min(bounds.bottom - next.y, next.height));
    }

    setCropBox(next);
  };

  const stopCropDrag = () => {
    cropDragRef.current = null;
    window.removeEventListener("pointermove", onCropMove);
    window.removeEventListener("pointerup", stopCropDrag);
  };

  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cropMode) setCropBox(getInitialCropBox());
  }, [cropMode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cropMode) setError("");
  }, [cropBox, cropMode]);

  // Apply transform
  const handleTransform = async (e) => {
    e.preventDefault();
    if (!selectedImage) return;
    setLoading(true);
    setError("");
    try {
      const payload = { operations };
      console.log("Transform payload", payload);
      await api.post(`/images/${selectedImage._id}/transform`, payload);
      closeTransformPanel();
      clearOperations();
      await fetchImages();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0] ||
          err.message ||
          "Transformation failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const cropSource = selectedImage
    ? `${API_BASE}/${selectedImage.path.replace(/^\//, "")}`
    : "";

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Image Dashboard</h1>
            <p className="text-slate-400 mt-1">
              Upload, preview, transform, and manage your images
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Upload */}
        <form
          onSubmit={handleUpload}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <div>
            <label className="block text-sm text-slate-300 mb-2">
              Choose an image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-slate-300 file:bg-slate-800 file:border file:border-slate-700 file:text-white file:px-4 file:py-2 file:rounded-lg file:mr-4 hover:file:bg-slate-700"
            />
          </div>

          {file && (
            <p className="text-sm text-slate-400">Selected: {file.name}</p>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? "Uploading..." : "Upload Image"}
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4">
            {error}
          </div>
        )}

        {selectedImage && (
          <form
            onSubmit={handleTransform}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Transform Image
              </h2>

              <button
                type="button"
                onClick={closeTransformPanel}
                className="text-slate-400 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setCropMode((v) => !v)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  cropMode
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                }`}
              >
                {cropMode ? "Exit Crop" : "Crop"}
              </button>

              <button
                type="button"
                onClick={() => setCropBox(getInitialCropBox())}
                className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
              >
                Reset Crop
              </button>

              {cropMode && (
                <button
                  type="button"
                  onClick={() => {
                    const crop = getCropInImagePixels();
                    if (crop) {
                      setOperations((prev) => [
                        { type: "crop", ...crop },
                        ...prev.filter((op) => op.type !== "crop"),
                      ]);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Add Crop
                </button>
              )}
            </div>

            {operations.length > 0 && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Operation Order</h3>
                  <button
                    type="button"
                    onClick={() => {
                      clearOperations();
                      setTransform({ ...defaultTransform });
                    }}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Clear
                  </button>
                </div>

                <div className="space-y-2">
                  {operations.map((op, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">
                          {index + 1}
                        </span>

                        <span className="text-slate-200">
                          {op.type === "resize" &&
                            `Resize ${op.width}×${op.height}`}{" "}
                          {op.type === "crop" &&
                            `Crop ${op.width}×${op.height}`}{" "}
                          {op.type === "rotate" && `Rotate ${op.angle}°`}{" "}
                          {op.type === "format" &&
                            `Format ${op.value.toUpperCase()}`}{" "}
                          {op.type === "grayscale" && "Grayscale"}{" "}
                          {op.type === "sepia" && "Sepia"}{" "}
                          {op.type === "blur" && `Blur ${op.value}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOperation(index)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professional draggable compare slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">
                  Original
                </span>
                <span className="text-sm font-medium text-slate-300">
                  Live Preview
                </span>
              </div>

              <div
                ref={sliderRef}
                onPointerDown={handlePointerDown}
                className="relative w-full min-h-72 md:min-h-112 aspect-video rounded-3xl overflow-hidden border border-slate-700 bg-slate-900 select-none touch-none shadow-2xl"
              >
                <div ref={cropContainerRef} className="absolute inset-0">
                  <img
                    ref={originalImageRef}
                    src={cropSource}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain bg-slate-900 pointer-events-none"
                    draggable={false}
                  />

                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{
                      clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                    }}
                  >
                    <img
                      src={
                        previewUrl ||
                        `${API_BASE}/${selectedImage.path.replace(/^\//, "")}`
                      }
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-contain bg-slate-900"
                      draggable={false}
                    />
                  </div>

                  {cropMode && (
                    <>
                      <img
                        src={cropMode ? cropSource : previewUrl || cropSource}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-contain bg-slate-900 pointer-events-none"
                        style={{
                          clipPath: makeHolePolygon(cropBox),
                          filter: "blur(8px) brightness(0.6)",
                        }}
                      />

                      <div className="absolute inset-0 bg-black/45" />

                      <img
                        src={cropSource}
                        alt="Focused preview"
                        draggable={false}
                        className="absolute inset-0 w-full h-full object-contain bg-slate-900 pointer-events-none"
                        style={{
                          clipPath: `polygon(${Math.max(0, cropBox.x)}px ${Math.max(0, cropBox.y)}px, ${Math.max(0, cropBox.x + cropBox.width)}px ${Math.max(0, cropBox.y)}px, ${Math.max(0, cropBox.x + cropBox.width)}px ${Math.max(0, cropBox.y + cropBox.height)}px, ${Math.max(0, cropBox.x)}px ${Math.max(0, cropBox.y + cropBox.height)}px)`,
                        }}
                      />

                      <div
                        className="absolute border-2 border-indigo-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] rounded-md cursor-move"
                        style={{
                          left: cropBox.x,
                          top: cropBox.y,
                          width: cropBox.width,
                          height: cropBox.height,
                        }}
                        onPointerDown={startCropDrag}
                      >
                        <div className="absolute inset-0 border border-white/20" />

                        {[
                          [
                            "nw",
                            "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
                          ],
                          [
                            "ne",
                            "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
                          ],
                          [
                            "sw",
                            "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
                          ],
                          [
                            "se",
                            "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
                          ],
                        ].map(([handle, cls]) => (
                          <button
                            key={handle}
                            type="button"
                            onPointerDown={startCropResize(handle)}
                            className={`absolute w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow ${cls}`}
                          />
                        ))}

                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded">
                          {(() => {
                            const c = getCropInImagePixels();
                            return c ? `${c.width} × ${c.height}` : "";
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.8)] pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                />

                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-12 h-12 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl border border-white/80 ring-4 ring-white/10">
                    ↔
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Drag to compare</span>
                <span>{Math.round(sliderPosition)}% revealed</span>
              </div>
            </div>
            {/* Controls */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Width
                </label>
                <input
                  type="number"
                  value={transform.width}
                  onChange={(e) => {
                    const next = {
                      ...transform,
                      width: Number(e.target.value),
                    };
                    setTransform(next);
                  }}
                  onBlur={() => pushHistory(transform, operations)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Height
                </label>
                <input
                  type="number"
                  value={transform.height}
                  onChange={(e) => {
                    const next = {
                      ...transform,
                      height: Number(e.target.value),
                    };
                    setTransform(next);
                  }}
                  onBlur={() => pushHistory(transform, operations)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  addOperation({
                    type: "resize",
                    width: Number(transform.width),
                    height: Number(transform.height),
                  })
                }
                className="md:col-span-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg"
              >
                Add Resize
              </button>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Rotate
                </label>
                <input
                  type="number"
                  value={transform.rotate}
                  onChange={(e) => {
                    const angle = Number(e.target.value);
                    setTransform((prev) => ({ ...prev, rotate: angle }));
                    setOperations((prev) => {
                      const withoutRotate = prev.filter(
                        (op) => op.type !== "rotate",
                      );
                      return angle !== 0
                        ? [...withoutRotate, { type: "rotate", angle }]
                        : withoutRotate;
                    });
                  }}
                  onBlur={() => pushHistory(transform, operations)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Blur
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={transform.blur}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? "" : Number(e.target.value);
                    setTransform((prev) => ({ ...prev, blur: value }));
                    setOperations((prev) => {
                      const without = prev.filter((op) => op.type !== "blur");
                      return value === ""
                        ? without
                        : [...without, { type: "blur", value }];
                    });
                  }}
                  onBlur={() => pushHistory(transform, operations)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Format
              </label>
              <select
                value={transform.format}
                onChange={(e) => {
                  const value = e.target.value;

                  setTransform((prev) => ({ ...prev, format: value }));

                  setOperations((prev) => {
                    const without = prev.filter((op) => op.type !== "format");
                    return [...without, { type: "format", value }];
                  });
                }}
                onBlur={() => pushHistory(transform, operations)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
            <div className="flex gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={transform.grayscale}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTransform({ ...transform, grayscale: checked });
                    setOperations((prev) => {
                      const without = prev.filter(
                        (op) => op.type !== "grayscale",
                      );
                      return checked
                        ? [...without, { type: "grayscale" }]
                        : without;
                    });
                  }}
                  onBlur={() => pushHistory(transform, operations)}
                />
                Grayscale
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={transform.sepia}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTransform({ ...transform, sepia: checked });
                    setOperations((prev) => {
                      const without = prev.filter((op) => op.type !== "sepia");
                      return checked
                        ? [...without, { type: "sepia" }]
                        : without;
                    });
                  }}
                  onBlur={() => pushHistory(transform, operations)}
                />
                Sepia
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = { ...defaultTransform };
                  setTransform(next);
                  clearOperations();
                  pushHistory(next, []);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-5 py-3 rounded-lg font-medium transition-colors"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={undo}
                className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700"
              >
                Undo
              </button>

              <button
                type="button"
                onClick={redo}
                className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700"
              >
                Redo
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Transforming..." : "Apply Transformations"}
              </button>
            </div>
          </form>
        )}

        {compareVersion && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Compare Versions
                </h2>
                <p className="text-slate-400 mt-1">
                  Original vs selected transformed version
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCompareVersion(null)}
                className="text-slate-400 hover:text-white text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Original */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Original</h3>
                  <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm">
                    Original
                  </span>
                </div>

                <img
                  src={`${API_BASE}/${compareVersion.original.path.replace(/^\//, "")}`}
                  alt="Original"
                  className="w-full h-80 object-contain bg-slate-900 rounded-xl border border-slate-700 hover:scale-[1.01] transition-transform duration-300"
                />

                <div className="space-y-1">
                  <p className="text-white font-medium">
                    {compareVersion.original.originalName}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {compareVersion.original.width} ×{" "}
                    {compareVersion.original.height}
                  </p>
                  <p className="text-slate-500 text-sm">
                    Uploaded:{" "}
                    {new Date(
                      compareVersion.original.createdAt,
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Variant */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Selected Version
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm">
                    Version
                  </span>
                </div>

                <img
                  src={`${API_BASE}/${compareVersion.variant.path.replace(/^\//, "")}`}
                  alt="Variant"
                  className="w-full h-80 object-contain bg-slate-900 rounded-xl border border-slate-700 hover:scale-[1.01] transition-transform duration-300"
                />

                <div className="space-y-3">
                  <div>
                    <p className="text-white font-medium">
                      {compareVersion.variant.width} ×{" "}
                      {compareVersion.variant.height}
                    </p>
                    <p className="text-slate-500 text-sm">
                      Transformed:{" "}
                      {new Date(
                        compareVersion.variant.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {getTransformationBadges(
                      compareVersion.variant.transformationParams,
                    ).map((badge) => (
                      <span
                        key={badge}
                        className="bg-slate-800 text-slate-300 px-2 py-1 rounded-md text-xs"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCompareVersion(null);
                  openTransformPanel(compareVersion.variant);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Restore This Version
              </button>

              <button
                type="button"
                onClick={() => setCompareVersion(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Close Compare
              </button>
            </div>
          </div>
        )}

        {/* Version Stacks */}
        <div className="space-y-8">
          {groups.map((group) => (
            <div
              key={group.original._id}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
            >
              {/* Original */}
              <div className="p-6 border-b border-slate-800">
                <div className="flex flex-col md:flex-row gap-6">
                  <img
                    src={`${API_BASE}/${group.original.path.replace(/^\//, "")}`}
                    alt={group.original.originalName}
                    className="w-full md:w-48 h-48 object-cover rounded-2xl border border-slate-700"
                  />

                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">
                          {group.original.originalName}
                        </h3>

                        <p className="text-slate-400 mt-1">
                          {group.original.width} × {group.original.height}
                        </p>

                        <p className="text-slate-500 text-sm mt-1">
                          Uploaded: {formatDate(group.original.createdAt)}
                        </p>

                        <p className="text-slate-500 text-sm">
                          {group.variants.length} version
                          {group.variants.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
                        Original
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openTransformPanel(group.original)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Transform
                      </button>

                      <a
                        href={`${API_BASE}/${group.original.path.replace(/^\//, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        View
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDownload(group.original)}
                        className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Download
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(group.original._id)}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants */}
              {group.variants.length > 0 && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 text-slate-300 font-medium">
                    <span>History</span>
                    <span className="text-slate-500">
                      ({group.variants.length})
                    </span>
                  </div>

                  {group.variants.map((variant) => (
                    <div
                      key={variant._id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4"
                    >
                      <div className="flex flex-col md:flex-row gap-4">
                        <img
                          src={`${API_BASE}/${variant.path.replace(/^\//, "")}`}
                          alt={variant.originalName}
                          className="w-full md:w-32 h-32 object-contain bg-slate-900 rounded-xl border border-slate-700"
                        />

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-white font-medium">
                                {variant.width} × {variant.height}
                              </p>

                              <p className="text-slate-400 text-sm mt-1">
                                Transformed: {formatDate(variant.createdAt)}
                              </p>
                            </div>

                            <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium">
                              Version
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {getTransformationBadges(
                              variant.transformationParams,
                            ).map((badge) => (
                              <span
                                key={badge}
                                className="bg-slate-800 text-slate-300 px-2 py-1 rounded-md text-xs"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setCompareVersion({
                                original: group.original,
                                variant,
                              })
                            }
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            Compare
                          </button>

                          <div className="flex flex-wrap gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => openTransformPanel(variant)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              Restore
                            </button>

                            <a
                              href={`${API_BASE}/${variant.path.replace(/^\//, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              View
                            </a>

                            <button
                              type="button"
                              onClick={() => handleDownload(variant)}
                              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              Download
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(variant._id)}
                              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty */}
        {groups.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-400">No images uploaded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
