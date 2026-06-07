import QRCode from 'qrcode';

export function buildTableMenuUrl(slug: string, publicToken: string): string {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedToken = publicToken.trim();
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost:4200';

  return `${origin}/r/${normalizedSlug}/menu?table=${encodeURIComponent(normalizedToken)}`;
}

export async function generateTableQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
  });
}

export function downloadSvgFile(svg: string, fileName: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
