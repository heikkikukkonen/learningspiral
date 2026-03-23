"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCardAction,
  generateCardAction,
  saveSourceDraftAction
} from "@/app/sources/actions";
import { CardType, cardTypeLabel } from "@/lib/types";

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

const presetTaskButtons: Array<{ value: CardType; label: string }> = [
  { value: "recall", label: "Kertaustehtava" },
  { value: "apply", label: "Soveltamistehtava" },
  { value: "reflect", label: "Reflektiotehtava" }
];

export function SourceTasksPanel({ sourceId, cards }: Props) {
  const router = useRouter();
  const [customInstruction, setCustomInstruction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function readEditorFormData() {
    const form = document.getElementById("source-editor-form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Ajatuslomaketta ei loytynyt.");
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
        setErrorMessage(error instanceof Error ? error.message : "Tehtavan kasittely epaonnistui.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleGenerateTask(variant: CardType | "custom") {
    const instruction = customInstruction.trim();
    if (variant === "custom" && !instruction) {
      setErrorMessage("Kirjoita ohje tehtavan luontia varten.");
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
    if (!window.confirm("Poistetaanko tehtava pysyvasti?")) {
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
      <div className="source-task-toolbar" role="group" aria-label="Tehtavien luonti">
        {presetTaskButtons.map((task) => (
          <button
            key={task.value}
            type="button"
            className="secondary source-task-create-button"
            disabled={isPending}
            onClick={() => handleGenerateTask(task.value)}
          >
            {pendingAction === `generate:${task.value}` ? "Luodaan..." : task.label}
          </button>
        ))}

        <div className="source-task-custom">
          <input
            value={customInstruction}
            onChange={(event) => setCustomInstruction(event.target.value)}
            placeholder="Kirjoita ohje tehtavan luontia varten"
            disabled={isPending}
          />
          <button
            type="button"
            className="secondary source-task-create-button"
            disabled={isPending}
            onClick={() => handleGenerateTask("custom")}
          >
            {pendingAction === "generate:custom" ? "Luodaan..." : "Luo tehtava"}
          </button>
        </div>
      </div>

      <p className="status source-task-info">Voit muuttaa tehtavien luonnin ohjeistusta Asetukset-sivulla.</p>

      <div className="list" style={{ marginTop: "0.8rem" }}>
        {cards.length === 0 ? (
          <div className="source-task-empty">
            <p>Luo tehtava ylla olevista painikkeista. Uusin tehtava tulee aina ylimmaksi.</p>
          </div>
        ) : null}

        {cards.map((card, index) => (
          <article className="card" key={card.id}>
            <div className="source-meta">
              <span className="pill" data-variant="primary">
                {cardTypeLabel(card.card_type)}
              </span>
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
                  <option value="recall">Kertaustehtava</option>
                  <option value="apply">Soveltamistehtava</option>
                  <option value="reflect">Reflektiotehtava</option>
                  <option value="decision">Paatostehtava</option>
                </select>
              </label>
            </div>

            <div className="actions" style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className="danger"
                disabled={isPending}
                onClick={() => handleDeleteCard(card.id)}
              >
                {pendingAction === `delete:${card.id}` ? "Poistetaan..." : "Poista"}
              </button>
            </div>
          </article>
        ))}
      </div>

      {errorMessage ? (
        <p className="status source-task-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
