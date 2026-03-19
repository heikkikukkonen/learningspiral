"use client";

import Link from "next/link";
import { useEffect } from "react";

type StoryStep = {
  key: string;
  kicker?: string;
  title?: string;
  lines?: string[];
  variant?: "hero" | "flow" | "quote" | "spiral" | "cta";
};

const storySteps: StoryStep[] = [
  {
    key: "intro",
    kicker: "Noema",
    title: "Ajattelu, joka syvenee — ja synnyttää merkityksellistä toimintaa",
    variant: "hero"
  },
  {
    key: "core",
    title: "Tallenna. Pohdi. Palaa siihen. Yhdistä se. Toimi."
  },
  {
    key: "flow",
    variant: "flow",
    lines: [
      "Tallenna se, mikä on merkityksellistä.",
      "Pohdi sitä.",
      "Palaa siihen.",
      "Yhdistä se.",
      "Anna sen kasvaa ymmärrykseksi.",
      "Toimi."
    ]
  },
  {
    key: "growth",
    title: "Ajatukset voivat kohdata toisensa.",
    variant: "spiral"
  },
  {
    key: "story-a1",
    lines: [
      "On olemassa hetkiä,",
      "joissa eri ajatukset yhdistyvät."
    ]
  },
  {
    key: "story-a2",
    lines: [
      "Jokin, mitä luit.",
      "Jokin, mitä koit.",
      "Jokin, mitä olet pohtinut aiemmin."
    ]
  },
  {
    key: "story-a3",
    variant: "quote",
    lines: ["Ja yhtäkkiä —", "ne liittyvät toisiinsa."]
  },
  {
    key: "story-b",
    lines: [
      "Syntyy uusi ajatus.",
      "Selkeämpi suunta.",
      "Oivallus, joka tuntuu oikealta."
    ]
  },
  {
    key: "story-c",
    lines: [
      "Tämä ei ole sattumaa.",
      "Se on seurausta siitä,",
      "että palaat ajatuksiisi",
      "ja annat niiden kohdata toisensa."
    ]
  },
  {
    key: "turn",
    title: "Noema tekee tästä mahdollista"
  },
  {
    key: "definition-a",
    lines: ["Noema ei ole muistiinpanosovellus."]
  },
  {
    key: "definition-b",
    lines: [
      "Se on apurisi,",
      "joka pitää ajattelusi liikkeessä",
      "ja auttaa sitä syvenemään."
    ]
  },
  {
    key: "definition-c",
    lines: [
      "Se ei ajattele puolestasi —",
      "vaan auttaa sinua ajattelemaan paremmin."
    ]
  },
  {
    key: "definition-d",
    lines: [
      "Se tuo ajatuksesi takaisin.",
      "Vahvistaa niitä.",
      "Ja ennen kaikkea:",
      "antaa niille mahdollisuuden kohdata toisensa."
    ]
  },
  {
    key: "definition-e",
    lines: ["Ja kun ne kohtaavat,", "syntyy jotain uutta."]
  },
  {
    key: "layer-a",
    lines: [
      "Uusi tieto ei korvaa vanhaa —",
      "se tarttuu siihen kiinni."
    ]
  },
  {
    key: "layer-b",
    lines: [
      "Ajatuksista alkaa muodostua verkko.",
      "Ymmärrys, joka rakentuu ajan myötä."
    ]
  },
  {
    key: "noesis-a",
    lines: [
      "Jokainen hetki alkaa havainnosta.",
      "Se on noesis."
    ]
  },
  {
    key: "noesis-b",
    lines: [
      "Mutta se, mitä siitä syntyy —",
      "on sinun tulkintasi.",
      "Sinun ymmärryksesi."
    ]
  },
  {
    key: "noema",
    lines: ["Se on noema."]
  },
  {
    key: "choice-a",
    lines: ["Sama havainto voi johtaa eri suuntiin."]
  },
  {
    key: "choice-b",
    lines: [
      "Ero ei ole siinä, mitä tapahtuu —",
      "vaan siinä, miten ajattelet siitä."
    ]
  },
  {
    key: "core-a",
    lines: [
      "Kun rakennat omaa Noemaasi,",
      "rakennat kykyäsi yhdistää, ymmärtää",
      "ja nähdä merkitys."
    ]
  },
  {
    key: "action-a",
    lines: ["Ja ajan myötä se näkyy:", "päätöksissäsi", "toiminnassasi", "suunnassasi"]
  },
  {
    key: "action-b",
    lines: ["Ei vain siinä, mitä tiedät —", "vaan siinä, mitä teet."]
  },
  {
    key: "cta",
    variant: "cta",
    title: "Aloita oman Noemasi rakentaminen",
    lines: ["Tallenna. Palaa. Yhdistä. Toimi."]
  }
];

type StoryExperienceProps = {
  mode?: "landing" | "story";
};

export function StoryExperience({ mode = "story" }: StoryExperienceProps) {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-story-step]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            target.dataset.visible = "true";
          }
        }
      },
      {
        threshold: 0.45,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    for (const section of sections) {
      observer.observe(section);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mode !== "landing") {
      return;
    }

    if (typeof window === "undefined" || window.scrollY > 8 || window.location.hash) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      return;
    }

    const sessionKey = "noema-landing-scroll-nudge-seen";
    if (window.sessionStorage.getItem(sessionKey) === "true") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      window.scrollTo({
        top: Math.min(window.innerHeight * 0.32, 220),
        behavior: "smooth"
      });
      window.sessionStorage.setItem(sessionKey, "true");
    }, 1400);

    return () => window.clearTimeout(timeoutId);
  }, [mode]);

  const isLanding = mode === "landing";

  return (
    <div className="story-page">
      <div className="story-backdrop" aria-hidden="true">
        <div className="story-backdrop-glow story-backdrop-glow-a" />
        <div className="story-backdrop-glow story-backdrop-glow-b" />
        <div className="story-backdrop-glow story-backdrop-glow-c" />
        <div className="story-backdrop-stream">
          <svg viewBox="0 0 1200 900" preserveAspectRatio="none">
            <path
              d="M-40 470C120 420 200 620 360 560C500 508 510 304 704 332C866 356 886 538 1048 548C1148 554 1232 470 1280 430"
              fill="none"
              pathLength="1"
            />
            <path
              d="M-20 504C130 458 228 638 388 588C528 544 548 356 718 382C884 408 908 594 1068 602C1162 606 1238 536 1292 486"
              fill="none"
              pathLength="1"
            />
          </svg>
        </div>
        <div className="story-backdrop-nodes">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="story-backdrop-spiral" />
      </div>

      {!isLanding ? (
        <div className="story-intro-bar">
          <Link href="/" className="story-mini-link">
            Etusivulle
          </Link>
          <span className="story-mini-label">Noeman tarina</span>
        </div>
      ) : null}

      {storySteps.map((step, index) => (
        <section
          key={step.key}
          data-story-step
          data-variant={step.variant ?? "default"}
          className="story-step"
        >
          <div className="story-step-shell">
            {step.kicker ? <p className="story-step-kicker">{step.kicker}</p> : null}
            {step.title ? <h1 className="story-step-title">{step.title}</h1> : null}
            {step.lines ? (
              <div className="story-step-lines">
                {step.lines.map((line, lineIndex) => (
                  <p
                    key={`${step.key}-${line}`}
                    className="story-step-line"
                    style={{ ["--story-delay" as string]: `${lineIndex * 180}ms` }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : null}

            {step.variant === "cta" ? (
              <div className="story-step-actions">
                <Link href="/capture?mode=text" className="button-link primary">
                  Aloita kirjaamalla ajatus
                </Link>
              </div>
            ) : null}

            {isLanding && index === 0 ? (
              <button
                type="button"
                className="story-scroll-cue"
                onClick={() => {
                  const nextSection = document.querySelectorAll<HTMLElement>("[data-story-step]")[1];
                  nextSection?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                aria-label="Vieritä seuraavaan kohtaan"
              >
                <span className="story-scroll-cue-label">Vieritä alas</span>
                <span className="story-scroll-cue-arrow" aria-hidden="true">
                  ↓
                </span>
              </button>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
