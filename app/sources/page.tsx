import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { listSources } from "@/lib/db";
import { parseSourceSummaryContent } from "@/lib/source-editor";
import { resolveSourceIdeaStatus, sourceIdeaStageLabel } from "@/lib/source-status";
import { IdeaStatus, SourceType } from "@/lib/types";
import { ThoughtsTagBrowser } from "./thoughts-tag-browser";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ajatukset",
  description: "Selaa tallentamiasi ajatuksia"
};

type SourceListItem = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  origin: string | null;
  tags: string[] | null;
  capture_mode: string;
  idea_status: IdeaStatus;
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

function buildSourcePreview(source: Pick<SourceListItem, "summary_content" | "raw_input">) {
  const summaryContent = source.summary_content?.trim() ?? "";
  const rawInput = source.raw_input?.trim() ?? "";

  if (!summaryContent) {
    return rawInput;
  }

  if (!/(^|\n)Idea:\s*/i.test(summaryContent)) {
    return summaryContent;
  }

  const parsed = parseSourceSummaryContent(summaryContent, rawInput);
  const idea = parsed.idea.trim();
  const analysis = parsed.analysis.trim();

  if (idea && analysis && idea !== analysis) {
    return `${idea}\n${analysis}`;
  }

  return idea || analysis;
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
  const activeTagLabel = tags.find((tag) => tag.value === normalizedActiveTag)?.label ?? activeTag;
  const tagItems = tags.map((tag) => {
    const isActive = tag.value === normalizedActiveTag;
    const nextTag = isActive ? "" : tag.label;

    return {
      value: tag.value,
      label: tag.label,
      count: tag.count,
      href: buildSourcesHref(rawQuery, nextTag),
      isActive
    };
  });

  const filteredSources = sources.filter((source) => {
    const matchesTag =
      !normalizedActiveTag ||
      (source.tags ?? []).some((tag) => normalizeSearchValue(tag) === normalizedActiveTag);

    return matchesTag && matchesQuery(source, query);
  });

  return (
    <section>
      <div className="page-header">
        <div className="page-title-with-icon">
          <Image
            src="/brand/action-icons/SelaaAjatuksia.PNG"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="page-title-icon"
          />
          <h1>Selaa ajatuksia</h1>
        </div>
      </div>

      {loadError ? (
        <article className="card">
          <strong>Tietokanta ei ole yhteydessä</strong>
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
            <div className="thoughts-search-row">
              <input
                id="thought-search"
                name="q"
                type="search"
                defaultValue={rawQuery}
                placeholder="Hae ajatuksia tunnisteella tai sisällöstä."
              />
              {activeTag ? <input type="hidden" name="tag" value={activeTag} /> : null}
              <button type="submit" className="button-link secondary">
                Hae
              </button>
            </div>
            <ThoughtsTagBrowser items={tagItems} activeTagLabel={activeTagLabel} />
          </form>
        </div>
      ) : null}

      <div className="list" style={{ marginTop: loadError ? "1rem" : 0 }}>
        {filteredSources.map((source) => {
          const preview = buildSourcePreview(source);

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
                    {sourceIdeaStageLabel(
                      resolveSourceIdeaStatus({
                        ideaStatus: source.idea_status,
                        hasCards: source.has_cards,
                        tags: source.tags
                      })
                    )}
                  </span>
                  {source.author ? <span>{source.author}</span> : null}
                  {source.tags?.map((tag) => (
                    <span className="tag-chip tag-chip-network tag-chip-inline" key={tag}>
                      <span className="tag-chip-mark" aria-hidden="true">âˆž</span>
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
                {preview ? <p className="thoughts-snippet">{preview}</p> : null}
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
              Et ole vielä tallentanut ajatuksia. Aloita tallentamalla ensimmäinen ajatus.
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
