/// <reference lib="dom" />
declare const piexif: any;

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error("Failed to read file as base64."));
      }
    };
    reader.onerror = error => reject(error);
  });
};

export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Could not parse mime type from data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

/**
 * Extracts the file extension from a data URL based on its MIME type.
 * @param dataUrl - Data URL string (e.g., "data:image/png;base64,...")
 * @returns File extension ('png', 'jpg', 'webp', etc.)
 */
export const getExtensionFromDataUrl = (dataUrl: string): string => {
    const mimeMatch = dataUrl.match(/data:image\/(.*?);/);
    if (!mimeMatch) return 'jpg'; // Default fallback

    const format = mimeMatch[1].toLowerCase();
    // Handle common formats
    if (format === 'jpeg') return 'jpg';
    if (format === 'png') return 'png';
    if (format === 'webp') return 'webp';
    if (format === 'gif') return 'gif';

    return 'jpg'; // Default fallback
};

/**
 * Sanitizes a filename by removing only filesystem-reserved characters while preserving Unicode.
 *
 * **Unicode-Friendly**: Preserves non-Latin characters (Arabic, Chinese, Cyrillic, etc.)
 *
 * **Keeps**: All Unicode letters/numbers, hyphens, underscores, dots
 *
 * **Removes**: < > : " / \ | ? * and control characters (ASCII 0-31)
 *
 * @param name - The filename to sanitize
 * @returns Sanitized filename safe for all major operating systems
 */
export const sanitizeFilename = (name: string): string => {
    // Replace whitespace with hyphens
    let sanitized = name.replace(/\s+/g, '-');

    // Remove only truly problematic filename characters (filesystem reserved characters)
    // This regex removes: < > : " / \ | ? * and control characters (0x00-0x1F)
    // Everything else (including all Unicode) is preserved
    sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');

    // Trim and remove leading/trailing dots (security risk on some systems)
    sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

    // If sanitized name is empty after cleaning, use fallback
    if (!sanitized) {
        sanitized = 'untitled';
    }

    return sanitized;
};

export const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generateSetId = () => Math.random().toString(36).substring(2, 9).toUpperCase();
export const generateShortId = () => Math.random().toString(36).substring(2, 7);

export const getTimestamp = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

/**
 * Embeds a prompt into a JPEG image's EXIF metadata with proper Unicode support.
 *
 * **Unicode-Safe**: Handles emojis, non-Latin characters, and all UTF-8 text.
 *
 * @param imageDataUrl The data URL of the JPEG image.
 * @param prompt The text prompt to embed (supports Unicode).
 * @returns A new data URL of the image with embedded metadata.
 */
export const embedPromptInJpeg = (imageDataUrl: string, prompt: string): string => {
    const zeroth = {};
    const exif = {};
    const gps = {};

    // EXIF UserComment requires proper encoding for Unicode support
    // Format: [Character Code (8 bytes)] + [Actual String]
    // Using "UNICODE\0" prefix for UTF-16 encoding (EXIF spec)

    try {
        // Encode the prompt as UTF-8 bytes
        const encoder = new TextEncoder();
        const promptBytes = encoder.encode(prompt);

        // Create the character code prefix for UTF-8 (using undefined char code)
        // EXIF spec: undefined char code is 8 null bytes, but piexif handles "UNICODE\0" better
        const charCode = new Uint8Array([0x55, 0x4E, 0x49, 0x43, 0x4F, 0x44, 0x45, 0x00]); // "UNICODE\0"

        // Combine character code + prompt bytes
        const userCommentBytes = new Uint8Array(charCode.length + promptBytes.length);
        userCommentBytes.set(charCode, 0);
        userCommentBytes.set(promptBytes, charCode.length);

        // Convert to string that piexif can handle (Latin1 byte representation)
        let userCommentStr = '';
        for (let i = 0; i < userCommentBytes.length; i++) {
            userCommentStr += String.fromCharCode(userCommentBytes[i]);
        }

        exif[piexif.ExifIFD.UserComment] = userCommentStr;
        const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
        const exifbytes = piexif.dump(exifObj);
        return piexif.insert(exifbytes, imageDataUrl);
    } catch (error) {
        // Fallback: if embedding fails, return original image
        console.warn('Failed to embed prompt in JPEG EXIF:', error);
        return imageDataUrl;
    }
};

// Standard CRC32 implementation for PNG chunk checksums.
const crc32Table = (() => {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
    }
    return table;
})();

const crc32 = (buf: Uint8Array): number => {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ -1) >>> 0;
};

/**
 * Embeds a prompt into a PNG image's metadata by adding an iTXt chunk.
 *
 * **Unicode-Safe**: Uses PNG iTXt chunk for full UTF-8 support (emojis, all languages).
 *
 * @param imageBlob The blob of the original PNG image.
 * @param prompt The text prompt to embed (supports Unicode).
 * @returns A promise that resolves to a new Blob of the PNG with embedded metadata.
 */
export const embedPromptInPng = async (imageBlob: Blob, prompt: string): Promise<Blob> => {
    try {
        const keyword = "Description"; // This key is often read by OS file properties
        const textEncoder = new TextEncoder();
        const keywordBytes = textEncoder.encode(keyword);
        const promptBytes = textEncoder.encode(prompt);

        // iTXt chunk format (for Unicode support):
        // Keyword: 1-79 bytes (Latin-1)
        // Null separator: 1 byte
        // Compression flag: 1 byte (0 = uncompressed)
        // Compression method: 1 byte (0)
        // Language tag: 0-79 bytes (empty for default)
        // Null separator: 1 byte
        // Translated keyword: 0+ bytes (empty for default)
        // Null separator: 1 byte
        // Text: 0+ bytes (UTF-8)

        const compressionFlag = 0;
        const compressionMethod = 0;
        const languageTag = new Uint8Array(0); // Empty = default language
        const translatedKeyword = new Uint8Array(0); // Empty = no translation

        // Calculate total chunk data size
        const chunkDataLength =
            keywordBytes.length + 1 + // keyword + null
            1 + 1 + // compression flag + method
            languageTag.length + 1 + // language tag + null
            translatedKeyword.length + 1 + // translated keyword + null
            promptBytes.length; // text

        // Create iTXt chunk data
        const chunkDataBytes = new Uint8Array(chunkDataLength);
        let offset = 0;

        chunkDataBytes.set(keywordBytes, offset);
        offset += keywordBytes.length;
        chunkDataBytes[offset++] = 0; // null separator

        chunkDataBytes[offset++] = compressionFlag;
        chunkDataBytes[offset++] = compressionMethod;

        chunkDataBytes.set(languageTag, offset);
        offset += languageTag.length;
        chunkDataBytes[offset++] = 0; // null separator

        chunkDataBytes.set(translatedKeyword, offset);
        offset += translatedKeyword.length;
        chunkDataBytes[offset++] = 0; // null separator

        chunkDataBytes.set(promptBytes, offset);

        // Create the full chunk structure
        const chunkTypeBytes = new Uint8Array([105, 84, 88, 116]); // "iTXt" (was "tEXt")
        const dataAndTypeBytes = new Uint8Array(chunkTypeBytes.length + chunkDataBytes.length);
        dataAndTypeBytes.set(chunkTypeBytes, 0);
        dataAndTypeBytes.set(chunkDataBytes, chunkTypeBytes.length);

        const crc = crc32(dataAndTypeBytes);
        const crcBytes = new Uint8Array(4);
        new DataView(crcBytes.buffer).setUint32(0, crc, false);

        const lengthBytes = new Uint8Array(4);
        new DataView(lengthBytes.buffer).setUint32(0, chunkDataBytes.length, false);

        const chunk = new Uint8Array(lengthBytes.length + dataAndTypeBytes.length + crcBytes.length);
        chunk.set(lengthBytes, 0);
        chunk.set(dataAndTypeBytes, lengthBytes.length);
        chunk.set(crcBytes, lengthBytes.length + dataAndTypeBytes.length);

        // Insert chunk before the IEND chunk of the PNG
        const imageBuffer = await imageBlob.arrayBuffer();
        const originalBytes = new Uint8Array(imageBuffer);
        const iendPosition = originalBytes.length - 12; // IEND chunk is always last 12 bytes

        const newPngBytes = new Uint8Array(originalBytes.length + chunk.length);
        newPngBytes.set(originalBytes.slice(0, iendPosition), 0);
        newPngBytes.set(chunk, iendPosition);
        newPngBytes.set(originalBytes.slice(iendPosition), iendPosition + chunk.length);

        return new Blob([newPngBytes], { type: 'image/png' });
    } catch (error) {
        // Fallback: if embedding fails, return original image
        console.warn('Failed to embed prompt in PNG iTXt:', error);
        return imageBlob;
    }
};
