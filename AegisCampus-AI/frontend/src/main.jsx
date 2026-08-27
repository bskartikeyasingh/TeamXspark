import { StrictMode, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import Login from "./Login.jsx";
import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "firebase/auth";

const AUTH_STORAGE_KEY = "aegiscampus_auth_session";

function Root() {
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    // Listen for Firebase authentication state transitions
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // If current session is a student, sync claims
        setUser((prev) => {
          if (prev && prev.role === "admin") {
            // Keep admin session intact
            return prev;
          }
          const updatedUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: "student",
            studentId: prev?.studentId || "",
          };
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
          return updatedUser;
        });
      } else {
        // If no Firebase user and not admin, clear session
        setUser((prev) => {
          if (prev && prev.role === "admin") {
            return prev;
          }
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(AUTH_STORAGE_KEY);
          return null;
        });
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedInUser));
  };

  const handleLogout = async () => {
    try {
      if (user?.role === "student") {
        await signOut(auth);
      }
    } catch (e) {
      console.error("Firebase logout error:", e);
    }
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  };

  if (authChecking && !user) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#060b14",
        color: "#38bdf8",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", fontWeight: "700" }}>
          <span>🛡️ Initializing AegisCampus AI...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <App
      user={user}
      onLogout={handleLogout}
    />
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);