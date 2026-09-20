import sharp from 'sharp';

// Raster icons are generated from the same source as the favicon for iOS/Android.
for (const [size, filename] of [[192, 'icon-192.png'], [512, 'icon-512.png'], [180, 'apple-touch-icon.png']]) {
  await sharp('public/favicon.svg').resize(size, size).png().toFile(`public/${filename}`);
}
