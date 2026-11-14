export function extractFolderId(url) {
  try {
    const regex = /[-\w]{25,}/;
    const match = url.match(regex);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}
