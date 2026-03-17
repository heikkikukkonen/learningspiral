"use client";

import { useState } from "react";
import {
  generateSourceTagsAction,
  refineSourceDraftAction,
  saveSourceDraftAction
} from "@/app/sources/actions";

type SourceEditorFormProps = {
  sourceId: string;
  initialTitle: string;
  initialIdea: string;
  initialAnalysis: string;
  initialTags: string[];
  rawInput: string;
  inputModality: string;
};

const refineModes = [
  { id: "refresh", label: "Kirkasta ajatus" },
  { id: "deepen", label: "Syvenna ajattelua" },
  { id: "summarize", label: "Tiivista ydin" }
] as const;

export function SourceEditorForm({
  sourceId,
  initialTitle,
  initialIdea,
  initialAnalysis,
  initialTags,
  rawInput,
  inputModality
}: SourceEditorFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [idea, setIdea] = useState(initialIdea);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [aiNote, setAiNote] = useState("AI voi kirkastaa, syventaa tai tiivistaa ajatusta nykyisten kenttien pohjalta.");
  const [tagNote, setTagNote] = useState("Voit luoda tagit pyynnosta tai lisata ne itse.");
  const [activeMode, setActiveMode] = useState<(typeof refineModes)[number]["id"] | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

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

  function handleAiAction(mode: (typeof refineModes)[number]["id"]) {
    setActiveMode(mode);
    setIsRefining(true);
    void (async () => {
      try {
        const formData = new FormData();
        formData.set("title", title);
        formData.set("idea", idea);
        formData.set("analysis", analysis);
        formData.set("rawInput", rawInput);
        formData.set("tags", tags.join(","));
        formData.set("mode", mode);

        const result = await refineSourceDraftAction(formData);
        setAnalysis(result.analysis);
        setAiNote(
          result.model
            ? `AI paivitti analyysin tilassa "${result.mode}". Muista tallentaa, jos haluat sailyttaa muutokset.`
            : `Analyysi paivitettiin tilassa "${result.mode}". Muista tallentaa muutokset.`
        );
      } catch (error) {
        setAiNote(error instanceof Error ? error.message : "Analyysin paivitys epaonnistui.");
      } finally {
        setActiveMode(null);
        setIsRefining(false);
      }
    })();
  }

  function handleGenerateTags() {
    setIsGeneratingTags(true);
    void (async () => {
      try {
        const formData = new FormData();
        formData.set("title", title);
        formData.set("idea", idea);

        const result = await generateSourceTagsAction(formData);
        setTags(result.tags);
        setTagNote(
          result.tags.length > 0
            ? result.model
              ? "AI loi tagit otsikon ja idean perusteella. Muista tallentaa muutokset."
              : "Tagit paivitettiin varalogiikalla. Muista tallentaa muutokset."
            : "Tageja ei saatu luotua nykyisista kentista."
        );
      } catch (error) {
        setTagNote(error instanceof Error ? error.message : "Tagien luonti epaonnistui.");
      } finally {
        setIsGeneratingTags(false);
      }
    })();
  }

  return (
    <div className="source-editor-stack">
      <form id="source-editor-form" className="form source-edit-form" action={saveSourceDraftAction}>
        <input type="hidden" name="sourceId" value={sourceId} />
        <input type="hidden" name="rawInput" value={rawInput} />
        <input type="hidden" name="inputModality" value={inputModality} />
        <input type="hidden" name="tags" value={tags.join(",")} />

        <label className="form-row source-edit-field">
          <span>Otsikko</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Anna muistiinpanolle selkea otsikko"
            required
          />
        </label>

        <label className="form-row source-edit-field">
          <span>Idea</span>
          <textarea
            name="idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Kirjoita ytimekas paaoivallus tai varsinainen ajatus."
            required
          />
        </label>

        <div className="form-row source-edit-field">
          <div className="source-analysis-header">
            <span>Tagit</span>
            <button
              type="button"
              className="secondary source-analysis-action"
              onClick={handleGenerateTags}
              disabled={isGeneratingTags}
            >
              {isGeneratingTags ? "Luodaan..." : "Ehdota tageja"}
            </button>
          </div>

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
                <span className="status">Tagit ovat tyhjat, kunnes luot ne tai lisat ne itse.</span>
              )}
            </div>

            <p className="status source-analysis-note">{tagNote}</p>

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
                placeholder="Lisaa tagi"
              />
              <button type="button" className="secondary" onClick={addTag}>
                Lisaa tagi
              </button>
            </div>
          </div>
        </div>

        <div className="form-row source-edit-field source-analysis-shell">
          <div className="source-analysis-header">
            <span>Analyysi</span>
            <p className="status" style={{ margin: 0 }}>
              Jatka ajattelua nykyisen otsikon, idean ja alkuperaisen capturen pohjalta.
            </p>
          </div>

          <div className="source-analysis-actions" role="group" aria-label="AI-jalostus">
            {refineModes.map((mode) => (
              <button
                key={mode.id}
                className="secondary source-analysis-action"
                disabled={isRefining}
                onClick={() => handleAiAction(mode.id)}
                type="button"
              >
                {isRefining && activeMode === mode.id ? "Kasitellaan..." : mode.label}
              </button>
            ))}
          </div>

          <p className="status source-analysis-note">{aiNote}</p>

          <textarea
            name="analysis"
            value={analysis}
            onChange={(event) => setAnalysis(event.target.value)}
            className="source-analysis-textarea"
            placeholder="Jalosta ideaa pidemmalle: miksi tama on tarkea, mihin se liittyy, mita haluat muistaa."
            required
          />
        </div>
      </form>
    </div>
  );
}
