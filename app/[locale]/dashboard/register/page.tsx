
import { RegisterForm } from "@/components/admin/register-form"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Register"
}

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <div className="w-full max-w-sm">
                <RegisterForm />
            </div>
        </div>
    )
}
