// KrishiSetu Unified API Layer for State Nodes and National Gateway

const API_BASE = "http://localhost:8000";

// Resolves correct base URL for active state node or gateway
export function getNodeBaseUrl(nodeKey = "tn") {
  if (!nodeKey || nodeKey === "tn") return API_BASE;
  if (nodeKey === "pb") return `${API_BASE}/pb`;
  if (nodeKey === "od") return `${API_BASE}/od`;
  if (nodeKey === "national") return API_BASE;
  return API_BASE;
}

// 1. Health & Telemetry
export async function fetchNodeHealth(nodeKey = "tn") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/health`);
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    console.warn("fetchNodeHealth error:", err);
    return null;
  }
}

// 2. Farmer Profile
export async function fetchFarmerProfile(nodeKey = "tn", farmerId = null) {
  try {
    const url = farmerId 
      ? `${getNodeBaseUrl(nodeKey)}/api/farmer/profile?farmer_id=${encodeURIComponent(farmerId)}`
      : `${getNodeBaseUrl(nodeKey)}/api/farmer/profile`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch farmer profile");
    return await res.json();
  } catch (err) {
    console.warn("fetchFarmerProfile error:", err);
    return null;
  }
}

export async function saveFarmerProfile(nodeKey = "tn", profileData) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/farmer/profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData)
    });
    if (!res.ok) throw new Error("Failed to save farmer profile");
    return await res.json();
  } catch (err) {
    console.error("saveFarmerProfile error:", err);
    throw err;
  }
}

// 3. Farm Plots
export async function fetchPlots(nodeKey = "tn", farmerId = null) {
  try {
    const url = farmerId 
      ? `${getNodeBaseUrl(nodeKey)}/api/farmer/plots?farmer_id=${encodeURIComponent(farmerId)}`
      : `${getNodeBaseUrl(nodeKey)}/api/farmer/plots`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("fetchPlots error:", err);
    return [];
  }
}

export async function savePlot(nodeKey = "tn", plotData) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/farmer/plots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plotData)
    });
    if (!res.ok) throw new Error("Failed to save plot");
    return await res.json();
  } catch (err) {
    console.error("savePlot error:", err);
    throw err;
  }
}

export async function deletePlot(nodeKey = "tn", plotId) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/farmer/plots/${encodeURIComponent(plotId)}`, {
      method: "DELETE"
    });
    return res.ok;
  } catch (err) {
    console.error("deletePlot error:", err);
    return false;
  }
}

// 4. Today's Advisory Card
export async function fetchTodayAdvisory(nodeKey = "tn", district = "Thanjavur", lang = "en") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/advisory/today?district=${encodeURIComponent(district)}&lang=${lang}`);
    if (!res.ok) throw new Error("Advisory fetch failed");
    return await res.json();
  } catch (err) {
    console.warn("fetchTodayAdvisory error:", err);
    return null;
  }
}

// 5. Grounded RAG Q&A
export async function askAdvisory(nodeKey = "tn", { query, district = "Thanjavur", lang = "en" }) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/advisory/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, district, lang })
    });
    if (!res.ok) throw new Error("RAG ask failed");
    return await res.json();
  } catch (err) {
    console.error("askAdvisory error:", err);
    throw err;
  }
}

// 6. Weather Alerts & 7-day Timeline
export async function fetchWeatherAlerts(nodeKey = "tn", district = "Thanjavur") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/weather/alerts?district=${encodeURIComponent(district)}`);
    if (!res.ok) throw new Error("Weather alerts failed");
    return await res.json();
  } catch (err) {
    console.warn("fetchWeatherAlerts error:", err);
    return null;
  }
}

// 7. Soil Health Card
export async function fetchSoilHealthCard(nodeKey = "tn", district = "Thanjavur") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/data/soil-health-card?district=${encodeURIComponent(district)}`);
    if (!res.ok) throw new Error("SHC fetch failed");
    return await res.json();
  } catch (err) {
    console.warn("fetchSoilHealthCard error:", err);
    return null;
  }
}

// 8. NDVI Satellite Data
export async function fetchNdvi(nodeKey = "tn", district = "Thanjavur") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/data/ndvi?district=${encodeURIComponent(district)}`);
    if (!res.ok) throw new Error("NDVI fetch failed");
    return await res.json();
  } catch (err) {
    console.warn("fetchNdvi error:", err);
    return null;
  }
}

// 9. e-NAM Mandi Prices
export async function fetchEnamPrices(nodeKey = "tn", district = "") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/data/enam-prices?district=${encodeURIComponent(district)}`);
    if (!res.ok) throw new Error("eNAM fetch failed");
    return await res.json();
  } catch (err) {
    console.warn("fetchEnamPrices error:", err);
    return [];
  }
}

// 10. Crop Recommender (3 Regenerative Options)
export async function recommendCrops(nodeKey = "tn", payload) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/recommender/crop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Crop recommendation failed");
    return await res.json();
  } catch (err) {
    console.error("recommendCrops error:", err);
    throw err;
  }
}

// 11. Disease Vision Scanner
export async function scanDisease(nodeKey = "tn", { file, crop_hint, district }) {
  try {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      if (crop_hint) formData.append("crop_hint", crop_hint);
      if (district) formData.append("district", district);
      const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/disease/scan`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Disease scan failed");
      return await res.json();
    } else {
      const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/disease/scan-json`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop_hint, district })
      });
      if (!res.ok) throw new Error("Disease scan json failed");
      return await res.json();
    }
  } catch (err) {
    console.error("scanDisease error:", err);
    throw err;
  }
}

// 12. Extension Support Cases (AI -> Human KVK Loop)
export async function fetchExtensionCases(nodeKey = "tn", farmerId = null) {
  try {
    const url = farmerId 
      ? `${getNodeBaseUrl(nodeKey)}/api/extension/cases?farmer_id=${encodeURIComponent(farmerId)}`
      : `${getNodeBaseUrl(nodeKey)}/api/extension/cases`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("fetchExtensionCases error:", err);
    return [];
  }
}

export async function createExtensionCase(nodeKey = "tn", casePayload) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/extension/case`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(casePayload)
    });
    if (!res.ok) throw new Error("Failed to create extension case");
    return await res.json();
  } catch (err) {
    console.error("createExtensionCase error:", err);
    throw err;
  }
}

export async function updateExtensionCaseAction(nodeKey = "tn", actionPayload) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/extension/case/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actionPayload)
    });
    if (!res.ok) throw new Error("Failed to update extension case");
    return await res.json();
  } catch (err) {
    console.error("updateExtensionCaseAction error:", err);
    throw err;
  }
}

// 13. DEPA Consents
export async function createConsent(nodeKey = "tn", consentPayload) {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/consent/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(consentPayload)
    });
    if (!res.ok) throw new Error("Consent creation failed");
    return await res.json();
  } catch (err) {
    console.error("createConsent error:", err);
    throw err;
  }
}

export async function revokeConsent(nodeKey = "tn", consentId, reason = "Farmer revoked") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/consent/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent_id: consentId, revocation_reason: reason })
    });
    if (!res.ok) throw new Error("Consent revocation failed");
    return await res.json();
  } catch (err) {
    console.error("revokeConsent error:", err);
    throw err;
  }
}

export async function fetchConsentAudit(nodeKey = "tn") {
  try {
    const res = await fetch(`${getNodeBaseUrl(nodeKey)}/api/consent/audit`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn("fetchConsentAudit error:", err);
    return [];
  }
}

// 14. National Gateway & Federated Learning
export async function fetchNationalNodes() {
  try {
    const res = await fetch(`${API_BASE}/api/national/nodes`);
    if (!res.ok) throw new Error("Failed to fetch national nodes");
    return await res.json();
  } catch (err) {
    console.warn("fetchNationalNodes error:", err);
    return [];
  }
}

export async function fetchNationalStats() {
  try {
    const res = await fetch(`${API_BASE}/api/national/stats`);
    if (!res.ok) throw new Error("Failed to fetch national stats");
    return await res.json();
  } catch (err) {
    console.warn("fetchNationalStats error:", err);
    return null;
  }
}

export async function fetchModelRegistry() {
  try {
    const res = await fetch(`${API_BASE}/api/national/model-registry`);
    if (!res.ok) throw new Error("Failed to fetch model registry");
    return await res.json();
  } catch (err) {
    console.warn("fetchModelRegistry error:", err);
    return [];
  }
}

export async function runFederatedRound() {
  try {
    const res = await fetch(`${API_BASE}/api/national/fl/run-round`, {
      method: "POST"
    });
    if (!res.ok) throw new Error("Federated round failed");
    return await res.json();
  } catch (err) {
    console.error("runFederatedRound error:", err);
    throw err;
  }
}
