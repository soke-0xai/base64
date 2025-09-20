"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Moon, Sun, AlertCircle, Wifi, WifiOff, FileCode } from "lucide-react"
// useToastフックはshadcn/uiのデフォルトのものを想定しています
import { useToast } from "@/components/ui/use-toast"

export default function Base64App() {
  const [decodedText, setDecodedText] = useState("")
  const [base64Text, setBase64Text] = useState("")
  const [error, setError] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const { toast } = useToast()

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = savedTheme === "dark" || (!savedTheme && prefersDark)
    setDarkMode(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  useEffect(() => {
    // navigator.onLineはコンポーネントのマウント時にtrueを返すことがあるため、初期状態を正しく設定
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Back online",
        description: "Internet connection restored",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "Offline mode",
        description: "App will continue to work offline",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [toast])

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem("theme", newDarkMode ? "dark" : "light")
    document.documentElement.classList.toggle("dark", newDarkMode)
  }

  // Encode text to Base64 (UTF-8 safe)
  const encodeToBase64 = useCallback((text: string) => {
    try {
      return btoa(unescape(encodeURIComponent(text)))
    } catch (e) {
      console.error("Encoding error:", e)
      return ""
    }
  }, [])

  // Decode Base64 to text (UTF-8 safe)
  const decodeFromBase64 = useCallback((base64: string) => {
    try {
      // Base64文字列のパディングを補正
      const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      return decodeURIComponent(escape(atob(paddedBase64)))
    } catch (e) {
      throw new Error("Invalid Base64 string")
    }
  }, [])

  // Parse Data URI and get MIME type
  const parseDataUri = (dataUri: string) => {
    const match = dataUri.match(/^data:(.*?);base64,(.*)$/)
    if (match) {
      return {
        mimeType: match[1], // e.g., "text/html;charset=utf-8"
        base64Data: match[2],
        isDataUri: true,
      }
    }
    return { mimeType: null, base64Data: null, isDataUri: false }
  }


  // Handle decoded text change
  const handleDecodedTextChange = (value: string) => {
    setDecodedText(value)
    setError("")
    if (value) {
      const encoded = encodeToBase64(value)
      setBase64Text(encoded)
    } else {
      setBase64Text("")
    }
  }

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ ここが修正された関数です ★
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  const handleBase64TextChange = (value: string) => {
    const trimmedValue = value.trim();
    setBase64Text(trimmedValue)
    setError("")

    if (!trimmedValue) {
      setDecodedText("")
      return
    }

    // First, check if it's a Data URI for previewing
    const parsed = parseDataUri(trimmedValue)
    if (parsed.isDataUri && parsed.mimeType) {
      // It's a Data URI, so we don't try to decode it into the text area.
      // We can show some info instead.
      setDecodedText(`[Previewable Data URI: ${parsed.mimeType}]`)
      // If it's a text-based Data URI, we can try to show its content
      if (parsed.mimeType.startsWith("text/")) {
        try {
          const textContent = decodeFromBase64(parsed.base64Data || "");
          setDecodedText(textContent);
        } catch (e) {
           // Fallback if decoding fails
           setDecodedText(`[Previewable Data URI: ${parsed.mimeType}]`);
        }
      }
      return; // Stop further processing
    }

    // If not a Data URI, try to decode as plain text
    try {
      const decoded = decodeFromBase64(trimmedValue)
      setDecodedText(decoded)
    } catch (e) {
      setError("Invalid Base64 string")
      setDecodedText("")
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      })
    } catch (e) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  // Render preview based on content type
  const renderPreview = () => {
    if (!base64Text) return (
       <div className="text-muted-foreground text-center py-8">
          <FileCode className="mx-auto mb-2 h-8 w-8" />
          <p>Enter text or a Data URI to see a preview</p>
        </div>
    )

    const parsed = parseDataUri(base64Text)

    if (!parsed.isDataUri || !parsed.mimeType) {
      return (
        <div className="text-muted-foreground text-center py-8">
          <AlertCircle className="mx-auto mb-2 h-8 w-8" />
          <p>Not a Data URI format</p>
          <p className="text-sm">Enter a Data URI (e.g., data:image/png;base64,...) to see a preview</p>
        </div>
      )
    }

    const { mimeType, base64Data } = parsed
    const fullDataUri = base64Text

    if (mimeType.startsWith("image/")) {
      return (
        <div className="text-center p-4">
          <img
            src={fullDataUri}
            alt="Base64 Image Preview"
            className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg object-contain"
            onError={() => setError("Failed to load image")}
          />
        </div>
      )
    }

    if (mimeType === "text/html") {
      return (
        <iframe
          src={fullDataUri}
          className="w-full h-96 border rounded-lg bg-white"
          sandbox="allow-scripts" // allow-same-originはセキュリティリスクになる可能性があるため注意
          title="HTML Preview"
        />
      )
    }

    if (mimeType === "application/pdf") {
      return (
        <iframe src={fullDataUri} className="w-full h-96 border rounded-lg" title="PDF Preview" />
      )
    }

    if (mimeType.startsWith("text/")) {
      try {
        const textContent = decodeFromBase64(base64Data || "")
        return (
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
            {textContent}
          </pre>
        )
      } catch (e) {
        return (
          <div className="text-muted-foreground text-center py-8">
            <AlertCircle className="mx-auto mb-2 h-8 w-8" />
            <p>Failed to decode text content</p>
          </div>
        )
      }
    }

    return (
      <div className="text-muted-foreground text-center py-8">
        <AlertCircle className="mx-auto mb-2 h-8 w-8" />
        <p>Preview not supported for this MIME type: {mimeType}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-balance">Real-time Base64 Utility</h1>
            <p className="text-muted-foreground mt-2">Encode, decode, and preview Base64 content instantly.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-orange-500" />}
              <span>{isOnline ? "Online" : "Offline"}</span>
            </div>
            <Button variant="outline" size="icon" onClick={toggleDarkMode} className="shrink-0">
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Main Editor Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Decoded Text Editor */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Text</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(decodedText, "Decoded text")}
                  disabled={!decodedText}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={decodedText}
                onChange={(e) => handleDecodedTextChange(e.target.value)}
                placeholder="Enter text to encode..."
                className="min-h-[200px] lg:min-h-[250px] font-mono text-sm resize-y"
              />
            </CardContent>
          </Card>

          {/* Base64 Editor */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Base64</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(base64Text, "Base64 string")}
                  disabled={!base64Text}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={base64Text}
                onChange={(e) => handleBase64TextChange(e.target.value)}
                placeholder="Enter Base64 or Data URI to decode/preview..."
                className="min-h-[200px] lg:min-h-[250px] font-mono text-sm resize-y"
                aria-invalid={!!error}
              />
              {error && (
                <div className="flex items-center gap-2 mt-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <p className="text-sm text-muted-foreground">
              Automatic preview for Data URI formats (images, HTML, PDF, text)
            </p>
          </CardHeader>
          <CardContent className="min-h-[200px] flex items-center justify-center">
            {renderPreview()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
