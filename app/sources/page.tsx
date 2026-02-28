import Link from "next/link";
import { listSources } from "@/lib/db";
import { SourceType } from "@/lib/types";

type SourceListItem = {
  id: string;
  type: SourceType;
  title: string;
  author: string | null;
  tags: string[] | null;
  created_at: string;
};

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
        <h1>Sources</h1>
        <p className="muted">Kaikki lahteet, joista rakennetaan tiivistelma ja kertauskortit.</p>
      </div>

      <div className="actions" style={{ marginBottom: "1rem" }}>
        <Link href="/sources/new" className="button-link primary">
          Add source
        </Link>
      </div>

      {loadError ? (
        <article className="card">
          <strong>Database not connected</strong>
          <p className="status" style={{ marginBottom: 0 }}>
            {loadError}
          </p>
          <p className="status" style={{ marginBottom: 0 }}>
            Add `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
          </p>
        </article>
      ) : null}

      <div className="list" style={{ marginTop: loadError ? "1rem" : 0 }}>
        {sources.map((source) => (
          <article className="card source-row" key={source.id}>
            <div>
              <h3 style={{ margin: "0 0 0.4rem" }}>{source.title}</h3>
              <div className="source-meta">
                <span className="pill">{source.type}</span>
                {source.author ? <span>{source.author}</span> : null}
                {source.tags?.map((tag) => (
                  <span className="pill" key={tag}>
                    #{tag}
                  </span>
                ))}
              </div>
              <p className="status" style={{ marginBottom: 0 }}>
                Created: {new Date(source.created_at).toLocaleDateString("fi-FI")}
              </p>
            </div>
            <Link href={`/sources/${source.id}`} className="button-link secondary">
              Open
            </Link>
          </article>
        ))}
        {!loadError && sources.length === 0 ? (
          <article className="card">
            <p className="muted" style={{ margin: 0 }}>
              Ei viela lahteita. Luo ensimmainen lahde.
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
