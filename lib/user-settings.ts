export interface UserSettings {
  responseLanguage: string;
  analysisPromptRefresh: string;
  analysisPromptDeepen: string;
  analysisPromptSummarize: string;
  cardGenerationPrompt: string;
  recallCardGenerationPrompt: string;
  applyCardGenerationPrompt: string;
  reflectCardGenerationPrompt: string;
  discussCardGenerationPrompt: string;
  tagGenerationPrompt: string;
}

export const DEFAULT_TASK_GENERATION_PROMPTS = {
  recall:
    "Tee kysymyksesta mahdollisimman konkreettinen ja sellainen etta se testaa ajatuksen oleellisten osien muistamista ja jos kyseessa on sitaattimainen muotoilu jollekin ajatukselle, kysy muistatko sitaattia tai sen tekijaa",
  apply: "Luo tehtava joka ohjaa keksimaan keinon, miten voisin soveltaa ajatusta kaytannossa",
  reflect:
    "Luo tehtava joka ohjaa pohtimaan syvallisesti ajatuksen merkitysta minulle, miksi se on tarkea ja mita voin siita oppia",
  discuss:
    "Luo tehtava joka kannustaa minua loytamaan jonkun ystavan tai asiantuntijan kenen kanssa voisin keskustella aiheesta syventaakseni ymmarrysta asista."
} as const;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  responseLanguage: "Finnish",
  analysisPromptRefresh: "",
  analysisPromptDeepen: "",
  analysisPromptSummarize: "",
  cardGenerationPrompt: "",
  recallCardGenerationPrompt: "",
  applyCardGenerationPrompt: "",
  reflectCardGenerationPrompt: "",
  discussCardGenerationPrompt: "",
  tagGenerationPrompt: ""
};

function clamp(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function sanitizeUserSettings(input: Partial<UserSettings> | null | undefined): UserSettings {
  return {
    responseLanguage: clamp(input?.responseLanguage || DEFAULT_USER_SETTINGS.responseLanguage, 80) || "Finnish",
    analysisPromptRefresh: clamp(input?.analysisPromptRefresh || "", 1200),
    analysisPromptDeepen: clamp(input?.analysisPromptDeepen || "", 1200),
    analysisPromptSummarize: clamp(input?.analysisPromptSummarize || "", 1200),
    cardGenerationPrompt: clamp(input?.cardGenerationPrompt || "", 1200),
    recallCardGenerationPrompt: clamp(input?.recallCardGenerationPrompt || "", 1200),
    applyCardGenerationPrompt: clamp(input?.applyCardGenerationPrompt || "", 1200),
    reflectCardGenerationPrompt: clamp(input?.reflectCardGenerationPrompt || "", 1200),
    discussCardGenerationPrompt: clamp(input?.discussCardGenerationPrompt || "", 1200),
    tagGenerationPrompt: clamp(input?.tagGenerationPrompt || "", 1200)
  };
}

export function buildLanguageInstruction(language: string): string {
  const normalized = clamp(language, 80) || DEFAULT_USER_SETTINGS.responseLanguage;
  return `Write all user-facing output in ${normalized}.`;
}
