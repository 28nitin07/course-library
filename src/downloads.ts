/** Resolve blocked/quota-exhausted LFS downloads to an identical release asset. */
export async function downloadDestination(primary: string, backup: string, request: typeof fetch = fetch): Promise<string> {
  try {
    const response = await request(primary, { method: 'HEAD', signal: AbortSignal.timeout(8000), cache: 'no-store' });
    return response.ok ? primary : backup;
  } catch {
    return backup;
  }
}
