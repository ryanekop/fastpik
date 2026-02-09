import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Admin"
}

export default function AdminSecretLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
