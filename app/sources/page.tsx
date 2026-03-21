import type { Metadata } from "next";
import Link from "next/link";
import { listSources } from "@/lib/db";
import { deriveSourceIdeaStage, sourceIdeaStageLabel } from "@/lib/source-status";
import { SourceType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ajatukset",
  description: "Selaa tallentamiasi ajatuksia, syvenna niita ja palaa niihin myohemmin."
};

type SourceListItem = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  origin: string | null;
  tags: string[] | null;
  capture_mode: string;
  has_cards: boolean;
  created_at: string;
  summary_content?: string | null;
  raw_input?: string | null;
};

type SourcesPageProps = {
  searchParams?: {
    q?: string;
    tag?: string;
  };
};

function sourceTypeLabel(type: SourceType): string | null {
  return type === "other" ? null : type;
}

function captureModeLabel(captureMode: string): string | null {
  return captureMode === "chat" ? null : captureMode;
}

function normalizeSearchValue(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("fi-FI") ?? "";
}

function matchesQuery(source: SourceListItem, query: string) {
  if (!query) return true;

  const haystack = [
    source.title,
    source.author,
    source.origin,
    source.summary_content,
    source.raw_input,
    ...(source.tags ?? [])
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase("fi-FI");

  return haystack.includes(query);
}

function buildSourcesHref(query: string, tag: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (tag) params.set("tag", tag);

  const search = params.toString();
  return search ? `/sources?${search}` : "/sources";
}

export default async function SourcesPage({ searchParams }: SourcesPageProps) {
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

  const rawQuery = searchParams?.q?.trim() ?? "";
  const query = normalizeSearchValue(rawQuery);
  const activeTag = searchParams?.tag?.trim() ?? "";
  const normalizedActiveTag = normalizeSearchValue(activeTag);

  const allTags = new Map<string, { label: string; count: number }>();
  for (const source of sources) {
    for (const tag of source.tags ?? []) {
      const normalizedTag = normalizeSearchValue(tag);
      if (!normalizedTag) continue;

      const current = allTags.get(normalizedTag);
      if (current) {
        current.count += 1;
      } else {
        allTags.set(normalizedTag, { label: tag, count: 1 });
      }
    }
  }

  const tags = [...allTags.entries()]
    .map(([value, meta]) => ({ value, label: meta.label, count: meta.count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label, "fi-FI")
    );

  const filteredSources = sources.filter((source) => {
    const matchesTag =
      !normalizedActiveTag ||
      (source.tags ?? []).some((tag) => normalizeSearchValue(tag) === normalizedActiveTag);

    return matchesTag && matchesQuery(source, query);
  });

  return (
    <section>
      <div className="page-header">
        <h1>Ajatukset</h1>
        <p className="muted">
          Selaa tallentamiasi ajatuksia, syvenna niita ja palaa niihin myohemmin.
        </p>
      </div>

      <div className="actions" style={{ marginBottom: "1rem" }}>
        <Link href="/capture?mode=text" className="button-link primary">
          Tallenna ajatus
        </Link>
        <Link href="/progress" className="button-link secondary">
          Katso eteneminen
        </Link>
      </div>

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

      {!loadError ? (
        <div className="thoughts-toolbar">
          <form className="thoughts-search" role="search">
            <label className="thoughts-search-label" htmlFor="thought-search">
              Hae ajatuksia
            </label>
            <div className="thoughts-search-row">
              <input
                id="thought-search"
                name="q"
                type="search"
                defaultValue={rawQuery}
                placeholder="Hae ajatuksia tunnisteella tai sisallosta."
              />
              {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}
              <button type="submit" className="button-link secondary">
                Hae
              </button>
            </div>
          </form>

          <details className="thoughts-tags card" open={Boolean(activeTag)}>
            <summary className="thoughts-tags-summary">
              <span className="thoughts-eyebrow">Tunnisteet</span>
              <span className="thoughts-tags-title">Selaa aihepiireja tunnisteiden avulla</span>
            </summary>

            <div className="thoughts-tags-panel">
              {tags.length ? (
                <div className="thoughts-tag-list">
                  {tags.map((tag) => {
                    const isActive = tag.value === normalizedActiveTag;

                    return (
                      <Link
                        key={tag.value}
                        href={buildSourcesHref(rawQuery, tag.label)}
                        className="pill"
                        data-variant={isActive ? "primary" : undefined}
                      >
                        #{tag.label} <span className="thoughts-tag-count">{tag.count}</span>
                      </Link>
                    );
                  })}
                  {activeTag ? (
                    <Link
                      href={buildSourcesHref(rawQuery, "")}
                      className="button-link secondary thoughts-clear-link"
                    >
                      Tyhjenna tunnistesuodatus
                    </Link>
                  ) : null}
                </div>
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  Tunnisteet alkavat kertyvat, kun tallennat useampia ajatuksia.
                </p>
              )}
            </div>
          </details>
        </div>
      ) : null}

      <div className="list" style={{ marginTop: loadError ? "1rem" : 0 }}>
        {filteredSources.map((source) => {
          const preview = (source.summary_content ?? source.raw_input ?? "").trim();

          return (
            <article className="card source-row" key={source.id}>
              <div className="thoughts-card-copy">
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
                {preview ? (
                  <p className="thoughts-snippet">
                    {preview.slice(0, 180)}
                    {preview.length > 180 ? "..." : ""}
                  </p>
                ) : null}
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
          );
        })}

        {!loadError && sources.length === 0 ? (
          <article className="card">
            <p className="muted" style={{ margin: 0 }}>
              Et ole viela tallentanut ajatuksia. Aloita tallentamalla ensimmainen ajatus.
            </p>
          </article>
        ) : null}

        {!loadError && sources.length > 0 && filteredSources.length === 0 ? (
          <article className="card">
            <p className="muted" style={{ margin: 0 }}>
              Hakusi ei tuottanut osumia. Kokeile toista hakusanaa tai poista tunnistesuodatus.
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
