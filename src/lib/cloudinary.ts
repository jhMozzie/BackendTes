import { v2 as cloudinary } from 'cloudinary'

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || ''
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || ''
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || ''
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || ''

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
})

// Upload a Buffer (from multer memoryStorage) to Cloudinary
export async function uploadBuffer(buffer: Buffer, filename?: string) {
  const streamifier = await import('streamifier')

  return new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uploadOptions: any = {}
    if (CLOUDINARY_FOLDER) uploadOptions.folder = CLOUDINARY_FOLDER
    if (filename) uploadOptions.public_id = filename.replace(/\.[^/.]+$/, '')

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error)
      if (!result) return reject(new Error('No result from Cloudinary'))
      resolve({ secure_url: result.secure_url, public_id: result.public_id })
    })

    streamifier.createReadStream(buffer).pipe(stream)
  })
}

export async function destroy(publicId: string) {
  return cloudinary.uploader.destroy(publicId)
}

export default cloudinary
