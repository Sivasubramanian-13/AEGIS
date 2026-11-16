
import sharp from 'sharp'

export async function processImage(image: Buffer) {
  const metadata = await sharp(image).metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image')
  }

  if (metadata.width < 300 || metadata.height < 300) {
    throw new Error('Image resolution is too low')
  }

  return sharp(image)
    .rotate()
    .resize({
      width: 2000,
      height: 2000,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer()
}
