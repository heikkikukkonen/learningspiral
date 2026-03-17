export function HomeStory() {
  return (
    <details className="home-story" name="home-story">
      <summary className="home-story-toggle">
        <span>Mika on Noema?</span>
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
        <div className="home-story-crawl">
          <p className="home-story-kicker">Noema</p>
          <h2>Rauhallinen tila ajatella</h2>
          <p className="home-story-lead">Ajattelu, joka syvenee.</p>

          <div className="home-story-manifest">
            <p>Tallenna se, mikä on merkityksellista.</p>
            <p>Pohdi sita.</p>
            <p>Palauta se mieleesi.</p>
            <p>Yhdista se.</p>
            <p>Anna sen kasvaa ymmarrykseksi.</p>
          </div>

          <div className="home-story-section">
            <p>
              Ajattelu ei epaonnistu siksi, etta sinulta puuttuisi ideoita.
              Se epaonnistuu siksi, etta mikaan ei kanna niita eteenpain.
            </p>
            <p>
              Luet jotain tarkeaa. Koet oivalluksen hetken. Kirjoitat sen ylos.
              Ja sitten se katoaa.
            </p>
            <p>
              Ei siksi, ettei se olisi ollut merkityksellista, vaan siksi,
              ettei mikaan tuonut sita takaisin. Se, mihin et palaa, katoaa.
            </p>
          </div>

          <div className="home-story-section">
            <p className="home-story-section-title">Noema muuttaa taman</p>
            <p>
              Noema ei ole vain paikka tallettaa muistiinpanoja. Se on
              jarjestelma, joka pitaa ajattelusi elavana ja auttaa sita
              syvenemaan.
            </p>
            <p>
              Se tuo ajatuksesi takaisin oikeaan aikaan, yhdistaa ne toisiinsa
              ja muuttaa yksittaiset oivallukset rakentuvaksi ymmarrykseksi.
            </p>
          </div>

          <div className="home-story-section">
            <p>
              Kun oivallus kirjasta, keskustelusta tai omasta havainnosta
              tallennetaan, se ei jaa irralliseksi.
            </p>
            <p>
              Uusi tieto ei korvaa vanhaa, vaan tarttuu siihen kiinni ja
              kasvattaa ymmarrysta kerros kerrokselta.
            </p>
          </div>

          <div className="home-story-section">
            <p>Paivittainen kertaus tekee oppimisesta aktiivista. Noema auttaa sinua:</p>
            <ul className="home-story-list">
              <li>palaamaan aiempiin ajatuksiin</li>
              <li>muodostamaan yhteyksia niiden valille</li>
              <li>muuttamaan lukemisen, kuulemisen ja kokemisen ymmarrykseksi</li>
            </ul>
          </div>

          <div className="home-story-section">
            <p className="home-story-section-title">Missio</p>
            <p>
              Jos jokaisella olisi oma jatkuvasti vahvistuva oppimishistoria,
              me emme vain muistaisi enemman.
            </p>
            <p>
              Me ajattelisimme paremmin. Soveltaisimme rohkeammin. Ottaisimme
              seuraavan askeleen nopeammin, viisaammin, silloin kun on sen aika.
            </p>
          </div>

          <p className="home-story-closing">
            Etta ajattelusi ei ala aina alusta vaan rakentuu.
          </p>
        </div>
      </div>
    </details>
  );
}
