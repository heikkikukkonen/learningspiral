import { SourceType } from "@/lib/types";
import { createSourceAction } from "@/app/sources/actions";

const sourceTypes: SourceType[] = [
  "book",
  "podcast",
  "conversation",
  "thought",
  "article",
  "video",
  "other"
];

export default function NewSourcePage() {
  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>New Source</h1>
        <p className="muted">Tallentuu nyt oikeaan tietokantaan.</p>
      </div>

      <article className="card">
        <form className="form" action={createSourceAction}>
          <label className="form-row">
            <span>Type *</span>
            <select name="type" defaultValue="book" required>
              {sourceTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="form-row">
            <span>Title *</span>
            <input name="title" required />
          </label>

          <div className="grid grid-cols-2">
            <label className="form-row">
              <span>Author</span>
              <input name="author" />
            </label>
            <label className="form-row">
              <span>Origin</span>
              <input name="origin" />
            </label>
          </div>

          <label className="form-row">
            <span>Published at</span>
            <input name="publishedAt" type="date" />
          </label>

          <label className="form-row">
            <span>URL</span>
            <input name="url" />
          </label>

          <label className="form-row">
            <span>Tags (comma separated)</span>
            <input name="tags" placeholder="systems, learning" />
          </label>

          <div className="actions">
            <button type="submit" className="primary">
              Save source
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
