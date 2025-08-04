import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MapContainer,
  TileLayer,
  Popup,
  GeoJSON,
  Marker,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  fetchFollowerLocations,
  fetchIndiaGeoJson,
  getUser,
  clearUserError,
} from "../../store/userSlice";
import { selectSocketState } from "../../store/socketSlice";
import Pagination from "../../Utils/Pagination";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TableVirtuoso } from "react-virtuoso";
import { throttle } from "lodash";
import LZString from "lz-string";
import LoadingBar from "../../Utils/LoadingBar";

// Cache GeoJSON
const GEOJSON_CACHE_KEY = "india_geojson";

const cacheGeoJson = (data) => {
  try {
    if (!data?.type || data.type !== "FeatureCollection") return;
    const compressed = LZString.compressToUTF16(JSON.stringify(data));
    if (compressed.length / 1024 > 5000) return;
    localStorage.setItem(GEOJSON_CACHE_KEY, compressed);
    localStorage.setItem(
      `${GEOJSON_CACHE_KEY}_timestamp`,
      Date.now().toString()
    );
  } catch (e) {
    console.warn("[LocationDashboard] Failed to cache GeoJSON:", e.message);
  }
};

const getCachedGeoJson = () => {
  try {
    const compressed = localStorage.getItem(GEOJSON_CACHE_KEY);
    const cacheTimestamp = localStorage.getItem(
      `${GEOJSON_CACHE_KEY}_timestamp`
    );
    if (
      !compressed ||
      !cacheTimestamp ||
      Date.now() - parseInt(cacheTimestamp) > 24 * 60 * 60 * 1000
    ) {
      return null;
    }
    const data = JSON.parse(LZString.decompressFromUTF16(compressed));
    return data.type === "FeatureCollection" ? data : null;
  } catch (e) {
    console.warn(
      "[LocationDashboard] Failed to retrieve cached GeoJSON:",
      e.message
    );
    return null;
  }
};

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Format state/country names
const formatLabel = (str) =>
  str?.trim()
    ? str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase()
    : "Unknown";

// Map zoom handler
const ZoomHandler = ({
  selectedCountry,
  selectedState,
  locations,
  selectedUserLocation,
  geoJson,
}) => {
  const map = useMap();

  useEffect(() => {
    const cappedZoom = 5;
    map.options.maxZoom = cappedZoom;

    const defaultIndiaCenter = [20.5937, 78.9629];
    const defaultZoom = 4;

    const applyZoomWithCap = (bounds) => {
      const targetZoom = map.getBoundsZoom(bounds);
      const limitedZoom = Math.min(targetZoom, cappedZoom);
      map.fitBounds(bounds, { padding: [50, 50] });
      map.setZoom(limitedZoom);
    };

    if (selectedUserLocation?.lat && selectedUserLocation?.lon) {
      map.setView(
        [selectedUserLocation.lat, selectedUserLocation.lon],
        cappedZoom
      );
      return;
    }

    if (selectedState) {
      const stateLocations = locations.list.filter(
        (loc) =>
          formatLabel(loc.state) === selectedState &&
          loc.coordinates?.lat &&
          loc.coordinates?.lon
      );
      if (stateLocations.length >= 2) {
        const bounds = L.latLngBounds(
          stateLocations.map((loc) => [
            loc.coordinates.lat,
            loc.coordinates.lon,
          ])
        );
        applyZoomWithCap(bounds);
      } else {
        map.setView(defaultIndiaCenter, defaultZoom);
      }
      return;
    }

    if (selectedCountry) {
      const countryLocations = locations.list.filter(
        (loc) =>
          formatLabel(loc.country) === selectedCountry &&
          loc.coordinates?.lat &&
          loc.coordinates?.lon
      );

      if (
        selectedCountry === "India" &&
        geoJson?.data &&
        geoJson.data.type === "FeatureCollection"
      ) {
        const indiaLayer = L.geoJSON(geoJson.data);
        const indiaBounds = indiaLayer.getBounds();
        map.fitBounds(indiaBounds, { padding: [50, 50] });
        return;
      }

      if (countryLocations.length >= 5) {
        const bounds = L.latLngBounds(
          countryLocations.map((loc) => [
            loc.coordinates.lat,
            loc.coordinates.lon,
          ])
        );
        applyZoomWithCap(bounds);
      } else {
        map.setView(defaultIndiaCenter, defaultZoom);
      }
      return;
    }

    map.setView(defaultIndiaCenter, defaultZoom);
  }, [
    selectedCountry,
    selectedState,
    locations,
    selectedUserLocation,
    geoJson,
    map,
  ]);

  return null;
};

const LocationDashboard = () => {
  const dispatch = useDispatch();
  const {
    user,
    userId,
    geoJson,
    loading: userLoading,
    error: userError,
    followerLocations,
  } = useSelector((state) => state.user);
  const { socket, userStatus } = useSelector(selectSocketState);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState("India");
  const [selectedState, setSelectedState] = useState(null);
  const [selectedUserLocation, setSelectedUserLocation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const isLoading = userLoading || geoJson.loading || followerLocations.loading;
  const pageSize = 10;

  // Use static userIdToName since analyticsSlice is not used
  const userIdToName = useMemo(() => {
    const map = {};
    if (user && user._id) {
      map[user._id] = user.name || "Current User";
    }
    return map;
  }, [user]);

  useEffect(() => {
    if (!user && !userId && !userLoading && retryCount < 3) {
      dispatch(getUser()).then((result) => {
        if (result.error) {
          console.error("[LocationDashboard] getUser failed:", result.error);
          setRetryCount((prev) => prev + 1);
        }
      });
    }
  }, [dispatch, user, userId, userLoading, retryCount]);

  useEffect(() => {
    if (userId && !geoJson.loading && !geoJson.data) {
      const cachedGeoJson = getCachedGeoJson();
      if (cachedGeoJson) {
        dispatch({
          type: "user/fetchIndiaGeoJson/fulfilled",
          payload: cachedGeoJson,
        });
      } else {
        dispatch(fetchIndiaGeoJson()).then((result) => {
          if (result.payload && !result.error) {
            cacheGeoJson(result.payload);
          }
        });
      }
    }
  }, [dispatch, userId, geoJson.data, geoJson.loading]);

  useEffect(() => {
    if (userId) {
      dispatch(
        fetchFollowerLocations({
          page: currentPage,
          limit: pageSize,
          includeOffline: true,
        })
      );
    }
  }, [dispatch, userId, currentPage]);

  const handleLocationUpdate = useCallback(
    throttle(
      (location) => {
        if (
          !location?.userId ||
          !mongoose.Types.ObjectId.isValid(location.userId)
        ) {
          console.warn(
            "[LocationDashboard] Invalid userId in location update:",
            location
          );
          return;
        }
        dispatch({
          type: "user/addUserLocation",
          payload: {
            ...location,
            name: location.name || userIdToName[location.userId] || "Unknown",
            country: formatLabel(location.country) || "India",
          },
        });
      },
      1000,
      { leading: true }
    ),
    [dispatch, userIdToName]
  );

  useEffect(() => {
    if (socket) {
      socket.on("userLocationUpdate", handleLocationUpdate);
      return () => socket.off("userLocationUpdate", handleLocationUpdate);
    }
  }, [socket, handleLocationUpdate]);

  const filteredLocations = useMemo(() => {
    return followerLocations.list.filter(
      (loc) => loc.coordinates?.lat && loc.coordinates?.lon
    );
  }, [followerLocations.list]);

  const flatLocations = useMemo(() => {
    const list = filteredLocations.map((loc) => ({
      ...loc,
      name: loc.name || userIdToName[loc.userId] || "Unknown",
      country: formatLabel(loc.country) || "India",
      state: formatLabel(loc.state) || "Unknown",
      key: `${loc.userId}-${loc.timestamp || loc.name}`,
    }));
    return {
      ...followerLocations,
      list,
      totalPages: Math.max(
        1,
        Math.ceil((followerLocations.total || list.length) / pageSize)
      ),
    };
  }, [filteredLocations, userIdToName, followerLocations]);

  const tableData = useMemo(() => {
    const data = selectedCountry
      ? flatLocations.list.filter((loc) => loc.country === selectedCountry)
      : flatLocations.list;
    if (selectedState) {
      return data.filter((loc) => loc.state === selectedState);
    }
    return data.map((loc) => ({
      userId: loc.userId,
      name: loc.name,
      state: loc.state,
      country: loc.country,
      coordinates: loc.coordinates,
      timestamp: loc.timestamp,
      status: userStatus?.[loc.userId]?.isOnline ? "Online" : "Offline",
    }));
  }, [selectedCountry, selectedState, flatLocations.list, userStatus]);

  const paginatedData = useMemo(() => {
    return tableData.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );
  }, [tableData, currentPage]);

  const totalUsers = tableData.length;
  const offlineUsers = tableData.filter(
    (loc) => loc.status === "Offline"
  ).length;

  const handleRowClick = useCallback((loc) => {
    if (loc.coordinates?.lat && loc.coordinates?.lon) {
      setSelectedUserLocation(loc.coordinates);
    }
  }, []);

  const handleRetry = useCallback(() => {
    dispatch(clearUserError());
    setRetryCount(0);
    if (!user && !userId) {
      dispatch(getUser());
    }
    if (userId && !geoJson.data) {
      dispatch(fetchIndiaGeoJson());
    }
    if (userId) {
      dispatch(
        fetchFollowerLocations({
          page: currentPage,
          limit: pageSize,
          includeOffline: true,
        })
      );
    }
  }, [dispatch, user, userId, geoJson.data, currentPage]);

  const mapCenter = [20.5937, 78.9629];

  return (
    <div className="space-y-4">
      <LoadingBar loading={isLoading} text="Fetching data..." />
      {(userError || geoJson.error || flatLocations.error) && (
        <div className="text-red-500 text-center p-4">
          Error: {userError || geoJson.error || flatLocations.error}
          <button
            onClick={handleRetry}
            className="ml-4 text-blue-500 underline"
          >
            Retry
          </button>
        </div>
      )}
      {!user && !userId && userLoading && (
        <div className="text-center p-4">Loading user...</div>
      )}
      {!user && !userId && !userLoading && retryCount >= 3 && (
        <div className="text-center p-4">
          Please log in to view the dashboard
        </div>
      )}
      {user && userId && (
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="lg:w-1/4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow max-h-[60vh] overflow-y-auto relative">
            <h2 className="text-lg font-semibold mb-4">Follower Locations</h2>
            {flatLocations.list.length === 0 &&
              !flatLocations.loading &&
              !flatLocations.error && (
                <p className="text-center text-gray-600 dark:text-gray-400">
                  No location data available for your followers.
                </p>
              )}
            {flatLocations.list.length > 0 && (
              <div className="space-y-2">
                {[...new Set(flatLocations.list.map((loc) => loc.country))]
                  .filter((country) => country !== "Unknown")
                  .map((country) => (
                    <div key={country}>
                      <button
                        onClick={() => {
                          setSelectedCountry(
                            country === selectedCountry ? null : country
                          );
                          setSelectedState(null);
                          setSelectedUserLocation(null);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-sm ${
                          selectedCountry === country
                            ? "bg-gray-200 dark:bg-gray-700"
                            : ""
                        }`}
                      >
                        {country} (
                        {
                          flatLocations.list.filter(
                            (loc) => loc.country === country
                          ).length
                        }
                        )
                      </button>
                      {selectedCountry === country && (
                        <div className="pl-4 mt-2 space-y-1">
                          {[
                            ...new Set(
                              flatLocations.list
                                .filter((loc) => loc.country === country)
                                .map((loc) => loc.state)
                            ),
                          ]
                            .filter((state) => state !== "Unknown")
                            .map((state) => (
                              <button
                                key={state}
                                onClick={() => {
                                  setSelectedState(
                                    state === selectedState ? null : state
                                  );
                                  setSelectedUserLocation(null);
                                  setCurrentPage(1);
                                }}
                                className={`w-full text-left p-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm ${
                                  selectedState === state
                                    ? "bg-gray-300 dark:bg-gray-600"
                                    : ""
                                }`}
                              >
                                {state} (
                                {
                                  flatLocations.list.filter(
                                    (loc) =>
                                      loc.country === country &&
                                      loc.state === state
                                  ).length
                                }
                                )
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div className="lg:w-3/4 space-y-4 relative">
            <div className="h-[300px] sm:h-[400px] lg:h-[500px] rounded-lg shadow relative z-0">
              <MapContainer
                center={mapCenter}
                zoom={4}
                style={{
                  height: "100%",
                  width: "100%",
                  backgroundColor: "transparent",
                }}
                className="rounded-lg z-0"
                maxZoom={10}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>'
                  className="dark:filter dark:brightness-75 dark:contrast-125"
                  tileSize={256}
                  maxZoom={18}
                  keepBuffer={4}
                />
                <ZoomHandler
                  selectedCountry={selectedCountry}
                  selectedState={selectedState}
                  locations={flatLocations}
                  selectedUserLocation={selectedUserLocation}
                  geoJson={geoJson}
                />
                {selectedCountry === "India" && geoJson.data && (
                  <GeoJSON
                    data={geoJson.data}
                    style={() => ({
                      color: "#f63e02",
                      weight: 1,
                      opacity: 0.1,
                      fillOpacity: 0.4,
                    })}
                    zIndex={1000}
                  />
                )}
              </MapContainer>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow">
              <h2 className="text-lg font-semibold mb-4">
                Follower Locations (Total: {totalUsers}, Offline: {offlineUsers}
                )
              </h2>
              {tableData.length === 0 &&
                !flatLocations.error &&
                !flatLocations.loading && (
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    No location data available for your followers.
                  </p>
                )}
              {tableData.length > 0 && (
                <div className="overflow-x-auto">
                  <TableVirtuoso
                    style={{ height: "50vh" }}
                    data={paginatedData}
                    fixedItemHeight={48}
                    components={{
                      Table: ({ style, ...props }) => (
                        <table
                          className="w-full text-left text-sm"
                          style={style}
                          {...props}
                        />
                      ),
                      TableHead: () => (
                        <thead>
                          <tr>
                            <th className="p-2 border-b border-gray-300 dark:border-gray-600">
                              Name
                            </th>
                            <th className="p-2 border-b border-gray-300 dark:border-gray-600">
                              State
                            </th>
                            <th className="p-2 border-b border-gray-300 dark:border-gray-600">
                              Country
                            </th>
                            <th className="p-2 border-b border-gray-300 dark:border-gray-600">
                              Status
                            </th>
                          </tr>
                        </thead>
                      ),
                      TableRow: ({ item: loc }) => (
                        <tr
                          className="hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                          onClick={() => handleRowClick(loc)}
                        >
                          <td className="p-2 border-b border-gray-300 dark:border-gray-600">
                            {loc?.name || "Unknown"}
                          </td>
                          <td className="p-2 border-b border-gray-300 dark:border-gray-600">
                            {loc?.state || "Unknown"}
                          </td>
                          <td className="p-2 border-b border-gray-300 dark:border-gray-600">
                            {loc?.country || "Unknown"}
                          </td>
                          <td className="p-2 border-b border-gray-300 dark:border-gray-600">
                            {loc.status === "Online" ? (
                              <span className="text-green-500 font-semibold">
                                Online
                              </span>
                            ) : (
                              "Offline"
                            )}
                          </td>
                        </tr>
                      ),
                    }}
                  />
                </div>
              )}
              <Pagination
                currentPage={currentPage}
                totalPages={flatLocations.totalPages || 1}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDashboard;
