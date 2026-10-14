import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = '808dolan5-ux/Pipeline-mt5-48858';
const TAG_PREFIX = 'desktop-v';
const ASSET = 'QuantBot-Setup.exe';

// Public on purpose: the signed-out desktop app asks for its latest build on every start.
// Only ever reads desktop releases of this one repo and hands out a short-lived GitHub download link.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const gh = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'QuantBot-Desktop' };

    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, { headers: gh, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return Response.json({ error: `GitHub returned ${res.status}` }, { status: 502 });
    const release = (await res.json()).find((r) => !r.draft && r.tag_name.startsWith(TAG_PREFIX));
    if (!release) return Response.json({ build: 0 });

    const build = Number(release.tag_name.slice(TAG_PREFIX.length)) || 0;
    const asset = release.assets.find((a) => a.name === ASSET);
    if (body.action !== 'download') {
      return Response.json({ build, size: asset?.size || 0, published_at: release.published_at, page: release.html_url });
    }
    if (!asset) return Response.json({ error: 'Latest release has no installer' }, { status: 404 });

    // GitHub answers with a redirect to a signed link that works without a token for a few minutes
    const redirect = await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`, {
      headers: { ...gh, Accept: 'application/octet-stream' }, redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    const url = redirect.headers.get('location');
    if (!url) return Response.json({ error: `Download link unavailable (${redirect.status})` }, { status: 502 });
    return Response.json({ build, url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}