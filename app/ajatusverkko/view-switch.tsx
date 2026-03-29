import Link from "next/link";

export function ThoughtsViewSwitch({ active }: { active: "list" | "network" }) {
  return (
    <div className="thoughts-view-switch" aria-label="Ajatusnäkymä">
      <Link
        href="/sources"
        className={active === "list" ? "thoughts-view-switch-link is-active" : "thoughts-view-switch-link"}
        aria-current={active === "list" ? "page" : undefined}
      >
        Lista
      </Link>
      <Link
        href="/ajatusverkko"
        className={active === "network" ? "thoughts-view-switch-link is-active" : "thoughts-view-switch-link"}
        aria-current={active === "network" ? "page" : undefined}
      >
        Verkko
      </Link>
    </div>
  );
}
