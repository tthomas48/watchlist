import { getCroppedImageBlob } from './cropImage';

describe('getCroppedImageBlob', () => {
  const originalImage = global.Image;

  afterEach(() => {
    global.Image = originalImage;
  });

  it('draws croppedAreaPixels onto canvas and returns a Blob', async () => {
    const drawImage = jest.fn();
    const toBlob = jest.fn((cb) => {
      cb(new Blob(['jpeg-bytes'], { type: 'image/jpeg' }));
    });
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob,
    };

    global.Image = class FakeImage {
      constructor() {
        this.width = 800;
        this.height = 600;
        setTimeout(() => {
          if (this.onload) this.onload();
          this.dispatchEvent?.(new Event('load'));
        }, 0);
      }

      addEventListener(type, handler) {
        if (type === 'load') {
          this.onload = handler;
        }
      }

      setAttribute() {}

      set src(_value) {
        // trigger load asynchronously via constructor timeout
      }
    };

    const croppedAreaPixels = {
      x: 10, y: 20, width: 100, height: 100,
    };

    const blob = await getCroppedImageBlob(
      'blob:fake',
      croppedAreaPixels,
      {
        size: 512,
        createCanvas: () => fakeCanvas,
      },
    );

    expect(fakeCanvas.width).toBe(512);
    expect(fakeCanvas.height).toBe(512);
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(Object),
      10,
      20,
      100,
      100,
      0,
      0,
      512,
      512,
    );
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
  });

  it('rejects when croppedAreaPixels is missing', async () => {
    await expect(getCroppedImageBlob('blob:fake', null)).rejects.toThrow(
      'croppedAreaPixels is required',
    );
  });
});
