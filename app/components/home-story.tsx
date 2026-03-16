"use client";

import type { CSSProperties } from "react";
import { useId, useState } from "react";

type CrawlSection = {
  lead: string;
  body: string;
};

type HomeStoryProps = {
  sections: readonly CrawlSection[];
};

export function HomeStory({ sections }: HomeStoryProps) {
  const [progress, setProgress] = useState(18);
  const sliderId = useId();

  return (
    <details className="home-story" name="home-story">
      <summary className="home-story-toggle">
        <span>Mika on Learningspiral?</span>
        <span className="home-story-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </span>
      </summary>
      <div className="home-story-panel">
        <div className="home-story-space" aria-hidden="true" />
        <div className="home-story-network" aria-hidden="true">
          <span className="home-story-orbit home-story-orbit-a" />
          <span className="home-story-orbit home-story-orbit-b" />
          <span className="home-story-orbit home-story-orbit-c" />
          <span className="home-story-node home-story-node-a" />
          <span className="home-story-node home-story-node-b" />
          <span className="home-story-node home-story-node-c" />
          <span className="home-story-node home-story-node-d" />
          <span className="home-story-node home-story-node-e" />
          <span className="home-story-core" />
        </div>
        <div className="home-story-glow" aria-hidden="true" />
        <div
          className="home-story-crawl"
          style={
            {
              "--story-progress": `${progress}%`
            } as CSSProperties
          }
        >
          <p className="home-story-kicker">Learning Spiral</p>
          <h2>Oman ajattelun kasvava rata</h2>
          {sections.map((section) => (
            <p key={section.lead}>
              <strong>{section.lead}</strong> {section.body}
            </p>
          ))}
        </div>
        <div className="home-story-controls">
          <label className="home-story-slider-label" htmlFor={sliderId}>
            Liikuta tarinaa itse
          </label>
          <input
            id={sliderId}
            className="home-story-slider"
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
            aria-describedby={`${sliderId}-hint`}
          />
          <span id={`${sliderId}-hint`} className="home-story-slider-hint">
            Vedä oikealle nähdäksesi tekstin pidemmälle.
          </span>
        </div>
      </div>
    </details>
  );
}
