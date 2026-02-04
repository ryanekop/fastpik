import { ClientView } from "@/components/client/client-view";

export default async function ClientPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params;

    let config = null;
    try {
        // Decode the URL-encoded base64 string first, then decode base64 using Buffer (Node.js)
        const decodedProjectId = decodeURIComponent(projectId);
        const json = Buffer.from(decodedProjectId, 'base64').toString('utf-8');
        config = JSON.parse(json);
    } catch (e) {
        console.error("Failed to parse project ID", e);
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-red-500">Project Not Found</h1>
                    <p className="text-muted-foreground">The link you followed is invalid or broken.</p>
                </div>
            </div>
        );
    }

    return <ClientView config={config} />;
}
