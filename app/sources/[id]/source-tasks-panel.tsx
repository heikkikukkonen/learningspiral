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
};

const presetTaskButtons: Array<{ value: CardType; label: string; tooltip: string }> = QUICK_TASK_TYPES.map(
  (value) => ({
    value,
    label: QUICK_TASK_GUIDANCE[value].buttonLabel || QUICK_TASK_GUIDANCE[value].label,
    tooltip: QUICK_TASK_GUIDANCE[value].tooltip
  })
);

export function SourceTasksPanel({ sourceId, cards }: Props) {
  const router = useRouter();
  const [customInstruction, setCustomInstruction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
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

      await generateCardAction(formData);
      if (variant === "custom") {
        setCustomInstruction("");
      }
    });
  }

  function handleDeleteCard(cardId: string) {
    if (!window.confirm("Poistetaanko tehtävä pysyvästi?")) {
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

      <p className="status source-task-hint">Voit muokata toimintojen ohjeistusta Asetukset-sivulla.</p>

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

      <div className="list" style={{ marginTop: "0.8rem" }}>
        {cards.length === 0 ? (
          <div className="source-task-empty">
            <p>Luo tehtävä yllä olevista painikkeista. Uusin tehtävä tulee aina ylimmäksi.</p>
          </div>
        ) : null}

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
                <label className="form-row">
                  <span>Tyyppi</span>
                  <select
                    form="source-editor-form"
                    name={`cards[${index}].cardType`}
                    defaultValue={card.card_type}
                  >
                    <option value="recall">Kertaustehtävä</option>
                    <option value="apply">Soveltamistehtävä</option>
                    <option value="reflect">Reflektiotehtävä</option>
                    <option value="discuss">Keskustelutehtävä</option>
                    <option value="custom">Oma tehtävä</option>
                    <option value="decision">Päätöstehtävä</option>
                  </select>
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
