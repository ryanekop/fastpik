import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Webhook Tester"
}

export default function WebhookTestLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
