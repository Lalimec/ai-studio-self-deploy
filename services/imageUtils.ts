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

export const sanitizeFilename = (name: string): string => {
    return name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-._]/g, '');
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
 * Embeds a prompt into a JPEG image's EXIF metadata.
 * @param imageDataUrl The data URL of the JPEG image.
 * @param prompt The text prompt to embed.
 * @returns A new data URL of the image with embedded metadata.
 */
export const embedPromptInJpeg = (imageDataUrl: string, prompt: string): string => {
    const zeroth = {};
    const exif = {};
    const gps = {};
    // Embed prompt in the UserComment tag. The prefix is required by the EXIF standard.
    exif[piexif.ExifIFD.UserComment] = "ASCII\0\0\0" + prompt;
    const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
    const exifbytes = piexif.dump(exifObj);
    return piexif.insert(exifbytes, imageDataUrl);
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
 * Embeds a prompt into a PNG image's metadata by adding a tEXt chunk.
 * @param imageBlob The blob of the original PNG image.
 * @param prompt The text prompt to embed.
 * @returns A promise that resolves to a new Blob of the PNG with embedded metadata.
 */
export const embedPromptInPng = async (imageBlob: Blob, prompt: string): Promise<Blob> => {
    const keyword = "Description"; // This key is often read by OS file properties
    const textEncoder = new TextEncoder();
    const promptBytes = textEncoder.encode(prompt);
    const keywordBytes = textEncoder.encode(keyword);

    // Create tEXt chunk data: keyword + null separator + prompt
    const chunkDataBytes = new Uint8Array(keywordBytes.length + 1 + promptBytes.length);
    chunkDataBytes.set(keywordBytes, 0);
    chunkDataBytes.set([0], keywordBytes.length);
    chunkDataBytes.set(promptBytes, keywordBytes.length + 1);
    
    // Create the full chunk structure
    const chunkTypeBytes = new Uint8Array([116, 69, 88, 116]); // "tEXt"
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
};
