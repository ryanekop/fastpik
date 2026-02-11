"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MessageTemplateEditorProps {
    title: string
    description: string
    variables: { key: string; label: string }[]
    value: { id: string; en: string }
    onChange: (newValue: { id: string; en: string }) => void
}

export function MessageTemplateEditor({
    title,
    description,
    variables,
    value,
    onChange
}: MessageTemplateEditorProps) {
    const [activeTab, setActiveTab] = useState("id")
    const [localValue, setLocalValue] = useState(value)

    useEffect(() => {
        setLocalValue(value)
    }, [value])

    const handleChange = (lang: 'id' | 'en', text: string) => {
        const newValue = { ...localValue, [lang]: text }
        setLocalValue(newValue)
        onChange(newValue)
    }

    const insertVariable = (variableKey: string) => {
        const textarea = document.getElementById(`template-editor-${title}-${activeTab}`) as HTMLTextAreaElement
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = localValue[activeTab as 'id' | 'en'] || ""

        const newText = text.substring(0, start) + `{{${variableKey}}}` + text.substring(end)

        handleChange(activeTab as 'id' | 'en', newText)

        // Restore focus and cursor (timeout needed for React state update)
        setTimeout(() => {
            textarea.focus()
            const newCursorPos = start + variableKey.length + 4 // {{}} is 4 chars
            textarea.setSelectionRange(newCursorPos, newCursorPos)
        }, 0)
    }

    return (
        <Card className="border-muted">
            <CardContent className="pt-6 space-y-4">
                <div>
                    <h3 className="text-lg font-medium">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Variables</Label>
                    <div className="flex flex-wrap gap-2">
                        {variables.map((variable) => (
                            <Badge
                                key={variable.key}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary transition-colors py-1 px-2"
                                onClick={() => insertVariable(variable.key)}
                                title={`Click to insert {{${variable.key}}}`}
                            >
                                {variable.key}
                            </Badge>
                        ))}
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="id">Indonesian 🇮🇩</TabsTrigger>
                        <TabsTrigger value="en">English 🇺🇸</TabsTrigger>
                    </TabsList>

                    <div className="mt-2">
                        <Textarea
                            id={`template-editor-${title}-id`}
                            value={localValue.id || ""}
                            onChange={(e) => handleChange("id", e.target.value)}
                            placeholder="Tulis template pesan dalam Bahasa Indonesia..."
                            className={`min-h-[120px] font-mono text-sm ${activeTab !== 'id' ? 'hidden' : ''}`}
                        />
                        <Textarea
                            id={`template-editor-${title}-en`}
                            value={localValue.en || ""}
                            onChange={(e) => handleChange("en", e.target.value)}
                            placeholder="Write message template in English..."
                            className={`min-h-[120px] font-mono text-sm ${activeTab !== 'en' ? 'hidden' : ''}`}
                        />
                    </div>
                </Tabs>

                <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground italic">
                    Preview: {localValue[activeTab as 'id' | 'en']?.replace(/{{(\w+)}}/g, (match, key) => {
                        // Simple mock preview
                        const mockData: Record<string, string> = {
                            client_name: "Budi Santoso",
                            link: "https://fastpik.id/client/...",
                            max_photos: "50",
                            count: "10",
                            list: "IMG_001.jpg, IMG_002.jpg...",
                            password: "secret123",
                            duration: "7 hari"
                        }
                        return mockData[key] || match
                    }) || "(Empty message)"}
                </div>
            </CardContent>
        </Card>
    )
}
