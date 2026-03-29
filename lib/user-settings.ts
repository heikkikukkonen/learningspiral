export interface UserSettings {
  responseLanguage: string;
  showDebug: boolean;
  showBetaFeatures: boolean;
  analysisPromptRefresh: string;
  analysisPromptDeepen: string;
  analysisPromptSummarize: string;
  analysisPromptNetwork: string;
  cardGenerationPrompt: string;
  recallCardGenerationPrompt: string;
  applyCardGenerationPrompt: string;
  reflectCardGenerationPrompt: string;
  discussCardGenerationPrompt: string;
  tagGenerationPrompt: string;
}

export const DEFAULT_TAG_GENERATION_PROMPT =
  "Luo 3-6 selkeää tunnistetta, jotka kuvaavat ajatuksen ydintä selkeästi. Jos ajatus sisältää erisnimiä tai esimerkiksi kirjan nimiä tai tiettyjä avainkäsitteitä, luo niistä tunnisteet.";

export const DEFAULT_ANALYSIS_PROMPTS = {
  clarify: [
    "Muodosta selkeä ja helposti ymmärrettävä yhteenveto annetuista tiedoista.",
    "",
    "Tavoite:",
    "- kirkasta ajattelua ja poista epäselvyydet",
    "- jäsennä sisältö loogiseksi kokonaisuudeksi",
    "- tuo esiin keskeinen viesti ja tärkeimmät oivallukset",
    "",
    "Muoto:",
    "- 1-2 kappaletta",
    "- selkeä ja sujuva kieli",
    "- ei listoja, vaan yhtenäinen teksti"
  ].join("\n"),
  deepen: [
    "Syvennä ajatusta tuomalla mukaan uusia näkökulmia, kysymyksiä ja mahdollisia laajennuksia.",
    "",
    "Tavoite:",
    "- lisää uusia näkökulmia tai tulkintoja",
    "- nosta esiin viittauksia yleisiin ilmiöihin, tutkimuksiin, kirjoihin tai käytännön esimerkkeihin",
    "- esitä kiinnostavia jatkokysymyksiä",
    "- tuo mukaan mahdollisia esimerkkejä, vertauksia tai sovelluksia",
    "- auta näkemään aihe laajemmin",
    "- haasta tarvittaessa ajatusta",
    "",
    "Muoto:",
    "- 2-4 kappaletta",
    "- voi sisältää yksittäisiä kysymyksiä tekstin seassa",
    "- tuo tietoa ulkopuolisista lähteistä"
  ].join("\n"),
  condense: [
    "Tiivistä ajatuksen ydin mahdollisimman selkeästi ja ytimekkäästi.",
    "",
    "Tavoite:",
    "- tunnista tärkein ajatus",
    "- kiteytä se mahdollisimman selkeästi",
    "- säilytä merkitys mutta poista kaikki ylimääräinen",
    "",
    "Muoto:",
    "- enintään 2 lausetta",
    "- yksinkertainen ja selkeä kieli",
    "- helposti muistettava muotoilu"
  ].join("\n"),
  network: [
    "Tunnista ajatuksen pohjalta, millaisten ihmisten kanssa aiheesta kannattaisi keskustella ymmärryksen syventämiseksi.",
    "",
    "Tavoite:",
    "- ehdota 2-5 sellaista ihmistyyppiä, roolia tai asiantuntijaprofiilia tai tunnettua asiantuntijaa, joiden kanssa tästä aiheesta kannattaisi keskustella",
    "- kerro lyhyesti, mitä lisäarvoa kukin voisi tuoda ajatteluun",
    "- pidä ehdotukset käytännöllisinä ja helposti lähestyttävinä",
    "",
    "Muoto:",
    "- lyhyt johdanto",
    "- sen jälkeen selkeä lista ihmisistä tai rooleista",
    "- jokaisesta 1 lause"
  ].join("\n")
} as const;

export const DEFAULT_TASK_GENERATION_PROMPTS = {
  recall:
    "Luo muistamista vahvistava kertaustehtävä, joka on mahdollisimman konkreettinen ja sellainen että se testaa ajatuksen oleellisten osien muistamista ja jos kyseessä on sitaattimainen muotoilu jollekin ajatukselle, kysy muistatko sitaattia tai sen tekijää",
  apply:
    "Luo soveltamistehtävä joka ohjaa keksimään keinon, miten voisin soveltaa ajatusta käytännössä. Muotoile tehtävä niin, että käyttäjä kuvittelee tai tunnistaa todellisen tilanteen. Tehtävän tulee rohkaista toimintaa, ei vain muistamista.",
  reflect:
    "Luo reflektiotehtävä joka ohjaa pohtimaan syvällisesti ajatuksen merkitystä minulle ja kasvattamaan itsetuntemusta, ymmärrystä tai uuden näkökulman syntyä. Miksi se on tärkeä ja mitä voin siitä oppia. Tehtävä voi olla avoin, mutta sen tulisi olla selkeä.",
  discuss:
    "Luo keskustelutehtävä, joka ohjaa sosiaaliseen oppimiseen. joka kannustaa minua löytämään ystävän, kollegan, mentorin tai asiantuntijan, jonka kanssa hän voisi keskustella aiheesta ja syventää ymmärrystä keskustelun kautta. Muotoile tehtävä konkreettiseksi ja helposti toteutettavaksi. Anna myös esimerkkikeskustelun avaus tai malliehdotus siitä, miten asian voisi ottaa puheeksi."
} as const;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  responseLanguage: "Finnish",
  showDebug: false,
  showBetaFeatures: false,
  analysisPromptRefresh: "",
  analysisPromptDeepen: "",
  analysisPromptSummarize: "",
  analysisPromptNetwork: "",
  cardGenerationPrompt: "",
  recallCardGenerationPrompt: "",
  applyCardGenerationPrompt: "",
  reflectCardGenerationPrompt: "",
  discussCardGenerationPrompt: "",
  tagGenerationPrompt: ""
};

function clamp(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function sanitizeUserSettings(input: Partial<UserSettings> | null | undefined): UserSettings {
  return {
    responseLanguage: clamp(input?.responseLanguage || DEFAULT_USER_SETTINGS.responseLanguage, 80) || "Finnish",
    showDebug: Boolean(input?.showDebug),
    showBetaFeatures: Boolean(input?.showBetaFeatures),
    analysisPromptRefresh: clamp(input?.analysisPromptRefresh || "", 1200),
    analysisPromptDeepen: clamp(input?.analysisPromptDeepen || "", 1200),
    analysisPromptSummarize: clamp(input?.analysisPromptSummarize || "", 1200),
    analysisPromptNetwork: clamp(input?.analysisPromptNetwork || "", 1200),
    cardGenerationPrompt: clamp(input?.cardGenerationPrompt || "", 1200),
    recallCardGenerationPrompt: clamp(input?.recallCardGenerationPrompt || "", 1200),
    applyCardGenerationPrompt: clamp(input?.applyCardGenerationPrompt || "", 1200),
    reflectCardGenerationPrompt: clamp(input?.reflectCardGenerationPrompt || "", 1200),
    discussCardGenerationPrompt: clamp(input?.discussCardGenerationPrompt || "", 1200),
    tagGenerationPrompt: clamp(input?.tagGenerationPrompt || "", 1200)
  };
}

export function buildLanguageInstruction(language: string): string {
  const normalized = clamp(language, 80) || DEFAULT_USER_SETTINGS.responseLanguage;
  return `Write all user-facing output in ${normalized}.`;
}
