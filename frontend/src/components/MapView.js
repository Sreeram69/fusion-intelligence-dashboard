import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap
} from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";

// Marker icons
import redIcon from "leaflet-color-markers/img/marker-icon-red.png";
import blueIcon from "leaflet-color-markers/img/marker-icon-blue.png";
import greenIcon from "leaflet-color-markers/img/marker-icon-green.png";
import shadow from "leaflet-color-markers/img/marker-shadow.png";

// 🔹 Create icons
const redMarker = new L.Icon({
  iconUrl: redIcon,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const blueMarker = new L.Icon({
  iconUrl: blueIcon,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const greenMarker = new L.Icon({
  iconUrl: greenIcon,
  shadowUrl: shadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// 🔹 Marker selector
const getMarkerIcon = (type) => {
  if (type === "OSINT") return redMarker;
  if (type === "HUMINT") return blueMarker;
  if (type === "IMINT") return greenMarker;

  return redMarker;
};

/////////////////////////////////////////////////////
// 🔥 MAP CONTROLLER
/////////////////////////////////////////////////////
const MapController = ({ selectedItem }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedItem) {
      const actualItem = selectedItem.items ? selectedItem.items[0] : selectedItem;

      if (actualItem.lat == null || actualItem.lng == null) return;

      const { lat, lng } = actualItem;

      map.flyTo([lat, lng], 12, {
        duration: 1.5,
      });
    }
  }, [selectedItem, map]);

  return null;
};

/////////////////////////////////////////////////////
// 🔥 HEATMAP
/////////////////////////////////////////////////////
const HeatmapLayer = ({ data, selectedItem }) => {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {

    // ✅ FIXED HERE
    if (!data || data.length === 0) return;

    const actualItem = selectedItem?.items ? selectedItem.items[0] : selectedItem;

    if (!actualItem || actualItem.lat == null || actualItem.lng == null) return;

    const { lat, lng } = actualItem;

    const nearbyPoints = data
      .flatMap((item) => (item.items ? item.items : [item]))
      .filter((item) => {
        if (item.lat == null || item.lng == null) return false;

        const distance =
          Math.abs(item.lat - lat) + Math.abs(item.lng - lng);
        return distance < 1;
      });

    if (nearbyPoints.length === 0) return;

    const heatData = nearbyPoints.flatMap(item => [
      [item.lat, item.lng, 1.5],
      [item.lat + 0.005, item.lng + 0.005, 1.2],
      [item.lat - 0.005, item.lng - 0.005, 1.2]
    ]);

    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    const heatLayer = window.L.heatLayer(heatData, {
      radius: 60,
      blur: 35,
      maxZoom: 18,
      max: 2.0,
      minOpacity: 0.6,
      gradient: {
        0.2: "blue",
        0.4: "lime",
        0.6: "yellow",
        0.8: "orange",
        1.0: "red"
      }
    });

    heatLayer.addTo(map);
    heatRef.current = heatLayer;

  }, [selectedItem, data, map]);

  return null;
};

/////////////////////////////////////////////////////

const MapView = ({ selectedItem, data }) => {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer
        center={[28.6139, 77.2090]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MapController selectedItem={selectedItem} />
        <HeatmapLayer data={data} selectedItem={selectedItem} />

        {/* 🔹 Markers */}
        {data.map((item, index) => {

          if (item.lat == null || item.lng == null) return null;

          const mainItem = item.items ? item.items[0] : item;

          return (
            <Marker
              key={index}
              position={[item.lat, item.lng]}
              icon={getMarkerIcon(mainItem.type)}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div style={{ minWidth: "200px" }}>
                  {item.items ? (
                    item.items.map((i, idx) => (
                      <div key={idx}>
                        <strong>{i.type}</strong>: {i.title}

                        {i.image && i.image.length > 0 && i.image[0] && (
                          <img
                            src={
                              i.image[0]?.startsWith("http")
                                ? i.image[0]
                                : `http://localhost:5000${i.image[0]}`
                            }
                            alt="intel"
                            style={{
                              width: "150px",
                              marginTop: "5px",
                              borderRadius: "6px"
                            }}
                          />
                        )}
                        <hr />
                      </div>
                    ))
                  ) : (
                    <>
                      <strong>{item.title}</strong>
                      <p>{item.type}</p>
                    </>
                  )}
                </div>
              </Tooltip>

              <Popup>
                <div style={{ minWidth: "180px" }}>
                  {item.items ? (
                    item.items.map((i, idx) => (
                      <div key={idx}>
                        <h4>{i.title}</h4>
                        <p><b>Type:</b> {i.type}</p>
                        <p>{i.description}</p>

                        {i.image && i.image.length > 0 && i.image[0] && (
                          <img
                            src={
                              i.image[0]?.startsWith("http")
                                ? i.image[0]
                                : `http://localhost:5000${i.image[0]}`
                            }
                            alt="intel"
                            style={{ width: "120px", margin: "5px", borderRadius: "6px" }}
                          />
                        )}
                        <hr />
                      </div>
                    ))
                  ) : (
                    <>
                      <h4>{item.title}</h4>
                      <p><b>Type:</b> {item.type}</p>
                      <p>{item.description}</p>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;