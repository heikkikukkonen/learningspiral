"use client";

import { useState } from "react";
import {
  generateSourceTagsAction,
  refineSourceDraftAction,
  saveSourceDraftAction
} from "@/app/sources/actions";
import { dedupeTags, normalizeTagValue } from "@/lib/source-editor";
import type { TagSuggestion } from "@/lib/types";

type SourceEditorFormProps = {
  sourceId: string;
  initialTitle: string;
  initialIdea: string;
  initialAnalysis: string;
  initialTags: string[];
  tagSuggestions: TagSuggestion[];
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
  tagSuggestions,
  rawInput,
  inputModality
}: SourceEditorFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [idea, setIdea] = useState(initialIdea);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [tags, setTags] = useState(() => dedupeTags(initialTags));
  const [tagInput, setTagInput] = useState("");
  const [aiNote, setAiNote] = useState(
    "Voin kirkastaa, syventaa tai tiivistaa ajatusta nykyisten kenttien pohjalta."
  );
  const [tagNote, setTagNote] = useState(
    "Voit lisata tageja itse tai valita aiemmista ehdotuksista."
  );
  const [activeMode, setActiveMode] = useState<(typeof refineModes)[number]["id"] | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  const selectedTags = new Set(tags.map((tag) => normalizeTagValue(tag)));
  const availableTagSuggestions = tagSuggestions.filter(
    (tag) => !selectedTags.has(normalizeTagValue(tag.tag))
  );
  const normalizedTagInput = normalizeTagValue(tagInput);
  const matchingSuggestions = normalizedTagInput
    ? availableTagSuggestions.filter((suggestion) => {
        const normalizedSuggestion = normalizeTagValue(suggestion.tag);
        return (
          normalizedSuggestion.startsWith(normalizedTagInput) ||
          normalizedSuggestion.includes(normalizedTagInput) ||
          normalizedTagInput.includes(normalizedSuggestion)
        );
      })
    : [];
  const orderedMatchingSuggestions = [...matchingSuggestions].sort(
    (left, right) =>
      Number(normalizeTagValue(right.tag).startsWith(normalizedTagInput)) -
        Number(normalizeTagValue(left.tag).startsWith(normalizedTagInput)) ||
      right.usageCount - left.usageCount ||
      right.lastUsedAt.localeCompare(left.lastUsedAt)
  );
  const activeAutocompleteSuggestion = orderedMatchingSuggestions[0] ?? null;
  const exactAutocompleteSuggestion =
    normalizedTagInput
      ? availableTagSuggestions.find(
          (suggestion) => normalizeTagValue(suggestion.tag) === normalizedTagInput
        ) ?? null
      : null;
  const popularSuggestions = availableTagSuggestions
    .filter((suggestion) => suggestion.isPopular)
    .slice(0, 6);
  const recentSuggestions = [...availableTagSuggestions]
    .sort((left, right) => right.lastUsedAt.localeCompare(left.lastUsedAt))
    .slice(0, 6);

  function addResolvedTag(nextValue?: string) {
    const trimmedValue = (nextValue ?? tagInput).trim();
    if (!trimmedValue) return;

    const exactExistingTag = availableTagSuggestions.find(
      (suggestion) => normalizeTagValue(suggestion.tag) === normalizeTagValue(trimmedValue)
    );
    const resolvedSuggestion = exactExistingTag ?? null;
    const resolvedTag = resolvedSuggestion?.tag ?? trimmedValue.replace(/^#+/, "").trim();
    const normalizedResolvedTag = normalizeTagValue(resolvedTag);

    if (!normalizedResolvedTag) return;
    if (selectedTags.has(normalizedResolvedTag)) {
      setTagInput("");
      return;
    }

    setTags((current) => dedupeTags([...current, resolvedTag]));
    setTagInput("");
    setTagNote(
      resolvedSuggestion
        ? `Kaytin olemassa olevaa tagia "${resolvedSuggestion.tag}", jotta saman aiheen tagit pysyvat yhdessa.`
        : `Lisattiin uusi tagi "${resolvedTag}".`
    );
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
            ? `Paivitin analyysin tilassa "${result.mode}". Muista tallentaa muutokset, jos haluat sailyttaa ne.`
            : `Analyysi paivittyi tilassa "${result.mode}". Muista tallentaa muutokset.`
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
        setTags(dedupeTags(result.tags));
        setTagNote(
          result.tags.length > 0
            ? result.model
              ? "Loin tagit otsikon, idean ja aiempien tagiesi perusteella. Muista tallentaa muutokset."
              : "Tagit paivitettiin aiempia tageja painottavalla varalogiikalla. Muista tallentaa muutokset."
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
                tags.map((tag) => {
                  const matchingTag = tagSuggestions.find(
                    (suggestion) => normalizeTagValue(suggestion.tag) === normalizeTagValue(tag)
                  );

                  return (
                    <button
                      key={tag}
                      className="source-tag-chip"
                      onClick={() => removeTag(tag)}
                      type="button"
                    >
                      <span>{tag}</span>
                      {matchingTag?.isPopular ? (
                        <span className="source-tag-chip-badge">Suosittu</span>
                      ) : null}
                      <span aria-hidden="true">x</span>
                    </button>
                  );
                })
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
                    addResolvedTag();
                  }
                }}
                placeholder="Lisaa tagi tai hae olemassa olevista"
              />
              <button type="button" className="secondary" onClick={() => addResolvedTag()}>
                {exactAutocompleteSuggestion ? "Kayta olemassa olevaa" : "Lisaa tagi"}
              </button>
            </div>

            {orderedMatchingSuggestions.length > 0 ? (
              <div className="source-tag-section">
                <span className="source-tag-section-label">Ehdotukset kirjoittaessa</span>
                <div className="source-tag-suggestion-list">
                  {orderedMatchingSuggestions.slice(0, 6).map((suggestion, index) => (
                    <button
                      key={`${suggestion.tag}-${suggestion.lastUsedAt}`}
                      type="button"
                      className="source-tag-suggestion"
                      data-active={index === 0 ? "true" : "false"}
                      onClick={() => addResolvedTag(suggestion.tag)}
                    >
                      <span>#{suggestion.tag}</span>
                      <span className="source-tag-suggestion-meta">
                        {suggestion.isPopular ? "Suosittu" : `${suggestion.usageCount}x`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {popularSuggestions.length > 0 ? (
              <div className="source-tag-section">
                <span className="source-tag-section-label">Kaytat paljon</span>
                <div className="source-tag-suggestion-list">
                  {popularSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.tag}-${suggestion.lastUsedAt}`}
                      type="button"
                      className="source-tag-suggestion"
                      onClick={() => addResolvedTag(suggestion.tag)}
                    >
                      <span>#{suggestion.tag}</span>
                      <span className="source-tag-suggestion-meta">Suosittu</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {recentSuggestions.length > 0 ? (
              <div className="source-tag-section">
                <span className="source-tag-section-label">Viimeksi kaytetyt</span>
                <div className="source-tag-suggestion-list">
                  {recentSuggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.tag}-${suggestion.lastUsedAt}`}
                      type="button"
                      className="source-tag-suggestion"
                      onClick={() => addResolvedTag(suggestion.tag)}
                    >
                      <span>#{suggestion.tag}</span>
                      <span className="source-tag-suggestion-meta">{suggestion.usageCount}x</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="form-row source-edit-field source-analysis-shell">
          <div className="source-analysis-header">
            <span>Analyysi</span>
            <p className="status" style={{ margin: 0 }}>
              Jatka ajattelua nykyisen otsikon, idean ja alkuperaisen capturen pohjalta.
            </p>
          </div>

          <div className="source-analysis-actions" role="group" aria-label="Ajatuksen jalostus">
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
