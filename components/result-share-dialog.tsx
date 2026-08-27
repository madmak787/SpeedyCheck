"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Share2 } from "lucide-react"

export default function ResultShareDialog({
  open,
  onOpenChange,
  imageUrl,
  sharing,
  onShare,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string | null
  sharing: boolean
  onShare: () => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%-1.5rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share result</DialogTitle>
          <DialogDescription>Send this card, or save the PNG to your device.</DialogDescription>
        </DialogHeader>
        {imageUrl ? (
          <img src={imageUrl} alt="SpeedyCheck speed result" className="w-full rounded-xl border border-border" />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
            Preparing image…
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="flex-1 rounded-full" onClick={onShare} disabled={!imageUrl || sharing}>
            <Share2 className="h-4 w-4" />
            {sharing ? "Sharing…" : "Share image"}
          </Button>
          <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onSave} disabled={!imageUrl}>
            <Download className="h-4 w-4" />
            Save PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
