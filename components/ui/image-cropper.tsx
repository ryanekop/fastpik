'use client'

import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react'

interface ImageCropperProps {
    imageSrc: string
    open: boolean
    onClose: () => void
    onCropComplete: (croppedImageDataUrl: string) => void
    aspectRatio?: number
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        throw new Error('No 2d context')
    }

    // Set canvas size to the cropped area
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Draw the cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    )

    // Return as data URL
    return canvas.toDataURL('image/jpeg', 0.9)
}

function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.src = url
    })
}

export function ImageCropper({
    imageSrc,
    open,
    onClose,
    onCropComplete,
    aspectRatio = 1
}: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

    const onCropChange = useCallback((location: { x: number; y: number }) => {
        setCrop(location)
    }, [])

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(zoom)
    }, [])

    const onCropAreaComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleConfirm = useCallback(async () => {
        if (!croppedAreaPixels) return

        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
            onCropComplete(croppedImage)
            onClose()
        } catch (error) {
            console.error('Error cropping image:', error)
        }
    }, [imageSrc, croppedAreaPixels, onCropComplete, onClose])

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Crop Foto Profil</DialogTitle>
                </DialogHeader>

                <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropAreaComplete}
                    />
                </div>

                <div className="flex items-center gap-4 px-2">
                    <ZoomOut className="h-4 w-4 text-muted-foreground" />
                    <Slider
                        value={[zoom]}
                        min={1}
                        max={3}
                        step={0.1}
                        onValueChange={([value]) => setZoom(value)}
                        className="flex-1"
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground" />
                </div>

                <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={onClose} className="flex-1 cursor-pointer">
                        <X className="h-4 w-4 mr-2" />
                        Batal
                    </Button>
                    <Button onClick={handleConfirm} className="flex-1 cursor-pointer">
                        <Check className="h-4 w-4 mr-2" />
                        Gunakan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
