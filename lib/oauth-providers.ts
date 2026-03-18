import type { Provider } from "@supabase/supabase-js";

export const oauthProviderLabels = {
  google: "Google",
  apple: "Apple"
} satisfies Partial<Record<Provider, string>>;

const supportedOauthProviders = Object.keys(oauthProviderLabels) as Provider[];

function parseEnabledProviders(value: string | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase() as Provider)
    .filter((provider, index, providers) => {
      return supportedOauthProviders.includes(provider) && providers.indexOf(provider) === index;
    });
}

export function getEnabledOauthProviders() {
  return parseEnabledProviders(process.env.NEXT_PUBLIC_ENABLED_OAUTH_PROVIDERS);
}

export function isEnabledOauthProvider(provider: Provider) {
  return getEnabledOauthProviders().includes(provider);
}
