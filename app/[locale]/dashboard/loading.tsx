import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading dashboard...</p>
            </div>
        </div>
    )
}
