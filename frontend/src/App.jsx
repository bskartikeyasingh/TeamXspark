import { useEffect, useState } from "react";
import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Bell,
  Car,
  CheckCircle2,
  ClipboardList,
  Flame,
  HardHat,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Mic,
  MicOff,
  Package,
  Radio,
  Shield,
  Siren,
  Users,
  X,
  XCircle,
} from "lucide-react";
import CampusMap from "./components/CampusMap";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:8000";

function App({ user, onLogout }) {
  const isAdmin = user?.role === "admin";
  const studentName = user?.displayName || user?.name || "Student";
  const studentEmail = user?.email || "";
  const studentId = user?.studentId || user?.student_id || "";

  const [activePage, setActivePage] = useState("command");

  const [incidentHistory, setIncidentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");

  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState("");

  const [resourceSummary, setResourceSummary] = useState({
    total: 0,
    available: 0,
    deployed: 0,
    unavailable: 0,
  });

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [resourceTypeSummary, setResourceTypeSummary] = useState({});

  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  // Incident image state
  const [incidentImage, setIncidentImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [incidentData, setIncidentData] = useState(null);
  const [approval, setApproval] = useState(null);

  const [error, setError] = useState("");
  const [approvalError, setApprovalError] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Admin Panel States
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [newResource, setNewResource] = useState({
    id: "",
    name: "",
    type: "",
    status: "AVAILABLE",
    location: "",
    capacity: 1,
  });

  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleLogout = async () => {
    try {
      if (!isAdmin) {
        await signOut(auth);
      }

      if (onLogout) {
        onLogout();
      }

      setActivePage("command");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const loadIncidentHistory = async () => {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/api/incidents`);

      setIncidentHistory(response.data.incidents || []);
    } catch (err) {
      console.error(err);

      setHistoryError(
        err.response?.data?.detail ||
          "Unable to load incident history."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadAuditTrail = async () => {
    setAuditLoading(true);
    setAuditError("");

    try {
      const response = await axios.get(`${API_BASE_URL}/api/audit`);

      setAuditEvents(response.data.audit_events || []);
    } catch (err) {
      console.error("Failed to load audit trail:", err);

      setAuditError(
        err.response?.data?.detail ||
          "Unable to load audit trail."
      );
    } finally {
      setAuditLoading(false);
    }
  };

  const loadApprovals = async () => {
    if (!isAdmin) {
      return;
    }

    setApprovalsLoading(true);
    setApprovalsError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/emergency/approvals`
      );

      setApprovals(response.data.approvals || []);
    } catch (err) {
      console.error("Failed to load approvals:", err);

      setApprovalsError(
        err.response?.data?.detail ||
          "Unable to load approvals."
      );
    } finally {
      setApprovalsLoading(false);
    }
  };

  const loadResources = async () => {
    setResourcesLoading(true);
    setResourcesError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/resources`
      );

      setResources(response.data.resources || []);
    } catch (error) {
      console.error("Failed to load resources:", error);

      setResourcesError(
        error.response?.data?.detail ||
          "Unable to load resources."
      );
    } finally {
      setResourcesLoading(false);
    }
  };

  const loadResourceSummary = async () => {
    setSummaryLoading(true);

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/resources/summary`
      );

      setResourceSummary({
        total: response.data.total || 0,
        available: response.data.available || 0,
        deployed: response.data.deployed || 0,
        unavailable: response.data.unavailable || 0,
      });

      const typeResponse = await axios.get(
        `${API_BASE_URL}/api/resources/summary/by-type`
      );

      setResourceTypeSummary(
        typeResponse.data.summary || {}
      );
    } catch (error) {
      console.error(
        "Failed to load resource summary:",
        error
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAddResource = async (e) => {
    e.preventDefault();

    setAdminLoading(true);
    setAdminMessage("");
    setAdminError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/resources`,
        {
          id: newResource.id.trim(),
          name: newResource.name.trim(),
          type: newResource.type.trim(),
          status: newResource.status,
          location: newResource.location.trim(),
          capacity: Number(newResource.capacity),
        }
      );

      if (
        response.data.success ||
        response.status === 200 ||
        response.status === 201
      ) {
        setAdminMessage(
          "Resource added successfully."
        );

        setNewResource({
          id: "",
          name: "",
          type: "",
          status: "AVAILABLE",
          location: "",
          capacity: 1,
        });

        await loadResourceSummary();

        if (activePage === "resources") {
          await loadResources();
        }
      }
    } catch (error) {
      console.error(
        "Failed to add resource:",
        error
      );

      setAdminError(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          "Failed to add resource."
      );
    } finally {
      setAdminLoading(false);
    }
  };

  const handleApprove = async (approvalId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/emergency/approvals/${approvalId}/approve`,
        {
          approved_by:
            "Campus Emergency Commander",
        }
      );

      if (response.data.success) {
        await loadApprovals();

        await loadResources();
        await loadResourceSummary();
      }
    } catch (err) {
      console.error("Approval failed:", err);

      alert(
        err.response?.data?.detail ||
          "Unable to approve emergency response."
      );
    }
  };

  const handleReject = async (approvalId) => {
    const reason = window.prompt(
      "Enter rejection reason:"
    );

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/emergency/approvals/${approvalId}/reject`,
        {
          rejected_by:
            "Campus Emergency Commander",
          reason: reason.trim(),
        }
      );

      if (response.data.success) {
        await loadApprovals();
      }
    } catch (err) {
      console.error("Rejection failed:", err);

      alert(
        err.response?.data?.detail ||
          "Unable to reject emergency response."
      );
    }
  };

  const handleNavigation = (page) => {
    setActivePage(page);
    setSidebarOpen(false);

    if (page === "incidents") {
      loadIncidentHistory();
    }

    if (page === "audit") {
      loadAuditTrail();
    }

    if (page === "approvals" && isAdmin) {
      loadApprovals();
    }

    if (page === "resources") {
      loadResources();
      loadResourceSummary();
    }
  };

  // ============================================================
  // INCIDENT IMAGE HANDLER
  // ============================================================

  const handleIncidentImage = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      setIncidentImage(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file."
      );

      setIncidentImage(null);
      setImagePreview("");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image must be smaller than 5 MB."
      );

      setIncidentImage(null);
      setImagePreview("");

      return;
    }

    setIncidentImage(file);
    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(reader.result);
    };

    reader.onerror = () => {
      setError(
        "Unable to read the selected image."
      );

      setIncidentImage(null);
      setImagePreview("");
    };

    reader.readAsDataURL(file);
  };

  // ============================================================
  // VOICE INPUT
  // ============================================================

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);

      setError(
        "Voice input is not supported in this browser. Please use Google Chrome."
      );

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      setDescription((previous) => {
        if (!previous.trim()) {
          return transcript;
        }

        return `${previous.trim()} ${transcript}`;
      });
    };

    recognition.onerror = (event) => {
      console.error(
        "Voice recognition error:",
        event.error
      );

      if (event.error === "not-allowed") {
        setError(
          "Microphone permission was denied. Please allow microphone access."
        );
      } else {
        setError(
          "Unable to recognize your voice. Please try again."
        );
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // ============================================================
  // ANALYZE EMERGENCY
  // ============================================================

  const analyzeEmergency = async () => {
    if (!description.trim()) {
      setError(
        "Please describe the emergency."
      );

      return;
    }

    if (!location.trim()) {
      setError(
        "Please enter the incident location."
      );

      return;
    }

    setError("");
    setApprovalError("");
    setLoading(true);

    try {
      let imageData = null;

      // Convert image to Base64
      if (incidentImage) {
        imageData = await new Promise(
          (resolve, reject) => {
            const reader =
              new FileReader();

            reader.onload = () => {
              resolve(reader.result);
            };

            reader.onerror = () => {
              reject(
                new Error(
                  "Unable to read incident image."
                )
              );
            };

            reader.readAsDataURL(
              incidentImage
            );
          }
        );
      }

      // Get currently authenticated Firebase user
      const currentUser = auth?.currentUser;

      const authenticatedStudentName =
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        studentName ||
        "Student";

      const authenticatedStudentEmail =
        currentUser?.email ||
        studentEmail ||
        "";

      const response = await axios.post(
        `${API_BASE_URL}/api/emergency/respond`,
        {
          description:
            description.trim(),

          location:
            location.trim(),

          // Firebase student information
          student_name:
            authenticatedStudentName,

          student_email:
            authenticatedStudentEmail,

          // Base64 incident evidence
          image_data: imageData,
        }
      );

      setIncidentData(response.data);

      if (response.data?.approval) {
        setApproval(
          response.data.approval
        );
      }
    } catch (err) {
      console.error(
        "Emergency analysis failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Unable to connect to the emergency backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // APPROVE CURRENT RESPONSE
  // ============================================================

  const approveResponse = async () => {
    const approvalId =
      incidentData?.approval?.approval_id;

    if (!approvalId) {
      setApprovalError(
        "Approval ID is missing from the incident response."
      );

      return;
    }

    setApprovalError("");
    setApprovalLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/emergency/approvals/${approvalId}/approve`,
        {
          approved_by:
            "Campus Emergency Commander",
        }
      );

      setApproval(response.data);

      setIncidentData((previous) => ({
        ...previous,
        approval:
          response.data.approval,
        audit_events:
          response.data.audit_events,
      }));

      // Refresh resource information after deployment
      await loadResources();
      await loadResourceSummary();
    } catch (err) {
      console.error(err);

      setApprovalError(
        err.response?.data?.detail ||
          "Unable to approve the emergency response."
      );
    } finally {
      setApprovalLoading(false);
    }
  };

  // ============================================================
  // REJECT CURRENT RESPONSE
  // ============================================================

  const rejectResponse = async () => {
    const approvalId =
      incidentData?.approval?.approval_id;

    if (!approvalId) {
      setApprovalError(
        "Approval ID is missing from the incident response."
      );

      return;
    }

    if (!rejectionReason.trim()) {
      setApprovalError(
        "Please provide a reason for rejecting the response."
      );

      return;
    }

    setApprovalError("");
    setApprovalLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/emergency/approvals/${approvalId}/reject`,
        {
          rejected_by:
            "Campus Emergency Commander",

          reason:
            rejectionReason.trim(),
        }
      );

      setIncidentData((previous) => ({
        ...previous,
        approval:
          response.data.approval,
        audit_events:
          response.data.audit_events,
      }));

      setApproval(
        response.data.approval
      );

      setShowRejectBox(false);
      setRejectionReason("");
    } catch (err) {
      console.error(err);

      setApprovalError(
        err.response?.data?.detail ||
          "Unable to reject the emergency response."
      );
    } finally {
      setApprovalLoading(false);
    }
  };

  // ============================================================
  // RESET INCIDENT
  // ============================================================

  const resetIncident = () => {
    setIncidentData(null);
    setApproval(null);

    setDescription("");
    setLocation("");

    setIncidentImage(null);
    setImagePreview("");

    setError("");
    setApprovalError("");

    setShowRejectBox(false);
    setRejectionReason("");

    const input =
      document.getElementById(
        "incident-image"
      );

    if (input) {
      input.value = "";
    }
  };

  // ============================================================
  // DERIVED DATA
  // ============================================================

  const incident =
    incidentData?.incident;

  const response =
    incidentData?.response;

  const currentApproval =
    incidentData?.approval ||
    approval?.approval ||
    approval;

  const agentResponses =
    response?.agent_responses || {};

  const approvalStatus =
    currentApproval?.status ||
    "PENDING";

  const agentIcons = {
    security: Shield,
    medical: Ambulance,
    facilities: Flame,
    transport: Siren,
    communication: Bell,
  };

  const isPending =
    approvalStatus === "PENDING";

  const isApproved =
    approvalStatus === "APPROVED";

  const isRejected =
    approvalStatus === "REJECTED";

  // Deployed resources can come from either approval state
  // or incidentData approval.
  const deployedResources =
    approval?.approval
      ?.selected_resources ||
    approval?.selected_resources ||
    incidentData?.approval
      ?.selected_resources ||
    currentApproval?.selected_resources ||
    [];

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`sidebar ${
          sidebarOpen
            ? "sidebar-open"
            : ""
        }`}
      >
        <div className="brand">
          <div className="brand-icon">
            <Siren size={24} />
          </div>

          <div>
            <div className="brand-name">
              AegisCampus
            </div>

            <div className="brand-subtitle">
              AI COMMAND CENTER
            </div>
          </div>

          <button
            className="mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={20} />
          </button>
        </div>

        <div className="system-status">
          <span className="status-dot" />
          <span>
            System Operational
          </span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${
              activePage === "command"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("command")
            }
          >
            <LayoutDashboard size={19} />
            <span>
              Command Center
            </span>
          </button>

          <button
            className={`nav-item ${
              activePage === "incidents"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("incidents")
            }
          >
            <AlertTriangle size={19} />
            <span>Incidents</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "resources"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("resources")
            }
          >
            <Users size={19} />
            <span>Resources</span>
          </button>

          {isAdmin && (
            <button
              className={`nav-item ${
                activePage === "approvals"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                handleNavigation(
                  "approvals"
                )
              }
            >
              <CheckCircle2 size={19} />
              <span>Approvals</span>
            </button>
          )}

          <button
            className={`nav-item ${
              activePage === "audit"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("audit")
            }
          >
            <ClipboardList size={19} />
            <span>Audit Trail</span>
          </button>

          <button
            className={`nav-item ${
              activePage === "map"
                ? "active"
                : ""
            }`}
            onClick={() =>
              handleNavigation("map")
            }
          >
            <Map size={19} />
            <span>Campus Map</span>
          </button>
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
              />
            ) : (
              <Users size={20} />
            )}
          </div>

          <div className="sidebar-user-info">
            <strong>
              {isAdmin
                ? user?.username ||
                  "Administrator"
                : studentName}
            </strong>

            <span>
              {isAdmin
                ? "Administrator"
                : "Student"}
            </span>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="ai-status">
            <Radio size={16} />

            <span>
              Multi-Agent AI
            </span>

            <span className="online-label">
              ONLINE
            </span>
          </div>

          <div className="version">
            AegisCampus AI v1.0
          </div>
        </div>
      </aside>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="main-content">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            <Menu size={22} />
          </button>

          <div>
            <div className="topbar-title">
              Emergency Command Center
            </div>

            <div className="topbar-subtitle">
              Multi-Agent Campus Safety
              Operations
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginLeft: "auto",
            }}
          >
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowAdminPanel(
                    (previous) =>
                      !previous
                  );

                  setAdminMessage("");
                  setAdminError("");
                }}
                className="admin-button"
              >
                Admin Resource Management
              </button>
            )}

            <div
              className="user-info"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {isAdmin
                  ? user?.username ||
                    "Administrator"
                  : studentName}
              </span>

              <span
                style={{
                  fontSize: "12px",
                  opacity: 0.7,
                }}
              >
                (
                {isAdmin
                  ? "Administrator"
                  : "Student"}
                )
              </span>
            </div>

            <div className="topbar-status">
              <span className="status-dot" />
              LIVE
            </div>
          </div>
        </header>

        <div className="dashboard">
          {/* ==================================================
              ADMIN RESOURCE PANEL
          ================================================== */}

          {isAdmin &&
            showAdminPanel && (
              <section
                className="admin-panel panel"
                style={{
                  marginBottom: "24px",
                }}
              >
                <div className="admin-panel-header panel-heading">
                  <div>
                    <h2>
                      Admin Resource Management
                    </h2>

                    <p>
                      Add and manage campus
                      emergency resources.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setShowAdminPanel(false)
                    }
                    className="admin-close-button secondary-button"
                  >
                    Close
                  </button>
                </div>

                <form
                  onSubmit={handleAddResource}
                  className="admin-resource-form"
                >
                  <div className="form-group">
                    <label>
                      Resource ID
                    </label>

                    <input
                      type="text"
                      placeholder="Example: SEC-003"
                      value={newResource.id}
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          id: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Resource Name
                    </label>

                    <input
                      type="text"
                      placeholder="Example: Security Team Charlie"
                      value={newResource.name}
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Resource Type
                    </label>

                    <select
                      value={newResource.type}
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          type: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">
                        Select type
                      </option>

                      <option value="Security">
                        Security
                      </option>

                      <option value="Medical">
                        Medical
                      </option>

                      <option value="First Aid">
                        First Aid
                      </option>

                      <option value="Facilities">
                        Facilities
                      </option>

                      <option value="Transport">
                        Transport
                      </option>

                      <option value="Communication">
                        Communication
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>

                    <select
                      value={newResource.status}
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          status:
                            e.target.value,
                        })
                      }
                    >
                      <option value="AVAILABLE">
                        AVAILABLE
                      </option>

                      <option value="UNAVAILABLE">
                        UNAVAILABLE
                      </option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      Location
                    </label>

                    <input
                      type="text"
                      placeholder="Example: North Gate"
                      value={
                        newResource.location
                      }
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          location:
                            e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Capacity
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        newResource.capacity
                      }
                      onChange={(e) =>
                        setNewResource({
                          ...newResource,
                          capacity:
                            e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  {adminMessage && (
                    <div
                      className="admin-success"
                      style={{
                        color: "#10b981",
                        margin: "8px 0",
                      }}
                    >
                      {adminMessage}
                    </div>
                  )}

                  {adminError && (
                    <div
                      className="admin-error error-box"
                      style={{
                        margin: "8px 0",
                      }}
                    >
                      <AlertTriangle size={18} />
                      <span>
                        {adminError}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="admin-submit-button analyze-button"
                    style={{
                      marginTop: "12px",
                    }}
                  >
                    {adminLoading
                      ? "Adding Resource..."
                      : "Add Resource"}
                  </button>
                </form>
              </section>
            )}

          {/* ==================================================
              INCIDENT HISTORY
          ================================================== */}

          {activePage === "incidents" ? (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Incident History
                  </h2>

                  <p>
                    Previous emergency incidents
                    stored in MongoDB.
                  </p>
                </div>

                <AlertTriangle size={21} />
              </div>

              {historyLoading && (
                <div className="empty-state">
                  <span className="spinner" />

                  <p>
                    Loading incident
                    history...
                  </p>
                </div>
              )}

              {historyError && (
                <div className="error-box">
                  <AlertTriangle size={18} />

                  <span>
                    {historyError}
                  </span>
                </div>
              )}

              {!historyLoading &&
                !historyError &&
                incidentHistory.length ===
                  0 && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <AlertTriangle
                        size={30}
                      />
                    </div>

                    <h2>
                      No Incidents Yet
                    </h2>

                    <p>
                      Emergency incidents
                      will appear here after
                      they are analyzed.
                    </p>
                  </div>
                )}

              {!historyLoading &&
                incidentHistory.length >
                  0 && (
                  <div className="resource-list">
                    {incidentHistory.map(
                      (item) => (
                        <div
                          className="resource-row"
                          key={
                            item.incident_id
                          }
                        >
                          <div className="resource-symbol">
                            <AlertTriangle
                              size={17}
                            />
                          </div>

                          <div
                            style={{
                              flex: 1,
                            }}
                          >
                            <strong>
                              {item.incident_type ||
                                "Incident"}
                            </strong>

                            <div>
                              ID:{" "}
                              {
                                item.incident_id
                              }
                            </div>

                            <div>
                              📍{" "}
                              {item.location ||
                                "Unknown location"}
                            </div>

                            <div>
                              👥 Affected
                              people:{" "}
                              {item.affected_people ??
                                "Unknown"}
                            </div>

                            <div>
                              🕐{" "}
                              {item.created_at
                                ? new Date(
                                    item.created_at
                                  ).toLocaleString()
                                : "Unknown time"}
                            </div>
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              flexDirection:
                                "column",
                              alignItems:
                                "flex-end",
                              gap: "6px",
                            }}
                          >
                            <span className="available">
                              {item.severity ||
                                "UNKNOWN"}
                            </span>

                            <span>
                              {item.status ||
                                "UNKNOWN"}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
            </section>
          ) : activePage === "audit" ? (
            /* ==================================================
               AUDIT TRAIL
            ================================================== */

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Audit Trail
                  </h2>

                  <p>
                    Complete emergency activity
                    history stored in MongoDB.
                  </p>
                </div>

                <ClipboardList size={21} />
              </div>

              {auditLoading && (
                <div className="empty-state">
                  <span className="spinner" />

                  <p>
                    Loading audit history...
                  </p>
                </div>
              )}

              {auditError && (
                <div className="error-box">
                  <AlertTriangle size={18} />

                  <span>
                    {auditError}
                  </span>
                </div>
              )}

              {!auditLoading &&
                !auditError &&
                auditEvents.length ===
                  0 && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <ClipboardList
                        size={30}
                      />
                    </div>

                    <h2>
                      No Audit Events
                    </h2>

                    <p>
                      Emergency workflow events
                      will appear here.
                    </p>
                  </div>
                )}

              {!auditLoading &&
                !auditError &&
                auditEvents.length >
                  0 && (
                  <div className="audit-list">
                    {auditEvents.map(
                      (event) => (
                        <div
                          className="audit-row"
                          key={
                            event.event_id
                          }
                        >
                          <div className="audit-dot" />

                          <div className="audit-content">
                            <strong>
                              {
                                event.event_type
                              }
                            </strong>

                            <p>
                              {event.message}
                            </p>

                            <small>
                              Incident:{" "}
                              {
                                event.incident_id
                              }
                            </small>

                            <small>
                              {event.timestamp
                                ? new Date(
                                    event.timestamp
                                  ).toLocaleString()
                                : ""}
                            </small>
                          </div>

                          <span className="audit-actor">
                            {event.actor}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
            </section>
          ) : activePage ===
              "approvals" &&
            isAdmin ? (
            /* ==================================================
               ADMIN APPROVALS
            ================================================== */

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Emergency Approvals
                  </h2>

                  <p>
                    Human authorization requests
                    from the emergency command
                    system.
                  </p>
                </div>

                <Shield size={21} />
              </div>

              {approvalsLoading && (
                <div className="empty-state">
                  <span className="spinner" />

                  <p>
                    Loading approvals...
                  </p>
                </div>
              )}

              {approvalsError && (
                <div className="error-box">
                  <AlertTriangle size={18} />

                  <span>
                    {approvalsError}
                  </span>
                </div>
              )}

              {!approvalsLoading &&
                !approvalsError &&
                approvals.length ===
                  0 && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <Shield size={30} />
                    </div>

                    <h2>
                      No Approval Requests
                    </h2>

                    <p>
                      New emergency approval
                      requests will appear here.
                    </p>
                  </div>
                )}

              {!approvalsLoading &&
                !approvalsError &&
                approvals.length >
                  0 && (
                  <div className="approval-list">
                    {approvals.map(
                      (approvalItem) => {
                        const incidentDetails =
                          approvalItem
                            .response_plan
                            ?.incident_details ||
                          {};

                        const approvalImage =
                          incidentDetails.image_data ||
                          incidentDetails.image ||
                          approvalItem.image_data ||
                          "";

                        return (
                          <div
                            className="approval-card"
                            key={
                              approvalItem.approval_id
                            }
                          >
                            <div className="approval-card-header">
                              <div>
                                <h3>
                                  {
                                    approvalItem.approval_id
                                  }
                                </h3>

                                <p>
                                  Incident:{" "}
                                  {
                                    approvalItem.incident_id
                                  }
                                </p>
                              </div>

                              <span
                                className={`status-badge ${
                                  approvalItem.status?.toLowerCase()
                                }`}
                              >
                                {
                                  approvalItem.status
                                }
                              </span>
                            </div>

                            {/* STUDENT INFORMATION */}

                            {(incidentDetails.student_name ||
                              incidentDetails.student_email ||
                              incidentDetails.description ||
                              incidentDetails.location) && (
                              <div className="approval-incident-details">
                                {incidentDetails.student_name && (
                                  <div className="approval-student-info">
                                    <span>
                                      Reported By
                                    </span>

                                    <strong>
                                      {
                                        incidentDetails.student_name
                                      }
                                    </strong>
                                  </div>
                                )}

                                {incidentDetails.student_email && (
                                  <div className="approval-student-info">
                                    <span>
                                      Student Email
                                    </span>

                                    <strong>
                                      {
                                        incidentDetails.student_email
                                      }
                                    </strong>
                                  </div>
                                )}

                                {incidentDetails.location && (
                                  <div className="approval-student-info">
                                    <span>
                                      Incident Location
                                    </span>

                                    <strong>
                                      {
                                        incidentDetails.location
                                      }
                                    </strong>
                                  </div>
                                )}

                                {incidentDetails.description && (
                                  <div className="approval-incident-description">
                                    <span>
                                      Incident
                                      Description
                                    </span>

                                    <p>
                                      {
                                        incidentDetails.description
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* INCIDENT IMAGE */}

                            {approvalImage && (
                              <div className="approval-incident-image">
                                <div className="approval-image-label">
                                  Incident
                                  Evidence
                                </div>

                                <img
                                  src={
                                    approvalImage
                                  }
                                  alt="Incident evidence"
                                />
                              </div>
                            )}

                            <div className="approval-details">
                              <div>
                                <span>
                                  Priority
                                </span>

                                <strong>
                                  {
                                    approvalItem.priority
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Requested By
                                </span>

                                <strong>
                                  {
                                    approvalItem.requested_by
                                  }
                                </strong>
                              </div>

                              <div>
                                <span>
                                  Requested At
                                </span>

                                <strong>
                                  {approvalItem.requested_at
                                    ? new Date(
                                        approvalItem.requested_at
                                      ).toLocaleString()
                                    : "-"}
                                </strong>
                              </div>
                            </div>

                            <div className="approval-resources">
                              <h4>
                                Selected Resources
                              </h4>

                              <div className="resource-tags">
                                {(
                                  approvalItem.selected_resources ||
                                  []
                                ).map(
                                  (
                                    resource
                                  ) => (
                                    <span
                                      key={
                                        resource
                                      }
                                      className="resource-tag"
                                    >
                                      {
                                        resource
                                      }
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {approvalItem.status ===
                              "PENDING" && (
                              <div className="approval-actions">
                                <button
                                  className="approve-button"
                                  onClick={() =>
                                    handleApprove(
                                      approvalItem.approval_id
                                    )
                                  }
                                >
                                  <CheckCircle2
                                    size={17}
                                  />

                                  Approve
                                </button>

                                <button
                                  className="reject-button"
                                  onClick={() =>
                                    handleReject(
                                      approvalItem.approval_id
                                    )
                                  }
                                >
                                  <XCircle
                                    size={17}
                                  />

                                  Reject
                                </button>
                              </div>
                            )}

                            {approvalItem.status ===
                              "APPROVED" && (
                              <div className="approval-result approved">
                                <CheckCircle2
                                  size={18}
                                />

                                <span>
                                  Approved by{" "}
                                  {approvalItem.approved_by ||
                                    "Commander"}
                                </span>
                              </div>
                            )}

                            {approvalItem.status ===
                              "REJECTED" && (
                              <div className="approval-result rejected">
                                <XCircle
                                  size={18}
                                />

                                <span>
                                  Rejected:{" "}
                                  {approvalItem.rejection_reason ||
                                    "No reason provided"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
            </section>
          ) : activePage ===
            "resources" ? (
            /* ==================================================
               RESOURCES
            ================================================== */

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>
                    Emergency Resources
                  </h2>

                  <p>
                    Live resources available
                    across the campus.
                  </p>
                </div>

                <Package size={22} />
              </div>

              <div className="resource-summary-grid">
                <div className="summary-card">
                  <div className="summary-card-label">
                    Total Resources
                  </div>

                  <div className="summary-card-value">
                    {summaryLoading
                      ? "..."
                      : resourceSummary.total}
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-card-label">
                    Available
                  </div>

                  <div className="summary-card-value">
                    {summaryLoading
                      ? "..."
                      : resourceSummary.available}
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-card-label">
                    Deployed
                  </div>

                  <div className="summary-card-value">
                    {summaryLoading
                      ? "..."
                      : resourceSummary.deployed}
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-card-label">
                    Unavailable
                  </div>

                  <div className="summary-card-value">
                    {summaryLoading
                      ? "..."
                      : resourceSummary.unavailable}
                  </div>
                </div>
              </div>

              <div className="resource-type-summary">
                {Object.entries(
                  resourceTypeSummary
                ).map(
                  ([type, summary]) => (
                    <div
                      className="resource-type-card"
                      key={type}
                    >
                      <div className="resource-type-header">
                        <Package size={18} />

                        <h3>{type}</h3>
                      </div>

                      <div className="resource-type-stats">
                        <div>
                          <span>
                            Total
                          </span>

                          <strong>
                            {summary.total}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Available
                          </span>

                          <strong>
                            {summary.available}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Deployed
                          </span>

                          <strong>
                            {summary.deployed}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Unavailable
                          </span>

                          <strong>
                            {summary.unavailable}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              {resourcesLoading && (
                <div className="empty-state">
                  <p>
                    Loading resources...
                  </p>
                </div>
              )}

              {resourcesError && (
                <div className="error-box">
                  <AlertTriangle size={18} />

                  <span>
                    {resourcesError}
                  </span>
                </div>
              )}

              {!resourcesLoading &&
                !resourcesError &&
                resources.length ===
                  0 && (
                  <div className="empty-state">
                    <Package size={30} />

                    <h3>
                      No resources found
                    </h3>

                    <p>
                      Resources added by the
                      administrator will
                      appear here.
                    </p>
                  </div>
                )}

              {!resourcesLoading &&
                resources.length >
                  0 && (
                  <div className="resource-grid">
                    {resources.map(
                      (resource) => (
                        <div
                          className="resource-card"
                          key={resource.id}
                        >
                          <div className="resource-card-top">
                            <div className="resource-icon">
                              <Package
                                size={20}
                              />
                            </div>

                            <span
                              className={`resource-status ${
                                resource.status?.toLowerCase()
                              }`}
                            >
                              {
                                resource.status
                              }
                            </span>
                          </div>

                          <h3>
                            {
                              resource.name
                            }
                          </h3>

                          <p className="resource-id">
                            {resource.id}
                          </p>

                          <div className="resource-info">
                            <div>
                              <span>
                                Type
                              </span>

                              <strong>
                                {
                                  resource.type
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Location
                              </span>

                              <strong>
                                {
                                  resource.location
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Capacity
                              </span>

                              <strong>
                                {
                                  resource.capacity
                                }
                              </strong>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
            </section>
          ) : (
            /* ==================================================
               COMMAND CENTER
            ================================================== */

            <>
              <section className="hero-card">
                <div className="hero-content">
                  <div className="eyebrow">
                    <Siren size={15} />
                    AI EMERGENCY RESPONSE
                  </div>

                  <h1>
                    Analyze a Campus
                    Emergency
                  </h1>

                  <p>
                    Describe the incident and
                    let AegisCampus AI coordinate
                    specialized response teams,
                    resources and emergency
                    actions.
                  </p>
                </div>

                <div className="hero-symbol">
                  <Siren size={82} />
                </div>
              </section>

              {/* ==================================================
                  INCIDENT INPUT
              ================================================== */}

              <section className="input-card">
                <div className="section-heading">
                  <div>
                    <h2>
                      New Emergency Incident
                    </h2>

                    <p>
                      Provide accurate information
                      for the AI command system.
                    </p>
                  </div>

                  {incidentData && (
                    <button
                      className="secondary-button"
                      onClick={
                        resetIncident
                      }
                    >
                      New Incident
                    </button>
                  )}
                </div>

                <div className="input-grid">
                  {/* DESCRIPTION */}

                  <div className="field">
                    <label>
                      INCIDENT DESCRIPTION
                    </label>

                    <div className="voice-input-wrapper">
                      <textarea
                        value={
                          description
                        }
                        onChange={(event) =>
                          setDescription(
                            event.target
                              .value
                          )
                        }
                        placeholder="Describe the emergency or use the microphone to speak..."
                        rows={5}
                      />

                      <button
                        type="button"
                        className={`voice-button ${
                          isListening
                            ? "listening"
                            : ""
                        }`}
                        onClick={
                          startVoiceInput
                        }
                        disabled={
                          isListening
                        }
                        title={
                          isListening
                            ? "Listening..."
                            : "Speak your emergency description"
                        }
                      >
                        {isListening ? (
                          <MicOff size={20} />
                        ) : (
                          <Mic size={20} />
                        )}

                        <span>
                          {isListening
                            ? "Listening..."
                            : "Speak"}
                        </span>
                      </button>
                    </div>

                    {isListening && (
                      <div className="voice-status">
                        <span className="voice-dot" />

                        Listening for your
                        emergency
                        description...
                      </div>
                    )}
                  </div>

                  {/* LOCATION */}

                  <div className="field">
                    <label>
                      LOCATION
                    </label>

                    <input
                      value={location}
                      onChange={(event) =>
                        setLocation(
                          event.target
                            .value
                        )
                      }
                      placeholder="Example: Block C - 2nd Floor"
                    />

                    <div className="input-hint">
                      <Map size={14} />
                      Campus location
                    </div>
                  </div>

                  {/* IMAGE */}

                  <div className="field">
                    <label>
                      INCIDENT IMAGE /
                      EVIDENCE
                    </label>

                    <div className="image-upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        id="incident-image"
                        onChange={
                          handleIncidentImage
                        }
                      />

                      <label
                        htmlFor="incident-image"
                        className="image-upload-label"
                      >
                        📷 Choose Incident
                        Image
                      </label>

                      {imagePreview && (
                        <div className="incident-image-preview">
                          <img
                            src={
                              imagePreview
                            }
                            alt="Incident evidence preview"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setIncidentImage(
                                null
                              );

                              setImagePreview(
                                ""
                              );

                              const input =
                                document.getElementById(
                                  "incident-image"
                                );

                              if (input) {
                                input.value =
                                  "";
                              }
                            }}
                          >
                            Remove Image
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="error-box">
                    <AlertTriangle size={18} />

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                <button
                  className="analyze-button"
                  onClick={
                    analyzeEmergency
                  }
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />

                      Analyzing
                      Emergency...
                    </>
                  ) : (
                    <>
                      <Siren size={20} />

                      Analyze Emergency
                    </>
                  )}
                </button>
              </section>

              {/* ==================================================
                  CAMPUS MAP
              ================================================== */}

              <CampusMap
                incidentLocation={
                  incidentData?.incident
                    ?.location ||
                  incidentData?.location ||
                  incident?.location ||
                  location ||
                  "Campus Monitoring"
                }
                deployedResources={
                  deployedResources
                }
              />

              {/* ==================================================
                  INCIDENT RESULTS
              ================================================== */}

              {incidentData && (
                <>
                  <section className="incident-banner">
                    <div className="incident-main">
                      <div className="incident-icon">
                        <Flame size={28} />
                      </div>

                      <div>
                        <div className="incident-label">
                          INCIDENT DETECTED
                        </div>

                        <h2>
                          {incident?.incident_type ||
                            "Unknown Incident"}
                        </h2>

                        <p>
                          {incident?.summary}
                        </p>
                      </div>
                    </div>

                    <div className="critical-badge">
                      <span className="critical-dot" />

                      {incident?.severity ||
                        "UNKNOWN"}
                    </div>
                  </section>

                  <section className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon red">
                        <AlertTriangle
                          size={20}
                        />
                      </div>

                      <div>
                        <span>
                          SEVERITY
                        </span>

                        <strong>
                          {incident?.severity}
                        </strong>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon orange">
                        <Users size={20} />
                      </div>

                      <div>
                        <span>
                          AFFECTED PEOPLE
                        </span>

                        <strong>
                          {incident?.affected_people ??
                            0}
                        </strong>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon cyan">
                        <Map size={20} />
                      </div>

                      <div>
                        <span>
                          LOCATION
                        </span>

                        <strong>
                          {incident?.location}
                        </strong>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon green">
                        <CheckCircle2
                          size={20}
                        />
                      </div>

                      <div>
                        <span>
                          AI CONFIDENCE
                        </span>

                        <strong>
                          {incident?.confidence}%
                        </strong>
                      </div>
                    </div>
                  </section>

                  {/* ==================================================
                      MULTI AGENT RESPONSE
                  ================================================== */}

                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Multi-Agent Response
                        </h2>

                        <p>
                          Specialized AI agents
                          activated for this
                          incident.
                        </p>
                      </div>

                      <div className="agent-count">
                        {
                          Object.keys(
                            agentResponses
                          ).length
                        }{" "}
                        / 5 ACTIVE
                      </div>
                    </div>

                    <div className="agent-grid">
                      {[
                        "security",
                        "medical",
                        "facilities",
                        "transport",
                        "communication",
                      ].map(
                        (agentName) => {
                          const Icon =
                            agentIcons[
                              agentName
                            ];

                          const agent =
                            agentResponses[
                              agentName
                            ];

                          return (
                            <div
                              className={`agent-card ${
                                agent
                                  ? "agent-active"
                                  : "agent-error"
                              }`}
                              key={
                                agentName
                              }
                            >
                              <div className="agent-top">
                                <div className="agent-icon">
                                  <Icon
                                    size={20}
                                  />
                                </div>

                                <span className="agent-status">
                                  {agent
                                    ? "COMPLETED"
                                    : "ERROR"}
                                </span>
                              </div>

                              <h3>
                                {agentName
                                  .charAt(
                                    0
                                  )
                                  .toUpperCase() +
                                  agentName.slice(
                                    1
                                  )}
                              </h3>

                              <p>
                                {agent
                                  ? `${
                                      agent
                                        .selected_resources
                                        ?.length ||
                                      0
                                    } resources selected`
                                  : "Agent unavailable"}
                              </p>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </section>

                  {/* ==================================================
                      RESOURCES + APPROVAL
                  ================================================== */}

                  <section className="two-column">
                    <div className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            Selected Resources
                          </h2>

                          <p>
                            Resources recommended
                            by the AI agents.
                          </p>
                        </div>

                        <div className="resource-total">
                          {response
                            ?.selected_resources
                            ?.length || 0}
                        </div>
                      </div>

                      <div className="resource-list">
                        {(
                          response?.selected_resources ||
                          []
                        ).map(
                          (resourceId) => {
                            const isDeployed =
                              deployedResources.includes(
                                resourceId
                              );

                            return (
                              <div
                                className="resource-row"
                                key={
                                  resourceId
                                }
                              >
                                <div className="resource-symbol">
                                  <CheckCircle2
                                    size={17}
                                  />
                                </div>

                                <span>
                                  {
                                    resourceId
                                  }
                                </span>

                                <span
                                  className={
                                    isDeployed
                                      ? "available deployed"
                                      : "available"
                                  }
                                >
                                  {isDeployed
                                    ? "DEPLOYED"
                                    : "AVAILABLE"}
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    <div
                      className={`approval-panel ${
                        isApproved
                          ? "approval-approved"
                          : isRejected
                          ? "approval-rejected"
                          : ""
                      }`}
                    >
                      <div className="approval-icon">
                        {isApproved ? (
                          <CheckCircle2
                            size={25}
                          />
                        ) : isRejected ? (
                          <XCircle
                            size={25}
                          />
                        ) : (
                          <Shield
                            size={25}
                          />
                        )}
                      </div>

                      <div>
                        <div className="approval-label">
                          HUMAN APPROVAL
                        </div>

                        <h2>
                          {approvalStatus}
                        </h2>

                        <p>
                          {isApproved
                            ? `Approved by ${
                                currentApproval?.approved_by ||
                                "Campus Emergency Commander"
                              }. Emergency response actions are authorized.`
                            : isRejected
                            ? `Rejected by ${
                                currentApproval?.rejected_by ||
                                "Campus Emergency Commander"
                              }.`
                            : "High-impact emergency actions require authorization from an emergency commander."}
                        </p>
                      </div>

                      {isAdmin &&
                        isPending && (
                          <>
                            <button
                              className="approve-button"
                              onClick={
                                approveResponse
                              }
                              disabled={
                                approvalLoading
                              }
                            >
                              {approvalLoading ? (
                                <>
                                  <span className="spinner" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2
                                    size={17}
                                  />
                                  Approve
                                  Response
                                </>
                              )}
                            </button>

                            <button
                              className="reject-button"
                              onClick={() =>
                                setShowRejectBox(
                                  (previous) =>
                                    !previous
                                )
                              }
                              disabled={
                                approvalLoading
                              }
                            >
                              <XCircle
                                size={17}
                              />

                              Reject
                              Response
                            </button>

                            {showRejectBox && (
                              <div className="reject-box">
                                <label>
                                  REJECTION
                                  REASON
                                </label>

                                <textarea
                                  value={
                                    rejectionReason
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setRejectionReason(
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  placeholder="Explain why this response plan should be rejected..."
                                  rows={3}
                                />

                                <button
                                  className="confirm-reject-button"
                                  onClick={
                                    rejectResponse
                                  }
                                  disabled={
                                    approvalLoading
                                  }
                                >
                                  Confirm
                                  Rejection
                                </button>
                              </div>
                            )}
                          </>
                        )}

                      {isApproved && (
                        <div className="approval-success">
                          <CheckCircle2
                            size={16}
                          />

                          RESPONSE
                          AUTHORIZED
                        </div>
                      )}

                      {isRejected && (
                        <div className="approval-failure">
                          <XCircle
                            size={16}
                          />

                          RESPONSE
                          REJECTED
                        </div>
                      )}

                      {approvalError && (
                        <div className="approval-error">
                          <AlertTriangle
                            size={15}
                          />

                          {approvalError}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* ==================================================
                      COMMUNICATION ALERT
                  ================================================== */}

                  {agentResponses
                    .communication
                    ?.alert_required && (
                    <section className="alert-panel">
                      <div className="alert-header">
                        <div className="alert-icon">
                          <Bell size={21} />
                        </div>

                        <div>
                          <span>
                            EMERGENCY ALERT
                          </span>

                          <h2>
                            Communication Agent
                            Recommendation
                          </h2>
                        </div>
                      </div>

                      <div className="alert-message">
                        {
                          agentResponses
                            .communication
                            .alert_message
                        }
                      </div>

                      <div className="alert-audience">
                        {(
                          agentResponses
                            .communication
                            .audience || []
                        ).map(
                          (aud) => (
                            <span
                              key={aud}
                            >
                              {aud}
                            </span>
                          )
                        )}
                      </div>
                    </section>
                  )}

                  {/* ==================================================
                      RECOMMENDED ACTIONS
                  ================================================== */}

                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Recommended Actions
                        </h2>

                        <p>
                          Combined recommendations
                          from all active agents.
                        </p>
                      </div>
                    </div>

                    <div className="actions-grid">
                      {(
                        response?.recommended_actions ||
                        []
                      ).map(
                        (
                          action,
                          index
                        ) => (
                          <div
                            className="action-row"
                            key={`${action}-${index}`}
                          >
                            <span className="action-number">
                              {String(
                                index + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </span>

                            <span>
                              {action}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </section>

                  {/* ==================================================
                      INCIDENT AUDIT
                  ================================================== */}

                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Audit Trail
                        </h2>

                        <p>
                          Recorded emergency
                          workflow events.
                        </p>
                      </div>

                      <ClipboardList
                        size={21}
                      />
                    </div>

                    <div className="audit-list">
                      {(
                        incidentData.audit_events ||
                        []
                      ).map(
                        (event) => (
                          <div
                            className="audit-row"
                            key={
                              event.event_id
                            }
                          >
                            <div className="audit-dot" />

                            <div className="audit-content">
                              <strong>
                                {
                                  event.event_type
                                }
                              </strong>

                              <p>
                                {
                                  event.message
                                }
                              </p>
                            </div>

                            <span className="audit-actor">
                              {
                                event.actor
                              }
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* ==================================================
                  EMPTY COMMAND CENTER
              ================================================== */}

              {!incidentData && (
                <section className="empty-state">
                  <div className="empty-icon">
                    <Radio size={30} />
                  </div>

                  <h2>
                    Command Center Ready
                  </h2>

                  <p>
                    Submit an emergency incident
                    above to activate the
                    AegisCampus multi-agent
                    response system.
                  </p>

                  <div className="empty-agents">
                    <span>
                      Security
                    </span>

                    <span>
                      Medical
                    </span>

                    <span>
                      Facilities
                    </span>

                    <span>
                      Transport
                    </span>

                    <span>
                      Communication
                    </span>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;