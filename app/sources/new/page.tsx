"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SourceType } from "@/lib/types";

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
  const router = useRouter();
  const [type, setType] = useState<SourceType>("book");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [origin, setOrigin] = useState("");
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");

  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>New Source</h1>
        <p className="muted">
          MVP-lomake. Tallennus integroidaan Supabaseen seuraavassa vaiheessa.
        </p>
      </div>

      <article className="card">
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/sources/src-1");
          }}
        >
          <label className="form-row">
            <span>Type *</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as SourceType)}
            >
              {sourceTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="form-row">
            <span>Title *</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div className="grid grid-cols-2">
            <label className="form-row">
              <span>Author</span>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
              />
            </label>
            <label className="form-row">
              <span>Origin</span>
              <input
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
              />
            </label>
          </div>

          <label className="form-row">
            <span>URL</span>
            <input value={url} onChange={(event) => setUrl(event.target.value)} />
          </label>

          <label className="form-row">
            <span>Tags (comma separated)</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="systems, learning"
            />
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
