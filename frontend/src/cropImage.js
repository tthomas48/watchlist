/**
 * Load an image from a URL (object URL or data URL).
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function createImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = src;
  });
}

/**
 * Crop an image using pixel coordinates from react-easy-crop's onCropComplete.
 * Optionally inject createCanvas for tests.
 *
 * @param {string} imageSrc
 * @param {{ x: number, y: number, width: number, height: number }} croppedAreaPixels
 * @param {object} [options]
 * @param {number} [options.size=512]
 * @param {string} [options.mimeType='image/jpeg']
 * @param {number} [options.quality=0.92]
 * @param {() => HTMLCanvasElement} [options.createCanvas]
 * @returns {Promise<Blob>}
 */
export async function getCroppedImageBlob(
  imageSrc,
  croppedAreaPixels,
  {
    size = 512,
    mimeType = 'image/jpeg',
    quality = 0.92,
    createCanvas = () => document.createElement('canvas'),
  } = {},
) {
  if (!croppedAreaPixels
      || !Number.isFinite(croppedAreaPixels.width)
      || !Number.isFinite(croppedAreaPixels.height)) {
    throw new Error('croppedAreaPixels is required');
  }

  const image = await createImage(imageSrc);
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = size;
  canvas.height = size;

  const {
    x, y, width, height,
  } = croppedAreaPixels;

  ctx.drawImage(
    image,
    x,
    y,
    width,
    height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas export failed'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
