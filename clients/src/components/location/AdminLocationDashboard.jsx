import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  fetchAllUserLocations,
  fetchIndiaGeoJson,
  getUser,
  clearUserError,
} from "../../store/userSlice";
import { selectSocketState } from "../../store/socketSlice";
import Pagination from "../../Utils/Pagination";
import L from "leaflet";
import mongoose from "mongoose"; // Added for userId validation
import "leaflet/dist/leaflet.css";
import { TableVirtuoso } from "react-virtuoso";
import { throttle } from "lodash";
import { openDB } from "idb";
import { ErrorBoundary } from "react-error-boundary";
import LZString from "lz-string";
import LoadingBar from "../../Utils/LoadingBar";

// Cache GeoJSON in IndexedDB
const GEOJSON_CACHE_KEY = "india_geojson";
const DB_NAME = "GeoJSONCache";
const STORE_NAME = "geojson";

const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
};

const cacheGeoJson = async (data) => {
  try {
    if (!data?.type || data.type !== "FeatureCollection") return;
    const compressed = LZString.compressToUTF16(JSON.stringify(data));
    if (compressed.length / 1024 > 5000) {
      console.warn(
        "[AdminLocationDashboard] Compressed GeoJSON too large:",
        compressed.length / 1024,
        "KB"
      );
      return;
    }
    const db = await initDB();
    await db.put(STORE_NAME, compressed, GEOJSON_CACHE_KEY);
    console.info("[AdminLocationDashboard] GeoJSON cached successfully");
  } catch (e) {
    console.warn(
      "[AdminLocationDashboard] Failed to cache GeoJSON:",
      e.message
    );
  }
};

const getCachedGeoJson = async () => {
  try {
    const db = await initDB();
    const compressed = await db.get(STORE_NAME, GEOJSON_CACHE_KEY);
    if (!compressed) return null;
    const decompressed = LZString.decompressFromUTF16(compressed);
    const data = JSON.parse(decompressed);
    return data.type === "FeatureCollection" ? data : null;
  } catch (e) {
    console.warn(
      "[AdminLocationDashboard] Failed to retrieve cached GeoJSON:",
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
    const cappedZoom = 18;
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

// Error boundary fallback
const Fallback = ({ error, resetErrorBoundary }) => (
  <div className="text-red-500 text-center p-4">
    Error: {error.message}
    <button
      onClick={resetErrorBoundary}
      className="ml-4 text-blue-500 underline"
    >
      Retry
    </button>
  </div>
);

const AdminLocationDashboard = () => {
  const dispatch = useDispatch();
  const {
    user,
    userId,
    userLocations,
    geoJson,
    loading: userLoading,
    error: userError,
  } = useSelector((state) => state.user);
  const { socket, userStatus } = useSelector(selectSocketState);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedUserLocation, setSelectedUserLocation] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const pageSize = 10;

  const isLoading = userLoading || userLocations.loading || geoJson.loading;

  useEffect(() => {
    if (!user && !userId && !userLoading && retryCount < 3) {
      dispatch(getUser()).then((result) => {
        if (result.error) {
          console.error(
            "[AdminLocationDashboard] getUser failed:",
            result.error
          );
          setRetryCount((prev) => prev + 1);
        }
      });
    }
  }, [dispatch, user, userId, userLoading, retryCount]);

  useEffect(() => {
    if (userId && !geoJson.loading && !geoJson.data) {
      getCachedGeoJson().then((cachedGeoJson) => {
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
      });
    }
  }, [dispatch, userId, geoJson.data, geoJson.loading]);

  useEffect(() => {
    if (userId && user?.role === "admin") {
      dispatch(
        fetchAllUserLocations({
          page: currentPage,
          limit: pageSize,
        })
      );
    }
  }, [dispatch, userId, user, currentPage]);

  useEffect(() => {
    if (!socket) return;
    const throttledHandler = throttle(
      (location) => {
        if (
          !location?.userId ||
          !mongoose.Types.ObjectId.isValid(location.userId)
        ) {
          console.warn(
            "[AdminLocationDashboard] Invalid userId in location update:",
            location
          );
          return;
        }
        dispatch({
          type: "user/addUserLocation",
          payload: {
            ...location,
            name: location?.name || "Unknown",
            state: formatLabel(location.state) || "Unknown",
            country: formatLabel(location.country) || "India",
          },
        });
      },
      5000,
      { leading: true }
    );
    socket.on("userLocationUpdate", throttledHandler);
    return () => socket.off("userLocationUpdate", throttledHandler);
  }, [socket, dispatch]);

  useEffect(() => {
    console.info("[AdminLocationDashboard] GeoJSON:", {
      loading: geoJson.loading,
      error: geoJson.error,
      features: geoJson.data?.features?.length,
    });
    console.info("[AdminLocationDashboard] Locations:", {
      loading: userLocations.loading,
      error: userLocations.error,
      count: userLocations.list?.length,
    });
  }, [geoJson, userLocations]);

  const indiaGeoJson = useMemo(() => {
    const boundaryFeatures =
      geoJson.data?.features?.filter((f) => {
        const props = f.properties || {};
        const isIndia =
          ["india"].includes((props.Country || "").toLowerCase()) ||
          ["india"].includes((props.name || "").toLowerCase()) ||
          ["india"].includes((props.admin || "").toLowerCase()) ||
          ["in"].includes((props.iso || "").toLowerCase());
        const isValidGeometry =
          f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon";
        return isIndia && isValidGeometry;
      }) || [];
    return {
      type: "FeatureCollection",
      features: boundaryFeatures,
    };
  }, [geoJson.data]);

  const locations = useMemo(() => {
    const enrichedList =
      userLocations.list?.map((loc) => ({
        ...loc,
        name: loc?.name || "Unknown",
        state: formatLabel(loc?.state) || "Unknown",
        country: formatLabel(loc?.country) || "India",
        key: `${loc.userId}-${loc?.timestamp || loc?.name}`,
      })) || [];
    return {
      ...userLocations,
      list: enrichedList,
      totalPages: Math.max(
        1,
        Math.ceil((userLocations.total || enrichedList.length) / pageSize)
      ),
    };
  }, [userLocations]);

  const groupedLocations = useMemo(() => {
    const countries = {};
    locations.list?.forEach((loc) => {
      const country = formatLabel(loc.country);
      const state = formatLabel(loc.state);
      if (!countries[country]) countries[country] = { states: {}, count: 0 };
      if (!countries[country].states[state])
        countries[country].states[state] = [];
      countries[country].states[state].push({
        userId: loc.userId,
        coordinates: loc.coordinates,
        timestamp: loc.timestamp,
        pincode: loc.pincode,
        name: loc?.name,
        state: loc?.state,
        country: loc?.country,
      });
      countries[country].count++;
    });
    return countries;
  }, [locations.list]);

  const tableData = useMemo(() => {
    const data = selectedCountry
      ? Object.values(groupedLocations[selectedCountry]?.states || {}).flat()
      : locations.list || [];
    const filteredData = selectedState
      ? data.filter((loc) => formatLabel(loc.state) === selectedState)
      : data;
    return filteredData.map((loc) => ({
      userId: loc.userId,
      name: loc?.name || "Unknown",
      state: formatLabel(loc?.state) || "Unknown",
      country: formatLabel(loc?.country) || "India",
      status: userStatus?.[loc.userId]?.isOnline ? "Online" : "Offline",
      coordinates: loc.coordinates,
      timestamp: loc.timestamp,
    }));
  }, [
    selectedCountry,
    selectedState,
    groupedLocations,
    locations.list,
    userStatus,
  ]);

  const stateCounts = useMemo(() => {
    if (!selectedCountry || !selectedState) return null;
    const stateData =
      groupedLocations[selectedCountry]?.states[selectedState] || [];
    const online = stateData.filter(
      (loc) => userStatus?.[loc.userId]?.isOnline
    ).length;
    return {
      total: stateData.length,
      online,
      offline: stateData.length - online,
    };
  }, [selectedCountry, selectedState, groupedLocations, userStatus]);

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
    if (userId && user?.role === "admin") {
      dispatch(
        fetchAllUserLocations({
          page: currentPage,
          limit: pageSize,
        })
      );
    }
  }, [dispatch, user, userId, geoJson.data, currentPage]);

  const mapCenter = [20.5937, 78.9629];
  const geoJsonStyle = {
    color: "#FF0000",
    weight: 4,
    opacity: 1,
    fillOpacity: 0,
  };

  return (
    <ErrorBoundary FallbackComponent={Fallback} onReset={handleRetry}>
      <div className="space-y-4">
        <LoadingBar loading={isLoading} text="Fetching data..." />
        {(userError || geoJson.error || userLocations.error) && (
          <div className="text-red-500 text-center p-4">
            Error: {userError || geoJson.error || userLocations.error}
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
        {user && userId && user?.role !== "admin" && (
          <div className="text-center p-4">Admin access required</div>
        )}
        {user && userId && user?.role === "admin" && (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-1/4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow max-h-[60vh] overflow-y-auto relative">
              <h2 className="text-lg font-semibold mb-4">Locations</h2>
              {locations.list.length === 0 &&
                !locations.loading &&
                !locations.error && (
                  <p className="text-center text-gray-600 dark:text-gray-400">
                    No location data available
                  </p>
                )}
              {locations.list.length > 0 && (
                <div className="space-y-2">
                  {Object.keys(groupedLocations)
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
                          {country} ({groupedLocations[country].count})
                        </button>
                        {selectedCountry === country && (
                          <div className="pl-4 mt-2 space-y-1">
                            {Object.keys(groupedLocations[country].states)
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
                                    groupedLocations[country].states[state]
                                      .length
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
                  maxZoom={Math.floor(18 * 0.6)}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    className="dark:filter dark:brightness-75 dark:contrast-125"
                    tileSize={256}
                    maxZoom={18}
                    keepBuffer={4}
                  />
                  <ZoomHandler
                    selectedCountry={selectedCountry}
                    selectedState={selectedState}
                    locations={locations}
                    selectedUserLocation={selectedUserLocation}
                    geoJson={geoJson}
                  />
                  {indiaGeoJson.features?.length > 0 && (
                    <GeoJSON
                      data={indiaGeoJson}
                      style={geoJsonStyle}
                      zIndexOffset={1000}
                      onEachFeature={(feature, layer) => {
                        layer.bindPopup("<strong>India</strong>");
                      }}
                    />
                  )}
                  {selectedCountry === "India" && geoJson.data && (
                    <GeoJSON
                      data={geoJson.data}
                      style={() => ({
                        color: "#f63e02",
                        weight: 1,
                        opacity: 0.1,
                        fillOpacity: 0.1,
                      })}
                      zIndex={1000}
                    />
                  )}
                  <MarkerClusterGroup maxClusterRadius={20}>
                    {tableData
                      .filter(
                        (loc) => loc.coordinates?.lat && loc.coordinates?.lon
                      )
                      .map((loc, index) => (
                        <Marker
                          key={`${loc.userId}-${loc.timestamp || index}`}
                          position={[loc.coordinates.lat, loc.coordinates.lon]}
                          icon={customIcon}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p>
                                <strong>Name:</strong> {loc?.name || "Unknown"}
                              </p>
                              <p>
                                <strong>State:</strong>{" "}
                                {formatLabel(loc?.state)}
                              </p>
                              <p>
                                <strong>Country:</strong>{" "}
                                {formatLabel(loc?.country)}
                              </p>
                              <p>
                                <strong>Status:</strong>{" "}
                                {loc.status === "Online" ? (
                                  <span className="text-green-500 font-semibold">
                                    Online
                                  </span>
                                ) : (
                                  "Offline"
                                )}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </MarkerClusterGroup>
                </MapContainer>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow">
                <h2 className="text-lg font-semibold mb-4">
                  User Locations (Total: {totalUsers}, Offline: {offlineUsers})
                  {selectedState && stateCounts && (
                    <span className="ml-2 text-sm">
                      | {selectedState}: Total {stateCounts.total}, Online{" "}
                      {stateCounts.online}, Offline {stateCounts.offline}
                    </span>
                  )}
                </h2>
                {tableData.length === 0 &&
                  !locations.loading &&
                  !locations.error && (
                    <p className="text-center text-gray-600 dark:text-gray-400">
                      No users in selected location
                    </p>
                  )}
                {tableData.length > 0 && (
                  <div className="overflow-x-auto">
                    <TableVirtuoso
                      style={{ height: 300 }}
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
                              {loc?.country || "India"}
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
                  totalPages={locations.totalPages || 1}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AdminLocationDashboard;
