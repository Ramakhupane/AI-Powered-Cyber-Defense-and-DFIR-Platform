/**
 * API Configuration for CyberDefend Platform
 *
 * 🔑 To use real threat intelligence APIs:
 * 1. Get API keys from each service (links below)
 * 2. Set them below or better: inject them via environment at build time
 *
 * VirusTotal: https://www.virustotal.com/gui/my-apikey
 * AbuseIPDB:  https://www.abuseipdb.com/account/api
 * Shodan:     https://account.shodan.io/
 *
 * The app will try real APIs first. If a key is missing or the API fails,
 * it gracefully falls back to the smart mock engine — zero UX breakage.
 */

export interface ApiKeys {
  virustotal: string;
  abuseipdb: string;
  shodan: string;
}

function getKeys(): ApiKeys {
  // Attempt to read from env vars first (Vite exposes VITE_* variables)
  const envKeys: Partial<ApiKeys> = {
    virustotal: import.meta.env.VITE_VIRUSTOTAL_API_KEY as string | undefined,
    abuseipdb: import.meta.env.VITE_ABUSEIPDB_API_KEY as string | undefined,
    shodan: import.meta.env.VITE_SHODAN_API_KEY as string | undefined,
  };

  // If any env key is present, use env (even partial)
  if (envKeys.virustotal || envKeys.abuseipdb || envKeys.shodan) {
    return {
      virustotal: envKeys.virustotal || '',
      abuseipdb: envKeys.abuseipdb || '',
      shodan: envKeys.shodan || '',
    };
  }

  // Fall back to hardcoded values (paste your keys here if not using .env)
  return {
    virustotal: '',
    abuseipdb: '',
    shodan: '',
  };
}

export const API_KEYS = getKeys();

/** Check if at least one real API is configured */
export function hasAnyApiKey(): boolean {
  return Boolean(API_KEYS.virustotal || API_KEYS.abuseipdb || API_KEYS.shodan);
}

/** List which APIs are available */
export function getAvailableApis(): string[] {
  const available: string[] = [];
  if (API_KEYS.virustotal) available.push('VirusTotal');
  if (API_KEYS.abuseipdb) available.push('AbuseIPDB');
  if (API_KEYS.shodan) available.push('Shodan');
  return available;
}