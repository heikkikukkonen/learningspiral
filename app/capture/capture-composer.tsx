"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "idle" | "text" | "image" | "voice";

type AssetPayload = {
  kind: "image" | "audio";
  fileName: string;
  mimeType: string;
  fileSize: number;
  base64Data: string;
};

type AnalysisResult = {
  rawInput: string;
  summary: string;
  asset?: AssetPayload;
};

async function parseJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(json.error || "Request failed.");
  }
  return json;
}

export function CaptureComposer() {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState<Mode>("idle");
  const [textValue, setTextValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [summaryValue, setSummaryValue] = useState("");
  const [rawInputValue, setRawInputValue] = useState("");
  const [asset, setAsset] = useState<AssetPayload | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    if (mode === "text") {
      textAreaRef.current?.focus();
    }
  }, [mode]);

  function resetDraft(nextMode: Mode) {
    setMode(nextMode);
    setTextValue("");
    setNoteValue("");
    setTitleValue("");
    setSummaryValue("");
    setRawInputValue("");
    setAsset(null);
    setError("");
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl("");
    }
  }

  async function saveCapture(
    inputModality: "text" | "image" | "audio",
    overrides?: {
      title?: string;
      rawInput?: string;
      summary?: string;
      asset?: AssetPayload | null;
    }
  ) {
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        title: overrides?.title ?? titleValue,
        rawInput: overrides?.rawInput ?? rawInputValue,
        summary: overrides?.summary ?? summaryValue,
        inputModality,
        asset: overrides?.asset ?? asset
      };

      const response = await fetch("/api/capture/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const json = await parseJson<{ sourceId: string }>(response);
      router.push(`/capture?sourceId=${json.sourceId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function analyzeImage(file: File) {
    setIsAnalyzing(true);
    setError("");
    setMode("image");
    try {
      const formData = new FormData();
      formData.append("imageFile", file);
      formData.append("note", noteValue);

      const response = await fetch("/api/capture/analyze-image", {
        method: "POST",
        body: formData
      });

      const json = await parseJson<AnalysisResult>(response);
      setAsset(json.asset ?? null);
      setRawInputValue(json.rawInput);
      setSummaryValue(json.summary);
      setTitleValue((current) => current || file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function analyzeAudio(file: File) {
    setIsAnalyzing(true);
    setError("");
    setMode("voice");
    try {
      const formData = new FormData();
      formData.append("audioFile", file);
      formData.append("note", noteValue);

      const response = await fetch("/api/capture/analyze-audio", {
        method: "POST",
        body: formData
      });

      const json = await parseJson<AnalysisResult>(response);
      setAsset(json.asset ?? null);
      setRawInputValue(json.rawInput);
      setSummaryValue(json.summary);
      setTitleValue((current) => current || "Voice capture");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function startRecording() {
    resetDraft("voice");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], "voice-capture.webm", {
          type: recorder.mimeType || "audio/webm"
        });
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setIsRecording(false);
        await analyzeAudio(file);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording could not be started.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function saveTextCapture() {
    const trimmedText = textValue.trim();
    if (!trimmedText || isSaving) return;

    await saveCapture("text", {
      rawInput: trimmedText,
      summary: trimmedText
    });
  }

  const textCharacterCount = textValue.trim().length;

  return (
    <div className="grid">
      <article className="card capture-button-panel">
        <div className="capture-shortcuts">
          <button type="button" className="primary" onClick={() => resetDraft("text")}>
            Lisaa teksti
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              resetDraft("image");
              imageInputRef.current?.click();
            }}
          >
            Lisaa kuva
          </button>
          <button type="button" className="secondary" onClick={startRecording}>
            Sanele ajatus
          </button>
        </div>
        <p className="status" style={{ margin: 0 }}>
          Kuva ja aani muutetaan ensin tekstiksi, jonka jalkeen voit muokata AI:n yhteenvetoa ennen tallennusta.
        </p>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void analyzeImage(file);
            event.currentTarget.value = "";
          }}
        />
        <input
          ref={audioFileInputRef}
          type="file"
          accept="audio/*"
          className="hidden-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              resetDraft("voice");
              void analyzeAudio(file);
            }
            event.currentTarget.value = "";
          }}
        />
      </article>

      {mode === "text" ? (
        <article className="card capture-flow-card capture-text-card">
          <div className="capture-text-shell">
            <div className="capture-text-header">
              <div className="capture-text-copy">
                <h2 style={{ margin: 0 }}>Kirjoita ajatus</h2>
                <p className="status capture-text-status">
                  Tallenna idea heti. Voit palata hiomaan sita myohemmin.
                </p>
              </div>
            </div>

            <label className="form-row capture-primary-field capture-text-field">
              <span className="sr-only">Ajatus</span>
              <textarea
                ref={textAreaRef}
                value={textValue}
                placeholder="Kirjoita ajatuksesi tahan..."
                onChange={(event) => setTextValue(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    void saveTextCapture();
                  }
                }}
              />
            </label>

            <div className="capture-text-footer">
              <button
                type="button"
                className="primary capture-text-save"
                disabled={!textValue.trim() || isSaving}
                onClick={() => void saveTextCapture()}
              >
                {isSaving ? "Tallennetaan..." : "Tallenna"}
              </button>
              <p className="status capture-text-helper" style={{ margin: 0 }}>
                {textCharacterCount > 0
                  ? `${textCharacterCount} merkkia valmiina tallennettavaksi.`
                  : "Aloita yhdesta lauseesta. Pikanappi toimii myos Ctrl+Enterilla."}
              </p>
              <button type="button" className="capture-text-cancel" onClick={() => resetDraft("idle")}>
                Peruuta
              </button>
            </div>
          </div>
          <div className="capture-text-visual" aria-hidden="true">
            <div className="capture-text-brain" />
            <div className="capture-text-spiral" />
            <div className="capture-text-ring capture-text-ring-a" />
            <div className="capture-text-ring capture-text-ring-b" />
            <div className="capture-text-ring capture-text-ring-c" />
            <div className="capture-text-glow" />
          </div>
        </article>
      ) : null}

      {mode === "image" ? (
        <article className="card capture-flow-card">
          <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Lisaa kuva</h2>
            <button type="button" className="secondary" onClick={() => imageInputRef.current?.click()}>
              Valitse toinen kuva
            </button>
          </div>

          {!asset ? (
            <div className="grid" style={{ gap: "0.9rem" }}>
              <label className="form-row">
                <span>Lisaa halutessasi lyhyt huomio kuvan kontekstista</span>
                <textarea value={noteValue} onChange={(event) => setNoteValue(event.target.value)} />
              </label>
              <div className="actions">
                <button type="button" className="secondary" onClick={() => resetDraft("idle")}>
                  Peruuta
                </button>
              </div>
              {isAnalyzing ? <p className="status">AI tulkitsee kuvaa...</p> : null}
            </div>
          ) : (
            <div className="grid">
              <Image
                src={`data:${asset.mimeType};base64,${asset.base64Data}`}
                alt={asset.fileName}
                width={1200}
                height={900}
                className="capture-asset-preview"
                unoptimized
              />
              <label className="form-row">
                <span>AI:n kirjoittama yhteenveto</span>
                <textarea value={summaryValue} onChange={(event) => setSummaryValue(event.target.value)} />
              </label>
              <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" className="secondary" onClick={() => resetDraft("idle")}>
                  Peruuta
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!summaryValue.trim() || isSaving}
                  onClick={() => void saveCapture("image")}
                >
                  {isSaving ? "Tallennetaan..." : "Tallenna"}
                </button>
              </div>
            </div>
          )}
        </article>
      ) : null}

      {mode === "voice" ? (
        <article className="card capture-flow-card">
          <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Sanele ajatus</h2>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => audioFileInputRef.current?.click()}>
                Valitse tiedosto
              </button>
              {!isRecording ? (
                <button type="button" className="primary" onClick={startRecording}>
                  Aloita nauhoitus
                </button>
              ) : (
                <button type="button" className="danger" onClick={stopRecording}>
                  Lopeta nauhoitus
                </button>
              )}
            </div>
          </div>

          {isRecording ? <p className="status">Nauhoitus kaynnissa selaimessa...</p> : null}
          {isAnalyzing ? <p className="status">AI litteroi ja jäsentää aanta...</p> : null}
          {audioPreviewUrl ? <audio controls className="capture-audio-player" src={audioPreviewUrl} /> : null}

          {!asset && !isRecording ? (
            <div className="actions">
              <button type="button" className="secondary" onClick={() => resetDraft("idle")}>
                Peruuta
              </button>
            </div>
          ) : null}

          {asset ? (
            <div className="grid">
              <label className="form-row">
                <span>Raakana tallennettu teksti</span>
                <textarea value={rawInputValue} onChange={(event) => setRawInputValue(event.target.value)} />
              </label>
              <label className="form-row">
                <span>AI:n kirjoittama yhteenveto</span>
                <textarea value={summaryValue} onChange={(event) => setSummaryValue(event.target.value)} />
              </label>
              <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <button type="button" className="secondary" onClick={() => resetDraft("idle")}>
                  Peruuta
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={!rawInputValue.trim() || !summaryValue.trim() || isSaving}
                  onClick={() => void saveCapture("audio")}
                >
                  {isSaving ? "Tallennetaan..." : "Tallenna"}
                </button>
              </div>
            </div>
          ) : null}
        </article>
      ) : null}

      {error ? (
        <article className="card">
          <p className="status" style={{ margin: 0 }}>
            {error}
          </p>
        </article>
      ) : null}
    </div>
  );
}
