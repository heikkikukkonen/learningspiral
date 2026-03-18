"use client";

import { useState, useTransition } from "react";
import {
  deleteSourceAction,
  saveSourceDraftAndReturnAction
} from "@/app/sources/actions";

type SourcePageActionsProps = {
  sourceId: string;
  lastSavedLabel: string;
};

export function SourcePageActions({
  sourceId,
  lastSavedLabel
}: SourcePageActionsProps) {
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

  function handleSave() {
    setErrorMessage("");

    startTransition(async () => {
      try {
        const formData = readEditorFormData();
        const result = await saveSourceDraftAndReturnAction(formData);
        window.location.assign(result.redirectTo);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Tallennus epäonnistui. Yritä uudelleen.";
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
          error instanceof Error ? error.message : "Idean poisto epäonnistui. Yritä uudelleen.";
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
          {isPending ? "Kasitellaan..." : "Poista idea"}
        </button>

        <div className="source-page-save-actions">
          <div className="source-edit-save-group">
            <p className="status" style={{ margin: 0 }}>
              {lastSavedLabel}
            </p>
            <button
              type="button"
              className="primary source-edit-save"
              onClick={() => handleSave()}
              disabled={isPending}
            >
              {isPending ? "Tallennetaan..." : "Tallenna ja palaa"}
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
