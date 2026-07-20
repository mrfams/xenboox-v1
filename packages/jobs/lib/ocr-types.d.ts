declare module "pdfjs-dist" {
  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }
  export interface PDFPageProxy {
    getViewport(params: { scale: number }): PDFPageViewport;
    getTextContent(): Promise<{ items: { str: string }[] }>;
    render(params: { canvasContext: unknown; viewport: PDFPageViewport }): {
      promise: Promise<void>;
    };
  }
  export interface PDFPageViewport {
    width: number;
    height: number;
  }
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(params: { data: Uint8Array }): {
    promise: Promise<PDFDocumentProxy>;
  };
}

declare module "tesseract.js" {
  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
    };
  }
  export interface Worker {
    recognize(image: string | Buffer | Uint8Array): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }
  export function createWorker(lang: string): Promise<Worker>;
}

declare module "xlsx" {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  }
  export function read(
    data: Buffer | Uint8Array,
    opts?: { type?: string },
  ): WorkBook;
  export const utils: {
    sheet_to_csv(sheet: unknown): string;
  };
}

declare module "mammoth" {
  export interface ExtractResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(params: {
    buffer: Buffer;
  }): Promise<ExtractResult>;
}
