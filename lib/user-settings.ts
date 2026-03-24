export interface UserSettings {
  responseLanguage: string;
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
  "Luo 3-6 selkeaa tunnistetta, jotka kuvaavat ajatuksen ydinta selkeasti. Jos ajatus sisaltaa erisnimia tai esimerkiksi kirjan nimia tai tiettyja avainkasitteita, luo niista tunnisteet.";

export const DEFAULT_ANALYSIS_PROMPTS = {
  clarify: [
    "Muodosta selkea ja helposti ymmarrettava yhteenveto annetuista tiedoista.",
    "",
    "Tavoite:",
    "- kirkasta ajattelua ja poista epaselvyydet",
    "- jasenna sisalto loogiseksi kokonaisuudeksi",
    "- tuo esiin keskeinen viesti ja tarkeimmat oivallukset",
    "",
    "Muoto:",
    "- 1-2 kappaletta",
    "- selkea ja sujuva kieli",
    "- ei listoja, vaan yhtenainen teksti"
  ].join("\n"),
  deepen: [
    "Syvenna ajatusta tuomalla mukaan uusia nakokulmia, kysymyksia ja mahdollisia laajennuksia.",
    "",
    "Tavoite:",
    "- lisaa uusia nakokulmia tai tulkintoja",
    "- nosta esiin viittauksia yleisiin ilmioihin, tutkimuksiin, kirjoihin tai kaytannon esimerkkeihin",
    "- esita kiinnostavia jatkokysymyksia",
    "- tuo mukaan mahdollisia esimerkkeja, vertauksia tai sovelluksia",
    "- auta nakemaan aihe laajemmin",
    "- haasta tarvittaessa ajatusta",
    "",
    "Muoto:",
    "- 2-4 kappaletta",
    "- voi sisaltaa yksittaisia kysymyksia tekstin seassa",
    "- tuo tietoa ulkopuolisista lahteista"
  ].join("\n"),
  condense: [
    "Tiivista ajatuksen ydin mahdollisimman selkeasti ja ytimekkaasti.",
    "",
    "Tavoite:",
    "- tunnista tarkein ajatus",
    "- kiteyta se mahdollisimman selkeasti",
    "- sailyta merkitys mutta poista kaikki ylimaarainen",
    "",
    "Muoto:",
    "- enintaan 2 lausetta",
    "- yksinkertainen ja selkea kieli",
    "- helposti muistettava muotoilu"
  ].join("\n"),
  network: [
    "Tunnista ajatuksen pohjalta, millaisten ihmisten kanssa aiheesta kannattaisi keskustella ymmarryksen syventamiseksi.",
    "",
    "Tavoite:",
    "- ehdota 2-5 sellaista ihmistyyppia, roolia tai asiantuntijaprofiilia tai tunnettua asiantuntijaa, joiden kanssa tasta aiheesta kannattaisi keskustella",
    "- kerro lyhyesti, mita lisaarvoa kukin voisi tuoda ajatteluun",
    "- pida ehdotukset kaytannollisina ja helposti lahestyttavina",
    "",
    "Muoto:",
    "- lyhyt johdanto",
    "- sen jalkeen selkea lista ihmisista tai rooleista",
    "- jokaisesta 1 lause"
  ].join("\n")
} as const;

export const DEFAULT_TASK_GENERATION_PROMPTS = {
  recall:
    "Luo muistamista vahvistava kertaustehtava, joka on mahdollisimman konkreettinen ja sellainen etta se testaa ajatuksen oleellisten osien muistamista ja jos kyseessa on sitaattimainen muotoilu jollekin ajatukselle, kysy muistatko sitaattia tai sen tekijaa",
  apply:
    "Luo soveltamistehtava joka ohjaa keksimaan keinon, miten voisin soveltaa ajatusta kaytannossa. Muotoile tehtava niin, etta kayttaja kuvittelee tai tunnistaa todellisen tilanteen. Tehtavan tulee rohkaista toimintaa, ei vain muistamista.",
  reflect:
    "Luo reflektiotehtava joka ohjaa pohtimaan syvallisesti ajatuksen merkitysta minulle ja kasvattamaan itsetuntemusta, ymmarrysta tai uuden nakokulman syntya. Miksi se on tarkea ja mita voin siita oppia. Tehtava voi olla avoin, mutta sen tulisi olla selkea.",
  discuss:
    "Luo keskustelutehtava, joka ohjaa sosiaaliseen oppimiseen. joka kannustaa minua loytamaan ystavan, kollegan, mentorin tai asiantuntijan, jonka kanssa han voisi keskustella aiheesta ja syventaa ymmarrysta keskustelun kautta. Muotoile tehtava konkreettiseksi ja helposti toteutettavaksi. Anna myos esimerkkikeskustelun avaus tai malliehdotus siita, miten asian voisi ottaa puheeksi."
} as const;

export const DEFAULT_USER_SETTINGS: UserSettings = {
  responseLanguage: "Finnish",
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
