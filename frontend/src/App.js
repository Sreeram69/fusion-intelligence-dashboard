import { useRef, useState, useEffect } from "react";
import MapView from "./components/MapView";
import Sidebar from "./components/Sidebar";

function App() {
  const mapRef = useRef();

  // 🔊 AUDIO REF
  const audioRef = useRef(null);

  // 🔹 Backend data
  const [data, setData] = useState([]);

  // 🔹 Selected item (for zoom)
  const [selectedItem, setSelectedItem] = useState(null);

  // 🔹 Filters
  const [filters, setFilters] = useState({
    OSINT: true,
    HUMINT: true,
    IMINT: true,
  });

  // 🔹 Search
  const [search, setSearch] = useState("");

  // 🔥 Timeline state
  const [timeIndex, setTimeIndex] = useState(0);

  // 🔥 ALERT STATE
  const [showAlert, setShowAlert] = useState(false);

  // 🔥 LOCATION TRACKING
  const [prevLocations, setPrevLocations] = useState([]);

  // 🔥 NEW: track seen items (FIX)
  const [seenIds, setSeenIds] = useState(new Set());

  // 🔊 SOUND FUNCTION
  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        console.log("🔒 Audio locked until first click");
      });
    }
  };

  // 🔓 AUTO UNLOCK AUDIO
useEffect(() => {
  const unlockAudio = () => {
    if (audioRef.current) {
      audioRef.current.muted = true;

      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
      }).catch(() => {});
    }

    window.removeEventListener("click", unlockAudio);
  };

  window.addEventListener("click", unlockAudio);
}, []);

 // 🔥 Fetch data
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  const fetchData = () => {
    fetch("http://localhost:5000/api/intel")
      .then((res) => res.json())
      .then((data) => {

        const safeData = data.filter(
          (item) => item.lat != null && item.lng != null
        );

        // 🔥 FIX START (ONLY THIS BLOCK UPDATED)

        let newItems = [];

        setSeenIds((prev) => {
          const updated = new Set(prev);

          newItems = safeData.filter((item) => {
            const id = item._id || item.id || item.timestamp;
            return !updated.has(id);
          });

          safeData.forEach((item) => {
            const id = item._id || item.id || item.timestamp;
            updated.add(id);
          });

          return updated;
        });

        // 🔥 trigger sound ONLY on NEW data
if (newItems.length > 0 && prevLocations.length > 0){
          setShowAlert(true);
          playAlertSound();

          setTimeout(() => {
            setShowAlert(false);
          }, 3000);
        }

        // 🔥 FIX END

        setPrevLocations(safeData);
        setData(safeData);
        setTimeIndex(1);
      })
      .catch((err) => console.error("Error fetching data:", err));
  };

  fetchData();

  const interval = setInterval(fetchData, 10000);

  return () => clearInterval(interval);
}, []);
  // 🔹 Selection
  const handleSelect = (item) => {
    setSelectedItem(item);
  };

  // 🔹 Filters
  const toggleFilter = (type) => {
    setFilters((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // 🔥 Sorting
  const sortedData = [...data].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // 🔹 Filter + search
  const filteredData = sortedData.filter(
    (item) =>
      filters[item.type] &&
      item.title.toLowerCase().includes(search.toLowerCase())
  );

  // 🔥 FIXED timeline
  const timelineData = filteredData.slice(0, Math.max(1, timeIndex));

  // 🔥 FUSION (your clustering untouched)
  const clusters = [];

  timelineData.forEach((item) => {
    if (item.lat == null || item.lng == null) return;

    let added = false;

    for (let cluster of clusters) {
      const distance =
        Math.abs(cluster.lat - item.lat) +
        Math.abs(cluster.lng - item.lng);

      if (distance < 0.5) {
        cluster.items.push(item);
        added = true;
        break;
      }
    }

    if (!added) {
      clusters.push({
        lat: item.lat,
        lng: item.lng,
        items: [item]
      });
    }
  });

  const fusedData = clusters;

  // 🔥 Timeline animation
  useEffect(() => {
    if (timeIndex >= filteredData.length) return;

    const timer = setTimeout(() => {
      setTimeIndex((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [timeIndex, filteredData]);

  return (
<div style={{
  display: "flex",
  flexDirection: "column",
  background: "#020617",
  minHeight: "100vh",
  fontFamily: "system-ui"
}}>
      {/* 🔊 AUDIO */}
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

      {/* 🚨 ALERT */}
      {showAlert && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
background: "linear-gradient(90deg, #ef4444, #dc2626)",
backdropFilter: "blur(10px)",
border: "1px solid rgba(255,255,255,0.2)",
animation: "pulse 1s infinite",
          color: "white",
          padding: "12px 20px",
          borderRadius: "8px",
          zIndex: 9999,
          fontWeight: "bold",
          boxShadow: "0 0 10px rgba(0,0,0,0.3)"
        }}>
          🚨 New Intelligence Detected!
        </div>
      )}

      {/* 🔥 Timeline */}
<div style={{
  padding: "15px",
  background: "linear-gradient(90deg, #020617, #0f172a)",
  color: "white",
  borderBottom: "1px solid rgba(255,255,255,0.1)"
}}>
  <p style={{ marginBottom: "8px", fontSize: "14px", opacity: 0.7 }}>
    Timeline Replay
  </p>

  <input
    type="range"
    min="0"
    max={filteredData.length}
    value={timeIndex}
    onChange={(e) => setTimeIndex(Number(e.target.value))}
    style={{
      width: "100%",
      accentColor: "#22c55e",
      cursor: "pointer"
    }}
  />
</div>

      <div style={{ display: "flex" }}>
        <Sidebar
          data={filteredData}
          onSelect={handleSelect}
          filters={filters}
          toggleFilter={toggleFilter}
          search={search}
          setSearch={setSearch}
        />
        <MapView
          mapRef={mapRef}
          selectedItem={selectedItem}
          data={fusedData.length > 0 ? fusedData : filteredData}
        />
      </div>
    </div>
  );
}

export default App;