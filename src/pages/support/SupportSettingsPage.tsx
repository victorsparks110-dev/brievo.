import { useState } from 'react'
import { Palette, Settings } from 'lucide-react'
import { usePageMeta } from '@/hooks/usePageMeta'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

export function SupportSettingsPage() {
  usePageMeta('Support settings')
  const { user, updateProfile } = useAuth()
  const { lightMode, setLightMode } = useTheme()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await updateProfile({ name, phone: phone.trim() || undefined })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Settings</p>
        <h1 className="text-3xl font-bold tracking-tight">Profile & preferences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="size-4" /> Support profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="size-4" /> Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="light-mode">Light Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch from the default dark-blue theme to a clean light theme.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={lightMode ? 'default' : 'outline'}>
                {lightMode ? 'On' : 'Off'}
              </Badge>
              <Switch
                id="light-mode"
                checked={lightMode}
                onCheckedChange={setLightMode}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
