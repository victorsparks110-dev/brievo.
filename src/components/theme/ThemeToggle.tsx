import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'

/** Light / Dark mode switcher for public (pre-login) pages. */
export function ThemeToggle() {
  const { lightMode, toggleLightMode } = useTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
      title={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={toggleLightMode}
    >
      {lightMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}
