import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getThoughtNetworkLayout, getUserSettings, listSources } from "@/lib/db";
import { parseSourceSummaryContent } from "@/lib/source-editor";
import { resolveSourceIdeaStatus, sourceIdeaStageLabel } from "@/lib/source-status";
import { IdeaStatus, SourceType } from "@/lib/types";
import type { ThoughtNetworkLayoutMap } from "@/lib/db";
import { ThoughtNetworkView } from "./thought-network-view";
import { ThoughtsViewSwitch } from "./view-switch";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Ajatusverkko",
  description: "Beta-nakymä ajatusten valisten yhteyksien tutkimiseen"
};

type SourceListItem = {
  id: string;
  type: SourceType;
  title: string;
  tags: string[] | null;
  idea_status: IdeaStatus;
  has_cards: boolean;
  created_at: string;
  summary_content?: string | null;
  raw_input?: string | null;
};

function buildSourceDraft(source: Pick<SourceListItem, "summary_content" | "raw_input">) {
  const summaryContent = source.summary_content?.trim() ?? "";
  const rawInput = source.raw_input?.trim() ?? "";
  const parsed = parseSourceSummaryContent(summaryContent, rawInput);
  const idea = parsed.idea.trim();
  const analysis = parsed.analysis.trim();

  let preview = "";
  if (!summaryContent) {
    preview = rawInput;
  } else if (!/(^|\n)Idea:\s*/i.test(summaryContent)) {
    preview = summaryContent;
  } else if (idea && analysis && idea !== analysis) {
    preview = `${idea}\n${analysis}`;
  } else {
    preview = idea || analysis;
  }

  return {
    preview,
    idea,
    analysis
  };
}

export default async function ThoughtNetworkPage() {
  const settings = await getUserSettings();

  if (!settings.showBetaFeatures) {
    return (
      <section>
        <div className="page-header">
          <div className="page-title-with-icon">
            <Image
              src="/brand/action-icons/Ajatusverkko.png"
              alt=""
              aria-hidden="true"
              width={64}
              height={64}
              className="page-title-icon page-title-icon-network"
            />
            <div className="page-title-copy">
              <h1>Ajatusverkko</h1>
              <span className="pill thought-network-beta-symbol" data-variant="primary" aria-label="Beta">
                Beta
              </span>
            </div>
          </div>
          <p className="muted">Toiminto avautuu, kun sallit beta-toiminnot asetuksissa.</p>
        </div>

        <article className="card">
          <p className="muted" style={{ marginTop: 0 }}>
            Ajatusverkko on vielä kokeellinen näkymä. Laita asetus päälle, niin lisään sen päävalikkoon ja saat
            tämän beta-sivun käyttöösi.
          </p>
          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <Link href="/settings" className="button-link secondary">
              Avaa asetukset
            </Link>
          </div>
        </article>
      </section>
    );
  }

  let sources: SourceListItem[] = [];
  let initialManualPositions: ThoughtNetworkLayoutMap = {};
  let loadError = "";

  try {
    [sources, initialManualPositions] = await Promise.all([
      listSources(),
      getThoughtNetworkLayout()
    ]);
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Could not load data. Check Supabase configuration.";
  }

  const thoughts = sources.map((source) => {
    const draft = buildSourceDraft(source);

    return {
      id: source.id,
      title: source.title,
      tags: source.tags ?? [],
      preview: draft.preview,
      idea: draft.idea,
      analysis: draft.analysis,
      createdAt: source.created_at,
      hasCards: source.has_cards,
      stageLabel: sourceIdeaStageLabel(
        resolveSourceIdeaStatus({
          ideaStatus: source.idea_status,
          hasCards: source.has_cards,
          tags: source.tags
        })
      )
    };
  });

  return (
    <section className="thought-network-page">
      <div className="page-header">
        <div className="page-title-with-icon">
          <Image
            src="/brand/action-icons/Ajatusverkko.png"
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            className="page-title-icon page-title-icon-network"
          />
          <div className="page-title-copy">
            <h1>Ajatusverkko</h1>
            <span className="pill thought-network-beta-symbol" data-variant="primary" aria-label="Beta">
              Beta
            </span>
          </div>
        </div>
        <p className="muted">
          Näe, miten ajatuksesi kerääntyvät tunnisteiden ympärille ja millaiset teemat vetävät toisiaan puoleensa.
        </p>
      </div>

      <div className="thoughts-toolbar">
        <ThoughtsViewSwitch active="network" />
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

      {!loadError && thoughts.length ? (
        <ThoughtNetworkView thoughts={thoughts} initialManualPositions={initialManualPositions} />
      ) : null}

      {!loadError && thoughts.length === 0 ? (
        <article className="card">
          <p className="muted" style={{ margin: 0 }}>
            Et ole vielä tallentanut ajatuksia. Aloita ensimmäisestä ajatuksesta, niin verkko alkaa rakentua.
          </p>
          <div className="actions" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
            <Link href="/app" className="button-link secondary">
              Tallenna ajatus
            </Link>
          </div>
        </article>
      ) : null}
    </section>
  );
}
