import { Loader2 } from "lucide-react"

export default function ClientLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading photos...</p>
            </div>
        </div>
    )
}
