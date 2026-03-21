export type SourceIdeaStage = "unrefined" | "refined";

export function deriveSourceIdeaStage(hasCards: boolean): SourceIdeaStage {
  return hasCards ? "refined" : "unrefined";
}

export function sourceIdeaStageLabel(stage: SourceIdeaStage): string {
  return stage === "refined" ? "Syvennetty ajatus" : "Keskenerainen ajatus";
}
