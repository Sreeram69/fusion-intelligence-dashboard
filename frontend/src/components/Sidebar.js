import { useState } from "react";

const Sidebar = ({
  data,
  onSelect,
  filters,
  toggleFilter,
  search,
  setSearch,
}) => {
  const [uploading, setUploading] = useState(false);

  // 🔥 JSON Upload (UNCHANGED)
  const handleFileUpload = (e) => {
    e.preventDefault();

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const jsonData = JSON.parse(reader.result);

        const safeData = Array.isArray(jsonData) ? jsonData : [jsonData];

        setUploading(true);

        await fetch("http://localhost:5000/api/intel/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(safeData),
        });

        alert("Upload successful ✅");

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        alert("Invalid JSON ❌");
      } finally {
        setUploading(false);
      }
    };

    reader.readAsText(file);
  };

  // 🔥 Image Upload (UNCHANGED)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!result || !result.imageUrl) {
        throw new Error("Invalid response");
      }

      alert("Image uploaded ✅");

      console.log("👉 Copy this path into your JSON:");
      console.log(result.imageUrl);
    } catch (err) {
      alert("Image upload failed ❌");
    }
  };

  return (
    <div
      style={{
        width: "320px",
        height: "100vh",
        overflowY: "auto",
        background: "linear-gradient(180deg, #020617, #0f172a)",
        color: "white",
        padding: "15px",
        boxSizing: "border-box",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* 🔹 Title */}
      <h2 style={{ marginBottom: "15px", fontWeight: "600" }}>
        🧠 Intelligence
      </h2>

      {/* 🔍 Search */}
      <input
        type="text"
        placeholder="Search intelligence..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "15px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          color: "white",
          outline: "none",
        }}
      />

      {/* 🔴 Clear Data */}
      <button
        onClick={async () => {
          await fetch("http://localhost:5000/api/intel", {
            method: "DELETE",
          });
          window.location.reload();
        }}
        style={{
          marginBottom: "10px",
          padding: "10px",
          width: "100%",
          background: "linear-gradient(90deg, #ef4444, #dc2626)",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "500",
        }}
      >
        Clear All Data
      </button>

      {/* 🔥 Drag & Drop */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];

          if (file) {
            const event = {
              target: { files: [file] },
              preventDefault: () => {},
            };
            handleFileUpload(event);
          }
        }}
        style={{
          border: "2px dashed rgba(255,255,255,0.2)",
          padding: "15px",
          marginBottom: "10px",
          textAlign: "center",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        Drag & Drop JSON here
      </div>

      {/* 🔥 JSON Upload */}
      <div style={{ marginBottom: "15px" }}>
        <input
          type="file"
          accept=".json"
          onChange={(e) => handleFileUpload(e)}
        />
        {uploading && <p>Uploading...</p>}
      </div>

      {/* 🔥 Image Upload */}
      <div style={{ marginBottom: "15px" }}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>

      {/* 📊 Counts */}
      <div style={{ marginBottom: "15px", fontSize: "14px", opacity: 0.8 }}>
        <p>🔴 OSINT: {data.filter((d) => d.type === "OSINT").length}</p>
        <p>🔵 HUMINT: {data.filter((d) => d.type === "HUMINT").length}</p>
        <p>🟢 IMINT: {data.filter((d) => d.type === "IMINT").length}</p>
      </div>

      {/* 🎛️ Filters */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ marginBottom: "8px" }}>Filters</h3>

        {["OSINT", "HUMINT", "IMINT"].map((type) => (
          <label key={type} style={{ display: "block", margin: "6px 0" }}>
            <input
              type="checkbox"
              checked={filters[type]}
              onChange={() => toggleFilter(type)}
              style={{ marginRight: "6px" }}
            />
            {type}
          </label>
        ))}
      </div>

      {/* 📋 Data List */}
      <div>
        {data.length === 0 && (
          <p style={{ color: "#94a3b8" }}>No data found</p>
        )}

        {data.map((item, index) => (
          <div
            key={item._id || item.id || index}
            onClick={() => onSelect(item)}
            style={{
              padding: "12px",
              marginBottom: "10px",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
            }
          >
            <h4 style={{ margin: "0 0 5px 0" }}>{item.title}</h4>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.7 }}>
              {item.type}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;