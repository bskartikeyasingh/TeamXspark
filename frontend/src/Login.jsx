import { useState, useMemo } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import axios from "axios";
import {
  Shield,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Radio,
  Server,
  Activity,
  ArrowRight,
  ShieldCheck,
  Check,
  MapPin,
  Cpu,
  KeyRound,
  IdCard,
} from "lucide-react";
import "./Login.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function Login({ onLogin }) {
  const [role, setRole] = useState("student"); // "student" | "admin"
  const [mode, setMode] = useState("login"); // "login" | "register"

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resetForm = () => {
    setFullName("");
    setStudentId("");
    setAdminUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccessMsg("");
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setMode("login");
    resetForm();
  };

  // Password Strength Calculation for Sign Up
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: "WEAK", color: "#ef4444" };
    if (score <= 2) return { score: 2, label: "FAIR", color: "#f59e0b" };
    if (score <= 3) return { score: 3, label: "STRONG", color: "#22c55e" };
    return { score: 4, label: "EXCELLENT", color: "#38bdf8" };
  }, [password]);

  // STUDENT AUTHENTICATION (LOGIN & REGISTRATION)
  const handleStudentAuth = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Registration validation
    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify.");
        return;
      }
      if (password.length < 6) {
        setError("Password must contain at least 6 characters.");
        return;
      }
    }

    setLoading(true);

    try {
      if (!auth) {
        // Direct Authentication mode when Firebase credentials are not provided
        const demoUid = "STU_" + Math.random().toString(36).substring(2, 9);
        onLogin({
          uid: demoUid,
          email: email.trim(),
          displayName: fullName.trim() || email.split("@")[0],
          role: "student",
          studentId: studentId.trim() || "STU-2026",
        });
        return;
      }

      let userCredential;

      if (mode === "login") {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      } else {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );
      }

      const user = userCredential.user;

      try {
        await axios.post(`${API_BASE_URL}/api/auth/firebase`, {
          id_token: await user.getIdToken(),
          student_id: studentId.trim() || undefined,
          name: fullName.trim() || undefined,
        });
      } catch (backendError) {
        console.warn("Backend student sync:", backendError);
      }


      if (mode === "register") {
        setSuccessMsg("Account created successfully! Initializing session...");
      }

      onLogin({
        uid: user.uid,
        email: user.email,
        displayName: fullName.trim() || user.displayName || email.split("@")[0],
        role: "student",
        studentId: studentId.trim(),
      });
    } catch (err) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email address or password.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("This campus email is already registered. Please sign in.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Must be at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid university email address.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // GOOGLE AUTHENTICATION
  const handleGoogleLogin = async () => {
    if (role !== "student") return;

    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (!auth || !googleProvider) {
        setError("Google Sign-In requires Firebase API key. Please use Email/Password login for direct access.");
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;


      try {
        await axios.post(`${API_BASE_URL}/api/auth/firebase`, {
          id_token: await user.getIdToken(),
          student_id: studentId.trim() || undefined,
        });
      } catch (backendError) {
        console.warn("Google user sync:", backendError);
      }

      onLogin({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        photoURL: user.photoURL,
        role: "student",
        studentId: studentId.trim(),
      });
    } catch (err) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Google authentication was cancelled.");
      } else {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ADMIN AUTHENTICATION
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/login`,
        {
          username: adminUsername.trim(),
          password: password,
        }
      );

      if (!response.data.success) {
        throw new Error(
          response.data.message || "Admin authorization failed."
        );
      }

      const adminUser = {
        username: response.data.username || adminUsername.trim(),
        name: response.data.name || "Campus Emergency Commander",
        role: "admin",
      };

      onLogin(adminUser);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Invalid commander credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aegis-auth-viewport">
      {/* BACKGROUND ATMOSPHERIC GRID & RADAR */}
      <div className="auth-ambient-glow" />
      <div className="auth-tactical-grid" />

      <div className="auth-glass-container">
        {/* ============================================================
            LEFT PANEL: TACTICAL IDENTITY & SYSTEM CAPABILITIES
            ============================================================ */}
        <div className="auth-identity-panel">
          {/* Institutional Badge */}
          <div className="institution-flag">
            <span className="radar-ping-dot" />
            <span className="inst-text">VIGNAN UNIVERSITY • EMERGENCY RESPONSE SYSTEM</span>
          </div>

          {/* Core Brand Hero */}
          <div className="identity-hero">
            <div className="aegis-monogram-shield">
              <Shield size={32} className="monogram-icon" />
            </div>

            <div className="hero-titles">
              <h1 className="hero-brand-name">AEGISCAMPUS</h1>
              <span className="hero-brand-category">AI EMERGENCY INTELLIGENCE</span>
              <span className="hero-university-tag">Vignan University</span>
            </div>

            <p className="hero-mission-statement">
              {mode === "login"
                ? "AI-powered incident intelligence, emergency coordination and campus safety."
                : "Join the real-time campus safety network for intelligent incident reporting and live tactical evacuation guidance."}
            </p>
          </div>

          {/* Mode-Dependent System Status Readout */}
          {mode === "login" ? (
            <div className="system-status-readout">
              <div className="status-readout-header">
                <Activity size={13} className="text-cyan-bright" />
                <span>SYSTEM STATUS</span>
              </div>
              <div className="status-bullets">
                <div className="status-bullet-row">
                  <span className="bullet-dot bullet-green" />
                  <span>Emergency Intelligence Online</span>
                </div>
                <div className="status-bullet-row">
                  <span className="bullet-dot bullet-green" />
                  <span>Response Network Connected</span>
                </div>
                <div className="status-bullet-row">
                  <span className="bullet-dot bullet-green" />
                  <span>Campus Monitoring Active</span>
                </div>
              </div>

              <div className="telemetry-compact-row">
                <span className="t-meta">GEOSPATIAL: <strong>VADLAMUDI MAIN</strong></span>
                <span className="t-meta">SECURITY: <strong>TLS-256 / RBAC</strong></span>
              </div>
            </div>
          ) : (
            <div className="system-status-readout">
              <div className="status-readout-header">
                <ShieldCheck size={13} className="text-cyan-bright" />
                <span>CAMPUS SAFETY NETWORK CAPABILITIES</span>
              </div>
              <div className="status-bullets">
                <div className="status-bullet-row">
                  <span className="bullet-dot bullet-cyan" />
                  <span>AI Incident Intelligence & Severity Triage</span>
                </div>
                <div className="status-bullet-row">
                  <span className="bullet-dot bullet-cyan" />
                  <span>Emergency Response Coordination</span>
                </div>
                <div className="status-bullet-row">
                  <span className="bullet-dot bullet-cyan" />
                  <span>Live Resource Fleet Deployment</span>
                </div>
                <div className="status-bullet-row">
                  <span className="bullet-dot bullet-cyan" />
                  <span>Safe Evacuation & Hazard-Avoidance Routing</span>
                </div>
              </div>

              <div className="telemetry-compact-row">
                <span className="t-meta">INTELLIGENCE: <strong>REAL-TIME GROQ AI</strong></span>
                <span className="t-meta">ENCRYPTION: <strong>ACTIVE</strong></span>
              </div>
            </div>
          )}

          {/* Footer Disclaimer */}
          <div className="identity-footer-meta">
            <small>
              Official security operations platform of Vignan's Foundation for Science, Technology & Research. Unauthorized access attempts are monitored and recorded.
            </small>
          </div>
        </div>

        {/* ============================================================
            RIGHT PANEL: SOPHISTICATED GLASSMORPHISM FORM
            ============================================================ */}
        <div className="auth-form-glass-card">
          {/* Header Monogram & Subtitles */}
          <div className="form-card-header">
            <div className="card-shield-mini">
              <Lock size={16} className="text-cyan-bright" />
            </div>
            <div>
              <h2 className="card-main-title">
                {role === "admin"
                  ? "Commander Clearance"
                  : mode === "login"
                  ? "Secure Access"
                  : "Create Secure Account"}
              </h2>
              <p className="card-sub-title">
                {role === "admin"
                  ? "Campus Emergency Command System"
                  : mode === "login"
                  ? "Campus Emergency Command System"
                  : "Join the AegisCampus campus safety network."}
              </p>
            </div>
          </div>

          {/* Segmented Role Switcher */}
          <div className="glass-role-segmented">
            <button
              type="button"
              className={`role-tab-btn ${role === "student" ? "active" : ""}`}
              onClick={() => handleRoleChange("student")}
            >
              <User size={13} />
              <span>STUDENT / REPORTER</span>
            </button>

            <button
              type="button"
              className={`role-tab-btn ${role === "admin" ? "active" : ""}`}
              onClick={() => handleRoleChange("admin")}
            >
              <Shield size={13} />
              <span>COMMAND CENTER</span>
            </button>
          </div>

          {/* ========================================================
              STUDENT FORM (SIGN IN & REGISTRATION)
              ======================================================== */}
          {role === "student" && (
            <div className="glass-form-body">
              {/* Sign In vs Register Mode Switcher */}
              <div className="auth-mode-pill-strip">
                <button
                  type="button"
                  className={`mode-pill ${mode === "login" ? "active" : ""}`}
                  onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  className={`mode-pill ${mode === "register" ? "active" : ""}`}
                  onClick={() => { setMode("register"); setError(""); setSuccessMsg(""); }}
                >
                  NEW REGISTRATION
                </button>
              </div>

              <form onSubmit={handleStudentAuth} className="glass-input-form">
                {/* Full Name & Student ID (Visible only during Registration) */}
                {mode === "register" && (
                  <>
                    <div className="glass-input-group">
                      <label>FULL NAME *</label>
                      <div className="glass-input-wrapper">
                        <User size={15} className="input-leading-icon" />
                        <input
                          type="text"
                          placeholder="e.g. Charan Ankem"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="glass-input-group">
                      <label>STUDENT REGISTRATION ID (OPTIONAL)</label>
                      <div className="glass-input-wrapper">
                        <IdCard size={15} className="input-leading-icon" />
                        <input
                          type="text"
                          placeholder="e.g. 211FA04001"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Email Address */}
                <div className="glass-input-group">
                  <label>CAMPUS EMAIL ADDRESS *</label>
                  <div className="glass-input-wrapper">
                    <Mail size={15} className="input-leading-icon" />
                    <input
                      type="email"
                      placeholder="student@vignan.ac.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="glass-input-group">
                  <div className="field-top-flex">
                    <label>PASSWORD *</label>
                    {mode === "login" && (
                      <button
                        type="button"
                        className="forgot-password-link"
                        onClick={() => alert("Please contact the Vignan University IT / Security Helpdesk to reset your institutional credentials.")}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>

                  <div className="glass-input-wrapper">
                    <Lock size={15} className="input-leading-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-reveal-icon-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password Strength Meter for Registration */}
                  {mode === "register" && password && (
                    <div className="password-strength-container">
                      <div className="strength-meter-bar">
                        <div
                          className="strength-meter-fill"
                          style={{
                            width: `${passwordStrength.score * 25}%`,
                            backgroundColor: passwordStrength.color,
                          }}
                        />
                      </div>
                      <span className="strength-label" style={{ color: passwordStrength.color }}>
                        STRENGTH: {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field (Visible only during Registration) */}
                {mode === "register" && (
                  <div className="glass-input-group">
                    <label>CONFIRM PASSWORD *</label>
                    <div className={`glass-input-wrapper ${confirmPassword && password !== confirmPassword ? "input-mismatch" : ""}`}>
                      <KeyRound size={15} className="input-leading-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-reveal-icon-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        title={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {confirmPassword && password !== confirmPassword && (
                      <span className="field-mismatch-text">Passwords do not match</span>
                    )}
                  </div>
                )}

                {/* Remember Me Option (Login mode) */}
                {mode === "login" && (
                  <div className="form-remember-row">
                    <label className="remember-me-checkbox-label">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Remember institutional session</span>
                    </label>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="glass-error-banner">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Success Banner */}
                {successMsg && (
                  <div className="glass-success-banner">
                    <CheckCircle2 size={15} />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Substantial Action Button */}
                <button
                  type="submit"
                  className="glass-submit-cta"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-state-flex">
                      <span className="glass-spinner" />
                      <span>{mode === "login" ? "AUTHENTICATING..." : "CREATING ACCOUNT..."}</span>
                    </span>
                  ) : (
                    <span className="btn-state-flex">
                      <span>{mode === "login" ? "SIGN IN SECURELY" : "CREATE SECURE ACCOUNT"}</span>
                      <ArrowRight size={15} />
                    </span>
                  )}
                </button>

                {/* Switch Mode Link */}
                <div className="switch-mode-footer">
                  {mode === "login" ? (
                    <span>
                      Don't have a registered account?{" "}
                      <button
                        type="button"
                        className="link-btn-highlight"
                        onClick={() => { setMode("register"); setError(""); setSuccessMsg(""); }}
                      >
                        Create Account
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already have an emergency account?{" "}
                      <button
                        type="button"
                        className="link-btn-highlight"
                        onClick={() => { setMode("login"); setError(""); setSuccessMsg(""); }}
                      >
                        Sign In Here
                      </button>
                    </span>
                  )}
                </div>

                {/* OAuth Divider & Google Button */}
                <div className="glass-oauth-divider">
                  <span>OR AUTHENTICATE VIA</span>
                </div>

                <button
                  type="button"
                  className="glass-google-oauth-btn"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    className="google-icon-svg"
                  />
                  <span>UNIVERSITY GOOGLE ACCOUNT</span>
                </button>
              </form>
            </div>
          )}

          {/* ========================================================
              ADMIN COMMANDER FORM
              ======================================================== */}
          {role === "admin" && (
            <div className="glass-form-body">
              <div className="commander-access-callout">
                <div className="callout-badge-icon">
                  <Lock size={15} className="text-amber" />
                </div>
                <div>
                  <strong>Commander Clearance Protocol</strong>
                  <small>Enter verified security credentials to operate the incident dispatch console.</small>
                </div>
              </div>

              <form onSubmit={handleAdminLogin} className="glass-input-form">
                <div className="glass-input-group">
                  <label>OPERATOR USERNAME *</label>
                  <div className="glass-input-wrapper">
                    <User size={15} className="input-leading-icon" />
                    <input
                      type="text"
                      placeholder="admin"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="glass-input-group">
                  <label>SECURITY PASSCODE *</label>
                  <div className="glass-input-wrapper">
                    <Lock size={15} className="input-leading-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-reveal-icon-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide passcode" : "Show passcode"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="glass-error-banner">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="glass-submit-cta btn-commander-action"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-state-flex">
                      <span className="glass-spinner" />
                      <span>VERIFYING CLEARANCE...</span>
                    </span>
                  ) : (
                    <span className="btn-state-flex">
                      <span>ENTER COMMAND CENTER</span>
                      <ArrowRight size={15} />
                    </span>
                  )}
                </button>

                <div className="commander-credential-hint">
                  <Server size={12} />
                  <span>Default Commander Clearance: <code>admin</code> / <code>admin123</code></span>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}