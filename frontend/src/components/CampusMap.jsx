import { useEffect, useState } from "react";

import {
  Ambulance,
  Flame,
  MapPin,
  Shield,
  Siren,
  Users,
  Wrench,
  Radio,
  HeartPulse,
} from "lucide-react";

import "./CampusMap.css";


const RESOURCE_POSITIONS = {
  "SEC-001": { x: 27, y: 46 },
  "SEC-002": { x: 18, y: 37 },

  "AMB-001": { x: 57, y: 78 },
  "AMB-002": { x: 61, y: 72 },

  "FAU-001": { x: 52, y: 62 },
  "FAU-002": { x: 47, y: 43 },

  "FAC-001": { x: 43, y: 48 },
  "FAC-002": { x: 39, y: 65 },

  "VEH-001": { x: 69, y: 17 },
  "VEH-002": { x: 74, y: 20 },

  "COM-001": { x: 52, y: 31 },
  "COM-002": { x: 60, y: 35 },
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


function CampusMap({
  incidentLocation = "Campus Monitoring",
  deployedResources = [],
}) {

  const [resources, setResources] = useState([]);

  const [loadingResources, setLoadingResources] =
    useState(true);

  const [resourceError, setResourceError] =
    useState(false);


  /* ==========================================================
     LOAD REAL RESOURCES FROM BACKEND
  ========================================================== */

  useEffect(() => {

    const loadResources = async () => {

      try {

        setLoadingResources(true);

        setResourceError(false);

        const response = await fetch(
          "http://127.0.0.1:8000/api/resources"
        );

        if (!response.ok) {
          throw new Error(
            `Resource API returned ${response.status}`
          );
        }

        const data = await response.json();

        console.log(
          "REAL CAMPUS RESOURCES:",
          data
        );

        setResources(
          Array.isArray(data.resources)
            ? data.resources
            : []
        );

      } catch (error) {

        console.error(
          "Unable to load campus resources:",
          error
        );

        setResourceError(true);

        setResources([]);

      } finally {

        setLoadingResources(false);

      }
    };


    loadResources();

  }, []);


  /* ==========================================================
     ICON FOR RESOURCE
  ========================================================== */

  const getResourceIcon = (type) => {

    return (
      RESOURCE_ICONS[type] ||
      MapPin
    );

  };


  /* ==========================================================
     RESOURCE MARKERS
  ========================================================== */

  const resourceMarkers = resources
    .map((resource) => {

      const position =
        RESOURCE_POSITIONS[resource.id];

      if (!position) {
        return null;
      }

      return {
        ...resource,

        x: position.x,

        y: position.y,

        icon: getResourceIcon(resource.type),

        markerClass:
          RESOURCE_CLASSES[resource.type] ||
          "security",
      };

    })
    .filter(Boolean);


  return (

    <section
      className="campus-map-panel"
      id="campus-map"
    >

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="campus-map-header">

        <div>

          <div className="campus-map-eyebrow">

            <MapPin size={14} />

            CAMPUS INTELLIGENCE

          </div>


          <h2>
            Vignan University Emergency Map
          </h2>


          <p>
            Live incident and emergency resource
            coordination view.
          </p>

        </div>


        <div className="map-live-status">

          <span />

          MAP ONLINE

        </div>

      </div>


      {/* =====================================================
          MAP
      ====================================================== */}

      <div className="campus-map-container">

        <img
          src="/maps/campus-map.png"
          alt="Vignan University campus map"
          className="campus-map-image"
        />


        {/* ===================================================
            SAFE EVACUATION ROUTE
        ==================================================== */}

        <div className="map-overlay">

          <div className="route-line route-one" />

          <div className="route-line route-two" />

        </div>


        {/* ===================================================
            INCIDENT MARKER
        ==================================================== */}

        <div
          className="campus-marker marker-danger"
          style={{
            left: "39%",
            top: "58%",
          }}
        >

          <div className="marker-pulse" />

          <div className="marker-icon">

            <Flame size={15} />

          </div>


          <div className="marker-label">

            <strong>
              INCIDENT
            </strong>

            <span>
              {incidentLocation}
            </span>

          </div>

        </div>


        {/* ===================================================
            REAL RESOURCE MARKERS
        ==================================================== */}

        {resourceMarkers.map((resource) => {

  const Icon = resource.icon;

  const isDeployed =
    deployedResources.includes(resource.id);

  return (
    <div
      key={resource.id}
      className={`campus-marker marker-${resource.markerClass} ${
        isDeployed ? "resource-deployed" : ""
      }`}
      style={{
        left: `${resource.x}%`,
        top: `${resource.y}%`,
      }}
    >

      <div className="marker-pulse" />

      <div className="marker-icon">
        <Icon size={14} />
      </div>

      <div className="marker-label">

        <strong>
          {resource.id}
        </strong>

        <span>
          {isDeployed
            ? "DEPLOYED"
            : resource.name}
        </span>

      </div>

    </div>
  );

})}


        {/* ===================================================
            SAFE ZONE
        ==================================================== */}

        <div
          className="campus-marker marker-safe"
          style={{
            left: "70%",
            top: "58%",
          }}
        >

          <div className="marker-pulse" />

          <div className="marker-icon">

            <Users size={15} />

          </div>


          <div className="marker-label">

            <strong>
              SAFE ZONE
            </strong>

            <span>
              University Playground
            </span>

          </div>

        </div>


        {/* ===================================================
            ACTIVE INCIDENT BANNER
        ==================================================== */}

        <div className="map-incident-banner">

          <div className="map-alert-dot" />

          <div>

            <strong>
              ACTIVE INCIDENT
            </strong>

            <span>
              {incidentLocation}
            </span>

          </div>

        </div>


        {/* ===================================================
            RESOURCE STATUS
        ==================================================== */}

        <div className="map-resource-status">

          {loadingResources ? (

            <>
              <span className="status-loading-dot" />

              LOADING RESOURCES...

            </>

          ) : resourceError ? (

            <>
              <span className="status-error-dot" />

              RESOURCE API OFFLINE

            </>

          ) : (

            <>
              <span className="status-success-dot" />

              {resources.length} RESOURCES ONLINE

            </>

          )}

        </div>


        {/* ===================================================
            ROUTE LABEL
        ==================================================== */}

        <div className="map-route-label">

          SAFE EVACUATION ROUTE

        </div>


        {/* ===================================================
            LEGEND
        ==================================================== */}

        <div className="map-legend">

          <div>

            <span className="legend-dot danger" />

            Incident

          </div>


          <div>

            <span className="legend-dot medical" />

            Medical

          </div>


          <div>

            <span className="legend-dot security" />

            Security

          </div>


          <div>

            <span className="legend-dot facilities" />

            Facilities

          </div>


          <div>

            <span className="legend-dot transport" />

            Transport

          </div>


          <div>

            <span className="legend-dot communication" />

            Communication

          </div>


          <div>

            <span className="legend-dot safe" />

            Safe Zone

          </div>

        </div>

      </div>

    </section>

  );
}


export default CampusMap; 