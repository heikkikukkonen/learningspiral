import type { Provider } from "@supabase/supabase-js";

export const oauthProviderLabels = {
  google: "Google",
  apple: "Apple"
} satisfies Partial<Record<Provider, string>>;

export type EnabledOauthProvider = keyof typeof oauthProviderLabels;

const supportedOauthProviders = Object.keys(oauthProviderLabels) as EnabledOauthProvider[];

function parseEnabledProviders(value: string | undefined) {
  if (!value) return [];

  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((provider): provider is EnabledOauthProvider => {
      return supportedOauthProviders.includes(provider as EnabledOauthProvider);
    })
    .filter((provider, index, providers) => {
      return providers.indexOf(provider) === index;
    });
}

export function getEnabledOauthProviders() {
  return parseEnabledProviders(process.env.NEXT_PUBLIC_ENABLED_OAUTH_PROVIDERS);
}

export function isEnabledOauthProvider(provider: Provider) {
  return (supportedOauthProviders as Provider[]).includes(provider);
}
