import type { IdeaStatus } from "@/lib/types";

export function sourceIdeaStageLabel(stage: IdeaStatus): string {
  if (stage === "draft") return "Tallennettu";
  if (stage === "refined_with_cards") return "Syvenee noemaksi";
  return "Työstössä";
}
