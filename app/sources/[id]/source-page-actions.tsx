"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSourceAction
} from "@/app/sources/actions";

type SourcePageActionsProps = {
  sourceId: string;
  lastSavedLabel: string;
  backHref?: string | null;
};

export function SourcePageActions({
  sourceId,
  lastSavedLabel,
  backHref
}: SourcePageActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState("");

  function readEditorForm() {
    const form = document.getElementById("source-editor-form");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("Ajatuslomaketta ei löytynyt.");
    }

    return form;
  }

  function handleSave() {
    setErrorMessage("");
    try {
      const form = readEditorForm();

      const backToField = form.elements.namedItem("backTo");
      if (backToField instanceof HTMLInputElement) {
        backToField.value = backHref ?? "";
      }

      form.requestSubmit();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tallennus epäonnistui. Yritä uudelleen.";
      setErrorMessage(message);
    }
  }

  function handleDelete() {
    if (!window.confirm("Poistetaanko ajatus pysyvästi? Tämä poistaa myös siihen liittyvät tehtävät.")) {
      return;
    }

    setErrorMessage("");

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("sourceId", sourceId);
        if (backHref) {
          formData.set("backTo", backHref);
        }
        await deleteSourceAction(formData);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Ajatuksen poisto epäonnistui. Yritä uudelleen.";
        setErrorMessage(message);
      }
    });
  }

  return (
    <article className="card source-page-actions-panel">
      <div className="source-edit-footer source-page-actions">
        <div className="source-page-utility-actions">
          {backHref ? (
            <Link href={backHref} className="button-link secondary">
              Palaa review-näkymään
            </Link>
          ) : null}
          <button
            type="button"
            className="danger source-page-delete"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Käsittelen..." : "Poista ajatus"}
          </button>
        </div>

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
              {isPending ? "Tallennan..." : "Tallenna"}
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
