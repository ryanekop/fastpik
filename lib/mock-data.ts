export interface MockPhoto {
    id: string
    url: string
    fullUrl: string
    name: string
}

export const generateMockPhotos = (count: number = 20): MockPhoto[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `photo-${i + 1}`,
        url: `https://picsum.photos/seed/${i + 1}/400/300`, // Thumbnail
        fullUrl: `https://picsum.photos/seed/${i + 1}/1600/1200`, // Full size
        name: `DSCF${1000 + i}.JPG`
    }))
}
