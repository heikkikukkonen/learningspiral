export default function LoginPage() {
  return (
    <section className="review-shell">
      <div className="page-header">
        <h1>Login</h1>
        <p className="muted">
          MVP UI placeholder. Supabase Auth liitetään seuraavassa vaiheessa.
        </p>
      </div>

      <article className="card">
        <form className="form">
          <label className="form-row">
            <span>Email</span>
            <input type="email" placeholder="you@example.com" />
          </label>
          <label className="form-row">
            <span>Password</span>
            <input type="password" placeholder="********" />
          </label>
          <div className="actions">
            <button type="button" className="primary">
              Sign in
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}
