import { useEffect, useState, useMemo } from "react";
import {
  Ambulance,
  Flame,
  MapPin,
  Shield,
  Siren,
  Wrench,
  Radio,
  HeartPulse,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  X,
  Phone,
  User,
  Info,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import "./CampusMap.css";

// PRECISE RESOURCE FLEET LOCATIONS ON SATELLITE MAP
const RESOURCE_POSITIONS = {
  "SEC-001": { x: 17.5, y: 38.0 },
  "SEC-002": { x: 38.0, y: 48.0 },
  "AMB-001": { x: 42.0, y: 83.0 },
  "AMB-002": { x: 70.0, y: 65.0 },
  "FAU-001": { x: 44.0, y: 53.0 },
  "FAU-002": { x: 60.0, y: 56.0 },
  "FAC-001": { x: 35.0, y: 58.0 },
  "FAC-002": { x: 53.0, y: 68.0 },
  "VEH-001": { x: 60.0, y: 25.0 },
  "VEH-002": { x: 15.0, y: 28.0 },
  "COM-001": { x: 58.0, y: 36.0 },
  "COM-002": { x: 26.0, y: 32.0 },
};

const RESOURCE_ICONS = {
  Security: Shield,
  Medical: Ambulance,
  "First Aid": HeartPulse,
  Facilities: Wrench,
  Transport: Siren,
  Communication: Radio,
};

const RESOURCE_CLASSES = {
  Security: "security",
  Medical: "medical",
  "First Aid": "medical",
  Facilities: "facilities",
  Transport: "transport",
  Communication: "communication",
};

// CAMPUS BUILDINGS (SUBTLE MAP LABELS)
const CAMPUS_BUILDINGS = [
  { name: "A Block", x: 12.5, y: 44.5, type: "Academic Complex A", defaultSafe: "Playground" },
  { name: "Main Gate", x: 12.5, y: 33.5, type: "Primary Campus Exit Gate", defaultSafe: "Convocation Hall" },
  { name: "Library", x: 23.5, y: 36.0, type: "NTR Central Library", defaultSafe: "Convocation Hall" },
  { name: "H Block", x: 24.8, y: 54.5, type: "Humanities & Sciences H", defaultSafe: "Playground" },
  { name: "N Block", x: 49.2, y: 51.0, type: "Science & Technology N", defaultSafe: "Convocation Hall" },
  { name: "U Block", x: 55.4, y: 42.0, type: "Administrative Complex U", defaultSafe: "Convocation Hall" },
  { name: "Pharmacy Block", x: 46.2, y: 87.0, type: "Pharmacy College / Labs", defaultSafe: "Playground" },
];

// CONFIGURED SAFE ASSEMBLY ZONES
const SAFE_ZONES = [
  {
    name: "Convocation Hall",
    x: 63.5,
    y: 36.5,
    label: "SAFE SHELTER",
    description: "Indoor Assembly Auditorium & Emergency Command Shelter",
  },
  {
    name: "Playground",
    x: 64.0,
    y: 53.0,
    label: "SAFE ZONE ALPHA",
    description: "Open-Air Athletic Ground & Primary Muster Assembly Area",
  },
];

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// FUZZY LOCATION NORMALIZATION
function normalizeLocation(rawLocation) {
  if (!rawLocation) return "General Campus";
  const val = rawLocation.toLowerCase().trim();

  if (val.includes("n block") || val.includes("block n") || val === "n") return "N Block";
  if (val.includes("a block") || val.includes("block a") || val === "a") return "A Block";
  if (val.includes("h block") || val.includes("block h") || val === "h") return "H Block";
  if (val.includes("u block") || val.includes("block u") || val === "u") return "U Block";
  if (val.includes("library") || val.includes("ntr") || val === "l") return "Library";
  if (val.includes("pharmacy") || val.includes("pharm") || val === "p") return "Pharmacy Block";
  if (val.includes("main gate") || val.includes("gate") || val.includes("entrance") || val === "m") return "Main Gate";
  if (val.includes("playground") || val.includes("ground") || val.includes("sports")) return "Playground";
  if (val.includes("convocation") || val.includes("auditorium") || val.includes("hall")) return "Convocation Hall";

  return "N Block";
}

// DYNAMIC EVACUATION ROUTE CALCULATION
function calculateDynamicEvacuation(incidentLoc, incidentType = "General") {
  const normLoc = normalizeLocation(incidentLoc);

  if (normLoc === "Playground") {
    return {
      destination: "Playground (Safe Zone Alpha)",
      path: [{ x: 64.0, y: 53.0 }, { x: 64.0, y: 53.0 }],
      instructions: [
        "You are located at designated Safe Zone Alpha (Playground).",
        "Remain in open area away from structures.",
        "Await instructions from campus safety marshals.",
      ],
      hazardLocation: normLoc,
    };
  }

  if (normLoc === "Convocation Hall") {
    return {
      destination: "Convocation Hall (Safe Shelter)",
      path: [{ x: 63.5, y: 36.5 }, { x: 63.5, y: 36.5 }],
      instructions: [
        "You are located at designated Safe Shelter (Convocation Hall).",
        "Remain inside the assembly area.",
        "Follow emergency command briefings.",
      ],
      hazardLocation: normLoc,
    };
  }

  let chosenDestination = "Convocation Hall";
  let path = [];
  let steps = [];

  if (normLoc === "N Block") {
    chosenDestination = "Convocation Hall (Safe Shelter)";
    path = [
      { x: 49.2, y: 51.0 }, // N Block exit
      { x: 55.4, y: 42.0 }, // U Block corridor
      { x: 63.5, y: 36.5 }, // Convocation Hall
    ];
  } else if (normLoc === "A Block") {
    chosenDestination = "Playground (Safe Zone Alpha)";
    path = [
      { x: 12.5, y: 44.5 }, // A Block
      { x: 24.8, y: 54.5 }, // H Block East Pathway
      { x: 42.0, y: 56.0 }, // Central Avenue
      { x: 64.0, y: 53.0 }, // Playground
    ];
  } else if (normLoc === "Library") {
    chosenDestination = "Convocation Hall (Safe Shelter)";
    path = [
      { x: 23.5, y: 36.0 }, // Library
      { x: 38.0, y: 42.0 }, // North Corridor
      { x: 55.4, y: 42.0 }, // U Block
      { x: 63.5, y: 36.5 }, // Convocation Hall
    ];
  } else if (normLoc === "H Block") {
    chosenDestination = "Playground (Safe Zone Alpha)";
    path = [
      { x: 24.8, y: 54.5 }, // H Block exit
      { x: 42.0, y: 56.0 }, // Central Avenue
      { x: 64.0, y: 53.0 }, // Playground
    ];
  } else if (normLoc === "U Block") {
    chosenDestination = "Convocation Hall (Safe Shelter)";
    path = [
      { x: 55.4, y: 42.0 }, // U Block
      { x: 63.5, y: 36.5 }, // Convocation Hall
    ];
  } else if (normLoc === "Pharmacy Block") {
    chosenDestination = "Playground (Safe Zone Alpha)";
    path = [
      { x: 46.2, y: 87.0 }, // Pharmacy Block
      { x: 56.0, y: 72.0 }, // East Road
      { x: 64.0, y: 53.0 }, // Playground
    ];
  } else if (normLoc === "Main Gate") {
    chosenDestination = "Convocation Hall (Safe Shelter)";
    path = [
      { x: 12.5, y: 33.5 }, // Main Gate
      { x: 23.5, y: 36.0 }, // Library
      { x: 55.4, y: 42.0 }, // U Block
      { x: 63.5, y: 36.5 }, // Convocation Hall
    ];
  } else {
    chosenDestination = "Playground (Safe Zone Alpha)";
    path = [
      { x: 40.0, y: 50.0 },
      { x: 55.0, y: 52.0 },
      { x: 64.0, y: 53.0 },
    ];
  }

  const typeLower = (incidentType || "").toLowerCase();

  if (typeLower.includes("fire") || typeLower.includes("smoke")) {
    steps = [
      `Evacuate ${normLoc} immediately using nearest fire stairwells.`,
      "Stay low to prevent smoke inhalation; do NOT use building elevators.",
      `Follow the green path away from ${normLoc} to ${chosenDestination}.`,
      "Assemble at the safe area and report to safety marshals.",
    ];
  } else if (typeLower.includes("medical") || typeLower.includes("injur") || typeLower.includes("patient")) {
    steps = [
      `Keep corridors around ${normLoc} completely clear for incoming ambulances.`,
      "Give space to First Aid Unit responders.",
      `If not assisting, move towards ${chosenDestination}.`,
    ];
  } else if (typeLower.includes("security") || typeLower.includes("threat") || typeLower.includes("fight")) {
    steps = [
      `Move away from the incident perimeter at ${normLoc} immediately.`,
      "Do NOT gather around or record the incident.",
      `Proceed directly to safe shelter at ${chosenDestination}.`,
      "Follow directions from campus security personnel.",
    ];
  } else {
    steps = [
      `Evacuate ${normLoc} calmly following illuminated green route.`,
      `Proceed along clear pathways to ${chosenDestination}.`,
      "Check live status updates on AegisCampus AI.",
    ];
  }

  return {
    destination: chosenDestination,
    path,
    instructions: steps,
    hazardLocation: normLoc,
  };
}

export default function CampusMap({
  incidentLocation = "",
  deployedResources = [],
  activeIncident = null,
  isStudentView = false,
}) {
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [resourceError, setResourceError] = useState(false);

  // Map Layer Toggles
  const [layers, setLayers] = useState({
    incident: true,
    route: true,
    safeZones: true,
    deployedUnits: true,
    showAllFleet: false,
  });

  // Active Details Popover State (Building, Resource, or Incident)
  const [activePopover, setActivePopover] = useState(null);

  // Determine active emergency state
  const rawLocation =
    incidentLocation || activeIncident?.location || activeIncident?.incident?.location || "";
  const incidentType =
    activeIncident?.incident_type || activeIncident?.incident?.incident_type || "General";
  const incidentStatus =
    activeIncident?.status || activeIncident?.incident?.status || "PENDING";

  // Only show active emergency if location exists AND incident is not RESOLVED, CLOSED, or REJECTED
  const isEmergencyActive = Boolean(
    rawLocation &&
    rawLocation.trim() &&
    incidentStatus !== "RESOLVED" &&
    incidentStatus !== "CLOSED" &&
    incidentStatus !== "REJECTED"
  );

  const evacuationData = useMemo(() => {
    return calculateDynamicEvacuation(rawLocation, incidentType);
  }, [rawLocation, incidentType]);

  const buildingCoordsMap = useMemo(() => {
    const map = {};
    CAMPUS_BUILDINGS.forEach((b) => {
      map[b.name] = { x: b.x, y: b.y };
    });
    return map;
  }, []);

  const incidentPosition =
    buildingCoordsMap[evacuationData.hazardLocation] || { x: 49.2, y: 51.0 };

  // Fetch campus resources
  useEffect(() => {
    const controller = new AbortController();

    const loadResources = async () => {
      try {
        setLoadingResources(true);
        setResourceError(false);

        const response = await fetch(`${API_BASE_URL}/api/resources`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Resource API returned ${response.status}`);
        }

        const data = await response.json();
        setResources(Array.isArray(data.resources) ? data.resources : []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Unable to load campus resources:", error);
          setResourceError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingResources(false);
        }
      }
    };

    loadResources();
    const interval = setInterval(loadResources, 10000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  // Filter resources to display based on layer settings and deployment status
  const visibleMarkers = useMemo(() => {
    if (isStudentView) return []; // Students don't need to see resource fleet pins

    return resources
      .filter((resource) => {
        const isExplicitlyDeployed =
          (Array.isArray(deployedResources) && deployedResources.includes(resource.id)) ||
          resource.status === "DEPLOYED";

        if (layers.showAllFleet) {
          return true; // Admin explicitly toggled all resources visible
        }

        // DEFAULT: Show only actively deployed units
        return isExplicitlyDeployed && resource.status !== "AVAILABLE" && resource.status !== "UNAVAILABLE" && resource.status !== "MAINTENANCE";
      })
      .map((resource) => {
        const position = RESOURCE_POSITIONS[resource.id] || { x: 50, y: 50 };
        const isDeployed =
          (Array.isArray(deployedResources) && deployedResources.includes(resource.id)) ||
          resource.status === "DEPLOYED";

        return {
          ...resource,
          x: position.x,
          y: position.y,
          isDeployed,
          icon: RESOURCE_ICONS[resource.type] || Shield,
          markerClass: RESOURCE_CLASSES[resource.type] || "security",
        };
      });
  }, [resources, deployedResources, layers.showAllFleet, isStudentView]);

  return (
    <section className="campus-map-panel" id="campus-map">
      {/* MAP HEADER */}
      <div className="campus-map-header">
        <div className="header-info">
          <div className="campus-map-eyebrow">
            <MapPin size={13} />
            <span>CAMPUS GEOSPATIAL SENTINEL & EVACUATION</span>
          </div>
          <h2>Vignan University Tactical Situation Map</h2>
          <p>
            Real-time geospatial awareness: Landmark buildings, active hazard zones, safe assembly points, and responding fleet.
          </p>
        </div>

        <div className="map-header-right">
          {/* MAP LAYER CONTROLS (ADMIN ONLY) */}
          {!isStudentView && (
            <div className="map-layer-toggles">
              <button
                type="button"
                className={`layer-toggle-btn ${layers.showAllFleet ? "active" : ""}`}
                onClick={() => setLayers({ ...layers, showAllFleet: !layers.showAllFleet })}
                title="Toggle visibility of available / idle resources"
              >
                {layers.showAllFleet ? <Eye size={12} /> : <EyeOff size={12} />}
                <span>{layers.showAllFleet ? "ALL FLEET VISIBLE" : "DEPLOYED ONLY"}</span>
              </button>
            </div>
          )}

          <div className="map-header-badges">
            <div className="map-live-status">
              <span className="live-radar-dot" />
              <span>GEOSPATIAL ENGINE ACTIVE</span>
            </div>
            {isEmergencyActive ? (
              <div className="map-incident-active-badge">
                <span className="pulse-dot-red" />
                <span>HAZARD: {evacuationData.hazardLocation}</span>
              </div>
            ) : (
              <div className="map-monitoring-badge">
                <CheckCircle2 size={12} />
                <span>ALL SECTORS NORMAL</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MAP CANVAS CONTAINER */}
      <div
        className="campus-map-container"
        onClick={() => setActivePopover(null)} // Clicking map background closes popover
      >
        <img
          src="/maps/campus-map.png?v=satellite-map"
          alt="Vignan University campus satellite map"
          className="campus-map-image"
          onError={(e) => {
            e.target.style.opacity = "0.7";
          }}
        />

        {/* 1. DYNAMIC EVACUATION ROUTE (SVG) - VISIBLE ONLY DURING ACTIVE INCIDENT */}
        {isEmergencyActive && layers.route && evacuationData.path && evacuationData.path.length > 1 && (
          <svg
            className="evacuation-route-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Glow Path */}
            <polyline
              points={evacuationData.path
                .map(({ x, y }) => `${x},${y}`)
                .join(" ")}
              className="evacuation-route-glow"
            />
            {/* Animated Directional Route */}
            <polyline
              points={evacuationData.path
                .map(({ x, y }) => `${x},${y}`)
                .join(" ")}
              className="evacuation-route"
            />
            {/* Waypoint Nodes */}
            {evacuationData.path.map(({ x, y }, index) => (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="1.0"
                className={`route-node ${
                  index === 0
                    ? "route-start-node"
                    : index === evacuationData.path.length - 1
                    ? "route-end-node"
                    : ""
                }`}
              />
            ))}
          </svg>
        )}

        {/* 2. CAMPUS BUILDINGS (CLEAN, LOW-WEIGHT MAP LABELS) */}
        {CAMPUS_BUILDINGS.map((building) => {
          const isHazardLocation = isEmergencyActive && building.name === evacuationData.hazardLocation;

          return (
            <div
              key={building.name}
              className={`building-map-label ${isHazardLocation ? "building-hazard-highlight" : ""}`}
              style={{
                left: `${building.x}%`,
                top: `${building.y}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActivePopover({
                  type: "building",
                  data: building,
                  isHazard: isHazardLocation,
                });
              }}
              title={`Click to inspect ${building.name}`}
            >
              <span className="building-label-text">{building.name}</span>
            </div>
          );
        })}

        {/* 3. SAFE ZONES (CONVOCATION HALL & PLAYGROUND) */}
        {layers.safeZones &&
          SAFE_ZONES.map((zone) => (
            <div
              key={zone.name}
              className="safe-zone-marker"
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setActivePopover({
                  type: "safe_zone",
                  data: zone,
                });
              }}
              title={`${zone.name} (${zone.label})`}
            >
              <div className="safe-zone-dot" />
              <div className="safe-zone-label">
                <strong>{zone.name}</strong>
                <small>{zone.label}</small>
              </div>
            </div>
          ))}

        {/* 4. ACTIVE INCIDENT HAZARD PIN & SUBTLE TRANSLUCENT BOUNDARY */}
        {isEmergencyActive && layers.incident && (
          <div
            className="campus-marker marker-danger active-incident-pin"
            style={{
              left: `${incidentPosition.x}%`,
              top: `${incidentPosition.y}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActivePopover({
                type: "incident",
                location: rawLocation || evacuationData.hazardLocation,
                incidentType,
                destination: evacuationData.destination,
              });
            }}
          >
            <div className="marker-pulse-hazard" />
            <div className="marker-icon">
              <Flame size={15} />
            </div>
            <div className="marker-label">
              <strong>ACTIVE {incidentType.toUpperCase()}</strong>
              <span>{rawLocation || evacuationData.hazardLocation}</span>
            </div>
          </div>
        )}

        {/* 5. DEPLOYED / VISIBLE RESOURCES */}
        {layers.deployedUnits &&
          visibleMarkers.map((resource) => {
            const Icon = resource.icon;
            const isDeployed = resource.isDeployed;

            return (
              <div
                key={resource.id}
                className={`deployed-resource-marker marker-${resource.markerClass} ${
                  isDeployed ? "status-deployed-pin" : "status-idle-pin"
                }`}
                style={{
                  left: `${resource.x}%`,
                  top: `${resource.y}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePopover({
                    type: "resource",
                    data: resource,
                  });
                }}
                title={`${resource.id} (${resource.type}) - ${resource.status}`}
              >
                <div className="deployed-marker-icon">
                  <Icon size={11} />
                </div>
                <div className="deployed-marker-tag">
                  <strong>{resource.id}</strong>
                  <span>{isDeployed ? "DEPLOYED" : "AVAILABLE"}</span>
                </div>
              </div>
            );
          })}

        {/* INTERACTIVE CLICK POPOVER CARD */}
        {activePopover && (
          <div
            className="map-interactive-popover"
            style={{
              left:
                activePopover.type === "building"
                  ? `${activePopover.data.x}%`
                  : activePopover.type === "safe_zone"
                  ? `${activePopover.data.x}%`
                  : activePopover.type === "resource"
                  ? `${activePopover.data.x}%`
                  : `${incidentPosition.x}%`,
              top:
                activePopover.type === "building"
                  ? `${activePopover.data.y}%`
                  : activePopover.type === "safe_zone"
                  ? `${activePopover.data.y}%`
                  : activePopover.type === "resource"
                  ? `${activePopover.data.y}%`
                  : `${incidentPosition.y}%`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popover-header">
              <div className="popover-title-row">
                <Info size={13} className="text-cyan-400" />
                <h4>
                  {activePopover.type === "building"
                    ? activePopover.data.name
                    : activePopover.type === "safe_zone"
                    ? activePopover.data.name
                    : activePopover.type === "resource"
                    ? `${activePopover.data.id} - ${activePopover.data.name}`
                    : `Hazard Area: ${activePopover.location}`}
                </h4>
              </div>
              <button
                className="popover-close-btn"
                onClick={() => setActivePopover(null)}
              >
                <X size={13} />
              </button>
            </div>

            <div className="popover-body">
              {activePopover.type === "building" && (
                <>
                  <div className="popover-detail-row">
                    <span className="p-label">Type:</span>
                    <span className="p-val">{activePopover.data.type}</span>
                  </div>
                  <div className="popover-detail-row">
                    <span className="p-label">Status:</span>
                    <span className={`p-badge ${activePopover.isHazard ? "badge-hazard" : "badge-safe"}`}>
                      {activePopover.isHazard ? "HAZARD ZONE (EVACUATE)" : "SECURE / NORMAL"}
                    </span>
                  </div>
                  <div className="popover-detail-row">
                    <span className="p-label">Nearest Safe Zone:</span>
                    <span className="p-val text-green font-bold">{activePopover.data.defaultSafe}</span>
                  </div>
                </>
              )}

              {activePopover.type === "safe_zone" && (
                <>
                  <div className="popover-detail-row">
                    <span className="p-label">Designation:</span>
                    <span className="p-badge badge-safe">{activePopover.data.label}</span>
                  </div>
                  <div className="popover-detail-row">
                    <span className="p-label">Facility Details:</span>
                    <span className="p-val">{activePopover.data.description}</span>
                  </div>
                  <div className="popover-detail-row">
                    <span className="p-label">Assembly Status:</span>
                    <span className="p-val text-green">OPEN & CLEAR</span>
                  </div>
                </>
              )}

              {activePopover.type === "resource" && (
                <>
                  <div className="popover-detail-row">
                    <span className="p-label">Unit Code:</span>
                    <span className="p-val font-mono">{activePopover.data.id}</span>
                  </div>
                  <div className="popover-detail-row">
                    <span className="p-label">Category:</span>
                    <span className="p-val">{activePopover.data.type}</span>
                  </div>
                  <div className="popover-detail-row">
                    <span className="p-label">Operational Status:</span>
                    <span className={`p-badge ${activePopover.data.isDeployed ? "badge-deployed" : "badge-safe"}`}>
                      {activePopover.data.status}
                    </span>
                  </div>
                  {activePopover.data.contact_name && (
                    <div className="popover-detail-row">
                      <span className="p-label">Responder In-Charge:</span>
                      <span className="p-val">{activePopover.data.contact_name}</span>
                    </div>
                  )}
                  {activePopover.data.phone_number && (
                    <div className="popover-detail-row">
                      <span className="p-label">Contact:</span>
                      <span className="p-val font-mono">{activePopover.data.phone_number}</span>
                    </div>
                  )}
                  {activePopover.data.incident_id && (
                    <div className="popover-detail-row">
                      <span className="p-label">Assigned Incident:</span>
                      <span className="p-val font-mono text-amber">{activePopover.data.incident_id}</span>
                    </div>
                  )}
                </>
              )}

              {activePopover.type === "incident" && (
                <>
                  <div className="popover-detail-row">
                    <span className="p-label">Emergency Type:</span>
                    <span className="p-badge badge-hazard">{activePopover.incidentType}</span>
                  </div>
                  <div className="popover-detail-row">
                    <span className="p-label">Recommended Destination:</span>
                    <span className="p-val text-green font-bold">{activePopover.destination}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* EVACUATION INSTRUCTIONS PANEL */}
        {isEmergencyActive && (
          <div className="evacuation-instructions">
            <div className="evacuation-header">
              <div className="evacuation-alert-icon">
                <Navigation size={15} />
              </div>
              <div>
                <strong>TACTICAL EVACUATION DIRECTIVE</strong>
                <span>Hazard detected at {evacuationData.hazardLocation}</span>
              </div>
            </div>

            <div className="evacuation-destination-badge">
              <span className="dest-label">DESTINATION:</span>
              <strong className="dest-target">{evacuationData.destination}</strong>
            </div>

            <div className="evacuation-steps">
              {evacuationData.instructions.map((step, idx) => (
                <div key={idx} className="evacuation-step">
                  <span className="step-number">{idx + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="evacuation-status-footer">
              <span className="status-indicator-dot" />
              <span>OPTIMAL HAZARD-AVOIDING ROUTE ACTIVE</span>
            </div>
          </div>
        )}

        {/* TOP STATUS BAR */}
        <div className="map-resource-status">
          {loadingResources && resources.length === 0 ? (
            <>
              <span className="status-loading-dot" />
              <span>CONNECTING FLEET...</span>
            </>
          ) : resourceError ? (
            <>
              <span className="status-error-dot" />
              <span>OFFLINE FALLBACK</span>
            </>
          ) : (
            <>
              <span className="status-success-dot" />
              <span>
                {visibleMarkers.filter((m) => m.isDeployed).length > 0
                  ? `${visibleMarkers.filter((m) => m.isDeployed).length} UNIT(S) DEPLOYED`
                  : "ALL UNITS STANDING BY (AVAILABLE)"}
              </span>
            </>
          )}
        </div>

        {/* SIMPLIFIED MINIMAL LEGEND */}
        <div className="map-legend-simplified">
          {isEmergencyActive && (
            <>
              <div className="legend-mini-item">
                <span className="legend-mini-dot danger" />
                <span>Hazard Area</span>
              </div>
              <div className="legend-mini-item">
                <span className="legend-mini-line safe-route-line" />
                <span>Safe Evacuation Route</span>
              </div>
            </>
          )}
          <div className="legend-mini-item">
            <span className="legend-mini-dot safe" />
            <span>Safe Assembly Zone</span>
          </div>
          {visibleMarkers.filter((m) => m.isDeployed).length > 0 && (
            <div className="legend-mini-item">
              <span className="legend-mini-dot deployed" />
              <span>Deployed Unit ({visibleMarkers.filter((m) => m.isDeployed).length})</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}