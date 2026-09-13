"use client";

import dynamic from "next/dynamic";

// Leaflet needs the browser -> load the real map only on the client.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-500">
      Loading map…
    </div>
  ),
});

export default function MapView(props) {
  return <LeafletMap {...props} />;
}
