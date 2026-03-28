import type { IdeaStatus } from "@/lib/types";

export function resolveSourceIdeaStatus(input: {
  ideaStatus: IdeaStatus;
  hasCards: boolean;
  tags?: string[] | null;
}): IdeaStatus {
  const hasTags = Array.isArray(input.tags) && input.tags.some((tag) => tag.trim().length > 0);

  if (input.hasCards && hasTags) {
    return "refined_with_cards";
  }

  if (input.ideaStatus === "draft" && !input.hasCards && !hasTags) {
    return "draft";
  }

  return "refined_without_cards";
}

export function sourceIdeaStageLabel(stage: IdeaStatus): string {
  if (stage === "draft") return "Tallennettu";
  if (stage === "refined_with_cards") return "Syvenee noemaksi";
  return "Työstössä";
}
