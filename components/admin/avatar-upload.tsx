'use client'

import { useState, useRef } from 'react'
import { Loader2, Camera, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImageCropper } from '@/components/ui/image-cropper'

interface AvatarUploadProps {
    currentAvatar?: string | null
    name: string
    onUpload: (dataUrl: string | null) => Promise<void>
}

export function AvatarUpload({ currentAvatar, name, onUpload }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<string | null>(currentAvatar || null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Cropper state
    const [cropperOpen, setCropperOpen] = useState(false)
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)

        // Read file and open cropper
        const reader = new FileReader()
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            setImageToCrop(dataUrl)
            setCropperOpen(true)
        }
        reader.readAsDataURL(file)

        // Reset input so same file can be selected again
        e.target.value = ''
    }

    const handleCropComplete = async (croppedImageDataUrl: string) => {
        setUploading(true)
        setError(null)

        try {
            setPreview(croppedImageDataUrl)
            await onUpload(croppedImageDataUrl)
        } catch (err: any) {
            setError(err.message || 'Gagal upload gambar')
        } finally {
            setUploading(false)
            setImageToCrop(null)
        }
    }

    const handleCropperClose = () => {
        setCropperOpen(false)
        setImageToCrop(null)
    }

    const handleDelete = async () => {
        if (!preview) return

        setDeleting(true)
        setError(null)

        try {
            await onUpload(null)
            setPreview(null)
        } catch (err: any) {
            setError(err.message || 'Gagal menghapus foto')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <>
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
                    disabled={uploading || deleting}
                />
                <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                        Klik untuk upload foto
                    </p>
                    {preview && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-6 px-2 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation()
                                handleDelete()
                            }}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Trash2 className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">Hapus</span>
                        </Button>
                    )}
                </div>
                {error && (
                    <p className="text-xs text-destructive">{error}</p>
                )}
            </div>

            {/* Image Cropper Modal */}
            {imageToCrop && (
                <ImageCropper
                    imageSrc={imageToCrop}
                    open={cropperOpen}
                    onClose={handleCropperClose}
                    onCropComplete={handleCropComplete}
                    aspectRatio={1}
                />
            )}
        </>
    )
}
