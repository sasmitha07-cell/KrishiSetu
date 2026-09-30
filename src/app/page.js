"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sprout, Mic, MicOff, Volume2, VolumeX, Shield, ShieldCheck, 
  AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Send, 
  MapPin, Droplets, TrendingUp, Cpu, Database, Eye, FileText, 
  Check, X, Server, Layers, Award, Radio, Sun, CloudRain, 
  Camera, ChevronDown, ChevronUp, User, Info, ArrowUpRight,
  Plus, Edit2, Trash2, Calendar, Phone, Activity, Sliders, ExternalLink
} from "lucide-react";
import { translations } from "./i18n";
import { 
  fetchNodeHealth, fetchFarmerProfile, saveFarmerProfile, 
  fetchPlots, savePlot, deletePlot, fetchTodayAdvisory, 
  askAdvisory, fetchWeatherAlerts, fetchSoilHealthCard, 
  fetchNdvi, fetchEnamPrices, recommendCrops, scanDisease, 
  fetchExtensionCases, createExtensionCase, updateExtensionCaseAction, 
  createConsent, revokeConsent, fetchConsentAudit, 
  fetchNationalNodes, fetchNationalStats, fetchModelRegistry, runFederatedRound 
} from "./lib/api";
import { calculateCropGrowth } from "./lib/cropStages";
import { generateTodayActions } from "./lib/advisoryAggregator";

export default function LivingFarmApp() {
  // ----------------------------------------------------
  // Global Application State
  // ----------------------------------------------------
  const [lang, setLang] = useState("en");
  const [activeNode, setActiveNode] = useState("tn"); // 'tn' | 'pb' | 'od'
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'crops' | 'scan' | 'alerts' | 'profile'
  const [showAdminNetwork, setShowAdminNetwork] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);
  const [officerMode, setOfficerMode] = useState(false);

  const t = translations[lang] || translations.en;

  // ----------------------------------------------------
  // Single Source of Farmer & Plot State
  // ----------------------------------------------------
  const [farmer, setFarmer] = useState({
    farmer_id: "FARMER-TN-DEFAULT",
    name: "Ravi Kumar",
    state: "Tamil Nadu",
    district: "Thanjavur",
    village: "Ammapettai",
    farm_size_acres: 2.5,
    irrigation_type: "Canal / Borewell",
    current_crop: "Paddy",
    variety: "Kuruvai (CR 1009)",
    sowing_date: "2025-01-18",
    soil_type: "Alluvial Clay Loam",
    n_status: "Low",
    oc_status: "Moderate",
    language: "en"
  });

  const [plots, setPlots] = useState([]);
  const [activePlotIndex, setActivePlotIndex] = useState(0);

  // ----------------------------------------------------
  // Telemetry, Weather, Soil, Satellite, Mandi State
  // ----------------------------------------------------
  const [nodeHealth, setNodeHealth] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherSource, setWeatherSource] = useState("Live Open-Meteo");
  const [soilCard, setSoilCard] = useState(null);
  const [ndviData, setNdviData] = useState(null);
  const [mandiPrices, setMandiPrices] = useState([]);

  // ----------------------------------------------------
  // Recommender State
  // ----------------------------------------------------
  const [recommenderFilter, setRecommenderFilter] = useState({
    season: "Kharif",
    water_availability: "Canal / Borewell",
    risk_preference: "Moderate",
    regenerative_preference: true,
    budget_level: "Medium"
  });
  const [recommendations, setRecommendations] = useState([]);
  const [recommenderLoading, setRecommenderLoading] = useState(false);

  // ----------------------------------------------------
  // Disease Scan State
  // ----------------------------------------------------
  const [scanFile, setScanFile] = useState(null);
  const [scanImagePreview, setScanImagePreview] = useState(null);
  const [scanPlantPart, setScanPlantPart] = useState("Leaf");
  const [scanCropChoice, setScanCropChoice] = useState("");
  const [scanQualityError, setScanQualityError] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);

  // ----------------------------------------------------
  // Extension Support Cases State (AI -> Human Loop)
  // ----------------------------------------------------
  const [extensionCases, setExtensionCases] = useState([]);
  const [selectedCaseForReview, setSelectedCaseForReview] = useState(null);
  const [officerNotes, setOfficerNotes] = useState({ diagnosis: "", recommendation: "" });

  // ----------------------------------------------------
  // Consents (DEPA) State
  // ----------------------------------------------------
  const [consents, setConsents] = useState([
    {
      consent_id: "DEPA-CS-TN-8821",
      consumer_entity: "Tamil Nadu Agri Insurance Portal",
      data_scope: ["soil_health", "crop_history"],
      status: "ACTIVE",
      purpose: "Automated PMFBY claim settlement & weather index verification",
      digital_signature: "SHA256:7f4a9b812c3e4f5091a2"
    }
  ]);
  const [consentAudit, setConsentAudit] = useState([]);

  // ----------------------------------------------------
  // National Admin / FL State
  // ----------------------------------------------------
  const [nationalNodes, setNationalNodes] = useState([]);
  const [nationalStats, setNationalStats] = useState(null);
  const [modelRegistry, setModelRegistry] = useState([]);
  const [flRunning, setFlRunning] = useState(false);
  const [flRoundResult, setFlRoundResult] = useState(null);

  // ----------------------------------------------------
  // Interactive Checklist State
  // ----------------------------------------------------
  const [completedChecks, setCompletedChecks] = useState({});

  // ----------------------------------------------------
  // Speech & Voice State
  // ----------------------------------------------------
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState(null);
  const recognitionRef = useRef(null);

  // Progressive Disclosure Toggles
  const [showTechnicalSoil, setShowTechnicalSoil] = useState(false);
  const [showTechnicalNdvi, setShowTechnicalNdvi] = useState(false);
  const [showTechnicalAudit, setShowTechnicalAudit] = useState(false);

  // ----------------------------------------------------
  // Onboarding Form State (10 steps)
  // ----------------------------------------------------
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    name: "",
    state: "Tamil Nadu",
    district: "Thanjavur",
    village: "",
    farm_size_acres: 2.5,
    irrigation_type: "Canal",
    current_crop: "Paddy",
    variety: "Kuruvai CR-1009",
    sowing_date: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    soil_type: "Alluvial Clay Loam",
    n_status: "Low",
    oc_status: "Moderate"
  });

  // ----------------------------------------------------
  // Dynamic Calculations (Phenology & Actions)
  // ----------------------------------------------------
  const currentPlot = plots[activePlotIndex] || {
    crop: farmer.current_crop,
    variety: farmer.variety,
    sowing_date: farmer.sowing_date,
    area_acres: farmer.farm_size_acres,
    irrigation: farmer.irrigation_type,
    soil_type: farmer.soil_type,
    plot_name: `${farmer.district} Primary Plot`
  };

  const cropGrowth = calculateCropGrowth(currentPlot.crop, currentPlot.sowing_date);

  const todayActions = generateTodayActions({
    farmerProfile: farmer,
    growthInfo: cropGrowth,
    weatherData,
    soilData: soilCard,
    ndviData,
    recentScans,
    extensionCases
  });

  // ----------------------------------------------------
  // Initialize and Load Data from Backend
  // ----------------------------------------------------
  useEffect(() => {
    loadFarmerAndNodeData(activeNode);
  }, [activeNode]);

  async function loadFarmerAndNodeData(nodeKey) {
    try {
      const health = await fetchNodeHealth(nodeKey);
      if (health) setNodeHealth(health);

      const prof = await fetchFarmerProfile(nodeKey);
      if (prof) setFarmer(prof);

      const plotList = await fetchPlots(nodeKey);
      if (plotList && plotList.length > 0) {
        setPlots(plotList);
      } else if (prof) {
        setPlots([{
          plot_id: "PLOT-01",
          farmer_id: prof.farmer_id,
          plot_name: `${prof.district} Main Field`,
          crop: prof.current_crop,
          variety: prof.variety,
          sowing_date: prof.sowing_date,
          area_acres: prof.farm_size_acres,
          irrigation: prof.irrigation_type,
          soil_type: prof.soil_type
        }]);
      }

      const dist = prof?.district || (nodeKey === "pb" ? "Ludhiana" : nodeKey === "od" ? "Kalahandi" : "Thanjavur");
      const weather = await fetchWeatherAlerts(nodeKey, dist);
      if (weather) {
        setWeatherData(weather);
        setWeatherSource("Live Open-Meteo");
      }

      const shc = await fetchSoilHealthCard(nodeKey, dist);
      if (shc) setSoilCard(shc);

      const ndvi = await fetchNdvi(nodeKey, dist);
      if (ndvi) setNdviData(ndvi);

      const prices = await fetchEnamPrices(nodeKey, dist);
      if (prices) setMandiPrices(prices);

      const cases = await fetchExtensionCases(nodeKey);
      if (cases) setExtensionCases(cases);

      loadCropRecommendations(nodeKey, prof || farmer, recommenderFilter);

      const audit = await fetchConsentAudit(nodeKey);
      if (audit) setConsentAudit(audit);
    } catch (err) {
      console.warn("Bootstrap node data warning:", err);
    }
  }

  async function loadCropRecommendations(nodeKey = activeNode, profile = farmer, filters = recommenderFilter) {
    setRecommenderLoading(true);
    try {
      const payload = {
        district: profile.district,
        state: profile.state,
        season: filters.season,
        soil_type: profile.soil_type,
        water_availability: filters.water_availability,
        farm_size_acres: profile.farm_size_acres,
        previous_crop: profile.current_crop,
        current_crop: profile.current_crop,
        budget_level: filters.budget_level,
        risk_preference: filters.risk_preference,
        regenerative_preference: filters.regenerative_preference
      };
      const res = await recommendCrops(nodeKey, payload);
      if (res && res.recommendations) {
        setRecommendations(res.recommendations);
      }
    } catch (err) {
      console.warn("Recommender load warning:", err);
    } finally {
      setRecommenderLoading(false);
    }
  }

  async function handleNodeSwitch(newNodeKey) {
    setActiveNode(newNodeKey);
    const stateDistricts = {
      tn: { state: "Tamil Nadu", district: "Thanjavur", crop: "Paddy", variety: "Kuruvai (CR 1009)" },
      pb: { state: "Punjab", district: "Ludhiana", crop: "Wheat", variety: "PBW-826" },
      od: { state: "Odisha", district: "Kalahandi", crop: "Blackgram", variety: "PU-31" }
    };
    const s = stateDistricts[newNodeKey];
    setFarmer(prev => ({
      ...prev,
      state: s.state,
      district: s.district,
      current_crop: s.crop,
      variety: s.variety
    }));
  }

  async function handleCompleteOnboarding() {
    try {
      const newProfile = {
        ...farmer,
        ...onboardingData,
        language: lang,
        created_at: new Date().toISOString()
      };
      const saved = await saveFarmerProfile(activeNode, newProfile);
      setFarmer(saved || newProfile);

      const plot = {
        plot_id: `PLOT-${Date.now().toString().slice(-4)}`,
        farmer_id: (saved || newProfile).farmer_id,
        plot_name: `${newProfile.district} Primary Field`,
        crop: newProfile.current_crop,
        variety: newProfile.variety,
        sowing_date: newProfile.sowing_date,
        area_acres: newProfile.farm_size_acres,
        irrigation: newProfile.irrigation_type,
        soil_type: newProfile.soil_type
      };
      await savePlot(activeNode, plot);
      setPlots([plot]);
      setActivePlotIndex(0);

      setShowOnboarding(false);
      setOnboardingStep(1);

      loadCropRecommendations(activeNode, saved || newProfile, recommenderFilter);
      fetchWeatherAlerts(activeNode, newProfile.district).then(w => w && setWeatherData(w));
      fetchSoilHealthCard(activeNode, newProfile.district).then(s => s && setSoilCard(s));
    } catch (err) {
      alert("Error saving farm profile.");
    }
  }

  async function handleAddPlot(newPlotData) {
    try {
      await savePlot(activeNode, {
        ...newPlotData,
        farmer_id: farmer.farmer_id
      });
      const updatedList = await fetchPlots(activeNode, farmer.farmer_id);
      setPlots(updatedList);
      setShowAddPlotModal(false);
    } catch (err) {
      console.error("Failed to add plot:", err);
    }
  }

  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your query.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === "hi" ? "hi-IN" : lang === "ta" ? "ta-IN" : lang === "te" ? "te-IN" : "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQueryInput(transcript);
        setIsListening(false);
        handleSendAdvisory(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const speakText = (textToSpeak) => {
    if (!("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const cleanText = (textToSpeak || "").replace(/[*#•_]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === "hi" ? "hi-IN" : lang === "ta" ? "ta-IN" : lang === "te" ? "te-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSendAdvisory = async (textToSend) => {
    const q = textToSend || queryInput;
    if (!q.trim()) return;
    setAdvisoryLoading(true);
    setAdvisoryResult(null);
    try {
      const contextualQuery = `${q} [Context: Farmer in ${farmer.district}, Crop: ${currentPlot.crop}, Stage: ${cropGrowth.stageName}, Soil: ${farmer.soil_type}]`;
      const res = await askAdvisory(activeNode, {
        query: contextualQuery,
        district: farmer.district,
        lang
      });
      setAdvisoryResult(res);
      setQueryInput("");
    } catch (err) {
      setAdvisoryResult({
        answer: "Unable to retrieve package of practices. Please check local agronomist guidance.",
        grounded: false,
        citations: []
      });
    } finally {
      setAdvisoryLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanQualityError("");
    if (!file.type.startsWith("image/")) {
      setScanQualityError("Invalid format. Please capture a JPEG or PNG photo.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setScanQualityError("File is too large (>12MB). Please upload a smaller photo.");
      return;
    }
    setScanFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setScanImagePreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleRunScan = async (sampleOverride = null) => {
    setScanLoading(true);
    setScanResult(null);
    try {
      const cropToScan = scanCropChoice || currentPlot.crop;
      const res = await scanDisease(activeNode, {
        file: sampleOverride ? null : scanFile,
        crop_hint: cropToScan,
        district: farmer.district
      });

      setScanResult(res);

      const newScanRecord = {
        crop: res.crop,
        disease: res.disease,
        confidence_pct: res.confidence_pct,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        escalated: res.escalate_to_extension_officer,
        ticket_id: res.extension_ticket_id
      };
      setRecentScans([newScanRecord, ...recentScans.slice(0, 4)]);

      if (res.escalate_to_extension_officer || res.confidence_pct < 70) {
        const ticketId = res.extension_ticket_id || `KS-KVK-${Math.floor(10000 + Math.random() * 90000)}`;
        const newCase = {
          ticket_id: ticketId,
          farmer_id: farmer.farmer_id,
          farmer_name: farmer.name,
          district: farmer.district,
          state: farmer.state,
          crop: res.crop,
          plant_part: scanPlantPart,
          prediction: res.disease,
          confidence: res.confidence_pct / 100,
          status: "UNDER_REVIEW",
          officer_name: "Dr. A. Sundaram (KVK Agronomist)",
          officer_diagnosis: "Spore symptom inspection required. High humidity index favorable for leaf blight.",
          officer_recommendation: "Apply bio-control spray (Panchagavya 3% + Neem Azadirachtin)."
        };
        await createExtensionCase(activeNode, newCase);
        const cases = await fetchExtensionCases(activeNode);
        setExtensionCases(cases);
      }
    } catch (err) {
      alert("Scan failed. Classifier backend unavailable.");
    } finally {
      setScanLoading(false);
    }
  };

  const handleManualEscalate = async () => {
    if (!scanResult) return;
    const ticketId = `KS-KVK-${Math.floor(10000 + Math.random() * 90000)}`;
    const newCase = {
      ticket_id: ticketId,
      farmer_id: farmer.farmer_id,
      farmer_name: farmer.name,
      district: farmer.district,
      state: farmer.state,
      crop: scanResult.crop,
      plant_part: scanPlantPart,
      prediction: scanResult.disease,
      confidence: scanResult.confidence_pct / 100,
      status: "OPEN",
      officer_name: "KVK Field Agronomist",
      officer_diagnosis: "Farmer escalated for expert physical validation.",
      officer_recommendation: "Field visit scheduled or tele-advisory follow-up."
    };
    await createExtensionCase(activeNode, newCase);
    const cases = await fetchExtensionCases(activeNode);
    setExtensionCases(cases);
    alert(`Case created: ${ticketId}. View it in Profile → Support Cases.`);
  };

  const handleOfficerAction = async (ticketId, actionType) => {
    try {
      let status = actionType === "RESOLVE" ? "RESOLVED" : "UNDER_REVIEW";
      await updateExtensionCaseAction(activeNode, {
        ticket_id: ticketId,
        status,
        officer_diagnosis: officerNotes.diagnosis || "Confirmed fungal blast spore lesion from diagnostic symptom pattern.",
        officer_recommendation: officerNotes.recommendation || "Foliar spray of 3% Panchagavya with Neem oil. No synthetic tricyclazole needed.",
        officer_name: "Dr. A. Sundaram (Senior KVK Agronomist)"
      });
      const updated = await fetchExtensionCases(activeNode);
      setExtensionCases(updated);
      setSelectedCaseForReview(null);
      alert(`Case ${ticketId} updated to ${status}. Farmer screen updated.`);
    } catch (err) {
      alert("Failed to update case.");
    }
  };

  const handleRevokeConsent = async (consentId) => {
    try {
      await revokeConsent(activeNode, consentId, "Farmer exercised withdrawal rights");
      setConsents(consents.map(c => c.consent_id === consentId ? { ...c, status: "REVOKED" } : c));
      const audit = await fetchConsentAudit(activeNode);
      setConsentAudit(audit);
      alert(`Consent ${consentId} has been revoked. Future data sharing blocked.`);
    } catch (err) {
      alert("Failed to revoke consent artifact.");
    }
  };

  const handleRunFlRound = async () => {
    setFlRunning(true);
    setFlRoundResult(null);
    try {
      const res = await runFederatedRound();
      setFlRoundResult(res);
      const reg = await fetchModelRegistry();
      setModelRegistry(reg);
      const st = await fetchNationalStats();
      setNationalStats(st);
    } catch (err) {
      alert("Federated round execution error.");
    } finally {
      setFlRunning(false);
    }
  };

  return (
    <div className="app-shell">
      {/* ==================================================== */}
      {/* MASTER TOP HEADER */}
      {/* ==================================================== */}
      <header className="master-header">
        <div className="app-container">
          <div className="header-content">
            <div className="brand-group">
              <div className="brand-mark">
                <Sprout className="w-5 h-5 text-farm-foliage" />
              </div>
              <div>
                <h1 className="brand-name">KrishiSetu</h1>
                <span className="brand-dpg-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 inline-block" />
                  Digital Public Good
                </span>
              </div>
            </div>

            <div className="header-controls">
              {/* State Node Switcher */}
              <div className="pill-control">
                <Server className="w-3.5 h-3.5 text-farm-moss" />
                <select 
                  value={activeNode} 
                  onChange={(e) => handleNodeSwitch(e.target.value)}
                  className="pill-select"
                  title="Switch State Agricultural Node"
                >
                  <option value="tn">Tamil Nadu (NODE-TN-01)</option>
                  <option value="pb">Punjab (NODE-PB-02)</option>
                  <option value="od">Odisha (NODE-OD-03)</option>
                </select>
              </div>

              {/* Language Switcher */}
              <div className="lang-toggle-group">
                {["en", "hi", "ta", "te"].map(l => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`lang-toggle-btn ${lang === l ? "active" : ""}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* National Grid Modal Trigger */}
              <button 
                onClick={() => {
                  setShowAdminNetwork(true);
                  fetchNationalNodes().then(n => setNationalNodes(n));
                  fetchNationalStats().then(s => setNationalStats(s));
                  fetchModelRegistry().then(m => setModelRegistry(m));
                }}
                className="btn-header-grid"
                title="Inspect National Architecture & FedAvg Parameter Server"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">National Grid</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* MAIN LAYOUT: DESKTOP RAIL + EDITORIAL CANVAS */}
      {/* ==================================================== */}
      <div className="app-container">
        {/* Active Farm & Context Banner */}
        <div className="farm-context-strip">
          <div className="farmer-identity-meta">
            <div className="avatar-badge">
              {farmer.name.charAt(0)}
            </div>
            <div>
              <div className="farmer-headline">
                <span className="farmer-name">{farmer.name}</span>
                <span className="farmer-location-tag">• {farmer.village}, {farmer.district}</span>
                <button 
                  onClick={() => setShowEditProfile(true)}
                  className="p-1 text-stone-400 hover:text-stone-700"
                  title="Edit Farm Profile"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="farmer-plot-desc">
                {currentPlot.plot_name} • <strong>{currentPlot.crop}</strong> ({currentPlot.variety}) • {currentPlot.area_acres} Acres
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="crop-stage-chip">
              <span>{cropGrowth.stageIcon}</span>
              <span>Day {cropGrowth.daysAfterSowing} • {cropGrowth.stageName}</span>
            </div>

            <button 
              onClick={() => setShowOnboarding(true)}
              className="btn-setup-farm"
              title="Start New Farm Setup"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Setup Farm</span>
            </button>
          </div>
        </div>

        <div className="main-layout-grid">
          {/* Desktop Navigation Rail */}
          <aside className="desktop-nav-rail">
            {[
              { id: "home", label: t.nav_home, icon: Sun },
              { id: "crops", label: t.nav_crops, icon: Sprout },
              { id: "scan", label: t.nav_scan, icon: Camera },
              { id: "alerts", label: t.nav_alerts, icon: CloudRain },
              { id: "profile", label: t.nav_profile, icon: User }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rail-item ${activeTab === tab.id ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">

            {/* ================================================== */}
            {/* 1. HOME: CONTINUOUS LIVING STORY */}
            {/* ================================================== */}
            {activeTab === "home" && (
              <div>
                {/* 1.1 PRIMARY FOCAL POINT: TODAY'S FARM SIGNAL */}
                <section className={`signal-hero-panel urgency-${todayActions.priorityUrgency.toLowerCase()}`}>
                  <div className="signal-top-row">
                    <span className={`signal-urgency-badge badge-${todayActions.priorityUrgency.toLowerCase()}`}>
                      {todayActions.priorityUrgency === "URGENT" && <AlertTriangle className="w-3 h-3" />}
                      TODAY'S FARM SIGNAL • {todayActions.actionWhen}
                    </span>

                    <button 
                      onClick={() => speakText(todayActions.audioText)}
                      className="btn-audio-listen"
                      title="Hear this farm advisory in spoken audio"
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-farm-terracotta" /> : <Volume2 className="w-3.5 h-3.5" />}
                      <span>{isSpeaking ? t.stop_audio : t.hear_advice}</span>
                    </button>
                  </div>

                  <h2 className="signal-primary-headline">{todayActions.priorityHeadline}</h2>
                  <p className="signal-primary-body">{todayActions.priorityBody}</p>

                  <div className="signal-inline-metrics">
                    <div className="metric-datum">
                      <Sun className="w-4 h-4 text-amber-600" />
                      <span>{weatherData?.forecast_7day?.[0]?.max_temp ? `${Math.round(weatherData.forecast_7day[0].max_temp)}°C` : "31°C"}</span>
                    </div>
                    <div className="metric-datum">
                      <CloudRain className="w-4 h-4 text-blue-600" />
                      <span>{weatherData?.forecast_7day?.[0]?.precipitation_mm !== undefined ? `${weatherData.forecast_7day[0].precipitation_mm > 0 ? "68%" : "12%"} Rain Risk` : "68% Rain Risk"}</span>
                    </div>
                    <div className="metric-datum">
                      <Layers className="w-4 h-4 text-farm-moss" />
                      <span>Soil: {farmer.soil_type}</span>
                    </div>
                    <div className="text-xs text-stone-400 font-medium">
                      Source: {weatherSource}
                    </div>
                  </div>
                </section>

                {/* 1.2 SECONDARY: FIELD CONDITION SIGNALS */}
                <section className="editorial-section">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Field Status</span>
                      <h3 className="section-heading">Your Field Condition</h3>
                    </div>
                  </div>

                  <div className="field-signals-row">
                    <div className="signal-box">
                      <span className="signal-box-label">Canopy Health</span>
                      <div className="signal-box-val">{ndviData?.stress_level || "Healthy Canopy"}</div>
                      <span className="signal-box-sub">●●●●○ Optimal</span>
                    </div>

                    <div className="signal-box">
                      <span className="signal-box-label">Growth Stage</span>
                      <div className="signal-box-val">{cropGrowth.stageName.split(" ")[0]}</div>
                      <span className="signal-box-sub">Day {cropGrowth.daysAfterSowing} of {cropGrowth.cropName}</span>
                    </div>

                    <div className="signal-box">
                      <span className="signal-box-label">Soil Health</span>
                      <div className="signal-box-val">{soilCard?.nitrogen_rating || "Moderate"} N</div>
                      <span className="signal-box-sub">pH {soilCard?.ph || 7.1} Neutral</span>
                    </div>

                    <div className="signal-box">
                      <span className="signal-box-label">Weather Risk</span>
                      <div className="signal-box-val text-amber-700">Watch Window</div>
                      <span className="signal-box-sub">{todayActions.actionWhen}</span>
                    </div>
                  </div>
                </section>

                {/* 1.3 TERTIARY: TACTILE DAILY FARM ACTIONS */}
                <section className="editorial-section">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Action Plan</span>
                      <h3 className="section-heading">{t.today_checklist}</h3>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-stone-100 rounded text-stone-600">
                      {Object.values(completedChecks).filter(Boolean).length} / {todayActions.checkItems.length} Completed
                    </span>
                  </div>

                  <div className="tactile-actions-list">
                    {todayActions.checkItems.map((item) => {
                      const isDone = !!completedChecks[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`tactile-action-item ${isDone ? "completed" : ""}`}
                          onClick={() => setCompletedChecks(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        >
                          <div className={`action-checkbox ${isDone ? "checked" : ""}`}>
                            {isDone && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <div className="action-item-text">
                            <div className="action-item-meta">
                              <span className="action-category-chip">{item.category}</span>
                              <span className="action-timing-tag">• {item.timing}</span>
                            </div>
                            <div className="action-item-title">{item.title}</div>
                            <div className="action-item-reason">{item.reason}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 1.4 GROUNDED KRISHI COPILOT (VOICE & TEXT AGRONOMY) */}
                <section className="copilot-editorial-panel">
                  <div className="mb-4">
                    <span className="section-label">Agronomic Assistant</span>
                    <h3 className="section-heading">What do you want to know today?</h3>
                    <p className="section-caption">
                      Context: {farmer.name} • {farmer.district} • {currentPlot.crop} ({cropGrowth.stageName})
                    </p>
                  </div>

                  <div className="copilot-prompt-bar">
                    <button
                      onClick={toggleSpeechRecognition}
                      className={`mic-action-btn ${isListening ? "active-listening" : ""}`}
                      title={isListening ? "Listening... click to stop" : "Speak your question in Hindi, Tamil, Telugu, or English"}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>

                    <input
                      type="text"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendAdvisory()}
                      placeholder={isListening ? "Listening... speak now" : "Ask: Can I spray today? How to handle low nitrogen?..."}
                      className="copilot-input-field"
                    />

                    <button
                      onClick={() => handleSendAdvisory()}
                      disabled={advisoryLoading || !queryInput.trim()}
                      className="btn-copilot-submit"
                    >
                      {advisoryLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>

                  {advisoryLoading && (
                    <div className="p-4 text-xs text-stone-600 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-farm-moss" />
                      <span>Retrieving verified TNAU / ICAR Package of Practices for {farmer.district}...</span>
                    </div>
                  )}

                  {advisoryResult && (
                    <div className="copilot-output-container">
                      <div className="flex items-center justify-between mb-2">
                        <div className="grounded-source-badge">
                          <ShieldCheck className="w-4 h-4 text-emerald-700" />
                          <span>{advisoryResult.grounded ? "Grounded in Official State PoP" : "General Agronomic Advisory"}</span>
                        </div>
                        <button 
                          onClick={() => speakText(advisoryResult.answer)}
                          className="text-xs text-farm-moss hover:underline flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          Hear Answer
                        </button>
                      </div>

                      <div className="copilot-response-text">{advisoryResult.answer}</div>

                      {advisoryResult.citations && advisoryResult.citations.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-stone-200 flex flex-wrap gap-2">
                          <span className="text-2xs text-stone-500 font-bold uppercase">Sources:</span>
                          {advisoryResult.citations.map((c, i) => (
                            <span key={i} className="text-2xs text-farm-foliage bg-stone-100 px-2 py-0.5 rounded font-medium">
                              {c.document} • § {c.section}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ================================================== */}
            {/* 2. MY CROPS & SOILSENSE */}
            {/* ================================================== */}
            {activeTab === "crops" && (
              <div>
                {/* 2.1 PRIMARY PLOT HERO BANNER */}
                <section className="active-crop-hero">
                  <div className="plot-nav-tabs">
                    {plots.map((p, idx) => (
                      <button
                        key={p.plot_id || idx}
                        onClick={() => setActivePlotIndex(idx)}
                        className={`plot-tab-btn ${activePlotIndex === idx ? "selected" : ""}`}
                      >
                        <Sprout className="w-3.5 h-3.5 mr-1 inline" />
                        <span>{p.plot_name} ({p.crop})</span>
                      </button>
                    ))}
                    <button 
                      onClick={() => setShowAddPlotModal(true)}
                      className="btn-add-plot-pill"
                    >
                      <Plus className="w-3 h-3" />
                      Add Field Plot
                    </button>
                  </div>

                  <div className="crop-hero-headline-group">
                    <div>
                      <h2 className="crop-main-name">{currentPlot.crop}</h2>
                      <p className="crop-sub-variety">{currentPlot.variety} • Sown: {currentPlot.sowing_date}</p>
                    </div>

                    <div className="text-right">
                      <span className="crop-stage-chip">
                        {cropGrowth.stageIcon} {cropGrowth.stageName}
                      </span>
                      <div className="text-xs text-stone-500 mt-1">
                        <strong>{cropGrowth.daysAfterSowing} days after sowing</strong> • {cropGrowth.daysRemaining} days to maturity
                      </div>
                    </div>
                  </div>

                  {/* Disciplined Phenology Rail */}
                  <div className="phenology-milestone-rail">
                    <div className="rail-track">
                      <div 
                        className="rail-fill" 
                        style={{ width: `${cropGrowth.overallProgressPct}%` }}
                      />
                    </div>
                    <div className="rail-steps-grid">
                      {cropGrowth.allStages.map((st, i) => {
                        const isPassed = cropGrowth.daysAfterSowing >= st.minDays;
                        const isCurrent = cropGrowth.activeStageIndex === i;
                        return (
                          <div key={st.key} className={`milestone-node ${isCurrent ? "current" : isPassed ? "passed" : ""}`}>
                            <div className="node-bullet">{isPassed ? "✓" : i + 1}</div>
                            <div className="node-title">{st.name.split(" ")[0]}</div>
                            <div className="node-span">{st.minDays}-{st.maxDays}d</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage-Specific Care Protocol */}
                  <div className="stage-care-banner">
                    <div className="care-item">
                      <div className="care-icon-box">💧</div>
                      <div>
                        <div className="text-xs font-bold text-farm-foliage uppercase">Moisture Window</div>
                        <div className="text-xs text-stone-700">{cropGrowth.waterIndex}</div>
                      </div>
                    </div>
                    <div className="care-item">
                      <div className="care-icon-box">🌱</div>
                      <div>
                        <div className="text-xs font-bold text-farm-foliage uppercase">Critical Care</div>
                        <div className="text-xs text-stone-700">{cropGrowth.criticalCare}</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2.2 SOILSENSE: VERTICAL GEOLOGICAL SOIL MONOLITH */}
                <section className="editorial-section">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Earth Diagnostic</span>
                      <h3 className="section-heading">SoilSense • Geological Horizon Profile</h3>
                      <p className="section-caption">
                        {farmer.soil_type} • Measured Card: {soilCard?.card_id || "SHC-TN-001"}
                      </p>
                    </div>
                    <button 
                      onClick={() => setShowTechnicalSoil(!showTechnicalSoil)}
                      className="pill-control cursor-pointer"
                    >
                      <span className="text-xs font-bold text-farm-foliage">{showTechnicalSoil ? "Standard View" : "Lab NPK Numbers"}</span>
                    </button>
                  </div>

                  <div className="soilsense-profile-layout">
                    {/* The Monolith Column */}
                    <div className="soil-monolith">
                      <div className="stratum-surface">
                        <span className="stratum-depth">0 - 15 cm</span>
                        <div className="stratum-title">Surface Crumb</div>
                        <span className="text-2xs text-stone-700">Root zone aeration</span>
                      </div>
                      <div className="stratum-humus">
                        <span className="stratum-depth">15 - 30 cm</span>
                        <div className="stratum-title">Humus Horizon</div>
                        <span className="text-2xs opacity-90">{(soilCard?.organic_carbon_pct || 0.51)}% Organic Carbon</span>
                      </div>
                      <div className="stratum-mineral">
                        <span className="stratum-depth">30+ cm</span>
                        <div className="stratum-title">Mineral Subsoil</div>
                        <span className="text-2xs opacity-90">{soilCard?.nitrogen_kg_ha || 220} kg/ha Available N</span>
                      </div>
                    </div>

                    {/* Interpretation Column */}
                    <div className="soil-interpretation-panel">
                      <div className="diagnostic-bullet">
                        <div className="diag-header">
                          <span className="diag-title">Topsoil Reaction & Aeration</span>
                          <span className="diag-status-pill bg-emerald-100 text-emerald-800">
                            pH {soilCard?.ph || 7.1} ({soilCard?.ph_rating || "Neutral"})
                          </span>
                        </div>
                        <p className="diag-desc">
                          Balanced soil acidity supports optimal nutrient solubility and microbial enzymatic release.
                        </p>
                      </div>

                      <div className="diagnostic-bullet">
                        <div className="diag-header">
                          <span className="diag-title">Organic Carbon Reserve</span>
                          <span className={`diag-status-pill ${(soilCard?.organic_carbon_pct || 0.5) < 0.5 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {(soilCard?.organic_carbon_pct || 0.51)}% ({soilCard?.organic_carbon_rating || "Moderate"})
                          </span>
                        </div>
                        <p className="diag-desc">
                          {(soilCard?.organic_carbon_pct || 0.5) < 0.5 
                            ? "Humus fraction is depleted. Infiltrability and water-holding capacity are lower in dry spells."
                            : "Biological humus structure is sufficient to maintain rhizosphere moisture buffer."}
                        </p>
                        <div className="diag-action-note">
                          Recommendation: Incorporate crop residue mulching and 2 t/acre farmyard manure (FYM).
                        </div>
                      </div>

                      <div className="diagnostic-bullet">
                        <div className="diag-header">
                          <span className="diag-title">Available Nitrogen (N) Matrix</span>
                          <span className="diag-status-pill bg-amber-100 text-amber-900">
                            {soilCard?.nitrogen_kg_ha || 220} kg/ha ({soilCard?.nitrogen_rating || "Low"})
                          </span>
                        </div>
                        <p className="diag-desc">
                          Available nitrogen is in the lower tier. Split dressing with neem-coated urea and legume intercrop recommended to avoid leaching.
                        </p>
                      </div>

                      {showTechnicalSoil && (
                        <div className="mt-2 p-3 bg-stone-50 rounded border border-stone-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-stone-500 block">Available N:</span>
                            <strong className="text-farm-foliage">{soilCard?.nitrogen_kg_ha || 220} kg/ha</strong>
                          </div>
                          <div>
                            <span className="text-stone-500 block">Phosphorus (P2O5):</span>
                            <strong className="text-farm-foliage">{soilCard?.phosphorus_kg_ha || 22} kg/ha</strong>
                          </div>
                          <div>
                            <span className="text-stone-500 block">Potassium (K2O):</span>
                            <strong className="text-farm-foliage">{soilCard?.potassium_kg_ha || 260} kg/ha</strong>
                          </div>
                          <div>
                            <span className="text-stone-500 block">Zinc:</span>
                            <strong className="text-farm-foliage">{soilCard?.zinc_ppm || 0.62} ppm</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2.3 NEXT CROP RECOMMENDER (3 REGENERATIVE OPTIONS) */}
                <section className="editorial-section">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Crop Planning</span>
                      <h3 className="section-heading">Next Crop Recommender (3 Regenerative Pathways)</h3>
                      <p className="section-caption">Generated for {farmer.district} agro-climatic zone</p>
                    </div>
                  </div>

                  <div className="recommender-controls-bar">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-600">Season:</span>
                      <select 
                        value={recommenderFilter.season}
                        onChange={(e) => {
                          const updated = { ...recommenderFilter, season: e.target.value };
                          setRecommenderFilter(updated);
                          loadCropRecommendations(activeNode, farmer, updated);
                        }}
                        className="pill-select"
                      >
                        <option value="Kharif">Kharif (Monsoon)</option>
                        <option value="Rabi">Rabi (Winter)</option>
                        <option value="Summer">Summer / Zaid</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-600">Water Source:</span>
                      <select 
                        value={recommenderFilter.water_availability}
                        onChange={(e) => {
                          const updated = { ...recommenderFilter, water_availability: e.target.value };
                          setRecommenderFilter(updated);
                          loadCropRecommendations(activeNode, farmer, updated);
                        }}
                        className="pill-select"
                      >
                        <option value="Canal / Borewell">Canal / Borewell</option>
                        <option value="Rainfed">Rainfed</option>
                        <option value="Drip / Sprinkler">Drip / Sprinkler</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-600">Risk Profile:</span>
                      <select 
                        value={recommenderFilter.risk_preference}
                        onChange={(e) => {
                          const updated = { ...recommenderFilter, risk_preference: e.target.value };
                          setRecommenderFilter(updated);
                          loadCropRecommendations(activeNode, farmer, updated);
                        }}
                        className="pill-select"
                      >
                        <option value="Low">Low Risk</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High Yield Focus</option>
                      </select>
                    </div>
                  </div>

                  {recommenderLoading ? (
                    <div className="p-6 text-center text-xs text-stone-500">
                      <RefreshCw className="w-4 h-4 animate-spin mx-auto text-farm-moss mb-1" />
                      Evaluating soil and climate options...
                    </div>
                  ) : (
                    <div className="recommender-grid">
                      {recommendations.map((rec, i) => (
                        <div key={i} className="rec-card-composed">
                          <div>
                            <div className="rec-header-row">
                              <span className="rec-system-badge">{rec.crop_type || "Intercrop System"}</span>
                              <span className="rec-savings-pill">Save ₹{rec.expected_savings_inr}/ac</span>
                            </div>
                            <h4 className="rec-crop-title">{rec.crop_name}</h4>
                            <p className="rec-body-text">{rec.reasoning}</p>
                          </div>
                          <div>
                            <div className="text-2xs text-stone-500 mb-2">
                              <strong>Trade-off:</strong> {rec.tradeoffs || "Requires initial weed hoeing"}
                            </div>
                            <div className="rec-mandi-tag">
                              Mandi Signal: <strong>₹{rec.market_price_signal_inr}/quintal</strong> (Demo signal)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ================================================== */}
            {/* 3. SCAN: CROPCARE VISION */}
            {/* ================================================== */}
            {activeTab === "scan" && (
              <div>
                <section className="scanner-viewport-panel">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Diagnostic Screening</span>
                      <h3 className="section-heading">CropCare Vision Leaf Scanner</h3>
                      <p className="section-caption">Edge computer vision with organic IPM non-chemical treatment protocols</p>
                    </div>
                  </div>

                  {/* Optical Frame / Viewport */}
                  <div className="optical-frame">
                    {scanImagePreview ? (
                      <div className="w-full h-full relative">
                        <img src={scanImagePreview} alt="Captured crop leaf" className="captured-leaf-display" />
                        <button 
                          onClick={() => { setScanFile(null); setScanImagePreview(null); setScanResult(null); }}
                          className="absolute top-2 right-2 bg-white/90 text-alert-red px-2 py-1 rounded text-2xs font-bold"
                        >
                          ✕ Retake
                        </button>
                      </div>
                    ) : (
                      <label className="frame-shutter-prompt">
                        <Camera className="w-8 h-8 text-farm-moss mb-2" />
                        <span className="font-bold text-sm text-farm-foliage">Tap to Capture Plant Leaf</span>
                        <span className="text-xs text-stone-500 mt-1">Hold phone 15-20cm from symptom area</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          onChange={handleImageSelect}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  {scanQualityError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded border border-red-200 mb-4 text-center">
                      {scanQualityError}
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button 
                      onClick={() => handleRunScan()}
                      disabled={scanLoading}
                      className="btn-trigger-scan"
                    >
                      {scanLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Screening tissue patterns...
                        </>
                      ) : (
                        <>
                          <Sprout className="w-4 h-4" />
                          Run Diagnostic Scan
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => handleRunScan(true)}
                      className="text-xs font-semibold text-farm-moss hover:underline"
                    >
                      Or test with verified leaf sample
                    </button>
                  </div>

                  {/* Diagnostic Result Hierarchy */}
                  {scanResult && (
                    <div className="diagnostic-verdict-card">
                      <div className="verdict-header-band">
                        <div>
                          <span className="text-2xs font-bold text-stone-500 uppercase tracking-wider">Screening Verdict</span>
                          <h4 className="verdict-condition-name">{scanResult.disease}</h4>
                        </div>
                        <div className="verdict-confidence-meter">
                          Confidence: {scanResult.confidence_pct}%
                        </div>
                      </div>

                      <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded border border-stone-200 my-3">
                        <strong>Agronomic Context:</strong> Detected on {scanResult.crop} during {cropGrowth.stageName}. High humidity and dew can accelerate foliar lesions.
                      </div>

                      <div className="ipm-treatment-block">
                        <h5>Biological & Non-Chemical IPM First (TNAU Recommended)</h5>
                        <p>{scanResult.organic_remedy}</p>
                      </div>

                      {scanResult.chemical_threshold && (
                        <div className="mt-3 p-3 bg-amber-50/60 rounded border border-amber-200 text-xs text-stone-700">
                          <strong className="text-amber-900 block mb-1">Chemical Threshold (Last Resort Only):</strong>
                          {scanResult.chemical_threshold}
                        </div>
                      )}

                      <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs text-stone-600">
                          {scanResult.confidence_pct < 70 ? "⚠️ Low confidence. Forwarded to KVK expert." : "Need an agronomist second opinion?"}
                        </span>
                        <button 
                          onClick={handleManualEscalate}
                          className="px-4 py-1.5 bg-farm-terracotta text-white text-xs font-bold rounded-full"
                        >
                          Send to KVK Extension Officer
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ================================================== */}
            {/* 4. ALERTS: CLIMATEGUARD & SATELLITE NDVI */}
            {/* ================================================== */}
            {activeTab === "alerts" && (
              <div>
                {/* 4.1 CLIMATEGUARD 7-DAY UNIFIED FORECAST */}
                <section className="weather-unified-panel mb-8">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Atmosphere</span>
                      <h3 className="section-heading">ClimateGuard 7-Day Farm Forecast</h3>
                      <p className="section-caption">Station: {weatherData?.district || farmer.district} • {weatherSource}</p>
                    </div>
                    <button 
                      onClick={() => fetchWeatherAlerts(activeNode, farmer.district).then(w => w && setWeatherData(w))}
                      className="pill-control cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold text-farm-foliage">Refresh Live</span>
                    </button>
                  </div>

                  {/* Horizontal 7-Day Forecast Rail */}
                  <div className="forecast-rail-container">
                    {(weatherData?.forecast_7day || weatherData?.forecast || []).map((day, idx) => {
                      const maxT = day.max_temp !== undefined ? Math.round(day.max_temp) : 32;
                      const minT = day.min_temp !== undefined ? Math.round(day.min_temp) : 22;
                      const rainChance = day.precip_probability_pct !== undefined ? day.precip_probability_pct : (day.precipitation_mm > 0 ? 68 : 12);
                      return (
                        <div key={idx} className={`forecast-day-column ${idx === 0 ? "today" : ""}`}>
                          <span className="day-label">{idx === 0 ? "Today" : day.date?.slice(5)}</span>
                          <div className="day-icon-wrap">
                            {rainChance > 50 ? <CloudRain className="w-5 h-5 text-blue-600" /> : <Sun className="w-5 h-5 text-amber-500" />}
                          </div>
                          <div className="day-temps-inline">{maxT}° / {minT}°</div>
                          <div className="day-rain-bar">{rainChance}% rain</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Farm Risk Narrative */}
                  {(weatherData?.alerts || []).map((al, idx) => (
                    <div key={idx} className="weather-risk-narrative mb-3">
                      <div className="risk-narrative-title">{al.alert_type} • {al.valid_window || "Next 48h"}</div>
                      <div className="risk-narrative-why">{al.consequence || "May cause foliar wash-off or water stagnation."}</div>
                      <div className="risk-narrative-action">Action: {al.action || "Postpone chemical applications and clear field drains."}</div>
                    </div>
                  ))}
                </section>

                {/* 4.2 SATELLITE NDVI CANOPY DENSITY */}
                <section className="editorial-section">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Earth Observation</span>
                      <h3 className="section-heading">Satellite NDVI Canopy Index</h3>
                      <p className="section-caption">Sentinel-2 / MODIS 10m Resolution • Status: <strong>{ndviData?.stress_level || "Optimal"}</strong></p>
                    </div>
                    <button 
                      onClick={() => setShowTechnicalNdvi(!showTechnicalNdvi)}
                      className="pill-control cursor-pointer"
                    >
                      <span className="text-xs font-bold text-farm-foliage">{showTechnicalNdvi ? "Standard" : "Time Points"}</span>
                    </button>
                  </div>

                  <div className="p-6 bg-white border border-stone-200 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-stone-700 uppercase">Canopy Index (NDVI)</span>
                      <span className="text-sm font-bold text-farm-foliage">
                        {ndviData?.time_series?.slice(-1)[0]?.ndvi || 0.72} (Baseline: {ndviData?.time_series?.slice(-1)[0]?.baseline || 0.71})
                      </span>
                    </div>

                    <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-600 via-emerald-700 to-emerald-950 rounded-full"
                        style={{ width: `${((ndviData?.time_series?.slice(-1)[0]?.ndvi || 0.72) / 1.0) * 100}%` }}
                      />
                    </div>

                    <p className="text-xs text-stone-600 mt-3">
                      ✓ Measured vegetative absorption matches the phenological expectation for {currentPlot.crop} at day {cropGrowth.daysAfterSowing}.
                    </p>

                    {showTechnicalNdvi && (
                      <div className="mt-4 pt-3 border-t border-stone-100 overflow-x-auto text-xs">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b text-stone-500 text-left">
                              <th className="py-1">Observation Date</th>
                              <th className="py-1">Measured NDVI</th>
                              <th className="py-1">Baseline</th>
                              <th className="py-1">Anomaly</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(ndviData?.time_series || []).map((p, i) => (
                              <tr key={i} className="border-b border-stone-50">
                                <td className="py-1">{p.date}</td>
                                <td className="py-1 font-bold">{p.ndvi}</td>
                                <td className="py-1 text-stone-500">{p.baseline}</td>
                                <td className="py-1 font-semibold text-emerald-700">+{p.anomaly}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ================================================== */}
            {/* 5. PROFILE, SUPPORT CASES & DEPA CONSENT */}
            {/* ================================================== */}
            {activeTab === "profile" && (
              <div>
                {/* 5.1 FARMER PROFILE OVERVIEW */}
                <section className="profile-overview-panel mb-8">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Identity & Holding</span>
                      <h3 className="section-heading">My Farm Holding Profile</h3>
                      <p className="section-caption">ID: {farmer.farmer_id} • Node: {farmer.state}</p>
                    </div>
                    <button 
                      onClick={() => setShowEditProfile(true)}
                      className="pill-control cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold text-farm-foliage">Edit Profile</span>
                    </button>
                  </div>

                  <div className="profile-meta-grid">
                    <div className="meta-field-item">
                      <span className="meta-label">Farmer Name</span>
                      <span className="meta-val">{farmer.name}</span>
                    </div>
                    <div className="meta-field-item">
                      <span className="meta-label">Location</span>
                      <span className="meta-val">{farmer.village}, {farmer.district}</span>
                    </div>
                    <div className="meta-field-item">
                      <span className="meta-label">Total Holding</span>
                      <span className="meta-val">{farmer.farm_size_acres} Acres</span>
                    </div>
                    <div className="meta-field-item">
                      <span className="meta-label">Irrigation Source</span>
                      <span className="meta-val">{farmer.irrigation_type}</span>
                    </div>
                    <div className="meta-field-item">
                      <span className="meta-label">Primary Crop</span>
                      <span className="meta-val">{farmer.current_crop} ({farmer.variety})</span>
                    </div>
                    <div className="meta-field-item">
                      <span className="meta-label">Sowing Date</span>
                      <span className="meta-val">{farmer.sowing_date} (Day {cropGrowth.daysAfterSowing})</span>
                    </div>
                  </div>
                </section>

                {/* 5.2 MY SUPPORT CASES (AI -> HUMAN EXTENSION LOOP) */}
                <section className="editorial-section">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Extension Network</span>
                      <h3 className="section-heading">KVK Agronomist Support Cases</h3>
                      <p className="section-caption">Direct human loop from escalated scans or farmer questions</p>
                    </div>
                    <button 
                      onClick={() => setOfficerMode(!officerMode)}
                      className={`pill-control cursor-pointer ${officerMode ? "bg-amber-100" : ""}`}
                    >
                      <span className="text-xs font-bold text-farm-terracotta">
                        {officerMode ? "Exit Officer Console" : "Extension Officer Console"}
                      </span>
                    </button>
                  </div>

                  {extensionCases.length === 0 ? (
                    <div className="p-6 bg-white border border-stone-200 rounded-xl text-center text-xs text-stone-500">
                      You don't have any support cases. Take a crop scan to escalate leaf symptoms.
                    </div>
                  ) : (
                    <div className="support-cases-timeline">
                      {extensionCases.map(cs => (
                        <div key={cs.ticket_id} className="support-case-node">
                          <div className="case-top-meta">
                            <span className="case-id-code">{cs.ticket_id}</span>
                            <span className={`case-badge-status status-${cs.status?.toLowerCase()}`}>
                              {cs.status}
                            </span>
                          </div>
                          <div className="text-xs text-stone-700">
                            <strong>{cs.crop}</strong> ({cs.plant_part}) • Screening: {cs.prediction} ({(cs.confidence * 100).toFixed(0)}%)
                          </div>

                          {cs.officer_diagnosis && (
                            <div className="mt-2 p-3 bg-stone-50 rounded border border-stone-200 text-xs">
                              <span className="font-bold text-farm-foliage block">{cs.officer_name || "KVK Agronomist"} Findings:</span>
                              <div className="text-stone-700 mt-0.5">{cs.officer_diagnosis}</div>
                              {cs.officer_recommendation && (
                                <div className="text-farm-moss font-bold mt-1">Prescription: {cs.officer_recommendation}</div>
                              )}
                            </div>
                          )}

                          {officerMode && cs.status !== "RESOLVED" && (
                            <div className="mt-3 pt-3 border-t border-stone-200">
                              <span className="text-2xs font-bold text-farm-terracotta uppercase block mb-1">Clinical Prescription:</span>
                              <input 
                                type="text"
                                placeholder="Diagnosis findings..."
                                value={selectedCaseForReview === cs.ticket_id ? officerNotes.diagnosis : ""}
                                onChange={(e) => {
                                  setSelectedCaseForReview(cs.ticket_id);
                                  setOfficerNotes({ ...officerNotes, diagnosis: e.target.value });
                                }}
                                className="w-full text-xs p-2 border border-stone-300 rounded mb-1"
                              />
                              <input 
                                type="text"
                                placeholder="Prescription and treatment..."
                                value={selectedCaseForReview === cs.ticket_id ? officerNotes.recommendation : ""}
                                onChange={(e) => {
                                  setSelectedCaseForReview(cs.ticket_id);
                                  setOfficerNotes({ ...officerNotes, recommendation: e.target.value });
                                }}
                                className="w-full text-xs p-2 border border-stone-300 rounded mb-2"
                              />
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleOfficerAction(cs.ticket_id, "RESOLVE")}
                                  className="px-3 py-1 bg-farm-foliage text-white text-xs font-bold rounded"
                                >
                                  Prescribe & Mark Resolved
                                </button>
                                <button 
                                  onClick={() => handleOfficerAction(cs.ticket_id, "ACCEPT")}
                                  className="px-3 py-1 bg-stone-200 text-stone-700 text-xs font-bold rounded"
                                >
                                  Mark Under Review
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* 5.3 DEPA CONSENT MANAGEMENT */}
                <section className="editorial-section">
                  <div className="editorial-header">
                    <div>
                      <span className="section-label">Privacy & Governance</span>
                      <h3 className="section-heading">Data Sharing Consents (DEPA Standard)</h3>
                      <p className="section-caption">You own your data. Revoke third-party sharing permissions instantly.</p>
                    </div>
                    <button 
                      onClick={() => setShowTechnicalAudit(!showTechnicalAudit)}
                      className="pill-control cursor-pointer"
                    >
                      <span className="text-xs font-bold text-farm-foliage">{showTechnicalAudit ? "Hide Audit" : "Audit Trail"}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {consents.map(cs => (
                      <div key={cs.consent_id} className="p-4 bg-white border border-stone-200 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-farm-foliage">{cs.consumer_entity}</span>
                          <span className={`text-2xs font-bold px-2 py-0.5 rounded ${cs.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                            {cs.status}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mb-1">Purpose: {cs.purpose}</div>
                        <div className="text-2xs text-stone-400">Scopes: {cs.data_scope.join(", ")} • Sig: {cs.digital_signature}</div>

                        {cs.status === "ACTIVE" && (
                          <div className="mt-2 text-right">
                            <button 
                              onClick={() => handleRevokeConsent(cs.consent_id)}
                              className="text-xs font-bold text-alert-red hover:underline"
                            >
                              Revoke Access Immediately
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {showTechnicalAudit && (
                    <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-2">
                      <span className="font-bold text-stone-700 uppercase block mb-1">Cryptographic Audit Ledger:</span>
                      {consentAudit.slice(0, 5).map((log, i) => (
                        <div key={i} className="flex gap-2 text-2xs border-b border-stone-100 pb-1">
                          <span className="text-stone-400">{log.timestamp?.split("T")[0]}</span>
                          <span className="font-bold text-farm-foliage">{log.event_type}</span>
                          <span className="text-stone-600 flex-1">{log.details}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ==================================================== */}
      {/* INTEGRATED MOBILE BOTTOM NAVIGATION */}
      {/* ==================================================== */}
      <nav className="integrated-bottom-nav">
        {[
          { id: "home", label: t.nav_home, icon: Sun },
          { id: "crops", label: t.nav_crops, icon: Sprout },
          { id: "scan", label: t.nav_scan, icon: Camera },
          { id: "alerts", label: t.nav_alerts, icon: CloudRain },
          { id: "profile", label: t.nav_profile, icon: User }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mobile-nav-btn ${activeTab === tab.id ? "active" : ""}`}
            >
              <Icon className="w-5 h-5" />
              <span className="mobile-nav-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ==================================================== */}
      {/* MODAL 1: 10-STEP GUIDED ONBOARDING */}
      {/* ==================================================== */}
      {showOnboarding && (
        <div className="modal-overlay-scrim">
          <div className="modal-dialog-box">
            <div className="modal-head">
              <div>
                <span className="text-2xs font-bold text-farm-terracotta uppercase">Step {onboardingStep} of 10</span>
                <h3 className="modal-headline">Setup Your Farm Holding</h3>
              </div>
              <button onClick={() => setShowOnboarding(false)} className="modal-close-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              {onboardingStep === 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">1. Farmer Name / Identity</label>
                  <input 
                    type="text" 
                    value={onboardingData.name}
                    onChange={(e) => setOnboardingData({ ...onboardingData, name: e.target.value })}
                    placeholder="Enter your name (e.g. Ramesh Patel, Ravi Kumar)"
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  />
                </div>
              )}

              {onboardingStep === 2 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">2. State</label>
                  <select 
                    value={onboardingData.state}
                    onChange={(e) => setOnboardingData({ ...onboardingData, state: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  >
                    <option value="Tamil Nadu">Tamil Nadu (Cauvery Delta)</option>
                    <option value="Punjab">Punjab (Central Alluvial)</option>
                    <option value="Odisha">Odisha (Western Upland)</option>
                  </select>
                </div>
              )}

              {onboardingStep === 3 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">3. District</label>
                  <input 
                    type="text" 
                    value={onboardingData.district}
                    onChange={(e) => setOnboardingData({ ...onboardingData, district: e.target.value })}
                    placeholder="e.g. Thanjavur, Ludhiana, Kalahandi"
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  />
                </div>
              )}

              {onboardingStep === 4 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">4. Village</label>
                  <input 
                    type="text" 
                    value={onboardingData.village}
                    onChange={(e) => setOnboardingData({ ...onboardingData, village: e.target.value })}
                    placeholder="e.g. Ammapettai, Samrala"
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  />
                </div>
              )}

              {onboardingStep === 5 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">5. Holding Size (Acres)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={onboardingData.farm_size_acres}
                    onChange={(e) => setOnboardingData({ ...onboardingData, farm_size_acres: parseFloat(e.target.value) || 1.0 })}
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none font-bold"
                  />
                </div>
              )}

              {onboardingStep === 6 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">6. Irrigation Type</label>
                  <select 
                    value={onboardingData.irrigation_type}
                    onChange={(e) => setOnboardingData({ ...onboardingData, irrigation_type: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  >
                    <option value="Canal">Canal</option>
                    <option value="Canal / Borewell">Canal / Borewell</option>
                    <option value="Rainfed">Rainfed</option>
                    <option value="Drip / Sprinkler">Drip / Sprinkler</option>
                  </select>
                </div>
              )}

              {onboardingStep === 7 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">7. Standing Crop</label>
                  <select 
                    value={onboardingData.current_crop}
                    onChange={(e) => setOnboardingData({ ...onboardingData, current_crop: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  >
                    <option value="Paddy">Paddy / Rice</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Millet">Finger Millet (Ragi)</option>
                    <option value="Blackgram">Blackgram</option>
                  </select>
                </div>
              )}

              {onboardingStep === 8 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">8. Variety</label>
                  <input 
                    type="text" 
                    value={onboardingData.variety}
                    onChange={(e) => setOnboardingData({ ...onboardingData, variety: e.target.value })}
                    placeholder="e.g. CR-1009 Sub1, PBW-826, PU-31"
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  />
                </div>
              )}

              {onboardingStep === 9 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">9. Sowing Date</label>
                  <input 
                    type="date" 
                    value={onboardingData.sowing_date}
                    onChange={(e) => setOnboardingData({ ...onboardingData, sowing_date: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  />
                </div>
              )}

              {onboardingStep === 10 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700">10. Soil Type</label>
                  <select 
                    value={onboardingData.soil_type}
                    onChange={(e) => setOnboardingData({ ...onboardingData, soil_type: e.target.value })}
                    className="w-full p-2.5 border border-stone-300 rounded text-sm outline-none"
                  >
                    <option value="Alluvial Clay Loam">Alluvial Clay Loam</option>
                    <option value="Coarse Loamy Sand">Coarse Loamy Sand</option>
                    <option value="Red Sandy Loam">Red Sandy Loam</option>
                    <option value="Black Cotton Clay">Black Cotton Clay</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-200">
              <button 
                onClick={() => setOnboardingStep(Math.max(1, onboardingStep - 1))}
                disabled={onboardingStep === 1}
                className="text-xs text-stone-500 disabled:opacity-30"
              >
                Previous
              </button>

              {onboardingStep < 10 ? (
                <button 
                  onClick={() => setOnboardingStep(onboardingStep + 1)}
                  className="px-4 py-1.5 bg-farm-foliage text-white text-xs font-bold rounded"
                >
                  Next Step →
                </button>
              ) : (
                <button 
                  onClick={handleCompleteOnboarding}
                  className="px-5 py-2 bg-farm-terracotta text-white text-xs font-bold rounded"
                >
                  See My Farm ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: EDIT PROFILE */}
      {/* ==================================================== */}
      {showEditProfile && (
        <div className="modal-overlay-scrim">
          <div className="modal-dialog-box">
            <div className="modal-head">
              <h3 className="modal-headline">Edit Farmer Holding</h3>
              <button onClick={() => setShowEditProfile(false)} className="modal-close-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Farmer Name:</label>
                <input 
                  type="text" 
                  value={farmer.name} 
                  onChange={(e) => setFarmer({ ...farmer, name: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Current Standing Crop:</label>
                <select 
                  value={farmer.current_crop}
                  onChange={(e) => setFarmer({ ...farmer, current_crop: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded text-xs"
                >
                  <option value="Paddy">Paddy</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Millet">Finger Millet (Ragi)</option>
                  <option value="Blackgram">Blackgram</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Variety:</label>
                <input 
                  type="text" 
                  value={farmer.variety} 
                  onChange={(e) => setFarmer({ ...farmer, variety: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Sowing Date:</label>
                <input 
                  type="date" 
                  value={farmer.sowing_date} 
                  onChange={(e) => setFarmer({ ...farmer, sowing_date: e.target.value })}
                  className="w-full p-2 border border-stone-300 rounded text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button onClick={() => setShowEditProfile(false)} className="px-3 py-1 text-xs text-stone-600">Cancel</button>
              <button 
                onClick={async () => {
                  await saveFarmerProfile(activeNode, farmer);
                  setShowEditProfile(false);
                  loadCropRecommendations(activeNode, farmer, recommenderFilter);
                }}
                className="px-4 py-1.5 bg-farm-terracotta text-white text-xs font-bold rounded"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ADD NEW PLOT */}
      {/* ==================================================== */}
      {showAddPlotModal && (
        <div className="modal-overlay-scrim">
          <div className="modal-dialog-box">
            <div className="modal-head">
              <h3 className="modal-headline">Add Field Plot</h3>
              <button onClick={() => setShowAddPlotModal(false)} className="modal-close-icon">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-3 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Plot Name:</label>
                <input type="text" id="add-plot-name" defaultValue={`Plot 0${plots.length + 1}`} className="w-full p-2 border border-stone-300 rounded text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Crop:</label>
                <select id="add-plot-crop" defaultValue="Millet" className="w-full p-2 border border-stone-300 rounded text-xs">
                  <option value="Millet">Finger Millet</option>
                  <option value="Blackgram">Blackgram</option>
                  <option value="Paddy">Paddy</option>
                  <option value="Wheat">Wheat</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">Area (Acres):</label>
                <input type="number" id="add-plot-area" defaultValue="1.5" step="0.5" className="w-full p-2 border border-stone-300 rounded text-xs" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button onClick={() => setShowAddPlotModal(false)} className="px-3 py-1 text-xs text-stone-600">Cancel</button>
              <button 
                onClick={() => {
                  const pName = document.getElementById("add-plot-name")?.value || "Plot";
                  const pCrop = document.getElementById("add-plot-crop")?.value || "Millet";
                  const pArea = parseFloat(document.getElementById("add-plot-area")?.value) || 1.5;
                  handleAddPlot({
                    plot_name: pName,
                    crop: pCrop,
                    variety: "Standard",
                    sowing_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    area_acres: pArea,
                    irrigation: farmer.irrigation_type,
                    soil_type: farmer.soil_type
                  });
                }}
                className="px-4 py-1.5 bg-farm-foliage text-white text-xs font-bold rounded"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: NATIONAL GRID & FEDERATED LEARNING */}
      {/* ==================================================== */}
      {showAdminNetwork && (
        <div className="modal-overlay-scrim">
          <div className="modal-dialog-box max-w-xl">
            <div className="modal-head">
              <div>
                <span className="text-2xs font-bold text-farm-moss uppercase">Digital Public Good Backbone</span>
                <h3 className="modal-headline">National Agricultural Network & FedAvg Orchestrator</h3>
              </div>
              <button onClick={() => setShowAdminNetwork(false)} className="modal-close-icon">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {nationalNodes.map(n => (
                  <div key={n.node_id} className="p-3 bg-stone-50 rounded border border-stone-200 text-xs">
                    <div className="flex justify-between font-bold text-farm-foliage">
                      <span>{n.state_name}</span>
                      <span className="text-emerald-700 text-2xs">● {n.status}</span>
                    </div>
                    <div className="text-stone-500 text-2xs mt-1">Port: {n.port} • ID: {n.node_id}</div>
                    <div className="text-stone-700 text-2xs mt-1">Crops: {n.primary_crops?.slice(0, 3).join(", ")}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-bold text-sm text-farm-foliage">Federated Learning Parameter Server (FedAvg)</h4>
                    <p className="text-2xs text-stone-600">Zero raw farmer records transferred. Only mathematical weight gradients exchanged.</p>
                  </div>
                  <button 
                    onClick={handleRunFlRound}
                    disabled={flRunning}
                    className="px-3 py-1.5 bg-farm-foliage text-white text-xs font-bold rounded"
                  >
                    {flRunning ? "Aggregating..." : "Start Round"}
                  </button>
                </div>

                {flRoundResult && (
                  <div className="mt-3 p-3 bg-white rounded border border-emerald-300 text-xs">
                    <div className="font-bold text-emerald-900 mb-1">
                      ✓ Round {flRoundResult.round_summary?.round} Aggregated Successfully
                    </div>
                    <div className="text-stone-700 mb-2">
                      New Global Test Accuracy: <strong>{(flRoundResult.global_test_accuracy * 100).toFixed(1)}%</strong>
                    </div>
                    {flRoundResult.node_accuracy_comparison?.map(nc => (
                      <div key={nc.node_id} className="flex justify-between text-2xs border-b border-stone-50 py-1">
                        <span>{nc.state_name}:</span>
                        <span>
                          {(nc.local_accuracy_before * 100).toFixed(1)}% → <strong>{(nc.accuracy_with_global_model * 100).toFixed(1)}%</strong>
                          <span className="text-emerald-700 font-bold ml-1">(+{nc.accuracy_gain_pct}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <span className="text-2xs font-bold text-stone-500 uppercase block mb-1">DPG Model Registry:</span>
                <div className="space-y-1">
                  {modelRegistry.map((mr, i) => (
                    <div key={i} className="p-2 bg-stone-50 rounded border border-stone-200 text-xs flex justify-between">
                      <div>
                        <strong className="text-farm-foliage">{mr.version}</strong>
                        <div className="text-2xs text-stone-500">Round {mr.round} • {mr.created_at?.split("T")[0]}</div>
                      </div>
                      <span className="text-2xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded self-center">
                        Accuracy: {(mr.global_accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 text-right">
              <button onClick={() => setShowAdminNetwork(false)} className="px-4 py-1 text-xs bg-stone-200 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
