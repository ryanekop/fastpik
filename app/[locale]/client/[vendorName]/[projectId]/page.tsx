import { ClientView } from "@/components/client/client-view";
import { getProjectById } from "@/lib/supabase/projects";

// Allow caching for a short period or revalidate on demand?
// For now, let's keep it dynamic as admin might lock photos
export const revalidate = 0;

export default async function ClientWithVendorPage({ params }: { params: Promise<{ vendorName: string; projectId: string }> }) {
    const { projectId } = await params;
    // vendorName is cosmetic in the URL — project lookup is always by projectId

    let config = null;
    let isLegacy = false;

    // 1. Try Legacy Base64
    try {
        const decodedProjectId = decodeURIComponent(projectId);
        if (decodedProjectId.length > 50 || decodedProjectId.includes('{')) {
            const json = Buffer.from(decodedProjectId, 'base64').toString('utf-8');
            config = JSON.parse(json);
            if (!config.adminWhatsapp && config.whatsapp) {
                config.adminWhatsapp = config.whatsapp;
            }
            isLegacy = true;
        }
    } catch (e) {
        // Not a base64 config, proceed to DB
    }

    // 2. Try Database if not legacy
    if (!config) {
        try {
            config = await getProjectById(projectId);
        } catch (e) {
            console.error("Failed to fetch project from DB", e);
        }
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-red-500">Project Not Found</h1>
                    <p className="text-muted-foreground">The link you followed is invalid, expired, or deleted.</p>
                </div>
            </div>
        );
    }

    // 3. Fetch Message Templates (only if DB project)
    let templates = null;
    if (!isLegacy && config && config.id) {
        try {
            const { createServiceClient } = await import("@/lib/supabase/service");
            const supabase = createServiceClient();
            const { data: project } = await supabase
                .from('projects')
                .select('user_id')
                .eq('id', config.id)
                .single();

            if (project?.user_id) {
                const { data: settings } = await supabase
                    .from('settings')
                    .select('msg_tmpl_result_initial, msg_tmpl_result_extra')
                    .eq('user_id', project.user_id)
                    .single();

                if (settings) {
                    templates = {
                        resultInitial: settings.msg_tmpl_result_initial,
                        resultExtra: settings.msg_tmpl_result_extra
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch templates", err)
        }
    }

    return <ClientView config={config} messageTemplates={templates} />;
}
