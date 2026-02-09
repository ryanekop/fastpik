'use client'

import { useState, useRef } from 'react'
import { Loader2, Camera } from 'lucide-react'
import { compressImage } from '@/lib/image-compressor'

interface AvatarUploadProps {
    currentAvatar?: string | null
    name: string
    onUpload: (dataUrl: string) => Promise<void>
}

export function AvatarUpload({ currentAvatar, name, onUpload }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(currentAvatar || null)
    const inputRef = useRef<HTMLInputElement>(null)

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)
        setUploading(true)

        try {
            const result = await compressImage(file, {
                maxSizeMB: 5,
                targetSizeKB: 100,
                maxWidth: 400,
                maxHeight: 400
            })

            if (!result.success) {
                setError(result.error || 'Gagal mengompres gambar')
                setUploading(false)
                return
            }

            setPreview(result.dataUrl!)
            await onUpload(result.dataUrl!)
        } catch (err: any) {
            setError(err.message || 'Gagal upload gambar')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-3">
            <div
                className="relative cursor-pointer group"
                onClick={() => inputRef.current?.click()}
            >
                {preview ? (
                    <img
                        src={preview}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 group-hover:border-primary/50 transition-colors"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold border-4 border-primary/20 group-hover:border-primary/50 transition-colors">
                        {getInitials(name)}
                    </div>
                )}
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 group-hover:scale-110 transition-transform">
                    {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Camera className="w-4 h-4" />
                    )}
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
            />
            <p className="text-xs text-muted-foreground">
                Klik untuk upload foto (maks 5MB)
            </p>
            {error && (
                <p className="text-xs text-destructive">{error}</p>
            )}
        </div>
    )
}
