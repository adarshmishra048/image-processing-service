import { useEffect, useState } from "react";
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

  // Fetch grouped images
  const fetchImages = async () => {
    try {
      const res = await api.get("/images/grouped");
      setGroups(res.data.groups || []);
    } catch (err) {
      console.error(err);
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

    if (params.resize?.width && params.resize?.height) {
      badges.push(`${params.resize.width}×${params.resize.height}`);
    }

    if (params.rotate) badges.push(`rotate ${params.rotate}°`);
    if (params.grayscale) badges.push("grayscale");
    if (params.sepia) badges.push("sepia");
    if (params.blur) badges.push(`blur ${params.blur}`);
    if (params.format) badges.push(params.format);

    return badges;
  };

  // Live preview
  useEffect(() => {
    if (!selectedImage) return;

    const controller = new AbortController();
    const params = new URLSearchParams();

    params.set("width", transform.width);
    params.set("height", transform.height);
    params.set("rotate", transform.rotate);

    if (transform.grayscale) params.set("grayscale", "true");
    if (transform.sepia) params.set("sepia", "true");
    if (transform.blur !== "") params.set("blur", transform.blur);
    if (transform.format) params.set("format", transform.format);

    const loadPreview = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(
          `${API_BASE}/api/images/${selectedImage._id}/preview?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );

        if (!res.ok) return;

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

    loadPreview();

    return () => controller.abort();
  }, [transform, selectedImage]);

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
    setError("");
  };

  // Close transform panel
  const closeTransformPanel = () => {
    setSelectedImage(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setPreviewUrl(null);
    setTransform({ ...defaultTransform });
  };

  // Apply transform
  const handleTransform = async (e) => {
    e.preventDefault();

    if (!selectedImage) return;

    setLoading(true);
    setError("");

    try {
      const payload = {
        resize: {
          width: Number(transform.width),
          height: Number(transform.height),
        },
        rotate: Number(transform.rotate),
        grayscale: transform.grayscale,
        sepia: transform.sepia,
        format: transform.format,
      };

      const blurValue = Number(transform.blur);

      if (transform.blur !== "" && blurValue >= 0.3) {
        payload.blur = blurValue;
      }

      await api.post(`/images/${selectedImage._id}/transform`, payload);

      closeTransformPanel();
      await fetchImages();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.errors?.[0] ||
          err.response?.data?.message ||
          "Transformation failed",
      );
    } finally {
      setLoading(false);
    }
  };

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

            {/* Before / After Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-300">Original</p>
                <p className="text-sm text-slate-300">Live Preview</p>
              </div>

              <div className="relative w-full h-72 md:h-96 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                <img
                  src={`${API_BASE}/${selectedImage.path.replace(/^\//, "")}`}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />

                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={
                      previewUrl ||
                      `${API_BASE}/${selectedImage.path.replace(/^\//, "")}`
                    }
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />
                </div>

                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/90"
                  style={{ left: `calc(${sliderPosition}% - 1px)` }}
                />

                <div
                  className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xl border border-white/80"
                  style={{ left: `calc(${sliderPosition}% - 20px)` }}
                >
                  ↔
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
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
                  onChange={(e) =>
                    setTransform({
                      ...transform,
                      width: Number(e.target.value),
                    })
                  }
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
                  onChange={(e) =>
                    setTransform({
                      ...transform,
                      height: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Rotate
                </label>
                <input
                  type="number"
                  value={transform.rotate}
                  onChange={(e) =>
                    setTransform({
                      ...transform,
                      rotate: Number(e.target.value),
                    })
                  }
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
                  onChange={(e) =>
                    setTransform({ ...transform, blur: e.target.value })
                  }
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
                onChange={(e) =>
                  setTransform({ ...transform, format: e.target.value })
                }
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
                  onChange={(e) =>
                    setTransform({ ...transform, grayscale: e.target.checked })
                  }
                />
                Grayscale
              </label>

              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={transform.sepia}
                  onChange={(e) =>
                    setTransform({ ...transform, sepia: e.target.checked })
                  }
                />
                Sepia
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTransform({ ...defaultTransform })}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-5 py-3 rounded-lg font-medium transition-colors"
              >
                Reset
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
                  className="w-full h-80 object-cover rounded-xl border border-slate-700 hover:scale-[1.01] transition-transform duration-300"
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
                  className="w-full h-80 object-cover rounded-xl border border-slate-700 hover:scale-[1.01] transition-transform duration-300"
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
                    <span>Version History</span>
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
                          className="w-full md:w-32 h-32 object-cover rounded-xl border border-slate-700"
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
