export function extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/');
      const filename = parts[parts.length - 1]; // e.g. abc123.jpg
      const publicId = filename.split('.')[0];  // remove extension
  
      // Optional: include folder path if needed
      const folderIndex = parts.findIndex(part => part === 'upload');
      const folderPath = parts.slice(folderIndex + 1, parts.length - 1).join('/'); // e.g. productImages/abc123
  
      return folderPath ? `${folderPath}/${publicId}` : publicId;
    } catch {
      return null;
    }
  }
  