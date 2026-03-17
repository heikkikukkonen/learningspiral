"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IdeaNetworkLoader } from "@/app/components/idea-network-loader";
import { inferCaptureTitle } from "@/lib/source-editor";

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
  asset?: AssetPayload;
};

type CaptureComposerProps = {
  initialMode?: Mode;
};

type TextSaveStage = "idle" | "analyzing" | "saving";
async function parseJson<T>(response: Response): Promise<T> {
  const responseText = await response.text();
  let json: (T & { error?: string; message?: string }) | null = null;

  if (responseText) {
    try {
      json = JSON.parse(responseText) as T & { error?: string; message?: string };
    } catch {
      if (!response.ok) {
        throw new Error(
          `Pyynto epaonnistui (${response.status}). ${
            responseText.slice(0, 200) || "Palvelin ei palauttanut luettavaa virheviestia."
          }`
        );
      }
      throw new Error("Palvelin palautti virheellisen vastauksen.");
    }
  }

  if (!response.ok) {
    throw new Error(
      json?.error ||
        json?.message ||
        `Pyynto epaonnistui (${response.status}).`
    );
  }

  if (!json) {
    throw new Error("Palvelin palautti tyhjan vastauksen.");
  }

  return json;
}

function extractImageFileFromDataTransfer(dataTransfer: DataTransfer | null): File | null {
  if (!dataTransfer) return null;

  for (const item of Array.from(dataTransfer.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (isSupportedImageFile(file)) {
      return file;
    }
  }

  for (const file of Array.from(dataTransfer.files)) {
    if (isSupportedImageFile(file)) {
      return file;
    }
  }

  return null;
}

function isSupportedImageFile(file: File | null): file is File {
  if (!file) return false;
  if (file.type.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif)$/i.test(file.name);
}

function hasFileInDataTransfer(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  if (Array.from(dataTransfer.types).includes("Files")) return true;
  if (dataTransfer.files.length > 0) return true;
  return Array.from(dataTransfer.items).some((item) => item.kind === "file");
}

export function CaptureComposer({ initialMode = "text" }: CaptureComposerProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const imagePreviewRef = useRef<HTMLDivElement | null>(null);
  const imageTranscriptRef = useRef<HTMLLabelElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [textValue, setTextValue] = useState("");
  const [titleValue, setTitleValue] = useState("");
  const [rawInputValue, setRawInputValue] = useState("");
  const [asset, setAsset] = useState<AssetPayload | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [textSaveStage, setTextSaveStage] = useState<TextSaveStage>("idle");
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [isImageDragActive, setIsImageDragActive] = useState(false);

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

  useEffect(() => {
    if (mode !== "image" || asset || isAnalyzing) {
      return;
    }

    function handlePaste(event: ClipboardEvent) {
      const imageFile = extractImageFileFromDataTransfer(event.clipboardData);
      if (!imageFile) return;
      event.preventDefault();
      void analyzeImage(imageFile);
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [asset, isAnalyzing, mode]);

  useEffect(() => {
    if (mode !== "image" || !asset || isAnalyzing) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const transcriptElement = imageTranscriptRef.current;
      const previewElement = imagePreviewRef.current;
      if (!transcriptElement) return;

      const transcriptRect = transcriptElement.getBoundingClientRect();
      const previewRect = previewElement?.getBoundingClientRect();
      const desiredTopOffset = previewRect
        ? Math.max(32, Math.min(previewRect.height * 0.18, 120))
        : 72;

      window.scrollTo({
        top: window.scrollY + transcriptRect.top - desiredTopOffset,
        behavior: "smooth"
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [asset, isAnalyzing, mode]);

  function resetDraft(nextMode: Mode) {
    setMode(nextMode);
    setTextValue("");
    setTitleValue("");
    setRawInputValue("");
    setAsset(null);
    setTextSaveStage("idle");
    setError("");
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl("");
    }
    setIsImageDragActive(false);
  }

  function cancelCapture() {
    resetDraft("text");
    router.push("/");
  }

  async function saveCapture(
    inputModality: "text" | "image" | "audio",
    overrides?: {
      title?: string;
      rawInput?: string;
      summary?: string;
      asset?: AssetPayload | null;
    }
  ): Promise<boolean> {
    setIsSaving(true);
    setError("");
    try {
      const payload = {
        title: overrides?.title ?? titleValue,
        rawInput: overrides?.rawInput ?? rawInputValue,
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
      router.push(`/sources/${json.sourceId}`);
      router.refresh();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Tallennus epaonnistui. Tarkista palvelinlokit."
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function analyzeImage(file: File) {
    setIsImageDragActive(false);
    setIsAnalyzing(true);
    setError("");
    setMode("image");
    setAsset(null);
    setRawInputValue("");
    try {
      const formData = new FormData();
      formData.append("imageFile", file);

      const response = await fetch("/api/capture/analyze-image", {
        method: "POST",
        body: formData
      });

      const json = await parseJson<AnalysisResult>(response);
      setAsset(json.asset ?? null);
      setRawInputValue(json.rawInput);
      setTitleValue((current) =>
        current || inferCaptureTitle(json.rawInput, file.name.replace(/\.[^.]+$/, "") || "Kuvakaappaus")
      );
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

      const response = await fetch("/api/capture/analyze-audio", {
        method: "POST",
        body: formData
      });

      const json = await parseJson<AnalysisResult>(response);
      setAsset(json.asset ?? null);
      setRawInputValue(json.rawInput);
      setTitleValue((current) =>
        current || inferCaptureTitle(json.rawInput, file.name.replace(/\.[^.]+$/, "") || "Aanitallenne")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function analyzeText(text: string) {
    setIsAnalyzing(true);
    setError("");
    try {
      const response = await fetch("/api/capture/analyze-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      });

      const json = await parseJson<AnalysisResult>(response);
      setRawInputValue(json.rawInput);
      setTitleValue((current) => current || inferCaptureTitle(json.rawInput, "Idea"));
      return json;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Text analysis failed.");
      return null;
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
    if (!trimmedText || isSaving || isAnalyzing) return;

    setTextSaveStage("analyzing");
    const analyzed = await analyzeText(trimmedText);
    if (!analyzed) {
      setTextSaveStage("idle");
      return;
    }

    setTextSaveStage("saving");
    const saved = await saveCapture("text", {
      title: titleValue || inferCaptureTitle(analyzed.rawInput, "Idea"),
      rawInput: analyzed.rawInput
    });

    if (!saved) {
      setTextSaveStage("idle");
    }
  }

  const textCharacterCount = textValue.trim().length;
  const imageTranscriptCharacterCount = rawInputValue.trim().length;
  const voiceRawCharacterCount = rawInputValue.trim().length;
  const isTextProcessing = textSaveStage !== "idle";
  const imageDropzoneLabel = isImageDragActive ? "Pudota kuva tahan" : "Raahaa tai liita kuva";
  const textProcessingLabel =
    textSaveStage === "saving" ? "Tallennetaan ideaa" : "AI kasittelee kirjoittamaasi ajatusta";
  const textProcessingDetail =
    textSaveStage === "saving"
      ? "Luomme idealle uuden merkinnan ja siirramme sinut seuraavaksi muokkausnakymaan."
      : "Tarkistamme tekstin talteen sopivaan muotoon ennen kuin idea tallennetaan.";

  return (
    <div className="grid">
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

      {mode === "text" ? (
        <article className={`card capture-flow-card capture-text-card${isTextProcessing ? " is-processing" : ""}`}>
          <div className="capture-text-shell">
            <div className="capture-text-header">
              <div className="capture-text-copy">
                <h2 style={{ margin: 0 }}>Kirjoita ajatus</h2>
                <p className="status capture-text-status">
                  Tallenna alkuperainen teksti sellaisenaan. Jalostus tapahtuu vasta sources-nakymassa.
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
                disabled={isTextProcessing}
                aria-busy={isTextProcessing}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    void saveTextCapture();
                  }
                }}
              />
            </label>
            <p className="status capture-text-helper" style={{ margin: 0 }}>
              {isTextProcessing
                ? "Kasittely kaynnissa. Hetken paasta siirryt suoraan idean muokkaukseen."
                : textCharacterCount > 0
                ? `${textCharacterCount} merkkia valmiina tallennettavaksi.`
                : "Tallenna toimii myos Ctrl+Enterilla."}
            </p>

            <div className="capture-text-footer">
              <button
                type="button"
                className="primary capture-text-save"
                disabled={!textValue.trim() || isSaving || isAnalyzing}
                onClick={() => void saveTextCapture()}
              >
                {isTextProcessing ? (
                  <span className="submit-button-content">
                    <IdeaNetworkLoader label={textProcessingLabel} />
                    {textSaveStage === "saving" ? "Tallennetaan..." : "AI kasittelee..."}
                  </span>
                ) : (
                  "Tallenna"
                )}
              </button>
              <button type="button" className="capture-text-cancel" onClick={cancelCapture}>
                Peruuta
              </button>
            </div>
          </div>
          {isTextProcessing ? (
            <div className="capture-text-processing" aria-live="polite">
              <IdeaNetworkLoader variant="panel" label={textProcessingLabel} detail={textProcessingDetail} />
            </div>
          ) : null}
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
        <article className="card capture-flow-card capture-image-card">
          <div className="capture-image-shell">
            <div className="capture-image-header">
              <div className="capture-image-copy">
                <h2 style={{ margin: 0 }}>Lisaa kuva</h2>
                <p className="status capture-image-status">
                  Tuo screenshot, muistiinpano tai kuva. AI tulkitsee sen tekstiksi, jota voit korjata ennen tallennusta.
                </p>
              </div>
            </div>

            {!asset ? (
              <div className="capture-image-intake">
                {isAnalyzing ? (
                  <div className="capture-image-dropzone capture-image-dropzone-processing">
                    <IdeaNetworkLoader
                      variant="panel"
                      label="AI lukee kuvan tekstiksi"
                      detail="Teemme kuvasta muokattavan litteroinnin ilman lisajalostusta."
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`capture-image-dropzone${isImageDragActive ? " is-drag-active" : ""}`}
                    onClick={() => imageInputRef.current?.click()}
                    onDragEnter={(event) => {
                      if (hasFileInDataTransfer(event.dataTransfer)) {
                        event.preventDefault();
                        setIsImageDragActive(true);
                      }
                    }}
                    onDragOver={(event) => {
                      if (hasFileInDataTransfer(event.dataTransfer)) {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "copy";
                        setIsImageDragActive(true);
                      }
                    }}
                    onDragLeave={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                      setIsImageDragActive(false);
                    }}
                    onDrop={(event) => {
                      const file = extractImageFileFromDataTransfer(event.dataTransfer);
                      event.preventDefault();
                      setIsImageDragActive(false);
                      if (file) {
                        void analyzeImage(file);
                        return;
                      }
                      setError("Pudotettu tiedosto ei ollut tuettu kuva. Kayta PNG-, JPG- tai muuta kuvatiedostoa.");
                    }}
                    onPaste={(event) => {
                      const file = extractImageFileFromDataTransfer(event.clipboardData);
                      if (!file) return;
                      event.preventDefault();
                      void analyzeImage(file);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        imageInputRef.current?.click();
                      }
                    }}
                    aria-label="Raahaa, liita tai valitse kuva"
                    tabIndex={0}
                  >
                    <span className="capture-image-dropzone-icon" aria-hidden="true">
                      {isImageDragActive ? "\u2193" : "+"}
                    </span>
                    <strong>{imageDropzoneLabel}</strong>
                    <span>PNG, JPG tai screenshot. Klikkaa mobiilissa, raahaa desktopissa tai liita leikepoydalta.</span>
                  </button>
                )}

                <div className="capture-image-footer">
                  {!isAnalyzing ? (
                    <p className="status capture-image-helper" style={{ margin: 0 }}>
                      Pelkka kuvan lataus riittaa. Tarkistat tekstin ennen tallennusta.
                    </p>
                  ) : null}
                  <button type="button" className="capture-image-cancel" onClick={cancelCapture}>
                    Peruuta
                  </button>
                </div>
              </div>
            ) : (
              <div className="capture-image-result">
                <div ref={imagePreviewRef} className="capture-image-preview-shell">
                  <img
                    src={`data:${asset.mimeType};base64,${asset.base64Data}`}
                    alt={asset.fileName}
                    className="capture-asset-preview capture-image-preview"
                  />
                  <div className="capture-image-preview-meta">
                    <span className="pill" data-variant="primary">
                      Kuva litteroitu
                    </span>
                    <button
                      type="button"
                      className="secondary capture-image-secondary-action"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      Valitse toinen kuva
                    </button>
                  </div>
                </div>

                <label ref={imageTranscriptRef} className="form-row capture-image-summary-field">
                  <span>Litteroitu teksti</span>
                  <textarea value={rawInputValue} onChange={(event) => setRawInputValue(event.target.value)} />
                </label>

                <div className="capture-image-actions">
                  <div className="capture-image-save-group">
                    <p className="status capture-image-helper" style={{ margin: 0 }}>
                      {imageTranscriptCharacterCount > 0
                        ? `${imageTranscriptCharacterCount} merkkia valmiina tallennettavaksi.`
                        : "Muokkaa litterointia tarvittaessa ennen tallennusta."}
                    </p>
                    <div className="capture-image-save-actions">
                      <button
                        type="button"
                        className="primary capture-image-save"
                        disabled={!rawInputValue.trim() || isSaving}
                        onClick={() =>
                          void saveCapture("image", {
                            title: inferCaptureTitle(rawInputValue, asset?.fileName.replace(/\.[^.]+$/, "") || "Kuvakaappaus")
                          })
                        }
                      >
                        {isSaving ? "Tallennetaan..." : "Tallenna"}
                      </button>
                      <button type="button" className="capture-image-cancel capture-image-cancel-link" onClick={cancelCapture}>
                        Peruuta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="capture-image-visual" aria-hidden="true">
            <div className="capture-image-frame" />
            <div className="capture-image-glow capture-image-glow-a" />
            <div className="capture-image-glow capture-image-glow-b" />
            <div className="capture-image-orbit capture-image-orbit-a" />
            <div className="capture-image-orbit capture-image-orbit-b" />
            <div className="capture-image-dots" />
          </div>
        </article>
      ) : null}

      {mode === "voice" ? (
        <article className="card capture-flow-card capture-voice-card">
          <div className="capture-voice-shell">
            <div className="capture-voice-header">
              <div className="capture-voice-copy">
                <h2 style={{ margin: 0 }}>Sanele ajatus</h2>
                <p className="status capture-voice-status">
                  Sanele ajatus talteen tai tuo valmis M4A-, MP3- tai WebM-tiedosto. Litteroin puheen tekstiksi.
                </p>
              </div>
            </div>

            {!asset ? (
              <div className="capture-voice-intake">
                <div className="capture-voice-recorder">
                  <div className="capture-voice-recorder-copy">
                    <span className="pill" data-variant={isRecording ? "primary" : undefined}>
                      {isRecording ? "Nauhoitus kaynnissa" : "Valmis nauhoitukseen"}
                    </span>
                  </div>

                  <div className="capture-voice-recorder-actions">
                    <button
                      type="button"
                      className={isRecording ? "danger capture-voice-record-stop" : "primary capture-voice-record-start"}
                      onClick={isRecording ? stopRecording : startRecording}
                    >
                      {isRecording ? "Lopeta nauhoitus" : "Aloita nauhoitus"}
                    </button>
                    <button
                      type="button"
                      className="secondary capture-voice-file-button"
                      onClick={() => audioFileInputRef.current?.click()}
                    >
                      Valitse tiedosto
                    </button>
                  </div>
                </div>

                {isRecording ? <p className="status capture-voice-helper">Nauhoitus kaynnissa selaimessa...</p> : null}
                {isAnalyzing ? (
                  <IdeaNetworkLoader
                    variant="panel"
                    label="AI litteroi puheen tekstiksi"
                    detail="Tallennamme puheen muokattavaksi tekstiksi ilman lisaanalyysia."
                  />
                ) : null}
                {audioPreviewUrl ? (
                  <div className="capture-voice-preview-shell">
                    <div className="capture-voice-preview-meta">
                      <span className="pill" data-variant="primary">
                        Esikuuntelu
                      </span>
                      <span className="status">Tarkista aani ennen tallennusta.</span>
                    </div>
                    <audio controls className="capture-audio-player capture-voice-player" src={audioPreviewUrl} />
                  </div>
                ) : null}

                {!isRecording ? (
                  <div className="capture-voice-footer">
                    {isAnalyzing ? <p className="status capture-voice-helper">Kasittelemme tiedostoa juuri nyt.</p> : null}
                    <button type="button" className="capture-voice-cancel" onClick={cancelCapture}>
                      Peruuta
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="capture-voice-result">
                <div className="capture-voice-preview-shell">
                  <div className="capture-voice-preview-meta">
                    <span className="pill" data-variant="primary">
                      Aani litteroitu
                    </span>
                    <button
                      type="button"
                      className="secondary capture-voice-file-button"
                      onClick={() => audioFileInputRef.current?.click()}
                    >
                      Valitse toinen tiedosto
                    </button>
                  </div>
                  {audioPreviewUrl ? (
                    <audio controls className="capture-audio-player capture-voice-player" src={audioPreviewUrl} />
                  ) : null}
                </div>

                <label className="form-row capture-voice-transcript-field">
                  <span>Litteroitu raakateksti</span>
                  <textarea value={rawInputValue} onChange={(event) => setRawInputValue(event.target.value)} />
                </label>

                <div className="capture-voice-actions">
                  <button type="button" className="secondary" onClick={cancelCapture}>
                    Peruuta
                  </button>
                  <div className="capture-voice-save-group">
                    <p className="status capture-voice-helper" style={{ margin: 0 }}>
                      {voiceRawCharacterCount > 0
                        ? `${voiceRawCharacterCount} merkkia litteroituna ja valmiina tallennettavaksi.`
                        : "Varmista, etta litterointi tuntuu oikealta ennen tallennusta."}
                    </p>
                    <button
                      type="button"
                      className="primary capture-voice-save"
                      disabled={!rawInputValue.trim() || isSaving}
                      onClick={() => void saveCapture("audio")}
                    >
                      {isSaving ? "Tallennetaan..." : "Julkaise kun valmis"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="capture-voice-visual" aria-hidden="true">
            <div className="capture-voice-wave capture-voice-wave-a" />
            <div className="capture-voice-wave capture-voice-wave-b" />
            <div className="capture-voice-wave capture-voice-wave-c" />
            <div className="capture-voice-orbit capture-voice-orbit-a" />
            <div className="capture-voice-orbit capture-voice-orbit-b" />
            <div className="capture-voice-core" />
            <div className="capture-voice-glow capture-voice-glow-a" />
            <div className="capture-voice-glow capture-voice-glow-b" />
          </div>
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
