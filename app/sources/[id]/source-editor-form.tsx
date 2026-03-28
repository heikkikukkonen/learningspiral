"use client";

import { useState } from "react";
import { NoemaLoadingModal } from "@/app/components/noema-loading-modal";
import { ANALYSIS_ACTIONS } from "@/lib/analysis-actions";
import {
  generateSourceTagsAction,
  refineSourceDraftAction,
  saveSourceDraftAction
} from "@/app/sources/actions";
import { dedupeTags, normalizeTagValue } from "@/lib/source-editor";
import type { AnalysisModeOrCustom } from "@/lib/analysis-actions";
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
  const [customInstruction, setCustomInstruction] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [tagNote, setTagNote] = useState("");
  const [activeMode, setActiveMode] = useState<AnalysisModeOrCustom | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const hasTags = tags.length > 0;

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
  const exactAutocompleteSuggestion =
    normalizedTagInput
      ? availableTagSuggestions.find(
          (suggestion) => normalizeTagValue(suggestion.tag) === normalizedTagInput
        ) ?? null
      : null;
  const recentSuggestions = [...availableTagSuggestions].sort(
    (left, right) =>
      right.lastUsedAt.localeCompare(left.lastUsedAt) ||
      right.usageCount - left.usageCount ||
      left.tag.localeCompare(right.tag, "fi-FI")
  );
  const visibleSuggestions = normalizedTagInput
    ? orderedMatchingSuggestions.slice(0, 12)
    : recentSuggestions.slice(0, 12);
  const suggestionsLabel = normalizedTagInput ? "Vastaavat tunnisteet" : "Aiemmat tunnisteet";
  const showInlineSuggestions = normalizedTagInput.length > 0 && visibleSuggestions.length > 0;
  const showDefaultSuggestions = normalizedTagInput.length === 0 && visibleSuggestions.length > 0;
  const sourceLoadingOpen = isRefining || isGeneratingTags;
  const sourceLoadingLabel = isGeneratingTags ? "Luon tunnisteet automaattisesti" : "Syvennän näkökulmaa";
  const sourceLoadingDetail = isGeneratingTags
    ? "Voit poistaa tai lisätä itse tunnisteita tämän jälkeen."
    : activeMode === "custom"
      ? "Päivitän syvennystekstin antamasi ohjeen mukaan."
      : "Päivitän syvennystekstin. Voit kokeilla valmiita toimintoja tai ohjata omalla ohjeellasi syventämistä.";

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
        ? `Käytin olemassa olevaa tunnistetta "${resolvedSuggestion.tag}", jotta saman aiheen tunnisteet pysyvät yhdessä.`
        : `Lisättiin uusi tunniste "${resolvedTag}".`
    );
  }

  function removeTag(tagToRemove: string) {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  function handleAiAction(mode: AnalysisModeOrCustom) {
    const nextCustomInstruction = customInstruction.trim();
    if (mode === "custom" && !nextCustomInstruction) {
      setAiNote("Kirjoita oma pyyntösi ennen kuin painat Syvennä.");
      return;
    }

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
        if (mode === "custom") {
          formData.set("customInstruction", nextCustomInstruction);
        }

        const result = await refineSourceDraftAction(formData);
        setAnalysis(result.analysis);
        setAiNote(
          result.model
            ? `Päivitin "Syvennä näkökulmaa" -tekstin toiminnolla "${result.modeLabel}". Muista tallentaa muutokset, jos haluat säilyttää ne.`
            : `"Syvennä näkökulmaa" -teksti päivittyi toiminnolla "${result.modeLabel}". Muista tallentaa muutokset.`
        );
        if (mode === "custom") {
          setCustomInstruction("");
        }
      } catch (error) {
        setAiNote(error instanceof Error ? error.message : '"Syvennä näkökulmaa" -tekstin päivitys epäonnistui.');
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
              ? "Loin tunnisteet otsikon, idean ja aiempien tunnisteidesi perusteella. Muista tallentaa muutokset."
              : "Tunnisteet päivitettiin aiempia tunnisteita painottavalla varalogiikalla. Muista tallentaa muutokset."
            : "Tunnisteita ei saatu luotua nykyisistä kentistä."
        );
      } catch (error) {
        setTagNote(error instanceof Error ? error.message : "Tunnisteiden luonti epäonnistui.");
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
            placeholder="Anna ajatukselle selkeä otsikko"
            required
          />
        </label>

        <label className="form-row source-edit-field">
          <span>Ajatus</span>
          <textarea
            name="idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Kirjoita ytimekäs pääoivallus tai varsinainen ajatus."
            required
          />
        </label>

        <div className="form-row source-edit-field">
          <div className="source-analysis-header">
            <span>Tunnisteet</span>
          </div>

          <div className="source-tag-editor">
            {hasTags ? (
              <div className="source-tag-list">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    className="source-tag-chip"
                    onClick={() => removeTag(tag)}
                    type="button"
                  >
                    <span>{tag}</span>
                    <span aria-hidden="true">x</span>
                  </button>
                ))}
              </div>
            ) : null}

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
                placeholder="Lisää tunniste tai hae olemassa olevista"
              />
            </div>

            {showInlineSuggestions ? (
              <div className="source-tag-section source-tag-section-inline">
                <span className="source-tag-section-label">{suggestionsLabel}</span>
                <div className="source-tag-suggestion-list">
                  {visibleSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.tag}-${suggestion.lastUsedAt}`}
                      type="button"
                      className="source-tag-suggestion"
                      data-active={index === 0 ? "true" : "false"}
                      onClick={() => addResolvedTag(suggestion.tag)}
                    >
                      <span>#{suggestion.tag}</span>
                      <span className="source-tag-suggestion-meta">{suggestion.usageCount}x</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="source-tag-add source-tag-add-actions">
              <button type="button" className="secondary" onClick={() => addResolvedTag()}>
                {exactAutocompleteSuggestion ? "Käytä olemassa olevaa" : "Lisää uusi tunniste"}
              </button>
              {!hasTags ? (
                <button
                  type="button"
                  className="secondary source-tag-inline-action"
                  onClick={handleGenerateTags}
                  disabled={isGeneratingTags}
                >
                  {isGeneratingTags ? "Luon..." : "Luo automaattisesti"}
                </button>
              ) : null}
            </div>

            {tagNote ? <p className="status source-analysis-note">{tagNote}</p> : null}

            {showDefaultSuggestions ? (
              <div className="source-tag-section">
                <span className="source-tag-section-label">{suggestionsLabel}</span>
                <div className="source-tag-suggestion-list">
                  {visibleSuggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.tag}-${suggestion.lastUsedAt}`}
                      type="button"
                      className="source-tag-suggestion"
                      data-active={index === 0 ? "true" : "false"}
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

        <div className="form-row source-edit-field">
          <div className="source-analysis-header">
            <span>Syvennä näkökulmaa</span>
            <p className="status" style={{ margin: 0 }}>
              Valitse valmis toiminto tai anna oma suunta. Voit muokata toimintojen ohjeistusta
              Asetukset-sivulla.
            </p>
          </div>

          <div className="source-analysis-shell">
            <div className="source-analysis-actions" role="group" aria-label="Syvennä näkökulmaa">
              {ANALYSIS_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  className="secondary source-task-create-button source-analysis-action"
                  disabled={isRefining}
                  onClick={() => handleAiAction(action.id)}
                  type="button"
                  title={action.summary}
                >
                  {isRefining && activeMode === action.id ? "Käsittelen..." : action.label}
                </button>
              ))}
            </div>

            <div className="source-analysis-custom">
              <div className="source-analysis-custom-field">
                <textarea
                  value={customInstruction}
                  onChange={(event) => setCustomInstruction(event.target.value)}
                  placeholder="Kirjoita oma pyyntösi, jos haluat ohjata syventämistä tarkemmin."
                  rows={3}
                  disabled={isRefining}
                />
              </div>
              <button
                type="button"
                className="secondary source-task-create-button source-analysis-custom-button"
                disabled={isRefining}
                onClick={() => handleAiAction("custom")}
              >
                {isRefining && activeMode === "custom" ? "Käsittelen..." : "Syvennä"}
              </button>
            </div>

            {aiNote ? <p className="status source-analysis-note">{aiNote}</p> : null}

            <textarea
              name="analysis"
              value={analysis}
              onChange={(event) => setAnalysis(event.target.value)}
              className="source-analysis-textarea"
              placeholder="Kokoa tähän kirkastus, syvennys, tiivistys tai verkostoitumisidea."
              required
            />
          </div>
        </div>
      </form>

      <NoemaLoadingModal
        open={sourceLoadingOpen}
        label={sourceLoadingLabel}
        detail={sourceLoadingDetail}
      />
    </div>
  );
}
