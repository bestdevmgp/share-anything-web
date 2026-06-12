import * as CFB from 'cfb';
import pako from 'pako';

const HWPTAG_BEGIN = 16;
const HWPTAG_PARA_TEXT = HWPTAG_BEGIN + 51;

function toUint8Array(blob: CFB.CFB$Blob): Uint8Array {
  if (blob instanceof Uint8Array) return blob;
  return new Uint8Array(blob);
}

function readRecordHeader(data: Uint8Array, offset: number) {
  const dv = new DataView(data.buffer, data.byteOffset + offset, 4);
  const header = dv.getUint32(0, true);
  return {
    tagId: header & 0x3FF,
    level: (header >> 10) & 0x3FF,
    size: (header >> 20) & 0xFFF,
  };
}

function extractTextFromRecord(data: Uint8Array): string {
  const chars: string[] = [];
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);

  for (let i = 0; i < data.byteLength; i += 2) {
    const code = dv.getUint16(i, true);

    if (code >= 1 && code <= 9) {
      i += 14;
    } else if (code === 10) {
      chars.push('\n');
    } else if (code === 13) {
    } else if (code === 24) {
      chars.push('-');
    } else if (code === 30 || code === 31) {
      chars.push(' ');
    } else if (code >= 32) {
      if (code >= 0xD800 && code <= 0xDBFF && i + 2 < data.byteLength) {
        const low = dv.getUint16(i + 2, true);
        if (low >= 0xDC00 && low <= 0xDFFF) {
          chars.push(String.fromCharCode(code, low));
          i += 2;
          continue;
        }
      }
      chars.push(String.fromCharCode(code));
    }
  }

  return chars.join('');
}

function parseRecords(data: Uint8Array): Array<{ tagId: number; content: Uint8Array }> {
  const records: Array<{ tagId: number; content: Uint8Array }> = [];
  let offset = 0;

  while (offset + 4 <= data.byteLength) {
    const hdr = readRecordHeader(data, offset);
    offset += 4;

    let recordSize = hdr.size;
    if (hdr.size === 0xFFF) {
      if (offset + 4 > data.byteLength) break;
      const dv = new DataView(data.buffer, data.byteOffset + offset, 4);
      recordSize = dv.getUint32(0, true);
      offset += 4;
    }

    if (offset + recordSize > data.byteLength) break;

    records.push({
      tagId: hdr.tagId,
      content: data.subarray(offset, offset + recordSize),
    });

    offset += recordSize;
  }

  return records;
}

export function parseHwpToText(data: Uint8Array): string {
  const container = CFB.read(data, { type: 'array' });

  const headerEntry = CFB.find(container, '/FileHeader');
  if (!headerEntry) return '';
  const headerContent = toUint8Array(headerEntry.content);

  let properties = 0;
  if (headerContent.length >= 40) {
    const dv = new DataView(headerContent.buffer, headerContent.byteOffset + 36, 4);
    properties = dv.getUint32(0, true);
  }
  const isCompressed = (properties & 0x01) !== 0;
  const isEncrypted = (properties & 0x02) !== 0;

  if (isEncrypted) return '암호화된 HWP 파일은 미리보기를 지원하지 않아요.';

  const paragraphs: string[] = [];

  for (let si = 0; ; si++) {
    const sectionEntry = CFB.find(container, `/BodyText/Section${si}`);
    if (!sectionEntry) break;

    let sectionData: Uint8Array;
    const raw = toUint8Array(sectionEntry.content);

    if (isCompressed) {
      try {
        sectionData = pako.inflateRaw(raw);
      } catch {
        sectionData = raw;
      }
    } else {
      sectionData = raw;
    }

    const records = parseRecords(sectionData);
    for (const rec of records) {
      if (rec.tagId === HWPTAG_PARA_TEXT) {
        const text = extractTextFromRecord(rec.content);
        if (text.trim()) paragraphs.push(text);
      }
    }
  }

  return paragraphs.join('\n');
}
