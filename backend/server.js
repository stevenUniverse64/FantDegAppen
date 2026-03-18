import express from "express";
import cors from "cors";
import { getVegvesenCctv } from "./sources/vegvesenCctv.js";

const app = express();
const PORT = 3001;

app.use(cors());

const OSLO_CENTER = {
  lat: 59.9139,
  lon: 10.7522
};

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/cameras", async (req, res) => {
  try {
    const { sourceLayer, cameras } = await getVegvesenCctv();

    res.json({
      sourceLayer,
      count: cameras.length,
      cameras
    });
  } catch (error) {
    res.status(500).json({
      error: "Kunne ikke hente kameraer",
      details: error.message
    });
  }
});

app.get("/api/cameras/oslo", async (req, res) => {
  try {
    const radiusKm = Number(req.query.radiusKm || 40);
    const { sourceLayer, cameras } = await getVegvesenCctv();

    const osloCameras = cameras
      .map((camera) => ({
        ...camera,
        distanceKm:
          camera.lat != null && camera.lon != null
            ? haversineDistanceKm(
                OSLO_CENTER.lat,
                OSLO_CENTER.lon,
                camera.lat,
                camera.lon
              )
            : null
      }))
      .filter((camera) => camera.distanceKm != null && camera.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      sourceLayer,
      radiusKm,
      count: osloCameras.length,
      cameras: osloCameras
    });
  } catch (error) {
    res.status(500).json({
      error: "Kunne ikke hente Oslo-kameraer",
      details: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend kjører på http://localhost:${PORT}`);
});