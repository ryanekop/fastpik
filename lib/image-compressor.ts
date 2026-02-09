/**
 * Client-side image compressor using Canvas API
 * Compresses images to target size (default 100KB) while maintaining quality
 */

export interface CompressOptions {
    maxSizeMB?: number        // Maximum upload size in MB (default 5)
    targetSizeKB?: number     // Target compressed size in KB (default 100)
    maxWidth?: number         // Max width in pixels (default 400)
    maxHeight?: number        // Max height in pixels (default 400)
}

export interface CompressResult {
    success: boolean
    dataUrl?: string          // Base64 data URL of compressed image
    sizeKB?: number           // Final size in KB
    error?: string
}

export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<CompressResult> {
    const {
        maxSizeMB = 5,
        targetSizeKB = 100,
        maxWidth = 400,
        maxHeight = 400
    } = options

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
        return {
            success: false,
            error: `File terlalu besar (${fileSizeMB.toFixed(1)}MB). Maksimal ${maxSizeMB}MB.`
        }
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
        return {
            success: false,
            error: 'File harus berupa gambar (JPG, PNG, etc.)'
        }
    }

    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width
                let height = img.height

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }

                // Create canvas
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    resolve({ success: false, error: 'Failed to create canvas context' })
                    return
                }

                // Draw image
                ctx.drawImage(img, 0, 0, width, height)

                // Compress with decreasing quality until target size is reached
                let quality = 0.9
                let dataUrl = canvas.toDataURL('image/jpeg', quality)
                let sizeKB = getBase64SizeKB(dataUrl)

                // Iteratively reduce quality to reach target size
                while (sizeKB > targetSizeKB && quality > 0.1) {
                    quality -= 0.1
                    dataUrl = canvas.toDataURL('image/jpeg', quality)
                    sizeKB = getBase64SizeKB(dataUrl)
                }

                resolve({
                    success: true,
                    dataUrl,
                    sizeKB
                })
            }

            img.onerror = () => {
                resolve({ success: false, error: 'Gagal memuat gambar' })
            }

            img.src = e.target?.result as string
        }

        reader.onerror = () => {
            resolve({ success: false, error: 'Gagal membaca file' })
        }

        reader.readAsDataURL(file)
    })
}

function getBase64SizeKB(base64String: string): number {
    // Remove data URL prefix if present
    const base64 = base64String.split(',')[1] || base64String
    // Calculate size: base64 is ~4/3 the size of binary
    const sizeBytes = (base64.length * 3) / 4
    return sizeBytes / 1024
}
