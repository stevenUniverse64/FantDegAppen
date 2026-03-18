import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import CameraMedia from "./CameraMedia";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer
} from "react-leaflet";



const OSLO_POSITION = [59.9139, 10.7522];

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function App() {
  const [cameras, setCameras] = useState([]);
  const [count, setCount] = useState(0);
  const [sourceLayer, setSourceLayer] = useState("");
  const [radiusKm, setRadiusKm] = useState(40);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // LOAD CAMERAS
  async function loadCameras(selectedRadiusKm) {
  setLoading(true);
  setError("");

  try {
    const url =
      selectedRadiusKm === "all"
        ? "http://localhost:3001/api/cameras"
        : `http://localhost:3001/api/cameras/oslo?radiusKm=${selectedRadiusKm}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    setCameras(data.cameras || []);
    setCount(data.count || 0);
    setSourceLayer(data.sourceLayer || "");
  } catch (err) {
    console.error(err);
    setError("Kunne ikke hente kameraer fra backend.");
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    loadCameras(radiusKm);
  }, [radiusKm]);

const markers = useMemo(() => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return cameras
    .filter((camera) => camera.lat != null && camera.lon != null)
    .filter((camera) => {
      if (!normalizedSearch) return true;

      const name = (camera.name ?? "").toLowerCase();
      const roadNumber = (camera.roadNumber ?? "").toLowerCase();
      const orientation = (camera.orientation ?? "").toLowerCase();

      return (
        name.includes(normalizedSearch) ||
        roadNumber.includes(normalizedSearch) ||
        orientation.includes(normalizedSearch)
      );
    });
}, [cameras, searchTerm]);

  return (
    <div className="page">
      <aside className="sidebar">
        <h1>Oslo trafikkkamera</h1>
        <p>
          Denne visningen henter kameraer fra Statens vegvesen via backend og
          viser dem på kart.
        </p>

        <div className="control-group">
          <label htmlFor="radius">Radius rundt Oslo sentrum</label>
          <select
            id="radius"
            value={radiusKm}
            onChange={(e) => {
              const value = e.target.value;
              setRadiusKm(value === "all" ? "all" : Number(value));
            }}
          >
            <option value={15}>15 km</option>
            <option value={25}>25 km</option>
            <option value={40}>40 km</option>
            <option value={60}>60 km</option>
            <option value={100}>100 km</option>
            <option value="all">Alle kameraer</option>
          </select>
        </div>

        <div className="status-box">
          <div><strong>Antall kameraer:</strong> {count}</div>
          <div><strong>Kildelag:</strong> {sourceLayer || "Ukjent"}</div>
          <div><strong>Status:</strong> {loading ? "Laster..." : "Klar"}</div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="info-box">
          <h2>Søk etter kamera</h2>

          <label htmlFor="camera-search">Kameranavn</label>
          <input
            id="camera-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Skriv inn navn, for eksempel Hjortnes"
            className="search-input"
          />

          <p style={{ marginTop: "12px" }}>
            Viser {markers.length} kamera{markers.length !== 1 ? "er" : ""}.
          </p>
        </div>
      </aside>

      <main className="map-wrapper">
        <MapContainer center={OSLO_POSITION} zoom={10} className="map">
          
          <TileLayer
            attribution='&copy; OpenStreetMap-bidragsytere'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {markers.map((camera) => (
              <Marker
                key={`${camera.id ?? camera.name}-${camera.lat}-${camera.lon}`}
                position={[camera.lat, camera.lon]}
                icon={camera.hasVideo ? greenIcon : blueIcon}
              >
              <Popup>
                <div>
                  <h3>{camera.name}</h3>

                  <p><strong>ID:</strong> {camera.id ?? "Ukjent"}</p>

                  <p>
                    <strong>Posisjon:</strong> {camera.lat.toFixed(5)}, {camera.lon.toFixed(5)}
                  </p>

                  <p>
                    <strong>Avstand fra Oslo:</strong> {camera.distanceKm?.toFixed(1)} km
                  </p>

                  {camera.roadNumber && (
                    <p><strong>Vei:</strong> {camera.roadNumber}</p>
                  )}

                  {camera.orientation && (
                    <p><strong>Retning:</strong> {camera.orientation}</p>
                  )}

                  {camera.hasVideo && (
                    <p style={{ color: "green" }}>Live video tilgjengelig</p>
                  )}

                  <CameraMedia
                    videoUrl={camera.videoUrl}
                    imageUrl={camera.imageUrl}
                    alt={camera.name}
                  />

                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}