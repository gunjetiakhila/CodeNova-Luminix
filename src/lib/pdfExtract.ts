import type { DocFileType } from '@/types';

function getFileType(name: string): DocFileType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.txt')) return 'txt';
  return null;
}

export function extractTextFromTxt(file: File): Promise<string> {
  return file.text();
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const pdfjsLib = pdfjs as unknown as {
    getDocument: (args: { data: ArrayBuffer }) => {
      promise: Promise<{
        numPages: number;
        getPage: (n: number) => Promise<{
          getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
        }>;
      }>;
    };
    GlobalWorkerOptions: { workerSrc: string };
  };

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).href;

  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => item.str ?? '')
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

export async function extractText(file: File): Promise<string> {
  const type = getFileType(file.name);
  if (type === 'pdf') return extractTextFromPdf(file);
  if (type === 'txt') return extractTextFromTxt(file);
  throw new Error('Unsupported file type');
}

export { getFileType };
