"use client";

import { useState } from "react";
import { SubmitButton } from "@/app/components/submit-button";
import { saveSourceDraftAction } from "@/app/sources/actions";

type SourceEditorFormProps = {
  sourceId: string;
  initialTitle: string;
  initialIdea: string;
  initialAnalysis: string;
  initialTags: string[];
  rawInput: string;
  inputModality: string;
  lastSavedLabel: string;
};

export function SourceEditorForm({
  sourceId,
  initialTitle,
  initialIdea,
  initialAnalysis,
  initialTags,
  rawInput,
  inputModality,
  lastSavedLabel
}: SourceEditorFormProps) {
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    const next = tagInput.trim();
    if (!next) return;
    if (tags.some((tag) => tag.toLowerCase() === next.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTags((current) => [...current, next]);
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  return (
    <form className="form source-edit-form" action={saveSourceDraftAction}>
      <input type="hidden" name="sourceId" value={sourceId} />
      <input type="hidden" name="rawInput" value={rawInput} />
      <input type="hidden" name="inputModality" value={inputModality} />
      <input type="hidden" name="tags" value={tags.join(",")} />

      <label className="form-row source-edit-field">
        <span>Otsikko</span>
        <input name="title" defaultValue={initialTitle} placeholder="Anna muistiinpanolle selkea otsikko" required />
      </label>

      <label className="form-row source-edit-field">
        <span>Idea</span>
        <textarea
          name="idea"
          defaultValue={initialIdea}
          placeholder="Kirjoita ytimekas paaoivallus tai varsinainen ajatus."
          required
        />
      </label>

      <label className="form-row source-edit-field source-edit-field-analysis">
        <span>Analyysi</span>
        <textarea
          name="analysis"
          defaultValue={initialAnalysis}
          placeholder="Jalosta ideaa pidemmalle: miksi tama on tarkea, mihin se liittyy, mita haluat muistaa."
          required
        />
      </label>

      <div className="form-row source-edit-field">
        <span>Tagit</span>
        <div className="source-tag-editor">
          <div className="source-tag-list">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <button
                  key={tag}
                  className="source-tag-chip"
                  onClick={() => removeTag(tag)}
                  type="button"
                >
                  {tag} <span aria-hidden="true">x</span>
                </button>
              ))
            ) : (
              <span className="status">Ei tageja viela. Lisaa ainakin muutama avainsana.</span>
            )}
          </div>

          <div className="source-tag-add">
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="Lisää tagi"
            />
            <button type="button" className="secondary" onClick={addTag}>
              Lisää
            </button>
          </div>
        </div>
      </div>

      <div className="source-edit-footer">
        <p className="status" style={{ margin: 0 }}>
          {lastSavedLabel}
        </p>
        <SubmitButton className="primary source-edit-save" pendingText="Tallennetaan...">
          Tallenna ja jatka
        </SubmitButton>
      </div>
    </form>
  );
}
