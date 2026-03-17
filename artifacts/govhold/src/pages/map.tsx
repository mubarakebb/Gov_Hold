import { useMemo } from "react";
import { Link } from "wouter";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Image as ImageIcon, MapPin } from "lucide-react";
import { useListReports } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";

// Fix leaflet default icon issue in Vite/Webpack
const createCustomIcon = (color: string) => L.divIcon({
  className: "custom-leaflet-marker",
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 drop-shadow-md"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const statusColors = {
  open: "#ef4444",        // destructive red
  in_progress: "#f59e0b", // amber
  resolved: "#10b981",    // emerald
};

export function MapView() {
  const { data: reports, isLoading } = useListReports();

  // Filter reports that actually have coordinates
  const validReports = useMemo(() => 
    reports?.filter(r => r.latitude != null && r.longitude != null) || [],
  [reports]);

  // Default center (e.g., center of US if no reports, or first report)
  const center: [number, number] = validReports.length > 0 
    ? [validReports[0].latitude!, validReports[0].longitude!]
    : [39.8283, -98.5795];

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-4rem)] relative">
        {/* Overlays / UI Panel */}
        <div className="absolute top-4 left-4 md:left-8 z-20 w-72 max-w-[calc(100vw-2rem)]">
          <div className="bg-white/90 backdrop-blur-md border border-border p-4 rounded-2xl shadow-xl">
            <h2 className="font-display font-bold text-lg mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Infrastructure Map
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {validReports.length} geolocated reports in your area.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-destructive border border-white shadow-sm" />
                <span className="font-medium text-foreground">Open</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm" />
                <span className="font-medium text-foreground">In Progress</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white shadow-sm" />
                <span className="font-medium text-foreground">Resolved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 bg-muted relative z-0">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-50">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
              <p className="font-medium text-muted-foreground">Loading map data...</p>
            </div>
          ) : (
            <MapContainer 
              center={center} 
              zoom={5} 
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              
              {validReports.map(report => (
                <Marker 
                  key={report.id} 
                  position={[report.latitude!, report.longitude!]}
                  icon={createCustomIcon(statusColors[report.status])}
                >
                  <Popup className="govwatch-popup">
                    <div className="w-64 -m-1">
                      {report.imageUrl ? (
                        <div className="w-full h-32 bg-muted relative">
                          <img 
                            src={report.imageUrl} 
                            alt={report.title} 
                            className="w-full h-full object-cover rounded-t-xl"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 bg-secondary flex items-center justify-center rounded-t-xl text-muted-foreground">
                          <ImageIcon className="w-6 h-6 opacity-50" />
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {report.category}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(report.createdAt))} ago
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-sm leading-tight mb-1">
                          {report.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {report.description}
                        </p>
                        <Link 
                          href="/" 
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          View Details &rarr;
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </Layout>
  );
}
