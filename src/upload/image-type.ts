export type ReceiptImageType = 'image/jpeg' | 'image/png' | 'image/webp';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function detectReceiptImage(bytes: Buffer): ReceiptImageType | null {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1) {
    return null;
  }
  if (isPng(bytes)) {
    return 'image/png';
  }
  if (isJpeg(bytes)) {
    return 'image/jpeg';
  }
  if (isWebp(bytes)) {
    return 'image/webp';
  }
  return null;
}

function isPng(bytes: Buffer): boolean {
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return false;
  }
  let offset = 8;
  let first = true;
  let sawEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (length > bytes.length || offset + 12 + length > bytes.length) {
      return false;
    }
    const dataStart = offset + 8;
    const crcStart = dataStart + length;
    const actual = bytes.readUInt32BE(crcStart);
    if (crc32(bytes.subarray(offset + 4, crcStart)) !== actual) {
      return false;
    }
    if (first) {
      if (type !== 'IHDR' || !validPngHeader(bytes, dataStart, length)) {
        return false;
      }
      first = false;
    }
    if (type === 'IEND') {
      if (length !== 0) {
        return false;
      }
      sawEnd = true;
      offset = crcStart + 4;
      break;
    }
    offset = crcStart + 4;
  }
  return sawEnd && offset === bytes.length;
}

function validPngHeader(
  bytes: Buffer,
  dataStart: number,
  length: number,
): boolean {
  if (length !== 13 || dataStart + 13 > bytes.length) {
    return false;
  }
  const width = bytes.readUInt32BE(dataStart);
  const height = bytes.readUInt32BE(dataStart + 4);
  const bitDepth = bytes[dataStart + 8];
  const colorType = bytes[dataStart + 9];
  const compression = bytes[dataStart + 10];
  const filter = bytes[dataStart + 11];
  const interlace = bytes[dataStart + 12];
  if (
    width < 1 ||
    height < 1 ||
    bitDepth === undefined ||
    colorType === undefined ||
    compression !== 0 ||
    filter !== 0 ||
    (interlace !== 0 && interlace !== 1)
  ) {
    return false;
  }
  return pngCombination(colorType, bitDepth);
}

function pngCombination(colorType: number, bitDepth: number): boolean {
  if (colorType === 0) {
    return (
      bitDepth === 1 ||
      bitDepth === 2 ||
      bitDepth === 4 ||
      bitDepth === 8 ||
      bitDepth === 16
    );
  }
  if (colorType === 2 || colorType === 4 || colorType === 6) {
    return bitDepth === 8 || bitDepth === 16;
  }
  if (colorType === 3) {
    return bitDepth === 1 || bitDepth === 2 || bitDepth === 4 || bitDepth === 8;
  }
  return false;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = (crc & 1) === 1 ? 0xedb88320 : 0;
      crc = (crc >>> 1) ^ mask;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isJpeg(bytes: Buffer): boolean {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  ) {
    return false;
  }
  let offset = 2;
  let sawFrame = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return false;
    }
    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= bytes.length) {
      return false;
    }
    const marker = bytes[offset];
    if (marker === undefined) {
      return false;
    }
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) {
      return false;
    }
    if (marker === 0xda) {
      if (!sawFrame || offset + 2 > bytes.length) {
        return false;
      }
      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) {
        return false;
      }
      return jpegEndsAtEoi(bytes, offset + segmentLength);
    }
    if (
      marker === 0x00 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      return false;
    }
    if (offset + 2 > bytes.length) {
      return false;
    }
    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return false;
    }
    if (isStartOfFrame(marker) && !validFrame(bytes, offset, segmentLength)) {
      return false;
    }
    if (isStartOfFrame(marker)) {
      sawFrame = true;
    }
    offset += segmentLength;
  }
  return false;
}

function isStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function validFrame(
  bytes: Buffer,
  lengthOffset: number,
  segmentLength: number,
): boolean {
  if (segmentLength < 8 || lengthOffset + segmentLength > bytes.length) {
    return false;
  }
  const precision = bytes[lengthOffset + 2];
  const height = bytes.readUInt16BE(lengthOffset + 3);
  const width = bytes.readUInt16BE(lengthOffset + 5);
  const components = bytes[lengthOffset + 7];
  if (
    (precision !== 8 && precision !== 12) ||
    height < 1 ||
    width < 1 ||
    components === undefined ||
    components < 1 ||
    components > 4
  ) {
    return false;
  }
  return segmentLength === 8 + components * 3;
}

function jpegEndsAtEoi(bytes: Buffer, start: number): boolean {
  for (let index = start; index < bytes.length - 1; index += 1) {
    if (bytes[index] !== 0xff) {
      continue;
    }
    const next = bytes[index + 1];
    if (next === 0x00 || (next !== undefined && next >= 0xd0 && next <= 0xd7)) {
      index += 1;
      continue;
    }
    if (next === 0xff) {
      continue;
    }
    if (next === 0xd9) {
      return index + 2 === bytes.length;
    }
    return false;
  }
  return false;
}

function isWebp(bytes: Buffer): boolean {
  if (
    bytes.length < 20 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP' ||
    bytes.readUInt32LE(4) !== bytes.length - 8
  ) {
    return false;
  }
  let offset = 12;
  let first = true;
  let sawPayload = false;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) {
      return false;
    }
    const fourcc = bytes.toString('ascii', offset, offset + 4);
    const chunkSize = bytes.readUInt32LE(offset + 4);
    if (!/^[A-Za-z0-9 ]{4}$/.test(fourcc)) {
      return false;
    }
    const paddedEnd = offset + 8 + chunkSize + (chunkSize % 2);
    if (paddedEnd > bytes.length) {
      return false;
    }
    const chunk = bytes.subarray(offset + 8, offset + 8 + chunkSize);
    if (first) {
      if (fourcc !== 'VP8 ' && fourcc !== 'VP8L' && fourcc !== 'VP8X') {
        return false;
      }
      first = false;
    }
    if (fourcc === 'VP8 ' && !validVp8(chunk)) {
      return false;
    }
    if (fourcc === 'VP8L' && !validVp8l(chunk)) {
      return false;
    }
    if (fourcc === 'VP8X' && chunkSize < 10) {
      return false;
    }
    if (fourcc === 'VP8 ' || fourcc === 'VP8L') {
      sawPayload = true;
    }
    offset = paddedEnd;
  }
  return sawPayload && offset === bytes.length;
}

function validVp8(chunk: Buffer): boolean {
  if (chunk.length < 10) {
    return false;
  }
  const frameTag = chunk[0];
  if (frameTag === undefined || (frameTag & 1) !== 0) {
    return false;
  }
  if (chunk[3] !== 0x9d || chunk[4] !== 0x01 || chunk[5] !== 0x2a) {
    return false;
  }
  const width = chunk.readUInt16LE(6) & 0x3fff;
  const height = chunk.readUInt16LE(8) & 0x3fff;
  return width > 0 && height > 0;
}

function validVp8l(chunk: Buffer): boolean {
  if (chunk.length < 6 || chunk[0] !== 0x2f) {
    return false;
  }
  const bits = chunk.readUInt32LE(1);
  const version = bits >>> 29;
  return version === 0;
}
