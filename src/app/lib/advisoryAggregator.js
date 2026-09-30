// Dynamic Advisory & Action Aggregator
// Aggregates Crop Phenology + Weather Forecast + Soil Health + Satellite/NDVI + Disease Scans into today's farm actions

export function generateTodayActions({
  farmerProfile,
  growthInfo,
  weatherData,
  soilData,
  ndviData,
  recentScans = [],
  extensionCases = []
}) {
  const crop = farmerProfile?.current_crop || "Paddy";
  const farmerName = farmerProfile?.name || "Farmer";
  const district = farmerProfile?.district || "Thanjavur";
  
  // Extract weather risk parameters
  const weatherAlerts = weatherData?.alerts || [];
  const rainAlert = weatherAlerts.find(a => (a.alert_type || "").toLowerCase().includes("rain") || (a.advisory || "").toLowerCase().includes("rain"));
  const heatAlert = weatherAlerts.find(a => (a.alert_type || "").toLowerCase().includes("heat") || (a.advisory || "").toLowerCase().includes("temperature"));
  const windAlert = weatherAlerts.find(a => (a.alert_type || "").toLowerCase().includes("wind"));

  // Soil flags
  const isLowN = (soilData?.nitrogen_rating || "").toLowerCase() === "low" || (farmerProfile?.n_status || "").toLowerCase() === "low";
  const isLowOC = (soilData?.organic_carbon_rating || "").toLowerCase() === "low" || (farmerProfile?.oc_status || "").toLowerCase().includes("depleted");

  // Satellite stress
  const isNdviStressed = ndviData?.current_stress_flag === true;

  // Recent disease scan
  const activeScan = recentScans && recentScans.length > 0 ? recentScans[0] : null;

  // Determine top priority headline & body
  let priorityUrgency = "WATCH"; // URGENT | WATCH | INFO
  let priorityHeadline = "";
  let priorityBody = "";
  let actionWhen = "Today";

  if (rainAlert) {
    priorityUrgency = "URGENT";
    priorityHeadline = "Rain expected within 24-48 hours.";
    priorityBody = "Postpone foliar pesticide and fertilizer spraying immediately to avoid chemical wash-off and wastage. Clear drainage channels to prevent field inundation.";
    actionWhen = "Before rain arrives";
  } else if (heatAlert) {
    priorityUrgency = "URGENT";
    priorityHeadline = "High daytime temperatures forecast.";
    priorityBody = `Heat stress risk during ${growthInfo.stageName}. Provide light evening irrigation to cool down the root zone and prevent flower abortion.`;
    actionWhen = "Evening after 5 PM";
  } else if (isNdviStressed) {
    priorityUrgency = "WATCH";
    priorityHeadline = "Satellite vegetative anomaly detected in field.";
    priorityBody = "Satellite NDVI indicates localized biomass decline or water stress. Inspect western and low-lying field patches for root aeration or pest clustering.";
    actionWhen = "Today morning";
  } else {
    priorityUrgency = "INFO";
    priorityHeadline = `Field condition is stable in ${growthInfo.stageName}.`;
    priorityBody = `${growthInfo.criticalCare} Water requirement: ${growthInfo.waterIndex}.`;
    actionWhen = "Regular schedule";
  }

  // Generate 3-4 specific tactical checklist items
  const checkItems = [];

  // Item 1: Weather-linked action
  if (rainAlert) {
    checkItems.push({
      id: "chk-weather",
      category: "Weather Risk",
      title: "Halt foliar spraying & prepare drainage",
      reason: "Precipitation forecast will wash away applied inputs.",
      timing: "Next 24 hours",
      tag: "Urgent"
    });
  } else if (heatAlert) {
    checkItems.push({
      id: "chk-weather",
      category: "Climate Guard",
      title: "Light evening irrigation cycle",
      reason: "Mitigates high daytime heat and preserves canopy turgidity.",
      timing: "Evening after 5 PM",
      tag: "Moisture"
    });
  } else {
    checkItems.push({
      id: "chk-weather",
      category: "Water Care",
      title: `Maintain ${growthInfo.waterIndex}`,
      reason: `Optimal for ${growthInfo.stageName} stage.`,
      timing: "Morning before 9 AM",
      tag: "Hydration"
    });
  }

  // Item 2: Crop stage-specific care
  checkItems.push({
    id: "chk-stage",
    category: "Crop Phenology",
    title: growthInfo.criticalCare,
    reason: `Day ${growthInfo.daysAfterSowing} of ${growthInfo.cropName} (${growthInfo.stageName}).`,
    timing: "This week",
    tag: "Growth"
  });

  // Item 3: Soil or Regenerative action
  if (isLowOC) {
    checkItems.push({
      id: "chk-soil",
      category: "Soil Health",
      title: "Apply 2 tons/acre well-decomposed FYM or compost",
      reason: "Organic carbon is low; residue mulching improves microbial structure and water retention.",
      timing: "Next irrigation cycle",
      tag: "Regenerative"
    });
  } else if (isLowN) {
    checkItems.push({
      id: "chk-soil",
      category: "Soil Health",
      title: "Broadcast neem-coated urea or Panchagavya foliar spray",
      reason: "Available soil nitrogen is in the low band; split application avoids leaching.",
      timing: "Early morning",
      tag: "Nutrition"
    });
  } else {
    checkItems.push({
      id: "chk-soil",
      category: "Soil Health",
      title: "Foliar spray of 2% Panchagavya / Jeevamrit",
      reason: "Maintains rhizosphere biological activity and root vigor.",
      timing: "Calm evening",
      tag: "Organic"
    });
  }

  // Item 4: Pest / Disease or Extension surveillance
  if (activeScan && activeScan.confidence_pct > 0) {
    checkItems.push({
      id: "chk-disease",
      category: "CropCare Vision",
      title: `Monitor field for ${activeScan.disease || "leaf spots"}`,
      reason: `Recent scan showed ${(activeScan.confidence_pct).toFixed(0)}% likelihood. Follow IPM non-chemical protocol.`,
      timing: "Today inspection",
      tag: "Surveillance"
    });
  } else {
    checkItems.push({
      id: "chk-scouting",
      category: "Field Scouting",
      title: "Inspect lower leaves and crown tillers for symptoms",
      reason: "Early spot detection prevents pest outbreaks without synthetic over-application.",
      timing: "Morning walk",
      tag: "Prevention"
    });
  }

  // Audio advisory generation
  const audioText = `Namaste ${farmerName}. In ${district}, your ${crop} is at day ${growthInfo.daysAfterSowing}, ${growthInfo.stageName}. ${priorityHeadline} ${priorityBody}`;

  return {
    priorityUrgency,
    priorityHeadline,
    priorityBody,
    actionWhen,
    checkItems,
    audioText
  };
}
