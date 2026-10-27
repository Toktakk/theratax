import { detectReceiptImage } from './image-type.js';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A+L6KKK/lM/38P//Z';

const WEBP_HEX =
  '52494646240000005745425056503820180000003001009d012a0100010003003425a400037000fefb940000';

describe('receipt image bytes', () => {
  it('accepts a PNG, a JPEG, and a WebP', () => {
    expect(detectReceiptImage(Buffer.from(PNG_BASE64, 'base64'))).toBe(
      'image/png',
    );
    expect(detectReceiptImage(Buffer.from(JPEG_BASE64, 'base64'))).toBe(
      'image/jpeg',
    );
    expect(detectReceiptImage(Buffer.from(WEBP_HEX, 'hex'))).toBe('image/webp');
    expect(detectReceiptImage(losslessWebp())).toBe('image/webp');
  });

  it('rejects text, GIF, HEIC, a truncated JPEG, and a damaged PNG', () => {
    expect(detectReceiptImage(Buffer.from('notes'))).toBeNull();
    expect(detectReceiptImage(Buffer.from('GIF89a'))).toBeNull();
    expect(
      detectReceiptImage(
        Buffer.from('00000018667479706865696300000000', 'hex'),
      ),
    ).toBeNull();

    const jpeg = Buffer.from(JPEG_BASE64, 'base64');
    expect(detectReceiptImage(jpeg.subarray(0, 32))).toBeNull();
    expect(
      detectReceiptImage(Buffer.from([0xff, 0xd8, 0xff, 0xd9])),
    ).toBeNull();

    const png = Buffer.from(PNG_BASE64, 'base64');
    const damaged = Buffer.from(png);
    damaged[40] = (damaged[40] ?? 0) ^ 0xff;
    expect(detectReceiptImage(damaged)).toBeNull();

    const webp = Buffer.from(WEBP_HEX, 'hex');
    webp.writeUInt32LE(1, 4);
    expect(detectReceiptImage(webp)).toBeNull();
  });
});

function losslessWebp(): Buffer {
  const data = Buffer.from([0x2f, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00]);
  const payload = 4 + 8 + data.length + (data.length % 2);
  const file = Buffer.alloc(8 + payload);
  file.write('RIFF', 0, 'ascii');
  file.writeUInt32LE(payload, 4);
  file.write('WEBP', 8, 'ascii');
  file.write('VP8L', 12, 'ascii');
  file.writeUInt32LE(data.length, 16);
  data.copy(file, 20);
  return file;
}
