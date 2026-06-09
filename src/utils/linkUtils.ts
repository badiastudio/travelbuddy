import * as Linking from 'expo-linking';

export function buildInviteLink(inviteToken: string): string {
  return Linking.createURL('join', { queryParams: { token: inviteToken } });
}

export function parseInviteToken(url: string): string | null {
  const parsed = Linking.parse(url);
  return (parsed.queryParams?.token as string) ?? null;
}
