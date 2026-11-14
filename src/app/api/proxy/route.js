import { NextResponse } from 'next/server';

const ALLOWED_EXACT_HOSTS = new Set([
  'drive.google.com',
  'drive.usercontent.google.com',
  'docs.google.com',
]);

function isAllowedGoogleDriveUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password || parsed.port) return false;

    const host = parsed.hostname.toLowerCase();
    if (ALLOWED_EXACT_HOSTS.has(host)) return true;
    if (host.endsWith('.googleusercontent.com') && host.length > '.googleusercontent.com'.length) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  if (!isAllowedGoogleDriveUrl(targetUrl)) {
    return NextResponse.json({ error: 'URL domain not allowed' }, { status: 403 });
  }

  try {
    const response = await fetch(targetUrl);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 415 });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
