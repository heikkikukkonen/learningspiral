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
    title: "Rauhallinen tila ajatella",
    variant: "hero"
  },
  {
    key: "core",
    title: "Ajattelu, joka syvenee"
  },
  {
    key: "flow",
    variant: "flow",
    lines: [
      "Tallenna se, mikä on merkityksellistä.",
      "Pohdi sitä.",
      "Palauta se mieleesi.",
      "Yhdistä se."
    ]
  },
  {
    key: "growth",
    title: "Anna sen kasvaa ymmärrykseksi",
    variant: "spiral"
  },
  {
    key: "problem-a",
    lines: [
      "Ajattelu ei epäonnistu siksi,",
      "että sinulta puuttuisi ideoita."
    ]
  },
  {
    key: "problem-b",
    lines: [
      "Se epäonnistuu siksi,",
      "että mikään ei kanna niitä eteenpäin."
    ]
  },
  {
    key: "story-a",
    lines: [
      "Luet jotain tärkeää.",
      "Koet oivalluksen hetken.",
      "Kirjoitat sen ylös."
    ]
  },
  {
    key: "story-b",
    lines: ["Ja sitten-", "se katoaa."]
  },
  {
    key: "story-c",
    lines: [
      "Ei siksi, ettei se olisi merkityksellistä,",
      "vaan siksi, ettei mikään tuonut sitä takaisin."
    ]
  },
  {
    key: "quote",
    variant: "quote",
    lines: ["Se, mihin et palaa, katoaa."]
  },
  {
    key: "turn",
    title: "Noema muuttaa tämän"
  },
  {
    key: "definition-a",
    lines: ["Noema ei ole muistiinpanosovellus."]
  },
  {
    key: "definition-b",
    lines: [
      "Se on järjestelmä,",
      "joka pitää ajattelusi elävänä",
      "ja auttaa sitä syvenemään."
    ]
  },
  {
    key: "definition-c",
    lines: [
      "Se tuo ajatuksesi takaisin.",
      "Yhdistää ne.",
      "Ja rakentaa niistä ymmärrystä."
    ]
  },
  {
    key: "layer-a",
    lines: ["Uusi tieto ei korvaa vanhaa-", "se rakentuu sen päälle."]
  },
  {
    key: "layer-b",
    lines: ["Ajatuksista syntyy kokonaisuus.", "Kerros kerrokselta."]
  },
  {
    key: "noesis-a",
    lines: ["Jokainen hetki alkaa havainnosta.", "Se on noesis."]
  },
  {
    key: "noesis-b",
    lines: [
      "Mutta se, mitä siitä syntyy-",
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
      "Ero ei ole siinä, mitä tapahtuu-",
      "vaan siinä, miten ajattelet siitä."
    ]
  },
  {
    key: "core-a",
    lines: [
      "Kun rakennat omaa Noemaasi,",
      "rakennat tapaasi nähdä ja toimia."
    ]
  },
  {
    key: "action",
    lines: ["Ja ajan myötä se näkyy:", "päätöksissäsi", "toiminnassasi", "suunnassasi"]
  },
  {
    key: "finale",
    lines: ["Ajattelusi ei enää ala alusta.", "Se rakentuu."]
  },
  {
    key: "cta",
    variant: "cta",
    title: "Aloita oman Noemasi rakentaminen",
    lines: ["Tallenna. Pohdi. Palaa. Yhdistä."]
  }
];

export function StoryExperience() {
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

      <div className="story-intro-bar">
        <Link href="/" className="story-mini-link">
          Etusivulle
        </Link>
        <span className="story-mini-label">Noeman tarina</span>
      </div>

      {storySteps.map((step) => (
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
                {step.lines.map((line, index) => (
                  <p
                    key={`${step.key}-${line}`}
                    className="story-step-line"
                    style={{ ["--story-delay" as string]: `${index * 180}ms` }}
                  >
                    {line}
                  </p>
                ))}
              </div>
            ) : null}

            {step.variant === "cta" ? (
              <div className="story-step-actions">
                <Link href="/capture?mode=text" className="button-link primary">
                  Aloita kirjoittamalla ajatus
                </Link>
                <Link href="/sources" className="button-link secondary">
                  Katso ajatusverkko
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
