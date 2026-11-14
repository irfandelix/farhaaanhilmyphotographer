import { NextResponse } from 'next/server';

const FOLDER_ID_REGEX = /^[a-zA-Z0-9_-]{10,128}$/;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get('folderId');

  if (!folderId) {
    return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
  }

  if (!FOLDER_ID_REGEX.test(folderId)) {
    return NextResponse.json({ error: 'Invalid Folder ID format' }, { status: 400 });
  }

  const apiKey = process.env.GDRIVE_API_KEY || process.env.NEXT_PUBLIC_GDRIVE_API_KEY || '';
  if (!apiKey) {
    return NextResponse.json({ error: 'API Key not configured' }, { status: 500 });
  }

  try {
    const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
    const baseUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=nextPageToken,files(id,name,thumbnailLink,createdTime,size,imageMediaMetadata)&pageSize=1000&key=${apiKey}`;

    let allFiles = [];
    let pageToken = null;

    do {
      const currentUrl = pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
      const response = await fetch(currentUrl);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (data.files && data.files.length > 0) {
        allFiles = allFiles.concat(data.files);
      }

      pageToken = data.nextPageToken;
    } while (pageToken);

    return NextResponse.json({ files: allFiles });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
