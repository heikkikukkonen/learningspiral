"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NoemaLoadingModal } from "@/app/components/noema-loading-modal";
import {
  deleteCardAction,
  generateCardAction,
  saveSourceDraftAction
} from "@/app/sources/actions";
import {
  CardType,
  QUICK_TASK_GUIDANCE,
  QUICK_TASK_TYPES,
  cardTypeLabel,
  cardTypeSupportText
} from "@/lib/types";

type CardDetails = {
  id: string;
  card_type: CardType;
  prompt: string;
  answer: string;
};

type Props = {
  sourceId: string;
  cards: CardDetails[];
  showDebug: boolean;
};

const presetTaskButtons: Array<{ value: CardType; label: string; tooltip: string }> = QUICK_TASK_TYPES.map(
  (value) => ({
    value,
    label: QUICK_TASK_GUIDANCE[value].buttonLabel || QUICK_TASK_GUIDANCE[value].label,
    tooltip: QUICK_TASK_GUIDANCE[value].tooltip
  })
);

export function SourceTasksPanel({ sourceId, cards, showDebug }: Props) {
  const router = useRouter();
  const [customInstruction, setCustomInstruction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [taskDebugPrompt, setTaskDebugPrompt] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isGeneratingTask = Boolean(pendingAction?.startsWith("generate:"));

  function readEditorFormData() {
    const form = document.getElementById("source-editor-form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Ajatuslomaketta ei löytynyt.");
    }

    const formData = new FormData(form);
    formData.set("sourceId", sourceId);
    return formData;
  }

  function runAction(actionKey: string, task: () => Promise<void>) {
    setErrorMessage("");
    setPendingAction(actionKey);

    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Tehtävän käsittely epäonnistui.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleGenerateTask(variant: CardType | "custom") {
    const instruction = customInstruction.trim();
    if (variant === "custom" && !instruction) {
      setErrorMessage("Kirjoita ohje tehtävän luontia varten.");
      return;
    }

    runAction(`generate:${variant}`, async () => {
      await saveSourceDraftAction(readEditorFormData());

      const formData = new FormData();
      formData.set("sourceId", sourceId);
      formData.set("variant", variant);
      if (instruction) {
        formData.set("instruction", instruction);
      }

      const result = await generateCardAction(formData);
      setTaskDebugPrompt(result?.debugPrompt ?? "");
      if (variant === "custom") {
        setCustomInstruction("");
      }
    });
  }

  function handleDeleteCard(cardId: string) {
    if (!window.confirm("Poistanko tehtävän pysyvästi?")) {
      return;
    }

    runAction(`delete:${cardId}`, async () => {
      await saveSourceDraftAction(readEditorFormData());

      const formData = new FormData();
      formData.set("sourceId", sourceId);
      formData.set("cardId", cardId);
      await deleteCardAction(formData);
    });
  }

  return (
    <div className="source-task-stack">
      <div className="source-task-toolbar" role="group" aria-label="Tehtävien pikaluonti">
        {presetTaskButtons.map((task) => (
          <button
            key={task.value}
            type="button"
            className="secondary source-task-create-button"
            disabled={isPending}
            title={task.tooltip}
            onClick={() => handleGenerateTask(task.value)}
          >
            {pendingAction === `generate:${task.value}` ? "Luon..." : task.label}
          </button>
        ))}
      </div>

      <div className="source-task-custom">
        <input
          value={customInstruction}
          onChange={(event) => setCustomInstruction(event.target.value)}
          placeholder="Kirjoita ohje oman tehtävän luontia varten"
          disabled={isPending}
        />
        <button
          type="button"
          className="secondary source-task-create-button"
          disabled={isPending}
          onClick={() => handleGenerateTask("custom")}
        >
          {pendingAction === "generate:custom" ? "Luon..." : "Luo tehtävä"}
        </button>
      </div>

      {showDebug && taskDebugPrompt ? (
        <details className="source-tag-debug">
          <summary>Käytetty prompti (debug)</summary>
          <pre>{taskDebugPrompt}</pre>
        </details>
      ) : null}

      <div className="list" style={{ marginTop: "0.8rem" }}>
        {cards.map((card, index) => {
          const supportText = cardTypeSupportText(card.card_type);

          return (
            <article className="card" key={card.id}>
              <div className="source-task-card-topbar">
                <div className="source-meta">
                  <span className="pill" data-variant="primary">
                    {cardTypeLabel(card.card_type)}
                  </span>
                  {supportText ? (
                    <span className="source-task-type-note">{supportText}</span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="source-task-delete-button"
                  aria-label="Poista tehtävä"
                  disabled={isPending}
                  onClick={() => handleDeleteCard(card.id)}
                >
                  x
                </button>
              </div>

              <div className="form" style={{ marginTop: "0.7rem" }}>
                <input
                  form="source-editor-form"
                  type="hidden"
                  name={`cards[${index}].cardId`}
                  value={card.id}
                />
                <input
                  form="source-editor-form"
                  type="hidden"
                  name={`cards[${index}].cardType`}
                  value={card.card_type}
                />
                <label className="form-row">
                  <span>Kysymys</span>
                  <input
                    form="source-editor-form"
                    name={`cards[${index}].prompt`}
                    defaultValue={card.prompt}
                    required
                  />
                </label>
                <label className="form-row">
                  <span>Vastaus</span>
                  <textarea
                    form="source-editor-form"
                    name={`cards[${index}].answer`}
                    defaultValue={card.answer}
                    required
                  />
                </label>
              </div>

              {pendingAction === `delete:${card.id}` ? (
                <p className="status source-task-delete-status">Poistan tehtävän...</p>
              ) : null}
            </article>
          );
        })}
      </div>

      {errorMessage ? (
        <p className="status source-task-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <NoemaLoadingModal
        open={isPending && isGeneratingTask}
        label="Luon tehtävän"
        detail="Luon tehtävän automaattisesti. Voit itse muokata tehtävää ja vastausta halutessasi."
      />
    </div>
  );
}
