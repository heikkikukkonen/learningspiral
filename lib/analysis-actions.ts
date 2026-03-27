import { DEFAULT_ANALYSIS_PROMPTS, UserSettings } from "@/lib/user-settings";

export type AnalysisMode = "clarify" | "deepen" | "condense" | "network";
export type AnalysisModeOrCustom = AnalysisMode | "custom";

type AnalysisPromptSettingKey =
  | "analysisPromptRefresh"
  | "analysisPromptDeepen"
  | "analysisPromptSummarize"
  | "analysisPromptNetwork";

type AnalysisActionDefinition = {
  id: AnalysisMode;
  label: string;
  summary: string;
  settingsKey: AnalysisPromptSettingKey;
};

export const ANALYSIS_ACTIONS: AnalysisActionDefinition[] = [
  {
    id: "clarify",
    label: "Kirkasta",
    summary: "Selkeä yhteenveto",
    settingsKey: "analysisPromptRefresh"
  },
  {
    id: "deepen",
    label: "Syvennä",
    summary: "Uusia näkökulmia ja kysymyksiä",
    settingsKey: "analysisPromptDeepen"
  },
  {
    id: "condense",
    label: "Tiivistä",
    summary: "Ydin kahdessa lauseessa",
    settingsKey: "analysisPromptSummarize"
  },
  {
    id: "network",
    label: "Verkostoidu",
    summary: "Tunnista ihmisiä, joiden kanssa aihetta voisi syventää.",
    settingsKey: "analysisPromptNetwork"
  }
] as const;

const ANALYSIS_ACTION_MAP = Object.fromEntries(
  ANALYSIS_ACTIONS.map((action) => [action.id, action])
) as Record<AnalysisMode, AnalysisActionDefinition>;

export function isAnalysisMode(value: string): value is AnalysisMode {
  return value === "clarify" || value === "deepen" || value === "condense" || value === "network";
}

export function analysisModeLabel(mode: AnalysisModeOrCustom): string {
  if (mode === "custom") return "Oma syvennys";
  return ANALYSIS_ACTION_MAP[mode].label;
}

export function getAnalysisPrompt(settings: UserSettings | undefined, mode: AnalysisMode): string {
  const settingsKey = ANALYSIS_ACTION_MAP[mode].settingsKey;
  const customPrompt = settings?.[settingsKey]?.trim();
  return customPrompt || DEFAULT_ANALYSIS_PROMPTS[mode];
}
