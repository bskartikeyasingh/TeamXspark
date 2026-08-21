import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertCircle,
  Ambulance,
  ArrowUpRight,
  Bell,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  MapPin,
  Menu,
  MessageSquare,
  Navigation,
  Radio,
  RefreshCw,
  Route,
  Send,
  Shield,
  Siren,
  Users,
  Truck,
  X,
  Zap,
} from "lucide-react";

import { createIncident } from "./services/api";

const agents = [
  {
    name: "Incident Intelligence",
    shortName: "Incident Agent",
    icon: Bot,
    status: "Active",
    description: "Classifying incoming emergency reports",
  },
  {
    name: "Security Response",
    shortName: "Security Agent",
    icon: Shield,
    status: "Active",
    description: "Coordinating campus security teams",
  },
  {
    name: "Medical Response",
    shortName: "Medical Agent",
    icon: Ambulance,
    status: "Active",
    description: "Tracking medical resources",
  },
  {
    name: "Transport Coordination",
    shortName: "Transport Agent",
    icon: Truck,
    status: "Standby",
    description: "Managing emergency vehicles",
  },
  {
    name: "Facilities Response",
    shortName: "Facilities Agent",
    icon: Building2,
    status: "Active",
    description: "Monitoring infrastructure response",
  },
  {
    name: "Communication",
    shortName: "Communication Agent",
    icon: MessageSquare,
    status: "Active",
    description: "Preparing emergency notifications",
  },
];

const resources = [
  {
    name: "Ambulances",
    available: 2,
    total: 3,
    icon: Ambulance,
    type: "Medical",
  },
  {
    name: "Security Teams",
    available: 5,
    total: 7,
    icon: Shield,
    type: "Security",
  },
  {
    name: "Campus Vehicles",
    available: 4,
    total: 6,
    icon: Truck,
    type: "Transport",
  },
  {
    name: "First Aid Units",
    available: 6,
    total: 8,
    icon: Activity,
    type: "Medical",
  },
];

const initialActivity = [
  {
    time: "10:42:11",
    icon: AlertCircle,
    title: "Incident received",
    description: "Fire reported at Block C",
  },
  {
    time: "10:42:12",
    icon: Bot,
    title: "Incident classified",
    description: "Fire • Critical • 94% confidence",
  },
  {
    time: "10:42:13",
    icon: Shield,
    title: "Security Agent activated",
    description: "Nearest response team identified",
  },
  {
    time: "10:42:14",
    icon: Ambulance,
    title: "Medical Agent activated",
    description: "Ambulance A1 selected",
  },
  {
    time: "10:42:15",
    icon: Building2,
    title: "Facilities Agent activated",
    description: "Power isolation recommended",
  },
  {
    time: "10:42:16",
    icon: CheckCircle2,
    title: "Response plan prepared",
    description: "Awaiting command approval",
  },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [approved, setApproved] = useState(false);

  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const [incident, setIncident] = useState({
    incident_id: "INC-1042",
    description:
      "Fire and heavy smoke reported in Block C. Around 25 students may be trapped.",
    incident_type: "Fire",
    severity: "Critical",
    location: "Block C — 2nd Floor",
    affected_people: 25,
    confidence: 94,
    status: "Awaiting Approval",
    source: "text",
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const [activity, setActivity] = useState(initialActivity);

  const navigation = [
    { name: "Dashboard", icon: Home },
    { name: "Incidents", icon: Siren, badge: 3 },
    { name: "Live Map", icon: MapPin },
    { name: "Resources", icon: Truck },
    { name: "AI Agents", icon: Bot },
    { name: "Alerts", icon: Bell, badge: 5 },
    { name: "Reports", icon: FileText },
    { name: "Audit Logs", icon: Clock3 },
  ];

  const handleCreateIncident = async () => {
    if (!description.trim()) {
      setApiError("Please describe the emergency first.");
      return;
    }

    setLoading(true);
    setApiError("");

    try {
      const data = await createIncident({
        description,
        location: location || null,
        source: "text",
      });

      setIncident(data);

      setActivity((previous) => [
        {
          time: new Date().toLocaleTimeString("en-IN", {
            hour12: false,
          }),
          icon: Bot,
          title: "New incident analyzed",
          description: `${data.incident_type} • ${data.severity} • ${data.confidence}% confidence`,
        },
        ...previous,
      ]);

      setShowIncidentModal(false);
      setDescription("");
      setLocation("");
      setApproved(false);
    } catch (error) {
      console.error(error);

      setApiError(
        "Unable to connect to the backend. Make sure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    setApproved(true);

    setIncident((previous) => ({
      ...previous,
      status: "Response Approved",
    }));

    setActivity((previous) => [
      {
        time: new Date().toLocaleTimeString("en-IN", {
          hour12: false,
        }),
        icon: CheckCircle2,
        title: "Response approved",
        description: `Command officer approved ${incident.incident_id}`,
      },
      ...previous,
    ]);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-white/10 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-wide">
                Aegis<span className="text-cyan-400">Campus</span>
              </h1>

              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                AI Command Center
              </p>
            </div>
          </div>

          <button
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-5">
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Command
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.name;

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    setActivePage(item.name);
                    setMobileMenuOpen(false);
                  }}
                  className={`group flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm transition-all ${
                    isActive
                      ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive
                          ? "text-cyan-400"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />

                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isActive
                          ? "bg-cyan-400/20 text-cyan-300"
                          : "bg-white/10 text-slate-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              <span className="text-xs font-semibold text-emerald-400">
                ALL SYSTEMS OPERATIONAL
              </span>
            </div>

            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Emergency coordination services are connected and ready.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-xs font-bold">
              CO
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                Command Officer
              </p>

              <p className="text-[10px] text-slate-500">
                Emergency Control
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative min-h-screen lg:pl-72">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{activePage}</h2>

                <span className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-cyan-400 sm:inline">
                  Live
                </span>
              </div>

              <p className="text-xs text-slate-500">
                Vignan University • Emergency Operations Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 sm:flex">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />

              <span className="text-[11px] text-slate-400">
                Live monitoring
              </span>

              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            </div>

            <button className="relative rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end"
          >
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

                <span className="text-xs font-medium uppercase tracking-widest text-emerald-400">
                  Command Center Online
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Emergency Operations Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                AI-powered incident intelligence, resource coordination and
                response management.
              </p>
            </div>

            <button
              onClick={() => {
                setShowIncidentModal(true);
                setApiError("");
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-xs font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              <Siren className="h-4 w-4" />
              Report Emergency
            </button>
          </motion.div>

          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={Siren}
              label="Active Incidents"
              value="03"
              detail="1 critical"
              status="critical"
            />

            <StatCard
              icon={Users}
              label="People Affected"
              value={incident.affected_people || "36"}
              detail="Current incident"
              status="warning"
            />

            <StatCard
              icon={Activity}
              label="Resources Ready"
              value="17"
              detail="of 24 resources"
              status="success"
            />

            <StatCard
              icon={Zap}
              label="AI Agents"
              value="06"
              detail="5 active • 1 standby"
              status="info"
            />
          </div>

          {/* Main grid */}
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            {/* Map */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-400" />

                    <h3 className="text-sm font-semibold">
                      Campus Live Map
                    </h3>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Real-time incidents and resource locations
                  </p>
                </div>

                <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] text-slate-400 hover:bg-white/5 hover:text-white">
                  <Navigation className="h-3 w-3" />
                  Full Map
                </button>
              </div>

              <div className="relative h-[390px] overflow-hidden bg-[#07111f]">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)",
                    backgroundSize: "42px 42px",
                  }}
                />

                <div className="absolute left-[10%] top-[45%] h-3 w-[80%] rotate-[-12deg] rounded-full bg-slate-700/70" />
                <div className="absolute left-[25%] top-[15%] h-[75%] w-3 rotate-[10deg] rounded-full bg-slate-700/60" />
                <div className="absolute left-[5%] top-[68%] h-2 w-[90%] rotate-[5deg] rounded-full bg-slate-700/50" />

                <MapBuilding
                  className="left-[13%] top-[18%]"
                  label="Block A"
                />

                <MapBuilding
                  className="left-[52%] top-[17%]"
                  label="Block B"
                />

                <MapBuilding
                  className="left-[52%] top-[55%]"
                  label={incident.location || "Block C"}
                  danger
                />

                <MapBuilding
                  className="left-[13%] top-[55%]"
                  label="Admin"
                />

                <MapMarker
                  className="left-[62%] top-[64%]"
                  type="danger"
                  label={incident.incident_id}
                />

                <MapMarker
                  className="left-[76%] top-[29%]"
                  type="medical"
                  label="A1"
                />

                <MapMarker
                  className="left-[30%] top-[34%]"
                  type="security"
                  label="S1"
                />

                <MapMarker
                  className="left-[31%] top-[76%]"
                  type="vehicle"
                  label="V1"
                />

                <div className="absolute bottom-4 left-4 rounded-xl border border-white/10 bg-slate-950/80 p-3 backdrop-blur-md">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-slate-500">
                    Live Legend
                  </p>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Legend color="bg-red-400" label="Incident" />
                    <Legend color="bg-emerald-400" label="Medical" />
                    <Legend color="bg-blue-400" label="Security" />
                    <Legend color="bg-amber-400" label="Vehicle" />
                  </div>
                </div>

                <div className="absolute right-4 top-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-slate-950/80 px-3 py-2 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />

                  <span className="text-[10px] text-emerald-400">
                    LIVE DATA
                  </span>
                </div>
              </div>
            </motion.section>

            {/* Incident */}
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-red-400/20 bg-gradient-to-br from-red-500/[0.08] to-transparent"
            >
              <div className="border-b border-red-400/10 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                      <Siren className="h-4 w-4 text-red-400" />
                    </span>

                    <div>
                      <h3 className="text-sm font-semibold">
                        Active Incident
                      </h3>

                      <p className="text-[10px] text-slate-500">
                        AI analyzed emergency
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
                      incident.severity === "Critical"
                        ? "border border-red-400/20 bg-red-400/10 text-red-400"
                        : "border border-amber-400/20 bg-amber-400/10 text-amber-400"
                    }`}
                  >
                    {incident.severity}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xl font-bold">
                      {incident.incident_type} Incident
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-red-400" />
                      {incident.location}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-widest text-slate-500">
                      Incident ID
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-300">
                      {incident.incident_id}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <MiniMetric
                    label="Affected"
                    value={`~${incident.affected_people}`}
                  />

                  <MiniMetric
                    label="Confidence"
                    value={`${incident.confidence}%`}
                  />

                  <MiniMetric
                    label="Status"
                    value={approved ? "Approved" : "Pending"}
                  />
                </div>

                <div className="mt-5 rounded-xl border border-white/10 bg-black/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-cyan-400" />

                      <span className="text-xs font-semibold">
                        AI Response Recommendation
                      </span>
                    </div>

                    <span className="text-[9px] text-emerald-400">
                      READY
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    <Recommendation
                      icon={Shield}
                      text="Dispatch Security Team S1"
                    />

                    <Recommendation
                      icon={Ambulance}
                      text="Dispatch Ambulance A1"
                    />

                    <Recommendation
                      icon={Building2}
                      text="Facilities Team F1 → Power Isolation"
                    />

                    <Recommendation
                      icon={Route}
                      text="Evacuate via North Exit"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={approved}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold transition ${
                      approved
                        ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                        : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    }`}
                  >
                    {approved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Response Approved
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Response
                      </>
                    )}
                  </button>

                  <button className="rounded-xl border border-white/10 px-4 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Agents + Activity */}
          <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
            <motion.section className="rounded-2xl border border-white/10 bg-white/[0.025]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-cyan-400" />

                    <h3 className="text-sm font-semibold">
                      AI Agent Network
                    </h3>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Multi-agent emergency coordination
                  </p>
                </div>

                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-400">
                  5 ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
                {agents.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} />
                ))}
              </div>
            </motion.section>

            <motion.section className="rounded-2xl border border-white/10 bg-white/[0.025]">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-400" />

                    <h3 className="text-sm font-semibold">
                      Live Agent Activity
                    </h3>
                  </div>

                  <p className="mt-1 text-[11px] text-slate-500">
                    Latest decisions and system events
                  </p>
                </div>

                <button className="text-[10px] text-cyan-400 hover:text-cyan-300">
                  View all
                </button>
              </div>

              <div className="p-4">
                <div className="relative">
                  <div className="absolute bottom-5 left-[15px] top-5 w-px bg-white/10" />

                  <div className="space-y-4">
                    {activity.map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={`${item.time}-${index}`}
                          className="relative flex gap-3"
                        >
                          <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-950">
                            <Icon className="h-3.5 w-3.5 text-cyan-400" />
                          </div>

                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-slate-200">
                                {item.title}
                              </p>

                              <span className="font-mono text-[9px] text-slate-600">
                                {item.time}
                              </span>
                            </div>

                            <p className="mt-1 text-[10px] text-slate-500">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Resources */}
          <motion.section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-cyan-400" />

                  <h3 className="text-sm font-semibold">
                    Emergency Resource Availability
                  </h3>
                </div>

                <p className="mt-1 text-[11px] text-slate-500">
                  Current campus response capacity
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
              {resources.map((resource) => (
                <ResourceCard key={resource.name} resource={resource} />
              ))}
            </div>
          </motion.section>

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-white/5 pt-5 text-[10px] text-slate-600 sm:flex-row">
            <p>
              AegisCampus AI • Emergency Response & Resource Coordination
            </p>

            <div className="flex items-center gap-4">
              <span>System v0.1</span>

              <span className="flex items-center gap-1.5 text-emerald-500/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
          </footer>
        </div>
      </main>

      {/* Emergency modal */}
      <AnimatePresence>
        {showIncidentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                    <Siren className="h-5 w-5 text-red-400" />
                  </div>

                  <div>
                    <h2 className="font-semibold">
                      Report Emergency
                    </h2>

                    <p className="text-[10px] text-slate-500">
                      AI will analyze the incident
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIncidentModal(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    What happened?
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Example: There is heavy smoke and fire in Block C. Around 25 students may be trapped."
                    className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Location
                  </label>

                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Example: Block C — 2nd Floor"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                  />
                </div>

                {apiError && (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-400">
                    {apiError}
                  </div>
                )}

                <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-4">
                  <div className="flex gap-3">
                    <Bot className="h-5 w-5 shrink-0 text-cyan-400" />

                    <div>
                      <p className="text-xs font-semibold text-cyan-300">
                        AI Incident Intelligence
                      </p>

                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                        The system will classify the emergency, estimate
                        severity and identify affected people.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateIncident}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Analyzing Incident...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Analyze Incident
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail, status }) {
  const styles = {
    critical: {
      icon: "text-red-400",
      bg: "bg-red-400/10",
      border: "border-red-400/10",
    },
    warning: {
      icon: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/10",
    },
    success: {
      icon: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/10",
    },
    info: {
      icon: "text-cyan-400",
      bg: "bg-cyan-400/10",
      border: "border-cyan-400/10",
    },
  };

  const style = styles[status];

  return (
    <div
      className={`rounded-2xl border ${style.border} bg-white/[0.025] p-4 transition hover:bg-white/[0.04] sm:p-5`}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-2.5 ${style.bg}`}>
          <Icon className={`h-4 w-4 ${style.icon}`} />
        </div>

        <ArrowUpRight className="h-3.5 w-3.5 text-slate-700" />
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>

        <span className="mb-1 text-[9px] text-slate-600">{detail}</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
      <p className="text-[9px] uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-semibold text-slate-200">
        {value}
      </p>
    </div>
  );
}

function Recommendation({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" />

      <span className="text-[10px] text-slate-400">{text}</span>

      <CheckCircle2 className="ml-auto h-3 w-3 text-emerald-400" />
    </div>
  );
}

function AgentCard({ agent }) {
  const Icon = agent.icon;
  const isActive = agent.status === "Active";

  return (
    <div className="group rounded-xl border border-white/5 bg-white/[0.02] p-3 transition hover:border-cyan-400/10 hover:bg-white/[0.04]">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-400/5">
          <Icon className="h-4 w-4 text-cyan-400" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold text-slate-200">
              {agent.shortName}
            </p>

            <span className="flex items-center gap-1 text-[8px] uppercase tracking-wider">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isActive ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />

              <span
                className={
                  isActive ? "text-emerald-400" : "text-amber-400"
                }
              >
                {agent.status}
              </span>
            </span>
          </div>

          <p className="mt-1 line-clamp-1 text-[9px] text-slate-600">
            {agent.description}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResourceCard({ resource }) {
  const Icon = resource.icon;

  const percentage = Math.round(
    (resource.available / resource.total) * 100
  );

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/5">
          <Icon className="h-4 w-4 text-cyan-400" />
        </div>

        <span className="text-[9px] text-slate-600">
          {resource.type}
        </span>
      </div>

      <p className="mt-3 text-[11px] font-medium text-slate-300">
        {resource.name}
      </p>

      <div className="mt-2 flex items-end justify-between">
        <p className="text-lg font-bold">
          {resource.available}
          <span className="text-xs font-normal text-slate-600">
            /{resource.total}
          </span>
        </p>

        <span className="text-[9px] text-emerald-400">
          {percentage}% ready
        </span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function MapBuilding({ className, label, danger = false }) {
  return (
    <div className={`absolute ${className}`}>
      <div
        className={`flex h-20 w-28 items-center justify-center rounded-xl border ${
          danger
            ? "border-red-400/30 bg-red-400/10"
            : "border-slate-600/50 bg-slate-800/70"
        }`}
      >
        <div className="text-center">
          <Building2
            className={`mx-auto h-5 w-5 ${
              danger ? "text-red-400" : "text-slate-500"
            }`}
          />

          <p className="mt-1 text-[9px] font-medium text-slate-400">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function MapMarker({ className, type, label }) {
  const colors = {
    danger: "bg-red-500 border-red-300/40 shadow-red-500/30",
    medical:
      "bg-emerald-500 border-emerald-300/40 shadow-emerald-500/30",
    security: "bg-blue-500 border-blue-300/40 shadow-blue-500/30",
    vehicle:
      "bg-amber-500 border-amber-300/40 shadow-amber-500/30",
  };

  return (
    <div className={`absolute ${className}`}>
      <div
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border shadow-lg ${colors[type]}`}
      >
        <span className="h-2.5 w-2.5 rounded-full bg-white" />

        <span className="absolute inset-[-5px] animate-ping rounded-full border border-white/10" />
      </div>

      <div className="absolute left-1/2 top-9 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-slate-950/90 px-2 py-1 text-[8px] text-slate-300 backdrop-blur">
        {label}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />

      <span className="text-[8px] text-slate-500">
        {label}
      </span>
    </div>
  );
}

export default App;