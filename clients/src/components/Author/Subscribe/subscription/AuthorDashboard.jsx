import React, { useEffect, useState, useRef, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, ZoomControl } from "react-leaflet";
import { motion } from "framer-motion";
import { Loader2, MapPin } from "lucide-react";
import { fetchAllUserLocations, clearUserError } from "../../../store/userSlice";
import L from "leaflet";
import * as turf from "@turf/turf";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import MarkerClusterGroup from "react-leaflet-cluster";

const worldGeoJSON = React.lazy(() => import("../../../../public/data/world-countries.json"));
const indiaGeoJSON = React.lazy(() => import("../../../../public/data/india-accurate.json"));

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const LiveLocationMap = () => {
  const dispatch = useDispatch();
  const mapRef = useRef(null);
  const { userLocations, user } = useSelector((state) => state.user);
  const { role } = useSelector((state) => state.auth);
  const { userLocations: socketLocations } = useSelector((state) => state.socket);
  const [countryFilter, setCountryFilter] = useState([]);
  const [geoJSONLoaded, setGeoJSONLoaded] = useState({ world: false, india: false });
  const [theme, setTheme] = useState("light_all");
  const [worldGeoData, setWorldGeoData] = useState(null);
  const [indiaGeoData, setIndiaGeoData] = useState(null);
  const [error, setError] = useState(null);

  // Sync theme with Tailwind dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark_all" : "light_all");
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark_all" : "light_all");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Load GeoJSON files
  useEffect(() => {
    worldGeoJSON.then((data) => setWorldGeoData(data.default || data)).catch((err) => {
      console.error("Failed to load world-countries.json:", err);
      setError("Failed to load world map data");
    });
    indiaGeoJSON.then((data) => setIndiaGeoData(data.default || data)).catch((err) => {
      console.error("Failed to load india-accurate.json:", err);
      setError("Failed to load India map data");
    });
  }, []);

  // Fetch user locations
  useEffect(() => {
    if (role === "admin") {
      dispatch(fetchAllUserLocations({ page: 1, limit: 50 }));
    }
  }, [dispatch, role]);

  // Spatial lookup for state from coordinates
  const getStateFromCoordinates = (lat, lon, geojson) => {
    if (!geojson || !lat || !lon || isNaN(lat) || isNaN(lon)) return null;
    try {
      const point = turf.point([lon, lat]);
      for (const feature of geojson.features) {
        if (turf.booleanPointInPolygon(point, feature)) {
          return feature.properties?.NAME_1 || feature.properties?.name || null;
        }
      }
    } catch (err) {
      console.error("Error in state lookup:", err);
    }
    return null;
  };

  // Define allLocations
  const { list: locations, loading } = userLocations;
  const allLocations = useMemo(
    () =>
      [...locations, ...socketLocations]
        .filter(
          (loc) =>
            loc &&
            loc.coordinates &&
            typeof loc.coordinates === "object" &&
            typeof loc.coordinates.lat === "number" &&
            typeof loc.coordinates.lon === "number" &&
            !isNaN(loc.coordinates.lat) &&
            !isNaN(loc.coordinates.lon)
        )
        .map((loc) => ({
          ...loc,
          state:
            loc.state ||
            (loc.country === "India" && indiaGeoData
              ? getStateFromCoordinates(loc.coordinates.lat, loc.coordinates.lon, indiaGeoData)
              : null),
        })),
    [locations, socketLocations, indiaGeoData]
  );

  // Zoom to selected country (debounced)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (mapRef.current && countryFilter.length === 1 && geoJSONLoaded.world && geoJSONLoaded.india) {
        const selectedCountry = countryFilter[0];
        const countryLocations = allLocations.filter(
          (loc) => loc.country === selectedCountry && loc.coordinates?.lat && loc.coordinates?.lon
        );
        if (countryLocations.length > 0) {
          const bounds = L.latLngBounds(
            countryLocations.map((loc) => [loc.coordinates.lat, loc.coordinates.lon])
          );
          mapRef.current.fitBounds(bounds, { maxZoom: 6, padding: [50, 50] });
        }
      } else if (mapRef.current && countryFilter.length === 0) {
        mapRef.current.setView([20, 0], 2);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [countryFilter, geoJSONLoaded, allLocations]);

  if (role !== "admin") return null;

  // Calculate country and state population
  const countryPopulation = useMemo(
    () =>
      allLocations.reduce((acc, loc) => {
        if (loc.country && loc.country !== "Unknown") {
          acc[loc.country] = (acc[loc.country] || 0) + 1;
        }
        return acc;
      }, {}),
    [allLocations]
  );

  const statePopulation = useMemo(
    () =>
      allLocations.reduce((acc, loc) => {
        if (loc.country === "India" && loc.state && loc.state !== "Unknown") {
          acc[loc.state] = (acc[loc.state] || 0) + 1;
        }
        return acc;
      }, {}),
    [allLocations]
  );

  const maxCountryPopulation = Math.max(...Object.values(countryPopulation), 1);
  const maxStatePopulation = Math.max(...Object.values(statePopulation), 1);
  const countries = useMemo(
    () => [...new Set(allLocations.map((loc) => loc.country).filter((c) => c && c !== "Unknown"))].sort(),
    [allLocations]
  );
  const states = useMemo(
    () =>
      [...new Set(allLocations.filter((loc) => loc.country === "India").map((loc) => loc.state).filter((s) => s && s !== "Unknown"))].sort(),
    [allLocations]
  );

  const filteredLocations = useMemo(
    () => allLocations.filter((loc) => countryFilter.length === 0 || countryFilter.includes(loc.country)),
    [allLocations, countryFilter]
  );

  // Color styling with vibrant palette
  const getCountryColor = (countryName) => {
    const count = countryPopulation[countryName] || 0;
    if (count === 0) return "#E5E7EB";
    const ratio = count / maxCountryPopulation;
    const hue = 280 - ratio * 100;
    return `hsl(${hue}, 85%, 60%)`;
  };

  const getStateColor = (stateName) => {
    const count = statePopulation[stateName] || 0;
    if (count === 0) return "#E5E7EB";
    const ratio = count / maxStatePopulation;
    const hue = 280 - ratio * 100;
    return `hsl(${hue}, 85%, 60%)`;
  };

  const countryStyle = (feature) => ({
    fillColor: getCountryColor(feature.properties?.ADMIN || feature.properties?.name || ""),
    weight: 3,
    color: document.documentElement.classList.contains("dark") ? "#cccccc" : "#ffffff",
    fillOpacity: 0.8,
    className: "transition-all duration-300 hover:fill-opacity-1",
  });

  const stateStyle = (feature) => ({
    fillColor: getStateColor(feature.properties?.NAME_1 || feature.properties?.name || ""),
    weight: 5,
    color: document.documentElement.classList.contains("dark") ? "#cccccc" : "#ffffff",
    fillOpacity: 1.0,
    className: "transition-all duration-300 hover:fill-opacity-1",
  });

  // Blinking marker
  const getMarkerIcon = (isOnline) =>
    L.divIcon({
      className: `custom-marker ${isOnline ? "online" : "offline"}`,
      html: `
        <div style="
          background-color: ${isOnline ? "#10B981" : "#F87171"};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 3px solid ${document.documentElement.classList.contains("dark") ? "#cccccc" : "#ffffff"};
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: ${isOnline ? "blink 1.2s infinite ease-in-out" : "none"};
        "></div>
        <style>
          @keyframes blink {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
          }
        </style>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  // Add state labels
  const addStateLabels = (feature, layer) => {
    if (countryFilter.includes("India")) {
      const name = feature.properties?.NAME_1 || feature.properties?.name || "India";
      const count = statePopulation[name] || 0;
      layer.bindTooltip(`${name}: ${count} users`, {
        permanent: true,
        direction: "center",
        className: "text-sm font-bold bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark bg-opacity-80 rounded-lg shadow-md",
      });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-6 bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-2xl shadow-xl border border-gray-300 dark:border-gray-700 max-w-7xl mx-auto"
    >
      <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <MapPin className="w-7 h-7 text-indigo-500 dark:text-indigo-400" /> Global User Activity
      </h3>

      <div className="mb-6">
        <label className="block text-sm font-medium text-text-main-light dark:text-text-main-dark mb-2">
          Select Countries
        </label>
        <select
          multiple
          value={countryFilter}
          onChange={(e) => setCountryFilter([...e.target.selectedOptions].map((opt) => opt.value))}
          className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-text-main-light dark:text-text-main-dark focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all duration-300"
        >
          {countries.map((country) => (
            <option key={country} value={country} className="py-2">
              {country}
            </option>
          ))}
        </select>
      </div>

      {countryFilter.includes("India") && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-text-main-light dark:text-text-main-dark mb-3">Indian States</h4>
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="p-3 text-left text-text-main-light dark:text-text-main-dark text-sm font-medium">State</th>
                  <th className="p-3 text-left text-text-main-light dark:text-text-main-dark text-sm font-medium">Users</th>
                </tr>
              </thead>
              <tbody>
                {states.length > 0 ? (
                  states.map((state) => (
                    <tr
                      key={state}
                      className="hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
                      style={{ backgroundColor: getStateColor(state) }}
                    >
                      <td className="p-3 text-text-main-light dark:text-text-main-dark">{state}</td>
                      <td className="p-3 text-text-main-light dark:text-text-main-dark">{statePopulation[state] || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="p-3 text-center text-text-main-light dark:text-text-main-dark">
                      No state data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-500 dark:text-indigo-400" />
          <span className="text-text-main-light dark:text-text-main-dark mt-2">Loading user data...</span>
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => {
              dispatch(clearUserError());
              setError(null);
            }}
            className="text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-full p-2 transition"
          >
            Clear
          </button>
        </div>
      )}
      {!loading && !error && filteredLocations.length === 0 && (
        <p className="text-text-main-light dark:text-text-main-dark text-center">No location data available</p>
      )}
      {!loading && !error && filteredLocations.length > 0 && (
        <div className="w-full h-[600px] rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 shadow-lg bg-background-light dark:bg-background-dark">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={2}
            maxZoom={6}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
            ref={mapRef}
            zoomControl={false}
            dragging={true}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={true}
          >
            <ZoomControl position="bottomright" />
            <TileLayer
              url={`https://{s}.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}{r}.png`}
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> & <a href="https://carto.com/attributions">CARTO</a>'
              className="leaflet-tile"
            />
            <React.Suspense fallback={<div className="text-text-main-light dark:text-text-main-dark">Loading map data...</div>}>
              {worldGeoData && !countryFilter.includes("India") && (
                <GeoJSON
                  data={worldGeoData}
                  style={countryStyle}
                  onEachFeature={(feature, layer) => {
                    const country = feature.properties?.ADMIN || feature.properties?.name || "";
                    if (country !== "India") {
                      const count = countryPopulation[country] || 0;
                      if (count > 0) {
                        layer.bindTooltip(`${country}: ${count} users`, {
                          permanent: false,
                          direction: "auto",
                          className: "text-sm font-semibold bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark rounded-lg shadow-md",
                        });
                      }
                    }
                  }}
                  eventHandlers={{
                    add: () => setGeoJSONLoaded((prev) => ({ ...prev, world: true })),
                  }}
                />
              )}
              {indiaGeoData && countryFilter.includes("India") && (
                <GeoJSON
                  data={indiaGeoData}
                  style={stateStyle}
                  onEachFeature={(feature, layer) => {
                    const name = feature.properties?.NAME_1 || feature.properties?.name || "India";
                    const count = statePopulation[name] || 0;
                    layer.bindTooltip(`${name}: ${count} users`, {
                      permanent: true,
                      direction: "center",
                      className: "text-sm font-bold bg-background-light dark:bg-background-dark text-text-main-light dark:text-text-main-dark bg-opacity-80 rounded-lg shadow-md",
                    });
                    addStateLabels(feature, layer);
                  }}
                  eventHandlers={{
                    add: () => setGeoJSONLoaded((prev) => ({ ...prev, india: true })),
                  }}
                />
              )}
            </React.Suspense>
            <MarkerClusterGroup maxClusterRadius={40}>
              {filteredLocations.map((location) => (
                <Marker
                  key={location._id || location.userId}
                  position={[location.coordinates.lat, location.coordinates.lon]}
                  icon={getMarkerIcon(location.userId?.isOnline)}
                >
                  <Popup>
                    <div className="flex items-center gap-3 p-2">
                      {location.userId?.avatar && (
                        <img
                          src={location.userId.avatar}
                          alt={location.userId.name || "User"}
                          className="w-10 h-10 rounded-full border-2 border-gray-600 dark:border-gray-400"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-text-main-light dark:text-text-main-dark">{location.userId?.name || "Unknown"}</p>
                        <p className="text-sm text-text-main-light dark:text-text-main-dark">{location.userId?.email || "No email"}</p>
                        <p className="text-sm text-text-main-light dark:text-text-main-dark">
                          {location.city}, {location.state || location.country}
                        </p>
                        <p className="text-sm text-text-main-light dark:text-text-main-dark">
                          Last seen: {new Date(location.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      )}
    </motion.div>
  );
};

export default LiveLocationMap;