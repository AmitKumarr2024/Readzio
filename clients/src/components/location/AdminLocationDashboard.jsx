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
  setGeoJsonFromCache,
} from "../../store/userSlice";
import { selectSocketState } from "../../store/socketSlice";
import Pagination from "../../Utils/Pagination";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TableVirtuoso } from "react-virtuoso";
import { throttle } from "lodash";
import { ErrorBoundary } from "react-error-boundary";
import LoadingBar from "../../Utils/LoadingBar";
import { cacheGeoJson, getCachedGeoJson } from "../../Utils/geojsonUtils";

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
    const cappedZoom = 10;
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
const MapErrorFallback = ({ error }) => (
  <div className="text-red-500 text-center p-4">
    Map failed to load: {error.message}
  </div>
);

const AdminLocationDashboard = () => {
  const dispatch = useDispatch();
  const { userLocations, geoJson, userId } = useSelector((state) => state.user);
  const { socket, userStatus } = useSelector(selectSocketState);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedUserLocation, setSelectedUserLocation] = useState(null);
  const pageSize = 10;

  const isLoading = userLocations.loading || geoJson.loading;

  useEffect(() => {
    const loadIndiaGeoJson = async () => {
      if (geoJson.loading || geoJson.data) return;

      try {
        const cached = await getCachedGeoJson();
        if (cached) {
          dispatch(setGeoJsonFromCache(cached));
        } else {
          const res = await dispatch(fetchIndiaGeoJson()).unwrap();
          await cacheGeoJson(res);
        }
      } catch (err) {
        console.error("[GeoJSON] load error", err.message);
      }
    };

    loadIndiaGeoJson();
  }, [dispatch, geoJson.loading, geoJson.data]);

  useEffect(() => {
    const handler = setTimeout(() => {
      dispatch(
        fetchAllUserLocations({
          page: currentPage,
          limit: pageSize,
          includeOffline: true,
        })
      );
    }, 300);
    return () => clearTimeout(handler);
  }, [dispatch, currentPage, pageSize]);

  useEffect(() => {
    if (!socket) return;
    const throttledHandler = throttle(
      (location) => {
        const name = location?.name || "Unknown";
        dispatch({
          type: "user/addUserLocation",
          payload: {
            ...location,
            name,
            state: formatLabel(location.state) || "Haryana",
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

  const indiaGeoJson = useMemo(() => {
    const features =
      geoJson.data?.features?.filter(
        (f) =>
          (f.geometry?.type === "Polygon" ||
            f.geometry?.type === "MultiPolygon") &&
          ["india", "in"].includes(
            (
              f.properties?.NAME_0 ||
              f.properties?.name ||
              f.properties?.admin ||
              f.properties?.iso ||
              f.properties?.country ||
              ""
            ).toLowerCase()
          )
      ) || [];
    return { type: "FeatureCollection", features };
  }, [geoJson.data]);

  const limitedGeoJson = useMemo(() => {
    const features =
      geoJson.data?.features
        ?.filter(
          (f) =>
            f.properties?.pincode &&
            (!selectedState ||
              formatLabel(f.properties?.state) === selectedState)
        )
        ?.slice(0, 25) || [];
    return { type: "FeatureCollection", features };
  }, [geoJson.data, selectedState]);

  const locations = useMemo(() => {
    const enrichedList =
      userLocations.list?.map((loc) => ({
        ...loc,
        name: loc?.name || "Unknown",
        state: formatLabel(loc?.state) || "Haryana",
        country: formatLabel(loc?.country) || "India",
        key: `${loc.userId}-${loc?.timestamp || loc?.name}`,
      })) || [];
    return { ...userLocations, list: enrichedList };
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
      ? data.filter(
          (loc) => loc.state && formatLabel(loc.state) === selectedState
        )
      : data;
    return filteredData.map((loc) => ({
      userId: loc.userId,
      name: loc?.name || "Unknown",
      state: formatLabel(loc?.state) || "Unknown",
      country: formatLabel(loc?.country) || "Unknown",
      status: userStatus[loc.userId]?.isOnline ? "Online" : "Offline",
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
      (loc) => userStatus[loc.userId]?.isOnline
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

  const mapCenter = [20.5937, 78.9629];
  const geoJsonStyle = {
    color: "#FF0000",
    weight: 4,
    opacity: 1,
    fillOpacity: 0,
  };

  return (
    <div className="space-y-4">
      <LoadingBar loading={isLoading} text="Fetching data..." />
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-1/4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4 shadow max-h-[60vh] overflow-y-auto relative">
          <h2 className="text-lg font-semibold mb-4">Locations</h2>
          <LoadingBar
            loading={userLocations.loading}
            text="Loading user locations..."
          />
          {locations.error ? (
            <p className="text-red-500">{locations.error}</p>
          ) : !Object.keys(groupedLocations).length ? (
            <p>No location data</p>
          ) : (
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
                              {groupedLocations[country].states[state].length})
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
            <ErrorBoundary FallbackComponent={MapErrorFallback}>
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
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  className="dark:filter dark:brightness-75 dark:contrast-125"
                  tileSize={256}
                  maxZoom={10}
                  keepBuffer={4}
                />
                <ZoomHandler
                  selectedCountry={selectedCountry}
                  selectedState={selectedState}
                  locations={locations}
                  selectedUserLocation={selectedUserLocation}
                  geoJson={geoJson}
                />
                {geoJson.loading && (
                  <div className="text-center p-2 z-10">Loading GeoJSON...</div>
                )}
                {geoJson.error && (
                  <div className="text-red-500 text-center p-2 z-10">
                    Error: {geoJson.error}
                  </div>
                )}
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
                {selectedCountry === "India" &&
                  limitedGeoJson.features.length > 0 && (
                    <GeoJSON
                      data={limitedGeoJson}
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
                              <strong>State:</strong> {formatLabel(loc?.state)}
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
            </ErrorBoundary>
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
            {tableData.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400">
                No users in selected location
              </p>
            ) : (
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
                          {loc?.state}
                        </td>
                        <td className="p-2 border-b border-gray-300 dark:border-gray-600">
                          {loc?.country}
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
              totalPages={Math.ceil(totalUsers / pageSize)}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLocationDashboard;
