import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const createIncident = async ({
  description,
  location,
  source = "text",
}) => {
  const response = await api.post("/api/incidents", {
    description,
    location,
    source,
  });

  return response.data;
};

export const getIncidents = async () => {
  const response = await api.get("/api/incidents");

  return response.data;
};

export const checkBackendHealth = async () => {
  const response = await api.get("/health");

  return response.data;
};

export default api;