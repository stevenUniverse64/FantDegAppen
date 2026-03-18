
const POSSIBLE_LAYER_NAMES = [
  "datex_3_1:CctvSimple_v2",
  "datex_3_1:CctvSimple",
  "datex_3_1:CctvStatus",
  "datex_3_1:Cctv",
  "datex_3_1:TrafficMonitoring",
  "datex_3_1:WeatherStation"
];
async function fetchLayer(typeName) {
  const attempts = [
    {
      baseUrl: "https://ogckart-sn1.atlas.vegvesen.no/datex_3_1/wfs",
      params: {
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: typeName,
        outputFormat: "application/json",
        count: "10000"
      }
    },
    {
      baseUrl: "https://ogckart-sn1.atlas.vegvesen.no/datex_3_1/ows",
      params: {
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: typeName,
        outputFormat: "application/json",
        count: "10000"
      }
    },
    {
      baseUrl: "https://ogckart-sn1.atlas.vegvesen.no/datex_3_1/wfs",
      params: {
        service: "WFS",
        version: "1.1.0",
        request: "GetFeature",
        typeName: typeName,
        outputFormat: "application/json",
        maxFeatures: "10000"
      }
    }
  ];

  let lastError = null;

  for (const attempt of attempts) {
    const url =
      `${attempt.baseUrl}?` + new URLSearchParams(attempt.params).toString();

    console.log("Kaller:", url);

    try {
      const response = await fetch(url);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
      }

      if (text.trim().startsWith("<")) {
        throw new Error(`Fikk XML i stedet for JSON: ${text.slice(0, 500)}`);
      }

      const data = JSON.parse(text);

      if (!data || !Array.isArray(data.features)) {
        throw new Error("Svar mangler features-array");
      }

      return data;
    } catch (error) {
      lastError = new Error(`${url}\n${error.message}`);
      console.error(lastError.message);
    }
  }

  throw lastError || new Error(`Ingen vellykkede kall for ${typeName}`);
}

async function fetchCameraData() {
  let lastError = null;

  for (const layerName of POSSIBLE_LAYER_NAMES) {
    try {
      const data = await fetchLayer(layerName);
      if (data.features.length > 0) {
        return { layerName, data };
      }
    } catch (error) {
      console.error(`Feil på lag ${layerName}:`, error.message);
      lastError = error;
    }
  }

  throw lastError || new Error("Fant ikke et gyldig kamera-lag");
}

function mapFeatureToCamera(feature) {
  const coords = feature?.geometry?.coordinates || [];
  const p = feature?.properties || {};

  const lon = coords[0] ?? null;
  const lat = coords[1] ?? null;
  const hasVideo = (p.VIDEO_SERVICE_LEVEL ?? 0) > 0;

  return {
    id: p.CAMERA_ID ?? p.RECORD_ID ?? p.id ?? null,
    name: p.DESCRIPTION ?? p.description ?? "Ukjent kamera",
    orientation: p.ORIENTATION_DESCRIPTION ?? p.orientationDescription ?? null,
    roadNumber: p.ROAD_NUMBER ?? p.roadNumber ?? null,
    imageUrl: p.STILL_IMAGE_URL ?? p.stillImageUrl ?? null,
    videoServiceLevel: p.VIDEO_SERVICE_LEVEL ?? p.videoServiceLevel ?? 0,
    videoEncoding: p.VIDEO_ENCODING_STANDARD ?? p.videoEncodingStandard ?? null,
    videoUrl:
      p.videoUrl ??
      p.VIDEO_URL ??
      (hasVideo
        ? `https://kamera.vegvesen.no/public/${p.CAMERA_ID}/manifest.m3u8`
        : null),
    hasVideo,
    lat,
    lon,
    rawProperties: p,
    source: "vegvesen-cctv"
  };
}
export async function getVegvesenCctv() {
  const { layerName, data } = await fetchCameraData();

  const cameras = data.features
    .map(mapFeatureToCamera)
    .filter((camera) => camera.lat != null && camera.lon != null);

  return {
    sourceLayer: layerName,
    cameras
  };
}