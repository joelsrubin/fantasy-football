export const HIDDEN_YAHOO_GUID = "--hidden--";

export function isUsableYahooGuid(guid: string | null | undefined): boolean {
  if (!guid) return false;
  return guid.trim() !== "" && guid.trim() !== HIDDEN_YAHOO_GUID;
}

export function syntheticManagerGuid(teamKey: string): string {
  return `hidden:${teamKey}`;
}

export function resolveManagerGuid(input: {
  yahooGuid?: string | null;
  nickname?: string | null;
  teamKey: string;
  existingGuidByNickname?: Map<string, string>;
}): string {
  if (isUsableYahooGuid(input.yahooGuid)) {
    return input.yahooGuid!.trim();
  }

  const nickname = input.nickname?.trim();
  if (nickname && input.existingGuidByNickname) {
    const existing = input.existingGuidByNickname.get(nickname);
    if (isUsableYahooGuid(existing)) {
      return existing!.trim();
    }
  }

  return syntheticManagerGuid(input.teamKey);
}
