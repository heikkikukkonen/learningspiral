"use client";

type IdeaNetworkLoaderProps = {
  label?: string;
  detail?: string;
  variant?: "inline" | "panel";
};

export function IdeaNetworkLoader({
  label = "AI kasittelee ideaa",
  detail,
  variant = "inline"
}: IdeaNetworkLoaderProps) {
  return (
    <span
      className={`idea-network-loader idea-network-loader-${variant}`}
      role="status"
      aria-live="polite"
    >
      <span className="idea-network-visual" aria-hidden="true">
        <span className="idea-network-brain" />
        <span className="idea-network-swirl" />
        <span className="idea-network-orbit idea-network-orbit-a" />
        <span className="idea-network-orbit idea-network-orbit-b" />
        <span className="idea-network-links" />
        <span className="idea-network-node idea-network-node-a" />
        <span className="idea-network-node idea-network-node-b" />
        <span className="idea-network-node idea-network-node-c" />
        <span className="idea-network-node idea-network-node-d" />
        <span className="idea-network-node idea-network-node-e" />
        <span className="idea-network-core" />
      </span>
      {variant === "panel" ? (
        <span className="idea-network-copy">
          <span className="idea-network-label">{label}</span>
          {detail ? <span className="idea-network-detail">{detail}</span> : null}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
