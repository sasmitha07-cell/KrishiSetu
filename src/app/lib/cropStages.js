// Crop Phenology & Stage Engine
// Calculates days after sowing, phenological stage, stage progress %, and stage-specific care advice

export const CROP_STAGE_DEFINITIONS = {
  paddy: {
    name: "Paddy (Rice)",
    durationDays: 120,
    stages: [
      { name: "Establishment / Seedling", minDays: 0, maxDays: 15, key: "seedling", icon: "🌱", waterIndex: "Saturated (1-2 cm)", criticalCare: "Maintain thin water film; avoid submergence." },
      { name: "Vegetative Active Tillering", minDays: 16, maxDays: 40, key: "tillering", icon: "🌿", waterIndex: "Shallow (2-3 cm)", criticalCare: "Critical tillering phase. Apply organic neem cake or bio-fertilizer." },
      { name: "Panicle Initiation & Stem Elongation", minDays: 41, maxDays: 65, key: "panicle", icon: "🌾", waterIndex: "Submerged (3-5 cm)", criticalCare: "Moisture sensitive stage. Do not allow soil to dry out." },
      { name: "Flowering & Grain Filling", minDays: 66, maxDays: 95, key: "flowering", icon: "✨", waterIndex: "Submerged (3-5 cm)", criticalCare: "Keep water standing until dough stage; avoid foliar sprays during peak pollen shed." },
      { name: "Physiological Maturity & Ripening", minDays: 96, maxDays: 130, key: "maturity", icon: "🍂", waterIndex: "Dry down (Drain 10 days before harvest)", criticalCare: "Drain field completely 10-12 days before harvest to promote uniform ripening." }
    ]
  },
  wheat: {
    name: "Wheat",
    durationDays: 125,
    stages: [
      { name: "Crown Root Initiation (CRI)", minDays: 0, maxDays: 25, key: "cri", icon: "🌱", waterIndex: "First critical irrigation", criticalCare: "Most crucial irrigation window (20-25 DAS). Delaying causes irreversible root stunt." },
      { name: "Tillering & Jointing", minDays: 26, maxDays: 50, key: "tillering", icon: "🌿", waterIndex: "Moist soil", criticalCare: "Apply nitrogen/compost top dressing. Inspect for weed competition." },
      { name: "Booting & Heading", minDays: 51, maxDays: 75, key: "heading", icon: "🌾", waterIndex: "High moisture requirement", criticalCare: "Flag leaf emergence. Watch for aphid colonies and yellow rust." },
      { name: "Milking & Dough Stage", minDays: 76, maxDays: 105, key: "dough", icon: "✨", waterIndex: "Moderate moisture", criticalCare: "Susceptible to terminal heat shock. Provide light evening irrigation if hot winds blow." },
      { name: "Ripening & Harvest", minDays: 106, maxDays: 140, key: "maturity", icon: "🍂", waterIndex: "Zero irrigation", criticalCare: "Harvest when grain moisture drops below 14%." }
    ]
  },
  millet: {
    name: "Finger Millet / Pearl Millet",
    durationDays: 95,
    stages: [
      { name: "Seedling Emergence", minDays: 0, maxDays: 15, key: "emergence", icon: "🌱", waterIndex: "Light surface moisture", criticalCare: "Thin seedlings to 10cm spacing. Break soil crust if heavy rain occurs." },
      { name: "Vegetative Tillering", minDays: 16, maxDays: 35, key: "tillering", icon: "🌿", waterIndex: "Low to moderate", criticalCare: "Intercultural hoeing at 20-25 days. Extremely drought-resilient." },
      { name: "Stem Elongation & Flowering", minDays: 36, maxDays: 60, key: "flowering", icon: "🌾", waterIndex: "Moderate (Critical window)", criticalCare: "Provide protective irrigation if rain fails during earhead emergence." },
      { name: "Grain Hardening & Maturity", minDays: 61, maxDays: 105, key: "maturity", icon: "🍂", waterIndex: "Low / Rainfed", criticalCare: "Earheads turn brown. Harvest when lower grains are firm." }
    ]
  },
  blackgram: {
    name: "Blackgram (Urad)",
    durationDays: 75,
    stages: [
      { name: "Emergence & Seedling", minDays: 0, maxDays: 14, key: "seedling", icon: "🌱", waterIndex: "Residual moisture", criticalCare: "Rhizobium nodulation begins. Avoid standing water (sensitive to waterlogging)." },
      { name: "Vegetative Branching", minDays: 15, maxDays: 30, key: "vegetative", icon: "🌿", waterIndex: "Low", criticalCare: "One hand weeding at 20 days. Spray 2% DAP or Panchagavya for vigorous canopy." },
      { name: "Flowering & Pod Setting", minDays: 31, maxDays: 52, key: "flowering", icon: "🌾", waterIndex: "Crucial moist soil", criticalCare: "Most sensitive window. Moisture stress drops flowers. Spray 1% Potassium Nitrate." },
      { name: "Pod Filling & Maturity", minDays: 53, maxDays: 80, key: "maturity", icon: "🍂", waterIndex: "Dry soil", criticalCare: "Pods turn black/dark brown. Pick mature pods promptly before shattering." }
    ]
  }
};

export function calculateCropGrowth(cropName = "Paddy", sowingDateStr = "2025-01-18") {
  const normCrop = (cropName || "").toLowerCase();
  let cropConfig = CROP_STAGE_DEFINITIONS.paddy;
  if (normCrop.includes("wheat")) cropConfig = CROP_STAGE_DEFINITIONS.wheat;
  else if (normCrop.includes("millet") || normCrop.includes("ragi") || normCrop.includes("bajra")) cropConfig = CROP_STAGE_DEFINITIONS.millet;
  else if (normCrop.includes("blackgram") || normCrop.includes("urad") || normCrop.includes("gram") || normCrop.includes("pulse")) cropConfig = CROP_STAGE_DEFINITIONS.blackgram;

  // Calculate days after sowing
  let days = 42;
  try {
    const sowing = new Date(sowingDateStr);
    const now = new Date();
    if (!isNaN(sowing.getTime())) {
      const diffMs = now.getTime() - sowing.getTime();
      days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  } catch (e) {
    days = 42;
  }

  // Find active stage
  let activeStage = cropConfig.stages[0];
  let stageIndex = 0;
  for (let i = 0; i < cropConfig.stages.length; i++) {
    const s = cropConfig.stages[i];
    if (days >= s.minDays && days <= s.maxDays) {
      activeStage = s;
      stageIndex = i;
      break;
    }
    if (days > s.maxDays && i === cropConfig.stages.length - 1) {
      activeStage = s;
      stageIndex = i;
    }
  }

  // Calculate overall maturity percentage
  const totalDays = cropConfig.durationDays;
  const progressPct = Math.min(100, Math.round((days / totalDays) * 100));
  const daysRemaining = Math.max(0, totalDays - days);

  // Stage progress within current stage
  const stageSpan = Math.max(1, activeStage.maxDays - activeStage.minDays);
  const daysInStage = Math.max(0, days - activeStage.minDays);
  const currentStagePct = Math.min(100, Math.round((daysInStage / stageSpan) * 100));

  return {
    cropName: cropConfig.name,
    daysAfterSowing: days,
    stageName: activeStage.name,
    stageIcon: activeStage.icon,
    stageKey: activeStage.key,
    waterIndex: activeStage.waterIndex,
    criticalCare: activeStage.criticalCare,
    overallProgressPct: progressPct,
    currentStagePct,
    daysRemaining,
    allStages: cropConfig.stages,
    activeStageIndex: stageIndex,
    isHarvestReady: days >= totalDays
  };
}
