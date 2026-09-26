// global test, expect
const GoogleTV = require('./googletv');

test('play returns Max intent params for play.hbomax.com', async () => {
  const uri = 'https://play.hbomax.com/show/8c11d041-6b71-4e54-8369-fdb310e063b8';
  const params = await GoogleTV.play(uri);
  expect(params.result).toBe(true);
  expect(params.component).toBe('com.wbd.stream/com.wbd.beam.BeamActivity');
  expect(params.data).toBe('https://play.max.com/show/8c11d041-6b71-4e54-8369-fdb310e063b8');
});

test('play throws 400 for unknown host', async () => {
  const uri = 'https://example.com/video';
  await expect(GoogleTV.play(uri)).rejects.toMatchObject({
    status: 400,
    message: `Unsupported streaming URL: ${uri}`,
  });
});
