import { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export default function Login({ onLogin }) {
  const [role, setRole] = useState("student");
  const [mode, setMode] = useState("login");

  const [studentId, setStudentId] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetForm = () => {
    setStudentId("");
    setAdminUsername("");
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setMode("login");
    resetForm();
  };

  // ============================================================
  // STUDENT LOGIN / REGISTER
  // ============================================================

  const handleStudentAuth = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      let userCredential;

      if (mode === "login") {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      const user = userCredential.user;

      // Send Firebase identity to backend
      try {
        await axios.post(`${API_BASE_URL}/api/auth/firebase`, {
          id_token: await user.getIdToken(),
          student_id: studentId.trim(),
        });
      } catch (backendError) {
        console.error(
          "Firebase user synchronization failed:",
          backendError
        );
      }

      onLogin({
        ...user,
        role: "student",
        studentId: studentId.trim(),
      });
    } catch (err) {
      console.error(err);

      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setError("Password must contain at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GOOGLE LOGIN
  // ============================================================

  const handleGoogleLogin = async () => {
    if (role !== "student") return;

    setError("");
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);

      const user = result.user;

      try {
        await axios.post(`${API_BASE_URL}/api/auth/firebase`, {
          id_token: await user.getIdToken(),
          student_id: "",
        });
      } catch (backendError) {
        console.error(
          "Google user synchronization failed:",
          backendError
        );
      }

      onLogin({
        ...user,
        role: "student",
        studentId: "",
      });
    } catch (err) {
      console.error(err);

      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else {
        setError(err.message || "Google sign-in failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ADMIN LOGIN
  // ============================================================

  const handleAdminLogin = async (e) => {
    e.preventDefault();

    setError("");
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
          response.data.message || "Admin login failed."
        );
      }

      const admin = response.data.admin || {
        username: adminUsername.trim(),
      };

      onLogin({
        ...admin,
        role: "admin",
        username: admin.username || adminUsername.trim(),
      });
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          err.message ||
          "Invalid admin credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background">
        <div className="login-glow login-glow-one" />
        <div className="login-glow login-glow-two" />
      </div>

      <div className="login-card">
        {/* ================================================== */}
        {/* HEADER */}
        {/* ================================================== */}

        <div className="login-header">
          <div className="login-logo">
            <span>🛡️</span>
          </div>

          <h1>AegisCampus AI</h1>

          <p>
            AI-Powered Campus Emergency Response
          </p>
        </div>

        {/* ================================================== */}
        {/* ROLE SELECTOR */}
        {/* ================================================== */}

        <div className="role-selector">
          <button
            type="button"
            className={
              role === "student"
                ? "role-button active"
                : "role-button"
            }
            onClick={() => handleRoleChange("student")}
          >
            <span className="role-icon">🎓</span>

            <span>
              <strong>Student</strong>
              <small>Campus access</small>
            </span>
          </button>

          <button
            type="button"
            className={
              role === "admin"
                ? "role-button active admin-role"
                : "role-button"
            }
            onClick={() => handleRoleChange("admin")}
          >
            <span className="role-icon">🛡️</span>

            <span>
              <strong>Administrator</strong>
              <small>Emergency control</small>
            </span>
          </button>
        </div>

        {/* ================================================== */}
        {/* STUDENT */}
        {/* ================================================== */}

        {role === "student" && (
          <>
            <div className="login-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Sign In
              </button>

              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Create Account
              </button>
            </div>

            <form
              className="login-form"
              onSubmit={handleStudentAuth}
            >
              <label>
                Student ID
              </label>

              <input
                type="text"
                placeholder="Enter your student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />

              <label>
                Email
              </label>

              <input
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <label>
                Password
              </label>

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                  ? "Sign In"
                  : "Create Student Account"}
              </button>
            </form>

            <div className="login-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <span className="google-icon">G</span>

              {loading
                ? "Connecting..."
                : "Continue with Google"}
            </button>
          </>
        )}

        {/* ================================================== */}
        {/* ADMIN */}
        {/* ================================================== */}

        {role === "admin" && (
          <>
            <div className="admin-login-heading">
              <h2>Administrator Access</h2>

              <p>
                Authorized personnel only. Access to emergency
                command and resource management.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={handleAdminLogin}
            >
              <label>
                Admin Username
              </label>

              <input
                type="text"
                placeholder="Enter admin username"
                value={adminUsername}
                onChange={(e) =>
                  setAdminUsername(e.target.value)
                }
                required
              />

              <label>
                Password
              </label>

              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button
                type="submit"
                className="login-button admin-login-button"
                disabled={loading}
              >
                {loading
                  ? "Authenticating..."
                  : "Administrator Sign In"}
              </button>
            </form>

            <div className="admin-security-note">
              <span>🔒</span>

              <div>
                <strong>Protected Access</strong>

                <p>
                  Administrator credentials are verified by
                  the AegisCampus backend.
                </p>
              </div>
            </div>
          </>
        )}

        {/* ================================================== */}
        {/* ERROR */}
        {/* ================================================== */}

        {error && (
          <div className="login-error">
            ⚠️ {error}
          </div>
        )}

        <div className="login-footer">
          <span>AEGISCAMPUS AI</span>
          <span>•</span>
          <span>Emergency Response Platform</span>
        </div>
      </div>
    </div>
  );
}