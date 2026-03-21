import type { Metadata } from "next";
import Link from "next/link";
import { listSources } from "@/lib/db";
import { deriveSourceIdeaStage, sourceIdeaStageLabel } from "@/lib/source-status";
import { SourceType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ajatukset",
  description: "Kaikki talteen otetut ajatukset, joihin voit palata, syventää ja yhdistää."
};

type SourceListItem = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  tags: string[] | null;
  capture_mode: string;
  has_cards: boolean;
  created_at: string;
};

function sourceTypeLabel(type: SourceType): string | null {
  return type === "other" ? null : type;
}

function captureModeLabel(captureMode: string): string | null {
  return captureMode === "chat" ? null : captureMode;
}

export default async function SourcesPage() {
  let sources: SourceListItem[] = [];
  let loadError = "";

  try {
    sources = await listSources();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Could not load data. Check Supabase configuration.";
  }

  return (
    <section>
      <div className="page-header">
        <h1>Ajatukset</h1>
        <p className="muted">Kaikki talteen otetut ajatukset, joihin voit palata, syventää ja yhdistää.</p>
      </div>

      <div className="actions" style={{ marginBottom: "1rem" }}>
        <Link href="/capture?mode=text" className="button-link primary">
          Uusi ajatus
        </Link>
        <Link href="/progress" className="button-link secondary">
          Katso virta
        </Link>
      </div>

      {loadError ? (
        <article className="card">
          <strong>Tietokanta ei ole yhteydessä</strong>
          <p className="status" style={{ marginBottom: 0 }}>
            {loadError}
          </p>
          <p className="status" style={{ marginBottom: 0 }}>
            Lisää `.env.local` tiedostoon `NEXT_PUBLIC_SUPABASE_URL` ja `SUPABASE_SERVICE_ROLE_KEY`.
          </p>
        </article>
      ) : null}

      <div className="list" style={{ marginTop: loadError ? "1rem" : 0 }}>
        {sources.map((source) => (
          <article className="card source-row" key={source.id}>
            <div>
              <h3 style={{ margin: "0 0 0.4rem" }}>{source.title}</h3>
              <div className="source-meta">
                {sourceTypeLabel(source.type) ? (
                  <span className="pill">{sourceTypeLabel(source.type)}</span>
                ) : null}
                {captureModeLabel(source.capture_mode) ? (
                  <span className="pill">{captureModeLabel(source.capture_mode)}</span>
                ) : null}
                <span className="pill">
                  {sourceIdeaStageLabel(deriveSourceIdeaStage(source.has_cards))}
                </span>
                {source.author ? <span>{source.author}</span> : null}
                {source.tags?.map((tag) => (
                  <span className="pill" key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="status" style={{ marginBottom: 0 }}>
                Tallennettu:{" "}
                {new Date(source.created_at).toLocaleString("fi-FI", {
                  dateStyle: "short",
                  timeStyle: "short"
                })}
              </p>
            </div>
            <Link href={`/sources/${source.id}`} className="button-link secondary">
              Avaa
            </Link>
          </article>
        ))}
        {!loadError && sources.length === 0 ? (
          <article className="card">
            <p className="muted" style={{ margin: 0 }}>
              Ei ajatuksia vielä. Aloita kirjoittamalla ensimmäinen.
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
