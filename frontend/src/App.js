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
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }).catch(() => {});
      }

      window.removeEventListener("click", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);
  }, []);

  // 🔥 Fetch data
  useEffect(() => {
    const fetchData = () => {
      fetch("http://localhost:5000/api/intel")
        .then((res) => res.json())
        .then((data) => {

          // ✅ remove invalid lat/lng
          const safeData = data.filter(
            (item) => item.lat != null && item.lng != null
          );

          // 🔥 LOCATION ALERT
          const newLocations = safeData.filter((item) => {
            return !prevLocations.some(
              (prev) =>
                prev.lat?.toFixed(2) === item.lat?.toFixed(2) &&
                prev.lng?.toFixed(2) === item.lng?.toFixed(2)
            );
          });

          if (newLocations.length > 0) {
            setShowAlert(true);
            playAlertSound();

            setTimeout(() => {
              setShowAlert(false);
            }, 3000);
          }

          setPrevLocations(safeData);
          setData(safeData);

          // ensure markers visible
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

  // 🔥 FUSION
  const fusedDataMap = {};

  timelineData.forEach((item) => {
    if (item.lat == null || item.lng == null) return;

    const key = `${item.lat.toFixed(2)}_${item.lng.toFixed(2)}`;

    if (!fusedDataMap[key]) {
      fusedDataMap[key] = {
        lat: item.lat,
        lng: item.lng,
        items: []
      };
    }

    fusedDataMap[key].items.push(item);
  });

  const fusedData = Object.values(fusedDataMap);

  // 🔥 Timeline animation
  useEffect(() => {
    if (timeIndex >= filteredData.length) return;

    const timer = setTimeout(() => {
      setTimeIndex((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [timeIndex, filteredData]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* 🔊 AUDIO */}
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

      {/* 🚨 ALERT */}
      {showAlert && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "red",
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
      <div style={{ padding: "10px", background: "#0f172a", color: "white" }}>
        <input
          type="range"
          min="0"
          max={filteredData.length}
          value={timeIndex}
          onChange={(e) => setTimeIndex(Number(e.target.value))}
          style={{ width: "100%" }}
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