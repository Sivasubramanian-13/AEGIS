
import multer from 'multer'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
fileFilter: (_req, file, callback) => {
  const allowed = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]

  if (!allowed.includes(file.mimetype.toLowerCase())) {
    return callback(
      new Error(`Unsupported image type: ${file.mimetype}`)
    )
  }

  callback(null, true)
},
})
