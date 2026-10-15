declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export function extractRawText(options: { arrayBuffer: ArrayBuffer } | { buffer: Buffer }): Promise<MammothResult>;
  export function convertToHtml(options: { arrayBuffer: ArrayBuffer } | { buffer: Buffer }): Promise<MammothResult>;
}
