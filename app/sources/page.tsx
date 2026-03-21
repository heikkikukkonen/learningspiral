import type { Metadata } from "next";
import Link from "next/link";
import { listSources } from "@/lib/db";
import { deriveSourceIdeaStage, sourceIdeaStageLabel } from "@/lib/source-status";
import { SourceType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ajatukset",
  description: "Selaa tallentamiasi ajatuksia ja palaa niihin myöhemmin."
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

export default async function SourcesPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  let sources: SourceListItem[] = [];
  let loadError = "";
  const query = searchParams?.q?.trim().toLocaleLowerCase("fi-FI") ?? "";

  try {
    sources = await listSources();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Could not load data. Check Supabase configuration.";
  }

  const filteredSources = query
    ? sources.filter((source) => {
        const haystack = [
          source.title,
          source.author ?? "",
          source.capture_mode,
          ...(source.tags ?? [])
        ]
          .join(" ")
          .toLocaleLowerCase("fi-FI");
        return haystack.includes(query);
      })
    : sources;

  return (
    <section>
      <div className="page-header">
        <h1>Ajatukset</h1>
        <p className="muted">Selaa tallentamiasi ajatuksia ja palaa niihin myöhemmin.</p>
      </div>

      <form className="card thoughts-search-card" style={{ marginBottom: "1rem" }}>
        <label className="form-row">
          <span>Haku</span>
          <input
            type="search"
            name="q"
            defaultValue={searchParams?.q ?? ""}
            placeholder="Hae ajatuksia, tunnisteita tai sisältöä"
          />
        </label>

        <div className="actions">
          <button type="submit" className="primary">
            Hae
          </button>
          <Link href="/app" className="button-link secondary">
            Tallenna uusi ajatus
          </Link>
        </div>
      </form>

      {loadError ? (
        <article className="card">
          <strong>Tietokanta ei ole yhteydessa</strong>
          <p className="status" style={{ marginBottom: 0 }}>
            {loadError}
          </p>
          <p className="status" style={{ marginBottom: 0 }}>
            Lisaa `.env.local` tiedostoon `NEXT_PUBLIC_SUPABASE_URL` ja `SUPABASE_SERVICE_ROLE_KEY`.
          </p>
        </article>
      ) : null}

      <div className="list" style={{ marginTop: loadError ? "1rem" : 0 }}>
        {filteredSources.map((source) => (
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

        {!loadError && filteredSources.length === 0 ? (
          <article className="card">
            <p className="muted" style={{ margin: 0 }}>
              {query ? "Haulla ei loytynyt ajatuksia." : "Et ole viela tallentanut ajatuksia."}
            </p>
            {!query ? (
              <p className="muted" style={{ marginBottom: 0 }}>
                Aloita tallentamalla ensimmainen ajatus.
              </p>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
