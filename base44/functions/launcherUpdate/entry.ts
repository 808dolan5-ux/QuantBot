import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const REPO = '808dolan5-ux/Pipeline-mt5-48858';
const TAG_PREFIX = 'launcher-v';
const ASSET = 'QuantBot.exe';

// Public on purpose: the signed-out desktop launcher asks for its latest build and downloads it.
// Only ever reads launcher releases of this one repo.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');
    const gh = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'QuantBot-Launcher' };

    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, { headers: gh, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return Response.json({ error: `GitHub returned ${res.status}` }, { status: 502 });
    const release = (await res.json()).find((r) => !r.draft && r.tag_name.startsWith(TAG_PREFIX));
    if (!release) return Response.json({ build: 0 });

    const build = Number(release.tag_name.slice(TAG_PREFIX.length)) || 0;
    const asset = release.assets.find((a) => a.name === ASSET);
    if (body.action !== 'download') {
      return Response.json({ build, size: asset?.size || 0, published_at: release.published_at, page: release.html_url });
    }
    if (!asset) return Response.json({ error: 'Latest launcher release has no exe' }, { status: 404 });

    const redirect = await fetch(`https://api.github.com/repos/${REPO}/releases/assets/${asset.id}`, {
      headers: { ...gh, Accept: 'application/octet-stream' }, redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    const location = redirect.headers.get('location');
    const file = location ? await fetch(location, { signal: AbortSignal.timeout(180000) }) : redirect;
    if (!file.ok) return Response.json({ error: `Download failed (${file.status})` }, { status: 502 });

    return new Response(file.body, {
      headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename=${ASSET}`, 'X-Launcher-Build': String(build) },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}