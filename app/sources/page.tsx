import Link from "next/link";
import { demoSources, demoSummaryBySourceId } from "@/lib/mock-data";

export default function SourcesPage() {
  return (
    <section>
      <div className="page-header">
        <h1>Sources</h1>
        <p className="muted">
          Kaikki lähteet, joista rakennetaan tiivistelmä ja kertauskortit.
        </p>
      </div>

      <div className="actions" style={{ marginBottom: "1rem" }}>
        <Link href="/sources/new" className="button-link primary">
          Add source
        </Link>
      </div>

      <div className="list">
        {demoSources.map((source) => {
          const summary = demoSummaryBySourceId[source.id];
          return (
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
                  Summary: {summary ? "saved" : "missing"}
                </p>
              </div>
              <Link
                href={`/sources/${source.id}`}
                className="button-link secondary"
              >
                Open
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
