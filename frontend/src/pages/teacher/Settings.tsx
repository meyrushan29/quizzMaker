import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { api } from "../../lib/api"
import { Button, Card, Field, PageHeader, Spinner, inputClass } from "../../components/ui"

interface Preferences {
  default_passing_percentage: number
  at_risk_threshold_percentage: number
  default_show_result_immediately: boolean
  default_leaderboard_visible: boolean
  default_randomize_questions: boolean
  default_randomize_options: boolean
  default_allow_late_join: boolean
  default_allow_retake: boolean
}

export default function Settings() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.get<Preferences>("/api/settings/").then(setPrefs)
  }, [])

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!prefs) return
    await api.put("/api/settings/", prefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!prefs) return <Spinner />

  return (
    <div>
      <PageHeader title="Settings" subtitle="Defaults applied when you create a new quiz." />
      <Card className="max-w-2xl">
        <h3 className="mb-4 font-display text-sm font-semibold text-slate-900">Quiz Defaults</h3>
        <form className="space-y-4" onSubmit={handleSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default Passing Percentage">
              <input
                type="number"
                min={0}
                max={100}
                value={prefs.default_passing_percentage}
                onChange={(e) => setPrefs({ ...prefs, default_passing_percentage: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
            <Field label="At-Risk Threshold (%)">
              <input
                type="number"
                min={0}
                max={100}
                value={prefs.at_risk_threshold_percentage}
                onChange={(e) => setPrefs({ ...prefs, at_risk_threshold_percentage: Number(e.target.value) })}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["default_show_result_immediately", "Show Results Immediately"],
                ["default_leaderboard_visible", "Leaderboard Visible"],
                ["default_randomize_questions", "Randomize Questions"],
                ["default_randomize_options", "Randomize Answer Options"],
                ["default_allow_late_join", "Allow Late Joining"],
                ["default_allow_retake", "Allow Retakes"],
              ] as [keyof Preferences, string][]
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={Boolean(prefs[key])}
                  onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                {label}
              </label>
            ))}
          </div>
          {saved && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Settings saved.
            </div>
          )}
          <Button type="submit">Save Settings</Button>
        </form>
      </Card>
    </div>
  )
}
