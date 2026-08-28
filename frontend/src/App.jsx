import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Ambulance,
  ArrowRight,
  Bell,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  Eye,
  FileText,
  Flame,
  Globe,
  HeartPulse,
  HelpCircle,
  Image as ImageIcon,
  Info,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  List,
  Lock,
  LogOut,
  Map,
  MapPin,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Navigation,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Trash2,
  Truck,
  User,
  Users,
  Wifi,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import CampusMap from "./components/CampusMap";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const QUICK_LOCATIONS = [
  { name: "N Block", code: "N", icon: "🔬", desc: "Science & Tech" },
  { name: "A Block", code: "A", icon: "🏛️", desc: "Academic Complex" },
  { name: "Library", code: "L", icon: "📚", desc: "NTR Central Library" },
  { name: "H Block", code: "H", icon: "🏫", desc: "Humanities & Sciences" },
  { name: "U Block", code: "U", icon: "🏢", desc: "Admin Complex" },
  { name: "Pharmacy Block", code: "P", icon: "💊", desc: "Pharmacy College" },
  { name: "Main Gate", code: "M", icon: "🚪", desc: "Primary Campus Exit" },
  { name: "Playground", code: "PG", icon: "🌲", desc: "Safe Zone Alpha" },
  { name: "Convocation Hall", code: "CH", icon: "🏛️", desc: "Safe Shelter" },
];


const STUDENT_AI_PROMPTS = [
  "Where should I evacuate from N Block?",
  "What should I do during a chemical or lab fire?",
  "Show me the nearest safe assembly area.",
  "How do I request an immediate medical ambulance?",
];

const ADMIN_AI_PROMPTS = [
  "Summarize active emergency response protocols.",
  "Which resource fleet units should be prioritized for evacuation?",
  "Provide safety briefing for Convocation Hall assembly area.",
  "What is the status of security perimeter at North Gate?",
];

export default function App({ user, onLogout }) {
  const isAdmin = user?.role === "admin";
  const studentName = user?.displayName || user?.name || user?.username || "Student";
  const studentEmail = user?.email || "";
  const studentId = user?.studentId || user?.student_id || "";

  // Navigation State
  const [activeTab, setActiveTab] = useState("command");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Student Emergency Report Form State
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [incidentImage, setIncidentImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");

  // AI Assistant Chat State (Student & Admin)
  const [aiQuery, setAiQuery] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: "ai",
      text: "AegisCampus AI Sentinel active. Ask any emergency question, evacuation protocol, or safe shelter query.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [aiQueryLoading, setAiQueryLoading] = useState(false);

  // Active Incident Data
  const [activeIncidentData, setActiveIncidentData] = useState(null);

  // History & Incidents State
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [selectedIncidentModal, setSelectedIncidentModal] = useState(null);
  const [incidentSearchQuery, setIncidentSearchQuery] = useState("");
  const [incidentFilterStatus, setIncidentFilterStatus] = useState("ALL");
  const [incidentViewMode, setIncidentViewMode] = useState("cards");

  // Admin Approvals State
  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  // Admin Resources State
  const [resources, setResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourceSummary, setResourceSummary] = useState({
    total: 0,
    available: 0,
    deployed: 0,
    unavailable: 0,
    maintenance: 0,
  });
  const [resourceFilter, setResourceFilter] = useState("ALL");

  // Add / Edit Resource Modal State
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceForm, setResourceForm] = useState({
    id: "",
    name: "",
    type: "Security",
    location: "Main Security Office",
    capacity: 2,
    status: "AVAILABLE",
    contact_name: "",
    phone_number: "",
    email: "",
    vehicle_number: "",
    designation: "",
  });
  const [resourceFormLoading, setResourceFormLoading] = useState(false);
  const [resourceFormError, setResourceFormError] = useState("");

  // Confirmation Modal State for dangerous actions
  const [confirmModal, setConfirmModal] = useState(null);

  // Emergency Alerts State
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  // Audit Logs State
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Notification Banner
  const [toastMessage, setToastMessage] = useState(null);

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showToast = (msg, type = "success") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // ============================================================
  // INITIAL DATA LOADING & REAL-TIME SYNC
  // ============================================================
  useEffect(() => {
    loadResources();
    loadResourceSummary();
    loadIncidents();

    if (isAdmin) {
      loadApprovals();
      loadAlerts();
    }

    const interval = setInterval(() => {
      loadResourceSummary();
      loadIncidents();
      if (isAdmin) {
        loadApprovals();
        loadAlerts();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isAdmin, user]);

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = async () => {
    try {
      if (!isAdmin) {
        await signOut(auth);
      }
      if (onLogout) {
        onLogout();
      }
    } catch (err) {
      console.error("Logout error:", err);
      if (onLogout) onLogout();
    }
  };

  // ============================================================
  // API LOADERS
  // ============================================================
  const loadIncidents = async () => {
    setIncidentsLoading(true);
    try {
      let url = `${API_BASE_URL}/api/incidents`;
      if (!isAdmin && studentEmail) {
        url += `?student_email=${encodeURIComponent(studentEmail)}`;
      }
      const res = await axios.get(url);
      const incList = res.data.incidents || [];
      setIncidents(incList);

      // Auto set active incident if any
      const activeOne = incList.find((i) => i.status === "ACTIVE" || i.status === "PENDING");
      if (activeOne && !activeIncidentData) {
        setActiveIncidentData({ incident: activeOne, incident_id: activeOne.incident_id });
      }
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setIncidentsLoading(false);
    }
  };

  const loadResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/resources`);
      setResources(res.data.resources || []);
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const loadResourceSummary = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/resources/summary`);
      setResourceSummary({
        total: res.data.total || 0,
        available: res.data.available || 0,
        deployed: res.data.deployed || 0,
        unavailable: res.data.unavailable || 0,
        maintenance: res.data.maintenance || 0,
      });
    } catch (err) {
      console.error("Failed to load resource summary:", err);
    }
  };

  const loadApprovals = async () => {
    if (!isAdmin) return;
    setApprovalsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/emergency/approvals`);
      setApprovals(res.data.approvals || []);
    } catch (err) {
      console.error("Failed to load approvals:", err);
    } finally {
      setApprovalsLoading(false);
    }
  };

  const loadAlerts = async () => {
    if (!isAdmin) return;
    setAlertsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/emergency/alerts`);
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const loadAuditTrail = async () => {
    setAuditLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/audit`);
      setAuditEvents(res.data.audit_events || []);
    } catch (err) {
      console.error("Failed to load audit trail:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  // ============================================================
  // VOICE SPEECH RECOGNITION
  // ============================================================
  const toggleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      setReportError("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setReportError("");
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setDescription((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
      setIsListening(false);
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e.error);
      setIsListening(false);
      if (e.error === "not-allowed") {
        setReportError("Microphone access denied. Please grant permission.");
      } else {
        setReportError("Voice transcription timed out. Please retry.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // ============================================================
  // PHOTO EVIDENCE UPLOAD
  // ============================================================
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setIncidentImage(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setReportError("Invalid format. Please upload PNG, JPG, or JPEG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setReportError("Image size exceeds maximum limit of 5 MB.");
      return;
    }

    setIncidentImage(file);
    setReportError("");

    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setIncidentImage(null);
    setImagePreview("");
    const fileInput = document.getElementById("incident-image-input");
    if (fileInput) fileInput.value = "";
  };

  // ============================================================
  // SUBMIT EMERGENCY REPORT
  // ============================================================
  const handleReportEmergency = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setReportError("Emergency description is required.");
      return;
    }
    if (!location.trim()) {
      setReportError("Campus location is required.");
      return;
    }

    setReportLoading(true);
    setReportError("");
    setReportSuccess("");

    try {
      const payload = {
        description: description.trim(),
        location: location.trim(),
        student_id: studentId || (user?.uid ? user.uid.slice(0, 8) : "STU-01"),
        student_name: studentName,
        student_email: studentEmail || "student@vignan.ac.in",
        voice_transcript: isListening ? description : "",
        image_data: imagePreview || null,
      };

      const res = await axios.post(`${API_BASE_URL}/api/emergency/respond`, payload);

      if (res.data.success) {
        setActiveIncidentData(res.data);
        setReportSuccess("Incident logged. Awaiting Command Center dispatch.");
        showToast("Emergency report transmitted. Safety instructions generated.", "success");

        loadIncidents();
        loadResources();
        loadResourceSummary();
      }
    } catch (err) {
      console.error("Report failed:", err);
      setReportError(
        "Incident logged. Emergency processing continues through Command Center."
      );
    } finally {
      setReportLoading(false);
    }
  };

  // ============================================================
  // AI ASSISTANT QUERY HANDLER
  // ============================================================
  const handleSendAiPrompt = (queryText) => {
    const promptToSend = queryText || aiQuery;
    if (!promptToSend.trim()) return;

    const userMessage = {
      sender: "user",
      text: promptToSend.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setAiChatHistory((prev) => [...prev, userMessage]);
    setAiQuery("");
    setAiQueryLoading(true);

    setTimeout(() => {
      const q = promptToSend.toLowerCase();
      let answer = "";

      if (q.includes("evacuate") || q.includes("route") || q.includes("n block") || q.includes("fire")) {
        answer = "🚨 Evacuation Directive: If in N Block, immediately exit via the east stairwell toward the central avenue. Proceed south-east directly to Convocation Hall (Safe Shelter) or Playground (Safe Zone Alpha). Do not use elevators.";
      } else if (q.includes("safe") || q.includes("assembly") || q.includes("shelter")) {
        answer = "🛡️ Primary Safe Assembly Zones: 1. Convocation Hall (Indoor Safe Shelter - Coordinate: 63.5% X, 36.5% Y) 2. Open Playground (Safe Zone Alpha - Coordinate: 64.0% X, 53.0% Y). Both zones are equipped with first aid and campus security.";
      } else if (q.includes("ambulance") || q.includes("medical") || q.includes("injury")) {
        answer = "🚑 Medical Response Protocol: Submit an emergency report with 'Medical' or call the Campus Health Clinic at +91 94401 55501. Units AMB-001 and FAU-001 (First Aid) will be dispatched instantly upon authorization.";
      } else if (q.includes("prioritize") || q.includes("commander") || q.includes("perimeter")) {
        answer = "🛡️ Commander Strategic Briefing: Establish 50-meter perimeter cordon around active hazard zone. Deploy Security units SEC-001 and SEC-002 at access corridors. Verify Convocation Hall muster headcount.";
      } else {
        answer = `🛡️ AegisCampus AI Protocol: For "${promptToSend}", maintain situational awareness, notify nearby faculty or safety marshals, and submit a live report using the Emergency Intake console for immediate commander dispatch.`;
      }

      setAiChatHistory((prev) => [
        ...prev,
        {
          sender: "ai",
          text: answer,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      setAiQueryLoading(false);
    }, 600);
  };

  // ============================================================
  // ADMIN APPROVE & REJECT ACTIONS
  // ============================================================
  const handleApprovePlan = async (approvalId) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/emergency/approvals/${approvalId}/approve`,
        {
          approved_by: user?.name || user?.username || "Campus Emergency Commander",
        }
      );

      if (res.data.success) {
        showToast("Response Plan APPROVED: Units dispatched and responder alerts generated.", "success");
        loadApprovals();
        loadResources();
        loadResourceSummary();
        loadAlerts();
        loadIncidents();

        if (activeIncidentData?.approval?.approval_id === approvalId) {
          setActiveIncidentData((prev) => ({
            ...prev,
            approval: res.data.approval,
            incident: {
              ...prev.incident,
              approval_status: "APPROVED",
              status: "ACTIVE",
              deployed_resources: res.data.dispatched_resources,
            },
          }));
        }
      }
    } catch (err) {
      console.error("Approval error:", err);
      showToast(err.response?.data?.detail || "Approval failed.", "error");
    }
  };

  const handleRejectPlan = (approvalId) => {
    const reason = window.prompt("Enter official rejection reason:");
    if (!reason || !reason.trim()) return;

    axios
      .post(`${API_BASE_URL}/api/emergency/approvals/${approvalId}/reject`, {
        rejected_by: user?.name || user?.username || "Campus Emergency Commander",
        reason: reason.trim(),
      })
      .then((res) => {
        if (res.data.success) {
          showToast("Response plan rejected.", "info");
          loadApprovals();
          loadIncidents();
        }
      })
      .catch((err) => {
        showToast(err.response?.data?.detail || "Rejection failed.", "error");
      });
  };

  // ============================================================
  // ADMIN RESOLVE & CLOSE INCIDENT
  // ============================================================
  const handleResolveIncident = (incidentId) => {
    setConfirmModal({
      title: "Resolve Campus Incident",
      message: `Confirm incident ${incidentId} resolution. Deployed units will be marked ready for revocation.`,
      confirmLabel: "Mark as Resolved",
      confirmClass: "btn-confirm-success",
      onConfirm: async () => {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/emergency/incidents/${incidentId}/resolve`, {
            resolved_by: user?.name || user?.username || "Campus Emergency Commander",
            notes: "Incident resolved safely.",
          });
          if (res.data.success) {
            showToast(`Incident ${incidentId} marked as RESOLVED.`, "success");
            loadIncidents();
            loadResources();
            loadResourceSummary();
          }
        } catch (err) {
          showToast("Failed to resolve incident.", "error");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  // ============================================================
  // ADMIN BULK RELEASE / REVOKE RESOURCES
  // ============================================================
  const handleReleaseAllDeployed = () => {
    const deployedList = resources.filter((r) => r.status === "DEPLOYED");
    if (deployedList.length === 0) {
      showToast("No units are currently deployed.", "info");
      return;
    }

    setConfirmModal({
      title: "Stand Down All Deployed Units",
      message: `Release ${deployedList.length} deployed units back to AVAILABLE status?`,
      confirmLabel: "Release All Units",
      confirmClass: "btn-confirm-warning",
      onConfirm: async () => {
        try {
          for (const res of deployedList) {
            await axios.post(`${API_BASE_URL}/api/resources/${res.id}/revoke`, {
              incident_id: res.incident_id,
              revoked_by: user?.name || user?.username || "Campus Emergency Commander",
              reason: "Incident stand-down order",
            });
          }
          showToast(`All ${deployedList.length} units returned to AVAILABLE.`, "success");
          loadResources();
          loadResourceSummary();
        } catch (err) {
          showToast("Failed to release all units.", "error");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  // ============================================================
  // ADMIN RESOURCE DEPLOY & REVOKE
  // ============================================================
  const handleDeployResourceDirect = async (resourceId, incidentId = "INC-MANUAL") => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/resources/${resourceId}/deploy`, {
        incident_id: incidentId,
        deployed_by: user?.name || user?.username || "Campus Emergency Commander",
      });
      if (res.data.success) {
        showToast(`Resource ${resourceId} deployed.`, "success");
        loadResources();
        loadResourceSummary();
        loadAlerts();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Deployment failed.", "error");
    }
  };

  const handleRevokeResource = (resourceId, incidentId) => {
    setConfirmModal({
      title: "Revoke Emergency Unit",
      message: `Revoke unit ${resourceId} and return to AVAILABLE status?`,
      confirmLabel: "Confirm Revoke",
      confirmClass: "btn-confirm-warning",
      onConfirm: async () => {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/resources/${resourceId}/revoke`, {
            incident_id: incidentId,
            revoked_by: user?.name || user?.username || "Campus Emergency Commander",
            reason: "Stand-down order",
          });
          if (res.data.success) {
            showToast(`Resource ${resourceId} returned to AVAILABLE.`, "success");
            loadResources();
            loadResourceSummary();
          }
        } catch (err) {
          showToast(err.response?.data?.detail || "Revocation failed.", "error");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  // ============================================================
  // RESOURCE SAVE / EDIT / DELETE
  // ============================================================
  const handleSaveResource = async (e) => {
    e.preventDefault();
    setResourceFormLoading(true);
    setResourceFormError("");

    try {
      if (editingResource) {
        await axios.put(`${API_BASE_URL}/api/resources/${editingResource.id}`, resourceForm);
        showToast(`Resource ${editingResource.id} updated.`, "success");
      } else {
        await axios.post(`${API_BASE_URL}/api/resources`, resourceForm);
        showToast(`Resource ${resourceForm.id} registered.`, "success");
      }
      setShowResourceModal(false);
      setEditingResource(null);
      loadResources();
      loadResourceSummary();
    } catch (err) {
      setResourceFormError(err.response?.data?.detail || "Failed to save resource.");
    } finally {
      setResourceFormLoading(false);
    }
  };

  const handleDeleteResource = (resourceId) => {
    setConfirmModal({
      title: "Deactivate Unit",
      message: `Confirm removal of resource ${resourceId} from active fleet.`,
      confirmLabel: "Delete Unit",
      confirmClass: "btn-confirm-danger",
      onConfirm: async () => {
        try {
          await axios.delete(`${API_BASE_URL}/api/resources/${resourceId}`);
          showToast(`Resource ${resourceId} removed.`, "info");
          loadResources();
          loadResourceSummary();
        } catch (err) {
          showToast(err.response?.data?.detail || "Failed to delete.", "error");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const openAddResource = () => {
    setEditingResource(null);
    setResourceForm({
      id: `RES-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      type: "Security",
      location: "Main Security Office",
      capacity: 2,
      status: "AVAILABLE",
      contact_name: "",
      phone_number: "",
      email: "",
      vehicle_number: "",
      designation: "",
    });
    setResourceFormError("");
    setShowResourceModal(true);
  };

  const openEditResource = (res) => {
    setEditingResource(res);
    setResourceForm({
      id: res.id,
      name: res.name || "",
      type: res.type || "Security",
      location: res.location || "",
      capacity: res.capacity || 1,
      status: res.status || "AVAILABLE",
      contact_name: res.contact_name || "",
      phone_number: res.phone_number || "",
      email: res.email || "",
      vehicle_number: res.vehicle_number || "",
      designation: res.designation || "",
    });
    setResourceFormError("");
    setShowResourceModal(true);
  };

  // Filtered resources
  const filteredResources = useMemo(() => {
    if (resourceFilter === "ALL") return resources;
    return resources.filter((r) => r.type === resourceFilter || r.status === resourceFilter);
  }, [resources, resourceFilter]);

  // Derived current active incident
  const activeIncident = activeIncidentData?.incident || (incidents.find((i) => i.status === "ACTIVE") || (incidents.length > 0 ? incidents[0] : null));
  const hasActiveEmergency = Boolean(activeIncident && (activeIncident.status === "ACTIVE" || activeIncident.status === "PENDING"));
  const pendingApprovalsCount = approvals.filter((a) => a.status === "PENDING").length;

  const deployedResourceIds = useMemo(() => {
    return resources.filter((r) => r.status === "DEPLOYED").map((r) => r.id);
  }, [resources]);

  // Filtered incidents for search and status filter
  const filteredIncidents = useMemo(() => {
    let result = incidents;
    if (incidentFilterStatus !== "ALL") {
      result = result.filter((i) => i.status === incidentFilterStatus);
    }
    if (incidentSearchQuery.trim()) {
      const q = incidentSearchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.incident_id?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.incident_type?.toLowerCase().includes(q) ||
          i.student_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [incidents, incidentSearchQuery, incidentFilterStatus]);

  return (
    <div className="aegis-app-shell">
      {/* NOTIFICATION TOAST */}
      {toastMessage && (
        <div className={`ops-toast-bar toast-${toastMessage.type}`}>
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal && (
        <div className="ops-modal-backdrop">
          <div className="ops-modal confirm-dialog">
            <div className="ops-modal-header">
              <h3>{confirmModal.title}</h3>
              <button onClick={() => setConfirmModal(null)}><X size={14} /></button>
            </div>
            <div className="ops-modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="ops-modal-footer">
              <button type="button" className="btn-ops-secondary" onClick={() => setConfirmModal(null)}>Cancel</button>
              <button type="button" className={`btn-ops-primary ${confirmModal.confirmClass || ""}`} onClick={confirmModal.onConfirm}>
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT DETAILS & EVIDENCE INSPECTOR MODAL */}
      {selectedIncidentModal && (
        <div className="ops-modal-backdrop" onClick={() => setSelectedIncidentModal(null)}>
          <div className="ops-modal incident-inspector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ops-modal-header">
              <div>
                <h3>INCIDENT RECORD: {selectedIncidentModal.incident_id}</h3>
                <small className="mono-sub">{new Date(selectedIncidentModal.created_at).toLocaleString()}</small>
              </div>
              <button onClick={() => setSelectedIncidentModal(null)}><X size={16} /></button>
            </div>

            <div className="ops-modal-body inspector-grid">
              <div className="meta-strip">
                <span className={`status-tag status-${(selectedIncidentModal.status || "pending").toLowerCase()}`}>
                  STATUS: {selectedIncidentModal.status}
                </span>
                <span className={`sev-tag sev-${(selectedIncidentModal.severity || "medium").toLowerCase()}`}>
                  {selectedIncidentModal.severity} SEVERITY
                </span>
                <span className="location-tag">📍 {selectedIncidentModal.location}</span>
                <span className="type-tag">{selectedIncidentModal.incident_type}</span>
              </div>

              <div className="inspector-field">
                <label>INCIDENT DESCRIPTION</label>
                <div className="field-box-content">{selectedIncidentModal.description}</div>
              </div>

              <div className="inspector-field">
                <label>PHOTOGRAPHIC EVIDENCE</label>
                {selectedIncidentModal.image_data ? (
                  <div className="evidence-preview-wrap">
                    <img src={selectedIncidentModal.image_data} alt="Evidence" className="evidence-full-img" />
                  </div>
                ) : (
                  <div className="no-evidence-box">No photographic evidence attached to this record.</div>
                )}
              </div>

              {selectedIncidentModal.summary && (
                <div className="inspector-field">
                  <label>SITUATION ASSESSMENT & AI TRIAGE</label>
                  <div className="field-box-content">{selectedIncidentModal.summary}</div>
                </div>
              )}

              {selectedIncidentModal.deployed_resources?.length > 0 && (
                <div className="inspector-field">
                  <label>DEPLOYED UNITS</label>
                  <div className="units-list-row">
                    {selectedIncidentModal.deployed_resources.map((rId) => (
                      <span key={rId} className="unit-pill">🚨 {rId}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* TIMELINE PROGRESSION */}
              <div className="inspector-field">
                <label>IMMUTABLE INCIDENT AUDIT TIMELINE</label>
                <div className="inspector-timeline">
                  <div className="timeline-step done">
                    <span className="t-dot" />
                    <div><strong>Incident Reported</strong><small>{new Date(selectedIncidentModal.created_at).toLocaleTimeString()}</small></div>
                  </div>
                  <div className="timeline-step done">
                    <span className="t-dot" />
                    <div><strong>AI Intelligence Triage & Plan Generated</strong><small>Severity: {selectedIncidentModal.severity}</small></div>
                  </div>
                  <div className={`timeline-step ${selectedIncidentModal.approval_status === "APPROVED" ? "done" : "active"}`}>
                    <span className="t-dot" />
                    <div><strong>Commander Authorization</strong><small>{selectedIncidentModal.approval_status || "PENDING"}</small></div>
                  </div>
                  {selectedIncidentModal.status === "RESOLVED" && (
                    <div className="timeline-step done">
                      <span className="t-dot" />
                      <div><strong>Incident Marked Resolved</strong><small>Safety verified</small></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="reporter-bar">
                <span>Reporter: <strong>{selectedIncidentModal.student_name}</strong></span>
                <span>Email: {selectedIncidentModal.student_email || "N/A"}</span>
              </div>
            </div>

            <div className="ops-modal-footer">
              {isAdmin && selectedIncidentModal.status === "ACTIVE" && (
                <button
                  type="button"
                  className="btn-ops-primary btn-confirm-success"
                  onClick={() => {
                    setSelectedIncidentModal(null);
                    handleResolveIncident(selectedIncidentModal.incident_id);
                  }}
                >
                  Mark as Resolved
                </button>
              )}
              <button type="button" className="btn-ops-secondary" onClick={() => setSelectedIncidentModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RESOURCE ADD / EDIT MODAL (ADMIN) */}
      {showResourceModal && (
        <div className="ops-modal-backdrop">
          <div className="ops-modal resource-modal-dialog">
            <div className="ops-modal-header">
              <h3>{editingResource ? `EDIT RESOURCE: ${editingResource.id}` : "REGISTER NEW CAMPUS UNIT"}</h3>
              <button onClick={() => setShowResourceModal(false)}><X size={14} /></button>
            </div>

            <form onSubmit={handleSaveResource} className="ops-modal-body form-two-col">
              {resourceFormError && <div className="form-alert-error">{resourceFormError}</div>}

              <div className="field-group">
                <label>UNIT ID *</label>
                <input
                  type="text"
                  value={resourceForm.id}
                  disabled={Boolean(editingResource)}
                  onChange={(e) => setResourceForm({ ...resourceForm, id: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label>UNIT DESIGNATION / NAME *</label>
                <input
                  type="text"
                  placeholder="e.g. Patrol Unit 01"
                  value={resourceForm.name}
                  onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label>CATEGORY *</label>
                <select
                  value={resourceForm.type}
                  onChange={(e) => setResourceForm({ ...resourceForm, type: e.target.value })}
                >
                  <option value="Security">Security</option>
                  <option value="Medical">Medical / Ambulance</option>
                  <option value="First Aid">First Aid</option>
                  <option value="Facilities">Facilities</option>
                  <option value="Transport">Transport</option>
                  <option value="Communication">Communication</option>
                </select>
              </div>

              <div className="field-group">
                <label>BASE STATION LOCATION *</label>
                <input
                  type="text"
                  value={resourceForm.location}
                  onChange={(e) => setResourceForm({ ...resourceForm, location: e.target.value })}
                  required
                />
              </div>

              <div className="field-group">
                <label>STATUS</label>
                <select
                  value={resourceForm.status}
                  onChange={(e) => setResourceForm({ ...resourceForm, status: e.target.value })}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="DEPLOYED">DEPLOYED</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>

              <div className="field-group">
                <label>CAPACITY (PERSONNEL)</label>
                <input
                  type="number"
                  min="1"
                  value={resourceForm.capacity}
                  onChange={(e) => setResourceForm({ ...resourceForm, capacity: e.target.value })}
                />
              </div>

              <div className="field-divider-full">RESPONDER IN-CHARGE CONTACT DETAILS</div>

              <div className="field-group">
                <label>IN-CHARGE / DRIVER NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Varma"
                  value={resourceForm.contact_name}
                  onChange={(e) => setResourceForm({ ...resourceForm, contact_name: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label>PHONE (FOR DISPATCH ALERTS)</label>
                <input
                  type="text"
                  placeholder="+91 94401 55501"
                  value={resourceForm.phone_number}
                  onChange={(e) => setResourceForm({ ...resourceForm, phone_number: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label>VEHICLE REGISTRATION NO</label>
                <input
                  type="text"
                  placeholder="AP-07-EM-01"
                  value={resourceForm.vehicle_number}
                  onChange={(e) => setResourceForm({ ...resourceForm, vehicle_number: e.target.value })}
                />
              </div>

              <div className="field-group">
                <label>ROLE / DESIGNATION</label>
                <input
                  type="text"
                  placeholder="Paramedic Lead"
                  value={resourceForm.designation}
                  onChange={(e) => setResourceForm({ ...resourceForm, designation: e.target.value })}
                />
              </div>

              <div className="ops-modal-footer col-span-2">
                <button type="button" className="btn-ops-secondary" onClick={() => setShowResourceModal(false)}>Cancel</button>
                <button type="submit" className="btn-ops-primary" disabled={resourceFormLoading}>
                  {resourceFormLoading ? "Saving..." : editingResource ? "Update Unit" : "Register Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          GLOBAL APPLICATION SHELL: SIDEBAR & NAVIGATION
          ====================================================== */}
      <div className="aegis-layout-container">
        {/* LEFT COMMAND SIDEBAR */}
        <aside className="aegis-sidebar">
          <div className="sidebar-brand-block">
            <div className="brand-emblem-row">
              <ShieldAlert size={18} className="text-cyan" />
              <span className="brand-title">AEGISCAMPUS</span>
            </div>
            <span className="brand-subtitle">
              {isAdmin ? "Emergency Operations Center" : "Campus Safety Intelligence"}
            </span>
          </div>

          <div className="sidebar-role-indicator">
            <span className={`role-dot ${hasActiveEmergency ? "dot-alert" : ""}`} />
            <span>{isAdmin ? "SECURITY COMMANDER" : "STUDENT COMPANION"}</span>
          </div>

          <nav className="sidebar-nav">
            {isAdmin ? (
              <>
                <button
                  className={`nav-item ${activeTab === "command" ? "active" : ""}`}
                  onClick={() => setActiveTab("command")}
                >
                  <LayoutDashboard size={15} />
                  <span>COMMAND</span>
                </button>

                <button
                  className={`nav-item ${activeTab === "incidents" ? "active" : ""}`}
                  onClick={() => { setActiveTab("incidents"); loadIncidents(); }}
                >
                  <ClipboardList size={15} />
                  <span>INCIDENTS</span>
                  {incidents.length > 0 && <span className="nav-badge">{incidents.length}</span>}
                </button>

                <button
                  className={`nav-item ${activeTab === "approvals" ? "active" : ""}`}
                  onClick={() => { setActiveTab("approvals"); loadApprovals(); }}
                >
                  <ShieldAlert size={15} />
                  <span>APPROVALS</span>
                  {pendingApprovalsCount > 0 && <span className="nav-badge alert-badge">{pendingApprovalsCount}</span>}
                </button>

                <button
                  className={`nav-item ${activeTab === "resources" ? "active" : ""}`}
                  onClick={() => { setActiveTab("resources"); loadResources(); loadResourceSummary(); }}
                >
                  <Truck size={15} />
                  <span>RESOURCES</span>
                  {resourceSummary.deployed > 0 && <span className="nav-badge deployed-badge">{resourceSummary.deployed}</span>}
                </button>

                <button
                  className={`nav-item ${activeTab === "map" ? "active" : ""}`}
                  onClick={() => setActiveTab("map")}
                >
                  <Map size={15} />
                  <span>CAMPUS MAP</span>
                </button>

                <button
                  className={`nav-item ${activeTab === "ai-intel" ? "active" : ""}`}
                  onClick={() => setActiveTab("ai-intel")}
                >
                  <Cpu size={15} />
                  <span>AI INTELLIGENCE</span>
                </button>

                <button
                  className={`nav-item ${activeTab === "alerts" ? "active" : ""}`}
                  onClick={() => { setActiveTab("alerts"); loadAlerts(); }}
                >
                  <Radio size={15} />
                  <span>DISPATCH ALERTS</span>
                  {alerts.length > 0 && <span className="nav-badge">{alerts.length}</span>}
                </button>

                <button
                  className={`nav-item ${activeTab === "audit" ? "active" : ""}`}
                  onClick={() => { setActiveTab("audit"); loadAuditTrail(); }}
                >
                  <Activity size={15} />
                  <span>AUDIT LOG</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className={`nav-item ${activeTab === "command" ? "active" : ""}`}
                  onClick={() => setActiveTab("command")}
                >
                  <LayoutDashboard size={15} />
                  <span>Dashboard</span>
                </button>

                <button
                  className={`nav-item ${activeTab === "report" ? "active" : ""}`}
                  onClick={() => setActiveTab("report")}
                >
                  <AlertTriangle size={15} className="text-red" />
                  <span>Report Incident</span>
                </button>

                <button
                  className={`nav-item ${activeTab === "incidents" ? "active" : ""}`}
                  onClick={() => { setActiveTab("incidents"); loadIncidents(); }}
                >
                  <FileText size={15} />
                  <span>Incidents</span>
                  {incidents.length > 0 && <span className="nav-badge">{incidents.length}</span>}
                </button>

                <button
                  className={`nav-item ${activeTab === "map" ? "active" : ""}`}
                  onClick={() => setActiveTab("map")}
                >
                  <Map size={15} />
                  <span>Campus Map</span>
                </button>

                <button
                  className={`nav-item ${activeTab === "ai-assistant" ? "active" : ""}`}
                  onClick={() => setActiveTab("ai-assistant")}
                >
                  <Bot size={15} className="text-cyan" />
                  <span>AI Assistant</span>
                </button>
              </>
            )}
          </nav>

          <div className="sidebar-bottom-block">
            <div className="telemetry-status-row">
              <span className="telemetry-dot" />
              <span>SYSTEM ONLINE</span>
            </div>
            <div className="sidebar-user-card">
              <div className="user-avatar-tag">{isAdmin ? "EOC" : "STU"}</div>
              <div className="user-details">
                <strong>{studentName}</strong>
                <small>{isAdmin ? "Campus Commander" : studentEmail || "Student Portal"}</small>
              </div>
            </div>
            <button className="btn-sidebar-logout" onClick={handleLogout}>
              <LogOut size={13} />
              <span>TERMINATE SESSION</span>
            </button>
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <div className="aegis-main-workspace">
          {/* TOP OPERATIONAL HEADER */}
          <header className="ops-system-header">
            <div className="system-identity">
              <div className="system-status-indicator">
                <span className={`live-sentinel-dot ${hasActiveEmergency ? "sentinel-red" : ""}`} />
                <span className="system-tag">
                  {isAdmin
                    ? "VIGNAN UNIVERSITY • EMERGENCY OPERATIONS CENTER"
                    : "AEGISCAMPUS • CAMPUS SAFETY INTELLIGENCE"}
                </span>
              </div>
              <div className="clock-telemetry font-mono">{currentTime} IST</div>
            </div>

            {/* OPERATIONAL METRICS RIBBON */}
            <div className="ops-status-ribbon">
              {isAdmin ? (
                <>
                  <div className={`ops-ribbon-metric ${incidents.filter((i) => i.status === "ACTIVE").length > 0 ? "metric-active" : ""}`}>
                    <span className="r-val">{incidents.filter((i) => i.status === "ACTIVE").length}</span>
                    <span className="r-label">ACTIVE INCIDENTS</span>
                  </div>
                  <div className={`ops-ribbon-metric ${pendingApprovalsCount > 0 ? "metric-amber" : ""}`}>
                    <span className="r-val">{pendingApprovalsCount}</span>
                    <span className="r-label">PENDING APPROVALS</span>
                  </div>
                  <div className="ops-ribbon-metric">
                    <span className="r-val">{resourceSummary.deployed} / {resourceSummary.total}</span>
                    <span className="r-label">DEPLOYED</span>
                  </div>
                  <div className="ops-ribbon-metric">
                    <span className="r-val">{resourceSummary.available}</span>
                    <span className="r-label">AVAILABLE</span>
                  </div>
                </>
              ) : (
                <div className={`student-status-badge ${hasActiveEmergency ? "badge-emergency" : "badge-normal"}`}>
                  <span className="s-dot" />
                  <span>CAMPUS STATUS: {hasActiveEmergency ? "EMERGENCY ACTIVE" : "NORMAL"}</span>
                </div>
              )}

              <button className="btn-ops-refresh" onClick={() => { loadResources(); loadResourceSummary(); loadIncidents(); if (isAdmin) { loadApprovals(); loadAlerts(); } }} title="Sync State">
                <RefreshCw size={13} />
              </button>
            </div>
          </header>

          {/* MAIN PAGE CONTENT */}
          <main className="ops-workspace-content">
            {/* ======================================================
                1. STUDENT DASHBOARD (COMPANION VIEW)
                ====================================================== */}
            {!isAdmin && activeTab === "command" && (
              <div className="student-companion-layout">
                {/* HERO WELCOME STRIP */}
                <div className="student-hero-banner">
                  <div className="hero-text-block">
                    <h2>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {studentName}</h2>
                    <p>Your campus safety network is active and monitoring all sectors.</p>
                  </div>
                  <div className="hero-status-pills">
                    <span className="hero-status-chip"><span className="c-dot green" /> CAMPUS MONITORING ACTIVE</span>
                    <span className="hero-status-chip"><span className="c-dot green" /> EMERGENCY NETWORK ONLINE</span>
                  </div>
                </div>

                {/* ACTIVE EMERGENCY / EVACUATION GUIDANCE (DOMINANT IF ACTIVE) */}
                {hasActiveEmergency && activeIncident && (
                  <div className="student-active-emergency-card">
                    <div className="card-alert-header">
                      <div className="header-hazard-title">
                        <Flame size={20} className="text-red" />
                        <div>
                          <h3>ACTIVE EMERGENCY: {activeIncident.incident_type?.toUpperCase()} AT {activeIncident.location}</h3>
                          <span className="meta-sub">Reported at {new Date(activeIncident.created_at).toLocaleTimeString()} • Severity: {activeIncident.severity}</span>
                        </div>
                      </div>
                      <span className={`status-tag status-${(activeIncident.status || "pending").toLowerCase()}`}>
                        {activeIncident.status}
                      </span>
                    </div>

                    <div className="guidance-grid-split">
                      <div className="guidance-text-pane">
                        <div className="evac-instruction-box">
                          <h4>🛡️ EVACUATION GUIDANCE</h4>
                          <p className="evac-primary-target">
                            Primary Safe Area: <strong>Convocation Hall (Safe Shelter)</strong> or <strong>Playground (Safe Zone Alpha)</strong>
                          </p>
                          <ul className="evac-steps-list">
                            <li>1. Stay calm. Avoid {activeIncident.location} and adjacent corridors.</li>
                            <li>2. Follow the illuminated green pathway on the map below toward safety.</li>
                            <li>3. If injured or assisting someone, notify emergency marshals at Convocation Hall.</li>
                          </ul>
                        </div>

                        {activeIncident.image_data && (
                          <div className="incident-evidence-preview">
                            <span className="lbl-sm">INCIDENT PHOTOGRAPH:</span>
                            <img
                              src={activeIncident.image_data}
                              alt="Incident Evidence"
                              className="student-evidence-thumb"
                              onClick={() => setSelectedIncidentModal(activeIncident)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="guidance-map-pane">
                        <CampusMap
                          incidentLocation={activeIncident.location || ""}
                          deployedResources={deployedResourceIds}
                          activeIncident={activeIncident}
                          isStudentView={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TWO-COLUMN WORKSPACE: QUICK REPORT & AI ASSISTANT ENTRY */}
                <div className="student-action-grid">
                  {/* PROMINENT EMERGENCY REPORT CARD */}
                  <div className="student-report-card ops-panel">
                    <div className="ops-panel-header header-red-accent">
                      <div className="flex-row-center">
                        <AlertTriangle size={16} className="text-red" />
                        <h3>REPORT AN EMERGENCY</h3>
                      </div>
                      <span className="panel-status-sub">IMMEDIATE INTAKE</span>
                    </div>

                    <form onSubmit={handleReportEmergency} className="ops-form-stacked">
                      {reportError && <div className="form-alert-error">{reportError}</div>}
                      {reportSuccess && <div className="form-alert-success">{reportSuccess}</div>}

                      <div className="form-field">
                        <label className="field-title">INCIDENT LOCATION *</label>
                        <input
                          type="text"
                          placeholder="Type or select location below (e.g. N Block, Library, Pharmacy Block...)"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                          className="ops-input"
                        />

                        <div className="quick-select-header">
                          <span className="selector-title">QUICK SELECT CAMPUS ZONE:</span>
                        </div>
                        <div className="location-grid-selector">
                          {QUICK_LOCATIONS.map((loc) => {
                            const isSelected = location.toLowerCase().trim() === loc.name.toLowerCase().trim();
                            return (
                              <button
                                key={loc.name}
                                type="button"
                                className={`location-card-chip ${isSelected ? "selected" : ""}`}
                                onClick={() => setLocation(loc.name)}
                              >
                                <span className="loc-card-icon">{loc.icon}</span>
                                <div className="loc-card-meta">
                                  <strong>{loc.name}</strong>
                                  <small>{loc.desc}</small>
                                </div>
                                {isSelected && <span className="loc-check-dot">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="form-field">
                        <div className="field-label-split">
                          <label className="field-title">EMERGENCY DESCRIPTION *</label>
                          <button
                            type="button"
                            className={`btn-speech-toggle ${isListening ? "listening" : ""}`}
                            onClick={toggleVoiceInput}
                          >
                            {isListening ? <MicOff size={11} /> : <Mic size={11} />}
                            <span>{isListening ? "RECORDING..." : "VOICE INPUT"}</span>
                          </button>
                        </div>

                        <div className="textarea-wrapper">
                          <textarea
                            rows={3}
                            maxLength={500}
                            placeholder="Describe what is occurring (e.g. Fire in lab, injured student, electrical spark...)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            className="ops-textarea"
                          />
                          <div className="textarea-footer">
                            <span className="char-count-badge">{description.length} / 500 characters</span>
                          </div>
                        </div>
                      </div>

                      <div className="form-field">
                        <label className="field-title">ATTACH PHOTOGRAPH (EVIDENCE)</label>
                        {imagePreview ? (
                          <div className="evidence-staged-box">
                            <div className="evidence-preview-inner">
                              <img src={imagePreview} alt="Staged Evidence" className="staged-thumb" />
                              <div className="staged-meta">
                                <span className="staged-name">Photo Evidence Staged</span>
                                <span className="staged-sub">Ready to submit with emergency dispatch</span>
                              </div>
                            </div>
                            <button type="button" className="btn-remove-evidence" onClick={removeImage}>
                              <X size={13} /> Remove
                            </button>
                          </div>
                        ) : (
                          <label htmlFor="incident-image-input" className="evidence-drop-trigger">
                            <div className="drop-icon-circle">
                              <ImageIcon size={18} />
                            </div>
                            <div className="drop-text-block">
                              <strong>Upload Incident Photograph</strong>
                              <span>Click to browse or drop photo evidence (PNG/JPG Max 5MB)</span>
                            </div>
                          </label>
                        )}
                        <input
                          id="incident-image-input"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ display: "none" }}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-transmit-emergency"
                        disabled={reportLoading}
                      >
                        {reportLoading ? "TRANSMITTING TO COMMAND CENTER..." : "TRANSMIT EMERGENCY REPORT →"}
                      </button>
                    </form>
                  </div>

                  {/* RIGHT COLUMN: ASK AEGIS AI & RECENT INCIDENTS */}
                  <div className="student-companion-secondary">
                    {/* ASK AEGIS AI CARD */}
                    <div className="ops-panel ask-ai-card">
                      <div className="ops-panel-header">
                        <div className="flex-row-center">
                          <Bot size={16} className="text-cyan" />
                          <h3>ASK AEGIS AI</h3>
                        </div>
                        <div className="ai-status-pill">
                          <span className="ai-pulse-dot" />
                          <span>AI Online • Ready to Assist</span>
                        </div>
                      </div>

                      <div className="ask-ai-body">
                        <p className="ai-intro-text">
                          Instant emergency guidance, nearest evacuation points, and campus safety protocols.
                        </p>

                        <div className="ai-quick-chips">
                          {STUDENT_AI_PROMPTS.map((prompt, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="ai-prompt-chip"
                              onClick={() => {
                                setActiveTab("ai-assistant");
                                handleSendAiPrompt(prompt);
                              }}
                            >
                              <div className="prompt-chip-icon">
                                <Sparkles size={12} className="text-cyan" />
                              </div>
                              <span className="prompt-text">{prompt}</span>
                              <ArrowRight size={12} className="prompt-arrow" />
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="btn-open-ai-chat"
                          onClick={() => setActiveTab("ai-assistant")}
                        >
                          <MessageSquare size={14} />
                          <span>Open Live Safety Assistant</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>

                    {/* RECENT SUBMITTED INCIDENTS PREVIEW */}
                    <div className="ops-panel recent-incidents-card">
                      <div className="ops-panel-header">
                        <h3>MY RECENT INCIDENT LOGS</h3>
                        <button className="link-see-all" onClick={() => setActiveTab("incidents")}>
                          View All ({incidents.length})
                        </button>
                      </div>

                      <div className="recent-list-body">
                        {incidents.length === 0 ? (
                          <div className="empty-state-container">
                            <div className="empty-icon-box">
                              <ShieldCheck size={28} className="text-green" />
                            </div>
                            <strong>No active incident records</strong>
                            <p>All campus sectors are operating normally under 24/7 Aegis monitoring.</p>
                          </div>
                        ) : (
                          incidents.slice(0, 3).map((inc) => (
                            <div
                              key={inc.incident_id}
                              className="incident-mini-row"
                              onClick={() => setSelectedIncidentModal(inc)}
                            >
                              <div className="mini-row-info">
                                <strong>{inc.incident_type} — {inc.location}</strong>
                                <small>{new Date(inc.created_at).toLocaleDateString()} • {inc.severity} Severity</small>
                              </div>
                              <span className={`status-tag status-${(inc.status || "pending").toLowerCase()}`}>
                                {inc.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            )}

            {/* ======================================================
                2. STUDENT DEDICATED REPORT INCIDENT TAB
                ====================================================== */}
            {!isAdmin && activeTab === "report" && (
              <div className="student-report-tab-view">
                <div className="report-tab-grid">
                  {/* LEFT: MAIN REPORT FORM */}
                  <div className="ops-panel full-report-panel">
                    <div className="ops-panel-header header-red-accent">
                      <div className="flex-row-center">
                        <AlertTriangle size={18} className="text-red" />
                        <h2>OFFICIAL CAMPUS EMERGENCY REPORT</h2>
                      </div>
                      <span className="panel-status-sub">DIRECT EOC DISPATCH INTAKE</span>
                    </div>

                    <form onSubmit={handleReportEmergency} className="ops-form-stacked form-spacious">
                      {reportError && <div className="form-alert-error">{reportError}</div>}
                      {reportSuccess && <div className="form-alert-success">{reportSuccess}</div>}

                      <div className="form-field">
                        <label className="field-title">CAMPUS LOCATION *</label>
                        <input
                          type="text"
                          placeholder="Type or select location below (e.g. N Block, Pharmacy Block, Library...)"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          required
                          className="ops-input"
                        />

                        <div className="quick-select-header">
                          <span className="selector-title">QUICK SELECT CAMPUS ZONE:</span>
                        </div>
                        <div className="location-grid-selector">
                          {QUICK_LOCATIONS.map((loc) => {
                            const isSelected = location.toLowerCase().trim() === loc.name.toLowerCase().trim();
                            return (
                              <button
                                key={loc.name}
                                type="button"
                                className={`location-card-chip ${isSelected ? "selected" : ""}`}
                                onClick={() => setLocation(loc.name)}
                              >
                                <span className="loc-card-icon">{loc.icon}</span>
                                <div className="loc-card-meta">
                                  <strong>{loc.name}</strong>
                                  <small>{loc.desc}</small>
                                </div>
                                {isSelected && <span className="loc-check-dot">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="form-field">
                        <div className="field-label-split">
                          <label className="field-title">INCIDENT DESCRIPTION *</label>
                          <button
                            type="button"
                            className={`btn-speech-toggle ${isListening ? "listening" : ""}`}
                            onClick={toggleVoiceInput}
                          >
                            {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                            <span>{isListening ? "RECORDING..." : "VOICE INPUT"}</span>
                          </button>
                        </div>

                        <div className="textarea-wrapper">
                          <textarea
                            rows={4}
                            maxLength={500}
                            placeholder="Provide exact details: nature of emergency, casualties, floor, room number..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            className="ops-textarea"
                          />
                          <div className="textarea-footer">
                            <span className="char-count-badge">{description.length} / 500 characters</span>
                          </div>
                        </div>
                      </div>

                      <div className="form-field">
                        <label className="field-title">PHOTOGRAPHIC EVIDENCE</label>
                        {imagePreview ? (
                          <div className="evidence-staged-box">
                            <div className="evidence-preview-inner">
                              <img src={imagePreview} alt="Staged Evidence" className="staged-thumb" />
                              <div className="staged-meta">
                                <span className="staged-name">Photo Evidence Staged</span>
                                <span className="staged-sub">Ready to submit with emergency report</span>
                              </div>
                            </div>
                            <button type="button" className="btn-remove-evidence" onClick={removeImage}>
                              <X size={13} /> Remove Evidence
                            </button>
                          </div>
                        ) : (
                          <label htmlFor="incident-image-input-tab" className="evidence-drop-trigger">
                            <div className="drop-icon-circle">
                              <ImageIcon size={18} />
                            </div>
                            <div className="drop-text-block">
                              <strong>Attach Incident Photograph</strong>
                              <span>Click to browse or drop photo evidence (PNG/JPG Max 5MB)</span>
                            </div>
                          </label>
                        )}
                        <input
                          id="incident-image-input-tab"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={{ display: "none" }}
                        />
                      </div>

                      <button
                        type="submit"
                        className="btn-transmit-emergency btn-large"
                        disabled={reportLoading}
                      >
                        {reportLoading ? "TRANSMITTING TO COMMAND CENTER..." : "TRANSMIT EMERGENCY REPORT →"}
                      </button>
                    </form>
                  </div>

                  {/* RIGHT: EMERGENCY GUIDELINES & HOTLINES */}
                  <div className="report-side-cards">
                    {/* GUIDELINES CARD */}
                    <div className="ops-panel side-guidelines-card">
                      <div className="ops-panel-header">
                        <div className="flex-row-center">
                          <ShieldCheck size={16} className="text-green" />
                          <h3>EMERGENCY PROTOCOLS</h3>
                        </div>
                        <span className="panel-status-sub">VIGNAN DIRECTIVES</span>
                      </div>
                      <div className="side-card-body">
                        <div className="protocol-item">
                          <span className="protocol-badge fire">🔥 FIRE & HAZMAT</span>
                          <p>Evacuate immediately via designated stairwells. Do NOT use elevators. Proceed directly to Convocation Hall or Playground.</p>
                        </div>
                        <div className="protocol-item">
                          <span className="protocol-badge medical">🚑 MEDICAL CRITICAL</span>
                          <p>Keep corridors clear for ambulance ingress. Administer first aid if certified, or await FAU response teams.</p>
                        </div>
                        <div className="protocol-item">
                          <span className="protocol-badge security">🛡️ SECURITY & THREAT</span>
                          <p>Seek shelter in secure rooms. Barricade entry if necessary. Avoid recording or gathering around active perimeters.</p>
                        </div>
                      </div>
                    </div>

                    {/* HOTLINES & SHELTERS CARD */}
                    <div className="ops-panel side-hotlines-card">
                      <div className="ops-panel-header">
                        <div className="flex-row-center">
                          <Phone size={16} className="text-cyan" />
                          <h3>EMERGENCY DISPATCH HOTLINES</h3>
                        </div>
                      </div>
                      <div className="side-card-body">
                        <div className="hotline-row">
                          <span>Campus Security Control:</span>
                          <strong className="font-mono text-cyan">+91 98480 12345</strong>
                        </div>
                        <div className="hotline-row">
                          <span>Medical Emergency Center:</span>
                          <strong className="font-mono text-green">+91 94401 55501</strong>
                        </div>
                        <div className="hotline-row">
                          <span>Fire Response Unit:</span>
                          <strong className="font-mono text-red">+91 98660 77701</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================
                3. AI ASSISTANT TAB (STUDENT & ADMIN)
                ====================================================== */}
            {activeTab === "ai-assistant" && (
              <div className="ops-panel ai-chat-container">
                <div className="ops-panel-header">
                  <div className="flex-row-center">
                    <Bot size={18} className="text-cyan" />
                    <h2>AEGIS AI EMERGENCY COPILOT</h2>
                  </div>
                  <span className="panel-status-sub">GROQ AI INTELLIGENCE ACTIVE</span>
                </div>

                {hasActiveEmergency && activeIncident && (
                  <div className="ai-active-incident-brief">
                    <AlertTriangle size={14} className="text-amber" />
                    <span>
                      ACTIVE INCIDENT DETECTED: <strong>{activeIncident.incident_type} at {activeIncident.location}</strong>. Immediate Evacuation Destination: <strong>Convocation Hall / Playground</strong>.
                    </span>
                  </div>
                )}

                <div className="ai-chat-stream">
                  {aiChatHistory.map((msg, idx) => (
                    <div key={idx} className={`ai-message-row ${msg.sender === "user" ? "msg-user" : "msg-ai"}`}>
                      <div className="msg-avatar">{msg.sender === "user" ? "YOU" : "AI"}</div>
                      <div className="msg-bubble">
                        <p>{msg.text}</p>
                        <span className="msg-time">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}
                  {aiQueryLoading && (
                    <div className="ai-message-row msg-ai">
                      <div className="msg-avatar">AI</div>
                      <div className="msg-bubble"><span className="glass-spinner" /> ANALYZING INCIDENT & PROTOCOLS...</div>
                    </div>
                  )}
                </div>

                <div className="ai-prompts-bar-footer">
                  <span className="prompt-label-hint">QUICK PROMPTS:</span>
                  {(isAdmin ? ADMIN_AI_PROMPTS : STUDENT_AI_PROMPTS).map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      className="mini-prompt-chip"
                      onClick={() => handleSendAiPrompt(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="ai-input-bar">
                  <input
                    type="text"
                    placeholder="Ask Aegis AI Copilot (e.g. 'Where is the nearest safe zone from Library?')..."
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendAiPrompt(); }}
                  />
                  <button
                    type="button"
                    className="btn-ops-primary"
                    onClick={() => handleSendAiPrompt()}
                    disabled={aiQueryLoading || !aiQuery.trim()}
                  >
                    <Send size={13} />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================
                4. ADMIN COMMAND CENTER DASHBOARD
                ====================================================== */}
            {isAdmin && activeTab === "command" && (
              <div className="ops-command-flow">
                {/* ACTIVE EMERGENCY DOMINANT PANEL (IF INCIDENT ACTIVE) */}
                {hasActiveEmergency && activeIncident && (
                  <div className="active-incident-dominant-bar">
                    <div className="bar-hazard-strip">
                      <div className="bar-title-block">
                        <Flame size={20} className="text-red" />
                        <div>
                          <h3>ACTIVE EMERGENCY: {activeIncident.incident_type?.toUpperCase()} — {activeIncident.location}</h3>
                          <span className="meta-sub">Reported at {new Date(activeIncident.created_at).toLocaleTimeString()} by {activeIncident.student_name}</span>
                        </div>
                      </div>
                      <div className="bar-actions-block">
                        <span className="sev-tag sev-critical">CRITICAL SEVERITY</span>
                        <button
                          className="btn-ops-resolve-direct"
                          onClick={() => handleResolveIncident(activeIncident.incident_id)}
                        >
                          Mark as Resolved
                        </button>
                      </div>
                    </div>

                    <div className="bar-details-grid">
                      <div className="b-field">
                        <span className="b-lbl">SITUATION ASSESSMENT & AI TRIAGE:</span>
                        <p>{activeIncident.summary || activeIncident.description}</p>
                      </div>
                      {activeIncident.image_data && (
                        <div className="b-evidence">
                          <span className="b-lbl">EVIDENCE PHOTO:</span>
                          <img
                            src={activeIncident.image_data}
                            alt="Incident Evidence"
                            className="b-evidence-thumb"
                            onClick={() => setSelectedIncidentModal(activeIncident)}
                          />
                        </div>
                      )}
                      <div className="b-field">
                        <span className="b-lbl">DEPLOYED UNITS:</span>
                        <div className="unit-tags-row">
                          {activeIncident.deployed_resources?.length > 0 ? (
                            activeIncident.deployed_resources.map((u) => (
                              <span key={u} className="unit-tag-pill">🚨 {u}</span>
                            ))
                          ) : (
                            <span className="col-val text-gray">Awaiting authorization</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* PENDING APPROVAL ALERT BANNER */}
                {pendingApprovalsCount > 0 && (
                  <div className="ops-alert-banner-bar">
                    <div className="banner-text">
                      <AlertOctagon size={16} className="text-red" />
                      <span>
                        <strong>{pendingApprovalsCount} Emergency Response Plan(s)</strong> awaiting commander approval and responder dispatch.
                      </span>
                    </div>
                    <button className="btn-ops-action-urgent" onClick={() => setActiveTab("approvals")}>
                      Review Approvals <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                {/* PRIMARY COMMAND MAP VIEWPORT */}
                <div className="admin-map-workspace">
                  <CampusMap
                    incidentLocation={activeIncident?.location || ""}
                    deployedResources={deployedResourceIds}
                    activeIncident={activeIncident}
                    isStudentView={false}
                  />
                </div>
              </div>
            )}

            {/* ======================================================
                5. STANDALONE FULLSCREEN CAMPUS MAP (STUDENT & ADMIN)
                ====================================================== */}
            {activeTab === "map" && (
              <div className="ops-fullscreen-map-wrap">
                <CampusMap
                  incidentLocation={activeIncident?.location || ""}
                  deployedResources={deployedResourceIds}
                  activeIncident={activeIncident}
                  isStudentView={!isAdmin}
                />
              </div>
            )}

            {/* ======================================================
                6. APPROVALS QUEUE (ADMIN)
                ====================================================== */}
            {isAdmin && activeTab === "approvals" && (
              <div className="ops-tabular-view">
                <div className="view-action-header">
                  <div>
                    <h2>EMERGENCY RESPONSE APPROVAL QUEUE</h2>
                    <span className="sub-title">Review AI orchestrated response plans prior to responder dispatch</span>
                  </div>
                  <button className="btn-ops-secondary" onClick={loadApprovals}>
                    <RefreshCw size={12} /> Refresh Queue
                  </button>
                </div>

                {approvalsLoading ? (
                  <div className="ops-loading-box">Loading approval queue...</div>
                ) : approvals.length === 0 ? (
                  <div className="ops-empty-box">All response plans have been reviewed. No pending approvals.</div>
                ) : (
                  <div className="approvals-ops-list">
                    {approvals.map((appr) => (
                      <div key={appr.approval_id} className={`approval-ops-card status-${(appr.status || "pending").toLowerCase()}`}>
                        <div className="card-top-row">
                          <div>
                            <span className="approval-code">{appr.approval_id}</span>
                            <span className="incident-ref">INCIDENT: <strong>{appr.incident_id}</strong></span>
                          </div>
                          <span className={`status-tag status-${(appr.status || "pending").toLowerCase()}`}>
                            {appr.status}
                          </span>
                        </div>

                        <div className="card-data-body">
                          <div className="data-col">
                            <span className="col-lbl">REQUESTED AT:</span>
                            <span className="col-val">{new Date(appr.requested_at).toLocaleString()}</span>
                          </div>
                          <div className="data-col">
                            <span className="col-lbl">RECOMMENDED DISPATCH UNITS:</span>
                            <div className="unit-tags-row">
                              {appr.selected_resources?.length > 0 ? (
                                appr.selected_resources.map((u) => (
                                  <span key={u} className="unit-tag-pill">🚨 {u}</span>
                                ))
                              ) : (
                                <span className="col-val text-gray">None specified</span>
                              )}
                            </div>
                          </div>
                          <div className="data-col full-col">
                            <span className="col-lbl">RECOMMENDED PROTOCOL:</span>
                            <ul className="actions-bullet-list">
                              {appr.recommended_actions?.slice(0, 3).map((a, i) => (
                                <li key={i}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {appr.status === "PENDING" && (
                          <div className="card-actions-bar">
                            <button className="btn-ops-reject" onClick={() => handleRejectPlan(appr.approval_id)}>
                              Reject Plan
                            </button>
                            <button className="btn-ops-approve" onClick={() => handleApprovePlan(appr.approval_id)}>
                              Approve & Dispatch Units
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================
                7. FLEET MANAGEMENT & DEPLOYMENT LIFECYCLE (ADMIN)
                ====================================================== */}
            {isAdmin && activeTab === "resources" && (
              <div className="ops-tabular-view">
                <div className="view-action-header">
                  <div>
                    <h2>CAMPUS EMERGENCY RESOURCE FLEET</h2>
                    <span className="sub-title">Real-time status, responder contacts, and deployment lifecycle</span>
                  </div>
                  <div className="btn-row">
                    <button className="btn-ops-secondary text-amber" onClick={handleReleaseAllDeployed}>
                      Release All Deployed
                    </button>
                    <button className="btn-ops-primary" onClick={openAddResource}>
                      <Plus size={13} /> Register New Unit
                    </button>
                    <button className="btn-ops-secondary" onClick={loadResources}>
                      <RefreshCw size={12} /> Sync Fleet
                    </button>
                  </div>
                </div>

                {/* FILTER STRIP */}
                <div className="fleet-filter-strip">
                  {["ALL", "Security", "Medical", "First Aid", "Facilities", "Transport", "Communication", "AVAILABLE", "DEPLOYED"].map((f) => (
                    <button
                      key={f}
                      className={`fleet-filter-btn ${resourceFilter === f ? "active" : ""}`}
                      onClick={() => setResourceFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* OPERATIONAL FLEET TABLE */}
                <div className="ops-table-container">
                  <table className="ops-data-table">
                    <thead>
                      <tr>
                        <th>UNIT ID</th>
                        <th>DESIGNATION</th>
                        <th>TYPE</th>
                        <th>STATUS</th>
                        <th>BASE STATION</th>
                        <th>RESPONDER IN-CHARGE</th>
                        <th>PHONE</th>
                        <th>VEHICLE REG</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResources.map((res) => {
                        const isDeployed = res.status === "DEPLOYED";
                        return (
                          <tr key={res.id} className={isDeployed ? "row-deployed" : ""}>
                            <td className="font-mono font-bold">{res.id}</td>
                            <td>{res.name}</td>
                            <td><span className="type-badge-sm">{res.type}</span></td>
                            <td>
                              <span className={`status-tag status-${res.status.toLowerCase()}`}>
                                {res.status}
                              </span>
                            </td>
                            <td>{res.location}</td>
                            <td>{res.contact_name || "—"}</td>
                            <td className="font-mono">{res.phone_number || "—"}</td>
                            <td className="font-mono">{res.vehicle_number || "—"}</td>
                            <td>
                              <div className="table-btn-actions">
                                {isDeployed ? (
                                  <button
                                    className="btn-table-revoke"
                                    onClick={() => handleRevokeResource(res.id, res.incident_id)}
                                  >
                                    Revoke
                                  </button>
                                ) : res.status === "AVAILABLE" ? (
                                  <button
                                    className="btn-table-deploy"
                                    onClick={() => handleDeployResourceDirect(res.id)}
                                  >
                                    Deploy
                                  </button>
                                ) : null}
                                <button
                                  className="btn-table-edit"
                                  onClick={() => openEditResource(res)}
                                  title="Edit Unit"
                                >
                                  <Wrench size={12} />
                                </button>
                                <button
                                  className="btn-table-delete"
                                  disabled={isDeployed}
                                  onClick={() => handleDeleteResource(res.id)}
                                  title="Delete Unit"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ======================================================
                8. INCIDENT ARCHIVE & REPOSITORY (STUDENT & ADMIN)
                ====================================================== */}
            {/* ======================================================
                8. INCIDENT ARCHIVE & REPOSITORY (STUDENT & ADMIN)
                ====================================================== */}
            {activeTab === "incidents" && (
              <div className="ops-tabular-view">
                {/* 1. HERO HEADER & SUMMARY RIBBON */}
                <div className="incident-archive-hero">
                  <div className="archive-hero-title-block">
                    <div className="archive-badge-pill">
                      <ClipboardList size={14} className="text-cyan" />
                      <span>{isAdmin ? "CAMPUS DISPATCH REPOSITORY" : "STUDENT SAFETY AUDIT LOG"}</span>
                    </div>
                    <h2>{isAdmin ? "CAMPUS INCIDENT ARCHIVE" : "MY SUBMITTED INCIDENT LOG"}</h2>
                    <p>Real-time audit records of reported emergencies, AI response blueprints, responder fleet dispatches, and evidence repository.</p>
                  </div>

                  <div className="archive-metrics-grid">
                    <div className="archive-metric-card">
                      <div className="metric-icon-box cyan">
                        <FileText size={16} />
                      </div>
                      <div className="metric-info">
                        <strong>{incidents.length}</strong>
                        <span>TOTAL FILED</span>
                      </div>
                    </div>

                    <div className={`archive-metric-card ${incidents.filter(i => i.status === "ACTIVE").length > 0 ? "active-alert" : ""}`}>
                      <div className="metric-icon-box red">
                        <Flame size={16} />
                      </div>
                      <div className="metric-info">
                        <strong>{incidents.filter(i => i.status === "ACTIVE").length}</strong>
                        <span>ACTIVE RESPONSE</span>
                      </div>
                    </div>

                    <div className="archive-metric-card">
                      <div className="metric-icon-box amber">
                        <Clock size={16} />
                      </div>
                      <div className="metric-info">
                        <strong>{incidents.filter(i => i.status === "PENDING").length}</strong>
                        <span>PENDING INTAKE</span>
                      </div>
                    </div>

                    <div className="archive-metric-card">
                      <div className="metric-icon-box green">
                        <ShieldCheck size={16} />
                      </div>
                      <div className="metric-info">
                        <strong>{incidents.filter(i => i.status === "RESOLVED").length}</strong>
                        <span>RESOLVED & SAFE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. FILTER TABS, SEARCH & VIEW TOGGLE BAR */}
                <div className="incident-controls-bar ops-panel">
                  <div className="filter-chips-cluster">
                    {[
                      { key: "ALL", label: "All Incidents", count: incidents.length },
                      { key: "ACTIVE", label: "Active", count: incidents.filter(i => i.status === "ACTIVE").length },
                      { key: "PENDING", label: "Pending", count: incidents.filter(i => i.status === "PENDING").length },
                      { key: "APPROVED", label: "Approved", count: incidents.filter(i => i.status === "APPROVED").length },
                      { key: "RESOLVED", label: "Resolved", count: incidents.filter(i => i.status === "RESOLVED").length },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        className={`inc-filter-pill-btn ${incidentFilterStatus === tab.key ? "active" : ""}`}
                        onClick={() => setIncidentFilterStatus(tab.key)}
                      >
                        <span>{tab.label}</span>
                        <span className="pill-count">{tab.count}</span>
                      </button>
                    ))}
                  </div>

                  <div className="controls-right-group">
                    <div className="cyber-search-wrapper">
                      <Search size={14} className="search-icon text-cyan" />
                      <input
                        type="text"
                        placeholder="Search by ID, location, incident type..."
                        value={incidentSearchQuery}
                        onChange={(e) => setIncidentSearchQuery(e.target.value)}
                        className="cyber-search-input"
                      />
                      {incidentSearchQuery && (
                        <button type="button" className="btn-clear-search" onClick={() => setIncidentSearchQuery("")}>
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="view-mode-toggle">
                      <button
                        type="button"
                        className={`btn-view-mode ${incidentViewMode === "cards" ? "active" : ""}`}
                        onClick={() => setIncidentViewMode("cards")}
                        title="Visual Cards View"
                      >
                        <LayoutGrid size={15} />
                      </button>
                      <button
                        type="button"
                        className={`btn-view-mode ${incidentViewMode === "table" ? "active" : ""}`}
                        onClick={() => setIncidentViewMode("table")}
                        title="Data Table View"
                      >
                        <List size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. MAIN INCIDENT CONTENT */}
                {incidentsLoading ? (
                  <div className="ops-panel ops-empty-container">
                    <div className="empty-radar-wrapper">
                      <RefreshCw size={28} className="text-cyan spin-anim" />
                    </div>
                    <h3>Synchronizing Incident Repository...</h3>
                    <p>Fetching incident telemetry, response plans, and verified photographic evidence from secure database.</p>
                  </div>
                ) : filteredIncidents.length === 0 ? (
                  <div className="ops-panel ops-empty-container">
                    <div className="empty-radar-wrapper">
                      <div className="radar-wave" />
                      <ShieldCheck size={36} className="text-green" />
                    </div>
                    <h3>Zero Incident Records Found</h3>
                    <p>
                      {incidentFilterStatus !== "ALL" || incidentSearchQuery
                        ? `No incident reports match "${incidentSearchQuery || incidentFilterStatus}". Try adjusting your filters.`
                        : "All campus sectors are secure under 24/7 Aegis monitoring. No emergency incident reports filed."}
                    </p>
                    {!isAdmin && (
                      <button
                        type="button"
                        className="btn-empty-report-action"
                        onClick={() => setActiveTab("report")}
                      >
                        <AlertTriangle size={14} />
                        <span>Report An Emergency Now →</span>
                      </button>
                    )}
                  </div>
                ) : incidentViewMode === "cards" ? (
                  /* ================= CARDS GRID VIEW ================= */
                  <div className="incident-cards-grid">
                    {filteredIncidents.map((inc) => {
                      const isAct = inc.status === "ACTIVE";
                      const isRes = inc.status === "RESOLVED";
                      return (
                        <div
                          key={inc.incident_id}
                          className={`incident-ops-card ${isAct ? "card-status-active" : isRes ? "card-status-resolved" : ""}`}
                        >
                          <div className="incident-card-top-strip">
                            <div className="type-badge-cluster">
                              <span className={`sev-tag sev-${(inc.severity || "medium").toLowerCase()}`}>
                                {inc.severity} SEVERITY
                              </span>
                              <span className={`status-tag status-${(inc.status || "pending").toLowerCase()}`}>
                                <span className={`status-indicator-dot ${isAct ? "dot-pulse-red" : isRes ? "dot-green" : "dot-amber"}`} />
                                {inc.status}
                              </span>
                            </div>
                            <span className="card-incident-id font-mono font-bold">{inc.incident_id}</span>
                          </div>

                          <div className="incident-card-main-body">
                            <div className="card-incident-header">
                              <div className="hazard-avatar">
                                {inc.incident_type?.toLowerCase().includes("fire") ? "🔥" :
                                 inc.incident_type?.toLowerCase().includes("medical") ? "🚑" :
                                 inc.incident_type?.toLowerCase().includes("security") ? "🛡️" : "⚡"}
                              </div>
                              <div>
                                <h4 className="card-incident-title">{inc.incident_type?.toUpperCase()}</h4>
                                <span className="card-location-tag">
                                  <MapPin size={12} className="text-cyan" />
                                  <strong>{inc.location}</strong>
                                </span>
                              </div>
                            </div>

                            <p className="card-incident-desc">{inc.description || "No specific details provided."}</p>

                            {inc.image_data && (
                              <div className="card-evidence-attachment" onClick={() => setSelectedIncidentModal(inc)}>
                                <img src={inc.image_data} alt="Evidence" className="evidence-card-thumb" />
                                <div className="evidence-attachment-label">
                                  <ImageIcon size={12} className="text-cyan" />
                                  <span>Photographic Evidence Attached (Click to Inspect)</span>
                                </div>
                              </div>
                            )}

                            <div className="card-meta-details-row">
                              <span className="meta-item">
                                <Clock size={11} className="text-gray" />
                                <span>{new Date(inc.created_at).toLocaleString()}</span>
                              </span>
                              {isAdmin && inc.student_name && (
                                <span className="meta-item">
                                  <User size={11} className="text-gray" />
                                  <span>Reported by: <strong>{inc.student_name}</strong></span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="incident-card-actions-footer">
                            <button
                              type="button"
                              className="btn-card-inspect-full"
                              onClick={() => setSelectedIncidentModal(inc)}
                            >
                              <Eye size={13} />
                              <span>Inspect Full Response Plan & Evidence</span>
                              <ChevronRight size={13} />
                            </button>
                            {isAdmin && isAct && (
                              <button
                                type="button"
                                className="btn-table-resolve"
                                onClick={() => handleResolveIncident(inc.incident_id)}
                              >
                                <Check size={12} /> Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ================= DATA TABLE VIEW ================= */
                  <div className="ops-table-container">
                    <table className="ops-data-table">
                      <thead>
                        <tr>
                          <th>INCIDENT ID</th>
                          <th>TIMESTAMP</th>
                          <th>TYPE</th>
                          <th>LOCATION</th>
                          <th>SEVERITY</th>
                          {isAdmin && <th>REPORTER</th>}
                          <th>EVIDENCE</th>
                          <th>STATUS</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIncidents.map((inc) => (
                          <tr key={inc.incident_id}>
                            <td className="font-mono font-bold text-cyan">{inc.incident_id}</td>
                            <td className="font-mono text-gray">{new Date(inc.created_at).toLocaleString()}</td>
                            <td><strong>{inc.incident_type}</strong></td>
                            <td>
                              <span className="table-loc-pill">
                                <MapPin size={11} className="text-cyan" />
                                {inc.location}
                              </span>
                            </td>
                            <td>
                              <span className={`sev-tag sev-${(inc.severity || "medium").toLowerCase()}`}>
                                {inc.severity}
                              </span>
                            </td>
                            {isAdmin && <td>{inc.student_name || "—"}</td>}
                            <td>
                              {inc.image_data ? (
                                <img
                                  src={inc.image_data}
                                  alt="Evidence"
                                  className="evidence-table-thumb"
                                  onClick={() => setSelectedIncidentModal(inc)}
                                />
                              ) : (
                                <span className="text-gray">—</span>
                              )}
                            </td>
                            <td>
                              <span className={`status-tag status-${(inc.status || "pending").toLowerCase()}`}>
                                {inc.status}
                              </span>
                            </td>
                            <td>
                              <div className="table-btn-actions">
                                <button
                                  className="btn-table-inspect"
                                  onClick={() => setSelectedIncidentModal(inc)}
                                >
                                  Inspect Plan
                                </button>
                                {isAdmin && inc.status === "ACTIVE" && (
                                  <button
                                    className="btn-table-resolve"
                                    onClick={() => handleResolveIncident(inc.incident_id)}
                                  >
                                    Resolve
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================
                9. AI INTELLIGENCE TELEMETRY (ADMIN)
                ====================================================== */}
            {isAdmin && activeTab === "ai-intel" && (
              <div className="ops-tabular-view">
                <div className="view-action-header">
                  <div>
                    <h2>AEGIS AI INTELLIGENCE LAYER</h2>
                    <span className="sub-title">Real-time LLM inference, Groq API telemetry, and multi-agent triage logs</span>
                  </div>
                </div>

                <div className="ai-intel-grid">
                  <div className="ops-panel intel-status-box">
                    <div className="ops-panel-header">
                      <h3>GROQ LLM INFERENCE ENGINE</h3>
                      <span className="panel-status-sub">ACTIVE SENTINEL</span>
                    </div>
                    <div className="intel-data-rows">
                      <div className="i-row"><span>MODEL:</span><strong>openai/gpt-oss-120b</strong></div>
                      <div className="i-row"><span>TOKEN BUDGET:</span><strong>&lt; 350 Tokens / Incident</strong></div>
                      <div className="i-row"><span>AVERAGE LATENCY:</span><strong>~850ms</strong></div>
                      <div className="i-row"><span>FALLBACK STATUS:</span><strong className="text-green">Deterministic Rule Engine Online</strong></div>
                    </div>
                  </div>

                  <div className="ops-panel intel-status-box">
                    <div className="ops-panel-header">
                      <h3>CAMPUS ONTOLOGY & SPATIAL ANCHORS</h3>
                      <span className="panel-status-sub">NORMALIZED</span>
                    </div>
                    <div className="intel-data-rows">
                      <div className="i-row"><span>ACTIVE SECTORS:</span><strong>7 Academic / Residential Blocks</strong></div>
                      <div className="i-row"><span>SAFE ZONES:</span><strong>Playground (Alpha), Convocation Hall (Shelter)</strong></div>
                      <div className="i-row"><span>FLEET CAPACITY:</span><strong>{resourceSummary.total} Emergency Units</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================
                10. DISPATCH ALERTS (ADMIN)
                ====================================================== */}
            {isAdmin && activeTab === "alerts" && (
              <div className="ops-tabular-view">
                <div className="view-action-header">
                  <div>
                    <h2>RESPONDER DISPATCH ALERT LOGS</h2>
                    <span className="sub-title">Transmitted emergency notifications to field personnel & drivers</span>
                  </div>
                  <button className="btn-ops-secondary" onClick={loadAlerts}>
                    <RefreshCw size={12} /> Sync Alerts
                  </button>
                </div>

                {alertsLoading ? (
                  <div className="ops-loading-box">Loading alert stream...</div>
                ) : alerts.length === 0 ? (
                  <div className="ops-empty-box">No dispatch alerts generated. Alerts trigger automatically upon plan approval.</div>
                ) : (
                  <div className="alerts-ops-table-wrap">
                    <table className="ops-data-table">
                      <thead>
                        <tr>
                          <th>ALERT ID</th>
                          <th>TIME</th>
                          <th>UNIT</th>
                          <th>RECIPIENT RESPONDER</th>
                          <th>PHONE</th>
                          <th>INCIDENT</th>
                          <th>DISPATCH MESSAGE</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alerts.map((al) => (
                          <tr key={al.alert_id}>
                            <td className="font-mono font-bold text-amber">{al.alert_id}</td>
                            <td className="font-mono text-gray">{new Date(al.created_at).toLocaleTimeString()}</td>
                            <td className="font-mono font-bold">{al.resource_id}</td>
                            <td>{al.recipient_name}</td>
                            <td className="font-mono">{al.recipient_phone || "—"}</td>
                            <td className="font-mono text-gray">{al.incident_id}</td>
                            <td className="text-instruction">{al.message}</td>
                            <td><span className="status-tag status-available">{al.status || "SENT"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================
                11. AUDIT LOG (ADMIN)
                ====================================================== */}
            {isAdmin && activeTab === "audit" && (
              <div className="ops-tabular-view">
                <div className="view-action-header">
                  <div>
                    <h2>SYSTEM AUDIT TRAIL</h2>
                    <span className="sub-title">Immutable chronological log of all operator actions and system transitions</span>
                  </div>
                  <button className="btn-ops-secondary" onClick={loadAuditTrail}>
                    <RefreshCw size={12} /> Refresh Trail
                  </button>
                </div>

                {auditLoading ? (
                  <div className="ops-loading-box">Loading audit logs...</div>
                ) : auditEvents.length === 0 ? (
                  <div className="ops-empty-box">No audit events recorded.</div>
                ) : (
                  <div className="ops-table-container">
                    <table className="ops-data-table">
                      <thead>
                        <tr>
                          <th>EVENT TIMESTAMP</th>
                          <th>ACTION TYPE</th>
                          <th>OPERATOR / ACTOR</th>
                          <th>INCIDENT REF</th>
                          <th>SYSTEM LOG MESSAGE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditEvents.map((evt, idx) => (
                          <tr key={evt.event_id || idx}>
                            <td className="font-mono text-gray">{new Date(evt.timestamp || evt.created_at).toLocaleString()}</td>
                            <td className="font-bold text-cyan">{evt.event_type}</td>
                            <td>{evt.actor}</td>
                            <td className="font-mono">{evt.incident_id}</td>
                            <td className="text-gray">{evt.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}