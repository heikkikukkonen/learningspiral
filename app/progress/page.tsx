import { getProgressSnapshot } from "@/lib/db";

export const dynamic = "force-dynamic";

function sparklinePath(values: number[], width: number, height: number) {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export default async function ProgressPage() {
  const snapshot = await getProgressSnapshot();
  const lmsValues = snapshot.lmsTrend90.map((item) => item.lmsScore);
  const acceptedValues = snapshot.lmsTrend90.map((item) => item.acceptedCount);
  const reviewValues = snapshot.lmsTrend90.map((item) => item.reviewsCount);
  const insightValues = snapshot.lmsTrend90.map((item) => item.appliedCount);

  return (
    <section className="grid">
      <div className="page-header">
        <h1>Progress</h1>
        <p className="muted">Learning Momentum Score (LMS) and 30-day activity metrics.</p>
      </div>

      <div className="grid grid-cols-2">
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Active Review Days (30d)</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.3rem 0" }}>{snapshot.activeReviewDays30}</p>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Cards Accepted (30d)</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.3rem 0" }}>{snapshot.cardsAccepted30}</p>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Applied Insights (30d)</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.3rem 0" }}>{snapshot.appliedInsights30}</p>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Today Delta</h3>
          <p style={{ fontSize: "1.8rem", margin: "0.3rem 0" }}>
            +{snapshot.todayDelta.toFixed(3)} LMS
          </p>
        </article>
      </div>

      <article className="card">
        <h2 style={{ marginTop: 0 }}>LMS Trend (90d)</h2>
        <svg viewBox="0 0 1000 220" width="100%" height="220" role="img" aria-label="LMS trend line">
          <rect x="0" y="0" width="1000" height="220" fill="#f6f9fc" />
          <path d={sparklinePath(lmsValues, 1000, 220)} stroke="#0b4f6c" strokeWidth="3" fill="none" />
        </svg>
      </article>

      <div className="grid grid-cols-2">
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Review consistency</h3>
          <svg viewBox="0 0 1000 150" width="100%" height="150">
            <path d={sparklinePath(reviewValues, 1000, 150)} stroke="#0b4f6c" strokeWidth="3" fill="none" />
          </svg>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Cards accepted</h3>
          <svg viewBox="0 0 1000 150" width="100%" height="150">
            <path d={sparklinePath(acceptedValues, 1000, 150)} stroke="#067647" strokeWidth="3" fill="none" />
          </svg>
        </article>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Applied insights</h3>
          <svg viewBox="0 0 1000 150" width="100%" height="150">
            <path d={sparklinePath(insightValues, 1000, 150)} stroke="#b42318" strokeWidth="3" fill="none" />
          </svg>
        </article>
      </div>
    </section>
  );
}
