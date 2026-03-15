"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSourceAction, saveSourceDraftAction } from "@/app/sources/actions";

type SourcePageActionsProps = {
  sourceId: string;
  hasCards: boolean;
  lastSavedLabel: string;
};

export function SourcePageActions({
  sourceId,
  hasCards,
  lastSavedLabel
}: SourcePageActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  function readEditorFormData() {
    const form = document.getElementById("source-editor-form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Idealomaketta ei loytynyt.");
    }

    const formData = new FormData(form);
    formData.set("sourceId", sourceId);
    return formData;
  }

  function handleSave(mode: "later" | "complete") {
    if (mode === "complete" && !hasCards) {
      const message = "Luo kortit ensin ennen kuin tallennat idean valmiina.";
      setErrorMessage(message);
      window.alert(message);
      return;
    }

    setErrorMessage("");

    startTransition(async () => {
      try {
        const formData = readEditorFormData();
        formData.set("saveMode", mode);
        await saveSourceDraftAction(formData);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Tallennus epaonnistui. Yrita uudelleen.";
        setErrorMessage(message);
      }
    });
  }

  function handleDelete() {
    if (!window.confirm("Poistetaanko idea pysyvasti? Tama poistaa myos siihen liittyvat kortit.")) {
      return;
    }

    setErrorMessage("");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("sourceId", sourceId);
        await deleteSourceAction(formData);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Idean poisto epaonnistui. Yrita uudelleen.";
        setErrorMessage(message);
      }
    });
  }

  return (
    <article className="card source-page-actions-panel">
      <div className="source-edit-footer source-page-actions">
        <button
          type="button"
          className="danger source-page-delete"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? "Kasitellaan..." : "Poista"}
        </button>

        <div className="source-page-save-actions">
          <button
            type="button"
            className="secondary source-edit-later"
            onClick={() => handleSave("later")}
            disabled={isPending}
          >
            {isPending ? "Tallennetaan..." : "Jalosta myohemmin"}
          </button>

          <div className="source-edit-save-group">
            <p className="status" style={{ margin: 0 }}>
              {lastSavedLabel}
            </p>
            <button
              type="button"
              className="primary source-edit-save"
              onClick={() => handleSave("complete")}
              disabled={isPending}
            >
              {isPending ? "Tallennetaan..." : "Tallenna valmiina"}
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="status source-page-actions-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </article>
  );
}
