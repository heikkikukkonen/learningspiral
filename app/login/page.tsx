export default function LoginPage() {
  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Login</h1>
        <p className="muted">Auth tulee seuraavassa vaiheessa. Nyt data tallennetaan APP_USER_ID:lla.</p>
      </div>

      <article className="card">
        <ol style={{ margin: 0, paddingLeft: "1.1rem" }}>
          <li>Luo Supabase-projekti.</li>
          <li>Aja SQL tiedostosta `supabase/migrations/20260228103000_mvp_01_schema.sql`.</li>
          <li>Tayta `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_USER_ID`).</li>
          <li>Kaynista appi uudestaan.</li>
        </ol>
      </article>
    </section>
  );
}
