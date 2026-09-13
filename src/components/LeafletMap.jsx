"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function makeIcon(emoji, color) {
  return L.divIcon({
    className: "",
    html: `<div class="pin" style="border-color:${color}">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function LeafletMap({ center, markers = [], line = null, zoom = 13, height = 380 }) {
  const safeCenter = center && center.length === 2 ? center : [28.6139, 77.209];
  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl">
      <MapContainer center={safeCenter} zoom={zoom} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={safeCenter} />
        {markers.map((m, i) => (
          <Marker
            key={`${m.lat}-${m.lng}-${i}`}
            position={[m.lat, m.lng]}
            icon={makeIcon(m.emoji || "📍", m.color || "#0f766e")}
          >
            {m.label ? <Popup>{m.label}</Popup> : null}
          </Marker>
        ))}
        {line && line.length > 1 ? (
          <Polyline positions={line} pathOptions={{ color: "#0f766e", dashArray: "6 8" }} />
        ) : null}
      </MapContainer>
    </div>
  );
}
