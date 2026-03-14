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

  async function saveCapture(inputModality: "text" | "image" | "audio") {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/capture/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: titleValue,
          rawInput: rawInputValue,
          summary: summaryValue,
          inputModality,
          asset
        })
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
        <article className="card capture-flow-card">
          <h2 style={{ marginTop: 0 }}>Lisaa teksti</h2>
          <label className="form-row capture-primary-field">
            <span>Kirjoita ajatus</span>
            <textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} />
          </label>
          <div className="actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" className="secondary" onClick={() => resetDraft("idle")}>
              Peruuta
            </button>
            <button
              type="button"
              className="primary"
              disabled={!textValue.trim() || isSaving}
              onClick={() => {
                setRawInputValue(textValue.trim());
                setSummaryValue(textValue.trim());
                void saveCapture("text");
              }}
            >
              {isSaving ? "Tallennetaan..." : "Tallenna"}
            </button>
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
