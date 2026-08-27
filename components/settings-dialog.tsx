"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Trash2 } from "lucide-react"
import { reverseGeocode, type UserLocation } from "@/lib/location"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearHistory: () => void
  location: UserLocation | null
  detected: UserLocation | null
  onLocationChange: (location: UserLocation | null) => void
}

export default function SettingsDialog({
  open,
  onOpenChange,
  onClearHistory,
  location,
  detected,
  onLocationChange,
}: SettingsDialogProps) {
  const [city, setCity] = useState(location?.city || detected?.city || "")
  const [country, setCountry] = useState(location?.country || detected?.country || "")
  const [detecting, setDetecting] = useState(false)

  const save = () => {
    const next = { city: city.trim(), country: country.trim() }
    onLocationChange(next.city || next.country ? next : null)
  }

  const useDevice = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const found = await reverseGeocode(position.coords.latitude, position.coords.longitude)
          if (found) {
            setCity(found.city)
            setCountry(found.country)
            onLocationChange(found)
          }
        } finally {
          setDetecting(false)
        }
      },
      () => setDetecting(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setCity(location?.city || detected?.city || "")
          setCountry(location?.country || detected?.country || "")
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Location helps label results. Speeds still use the nearest Cloudflare edge.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Your location</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              IP lookup can be a city off. Set the right city so results match what you see on Fast.com or Ookla.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Lucknow" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="India" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={save} className="rounded-full">
                Save location
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={useDevice} disabled={detecting} className="rounded-full">
                <MapPin className="h-3.5 w-3.5" />
                {detecting ? "Detecting…" : "Use device location"}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">How speeds are measured</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Download and upload use 6 parallel streams for 10 seconds, like Ookla</li>
              <li>The score averages the middle of the test and ignores slow-start and spikes</li>
              <li>Ping uses Cloudflare and Google edges; Fast.com uses Netflix servers, so ping can differ</li>
            </ul>
          </div>

          <div className="border-t border-border pt-4">
            <Button
              variant="destructive"
              onClick={() => {
                onClearHistory()
                onOpenChange(false)
              }}
              className="w-full"
            >
              <Trash2 className="h-4 w-4" />
              Clear test history
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
