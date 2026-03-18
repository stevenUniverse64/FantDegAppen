import { useEffect, useRef } from "react";
import Hls from "hls.js";

export default function CameraMedia({ videoUrl, imageUrl, alt }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!videoUrl || !video) return;

    // Safari støtter HLS direkte
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
      return;
    }

    // Chrome/Edge trenger hls.js
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }
  }, [videoUrl]);

  if (videoUrl) {
    return (
      <video
        ref={videoRef}
        controls
        autoPlay
        muted
        playsInline
        style={{
          width: "260px",
          marginTop: "10px",
          borderRadius: "8px"
        }}
      />
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        style={{
          width: "260px",
          marginTop: "10px",
          borderRadius: "8px"
        }}
      />
    );
  }

  return <p>Ingen video eller bilde tilgjengelig.</p>;
}