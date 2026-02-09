"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

// Country data dengan flag emoji dan dial code
const countries = [
    { code: "ID", dialCode: "+62", flag: "🇮🇩", name: "Indonesia" },
    { code: "MY", dialCode: "+60", flag: "🇲🇾", name: "Malaysia" },
    { code: "SG", dialCode: "+65", flag: "🇸🇬", name: "Singapore" },
    { code: "US", dialCode: "+1", flag: "🇺🇸", name: "United States" },
    { code: "GB", dialCode: "+44", flag: "🇬🇧", name: "United Kingdom" },
    { code: "AU", dialCode: "+61", flag: "🇦🇺", name: "Australia" },
    { code: "JP", dialCode: "+81", flag: "🇯🇵", name: "Japan" },
    { code: "KR", dialCode: "+82", flag: "🇰🇷", name: "South Korea" },
    { code: "TH", dialCode: "+66", flag: "🇹🇭", name: "Thailand" },
    { code: "PH", dialCode: "+63", flag: "🇵🇭", name: "Philippines" },
    { code: "VN", dialCode: "+84", flag: "🇻🇳", name: "Vietnam" },
    { code: "IN", dialCode: "+91", flag: "🇮🇳", name: "India" },
]

interface PhoneInputProps {
    value?: string
    onChange?: (fullNumber: string, countryCode: string, localNumber: string) => void
    placeholder?: string
    className?: string
    error?: boolean
}

export function PhoneInput({ value = "", onChange, placeholder = "812xxxxxxxx", className, error }: PhoneInputProps) {
    const [selectedCountry, setSelectedCountry] = useState(countries[0]) // Default Indonesia
    const [localNumber, setLocalNumber] = useState("")
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Parse initial value if provided OR sync when value changes (e.g., form.reset())
    useEffect(() => {
        // If value is empty, clear the local state
        if (!value || value === "") {
            setLocalNumber("")
            setSelectedCountry(countries[0]) // Reset to default country
            return
        }

        // Check if value starts with a dial code
        const matchedCountry = countries.find(c => value.startsWith(c.dialCode.replace("+", "")))
        if (matchedCountry) {
            setSelectedCountry(matchedCountry)
            setLocalNumber(value.replace(matchedCountry.dialCode.replace("+", ""), ""))
        } else if (value.startsWith("0")) {
            // Assume Indonesia if starts with 0
            setSelectedCountry(countries[0])
            setLocalNumber(value.substring(1)) // Remove leading 0
        } else {
            setLocalNumber(value)
        }
    }, [value])

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value.replace(/\D/g, "") // Only allow digits

        // Auto-detect country from input
        if (input.startsWith("0")) {
            // Indonesian format (08...) - auto select Indonesia and remove leading 0
            if (!selectedCountry || selectedCountry.code !== "ID") {
                setSelectedCountry(countries[0])
            }
            input = input.substring(1)
        } else if (input.startsWith("62")) {
            // Pasted Indonesian format (+62...) - remove country code
            setSelectedCountry(countries[0])
            input = input.substring(2)
        } else if (input.startsWith("60")) {
            // Malaysian format
            setSelectedCountry(countries.find(c => c.code === "MY") || countries[0])
            input = input.substring(2)
        } else if (input.startsWith("65")) {
            // Singapore format
            setSelectedCountry(countries.find(c => c.code === "SG") || countries[0])
            input = input.substring(2)
        } else if (input.startsWith("1") && input.length > 10) {
            // US format
            setSelectedCountry(countries.find(c => c.code === "US") || countries[0])
            input = input.substring(1)
        }

        setLocalNumber(input)

        // Notify parent with full number
        const fullNumber = selectedCountry.dialCode.replace("+", "") + input
        onChange?.(fullNumber, selectedCountry.code, input)
    }

    const handleCountrySelect = (country: typeof countries[0]) => {
        setSelectedCountry(country)
        setIsOpen(false)
        // Notify parent with updated country
        const fullNumber = country.dialCode.replace("+", "") + localNumber
        onChange?.(fullNumber, country.code, localNumber)
    }

    return (
        <div className={cn("flex gap-0 min-w-0", className)} ref={dropdownRef}>
            {/* Country Dropdown */}
            <div className="relative z-10">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex items-center gap-1 px-3 h-10 border rounded-l-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer border-r-transparent",
                        error && "border-red-500"
                    )}
                >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="text-sm text-muted-foreground">{selectedCountry.dialCode}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-popover border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {countries.map((country) => (
                            <button
                                key={country.code}
                                type="button"
                                onClick={() => handleCountrySelect(country)}
                                className={cn(
                                    "flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors",
                                    selectedCountry.code === country.code && "bg-muted"
                                )}
                            >
                                <span className="text-lg">{country.flag}</span>
                                <span className="flex-1 text-sm">{country.name}</span>
                                <span className="text-sm text-muted-foreground">{country.dialCode}</span>
                                {selectedCountry.code === country.code && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Phone Number Input */}
            <input
                type="tel"
                value={localNumber}
                onChange={handleNumberChange}
                onFocus={() => setIsOpen(false)}
                placeholder={placeholder}
                className={cn(
                    "flex-1 min-w-0 h-10 px-3 border rounded-r-md bg-background",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                    error && "border-red-500 focus:ring-red-500"
                )}
            />
        </div>
    )
}
