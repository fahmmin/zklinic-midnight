import { useId } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  MoreVertical,
  Plus,
  Search
} from "lucide-react";

export function HeroDashboard() {
  const chartGradId = useId().replace(/:/g, "");

  return (
    <div
      className="w-full rounded-2xl p-3 text-[11px] select-none pointer-events-none md:p-4"
      style={{
        background: "rgba(255, 255, 255, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "var(--shadow-dashboard)"
      }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary font-semibold text-foreground">
            ZK
          </div>
          <span className="truncate font-medium text-foreground">ZKClinic</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-background/80 px-2.5 py-1 sm:flex">
            <Search className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate text-muted-foreground">Search open trials…</span>
            <kbd className="ml-auto shrink-0 rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground sm:inline">
            Generate proof
          </span>
          <Bell className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
            aria-hidden
          >
            JB
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        {/* Sidebar */}
        <aside className="w-40 shrink-0 rounded-lg border border-border/50 bg-background/60 p-2">
          <nav className="space-y-0.5">
            <div className="rounded-md bg-accent/15 px-2 py-1.5 font-medium text-accent">Trials</div>
            <div className="flex items-center justify-between px-2 py-1.5 text-muted-foreground">
              <span>Applications</span>
              <span className="rounded-full bg-secondary px-1.5 py-0 text-[9px] font-medium text-foreground">10</span>
            </div>
            <div className="px-2 py-1.5 text-muted-foreground">Proofs</div>
            <div className="flex items-center justify-between px-2 py-1.5 text-muted-foreground">
              <span>Credentials</span>
              <ChevronDown className="h-3 w-3" aria-hidden />
            </div>
            <div className="px-2 py-1.5 text-muted-foreground">Issuers</div>
            <div className="px-2 py-1.5 text-muted-foreground">Patients</div>
            <div className="flex items-center justify-between px-2 py-1.5 text-muted-foreground">
              <span>Criteria</span>
              <ChevronDown className="h-3 w-3" aria-hidden />
            </div>
          </nav>
          <p className="mt-2 px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Workflows</p>
          <nav className="mt-1 space-y-0.5">
            <div className="px-2 py-1 text-muted-foreground">Registry</div>
            <div className="px-2 py-1 text-muted-foreground">Trial matching</div>
            <div className="px-2 py-1 text-muted-foreground">Notifications</div>
            <div className="px-2 py-1 text-muted-foreground">Settings</div>
          </nav>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 rounded-lg border border-border/50 bg-secondary/30 p-3">
          <p className="text-sm font-semibold text-foreground">Welcome back, Jordan</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground">
              Apply
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-foreground">
              Match criteria
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-foreground">
              Generate proof
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-foreground">
              Post to ledger
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-foreground">
              Share proof ID
            </span>
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium text-foreground">
              Browse trials
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">Customize</span>
          </div>

          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            {/* Activity card */}
            <div className="flex min-w-0 flex-1 basis-0 flex-col rounded-xl border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1 font-medium text-foreground">
                    Eligibility proofs (30d)
                    <Check className="h-3 w-3 text-accent" aria-hidden />
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                    1,240
                    <span className="text-xs font-normal text-muted-foreground"> posted</span>
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-[10px]">
                <div>
                  <p className="text-muted-foreground">New trials live</p>
                  <p className="font-medium text-success">+18</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Awaiting review</p>
                  <p className="font-medium text-warning">42</p>
                </div>
              </div>
              <div className="text-accent mt-2 h-20 w-full">
                <svg
                  viewBox="0 0 200 80"
                  className="h-20 w-full"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id={chartGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 58 C 28 52, 42 68, 64 44 S 104 36, 128 48 C 152 60, 168 28, 200 32 L 200 80 L 0 80 Z"
                    fill={`url(#${chartGradId})`}
                  />
                  <path
                    d="M0 58 C 28 52, 42 68, 64 44 S 104 36, 128 48 C 152 60, 168 28, 200 32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>

            {/* Trial slots card */}
            <div className="flex min-w-0 flex-1 basis-0 flex-col rounded-xl border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">Open trials · slots left</p>
                <div className="flex gap-1">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </div>
              </div>
              <div className="mt-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">T2D · Phase III</span>
                  <span className="font-medium tabular-nums text-foreground">14 / 120</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">NAFLD · Phase II</span>
                  <span className="font-medium tabular-nums text-foreground">6 / 80</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Hypertension · IV</span>
                  <span className="font-medium tabular-nums text-foreground">31 / 200</span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity table */}
          <div className="mt-3 rounded-xl border border-border bg-background p-3">
            <p className="font-medium text-foreground">Recent proof activity</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-[10px]">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="pb-1.5 font-medium">Date</th>
                    <th className="pb-1.5 font-medium">Trial</th>
                    <th className="pb-1.5 font-medium">Result</th>
                    <th className="pb-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr>
                    <td className="py-1.5 align-top">Mar 18</td>
                    <td className="py-1.5 align-top">T2D-2026-04</td>
                    <td className="py-1.5 align-top">8 / 8 criteria</td>
                    <td className="py-1.5 align-top font-medium text-warning">Pending post</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 align-top">Mar 17</td>
                    <td className="py-1.5 align-top">NAFLD-12</td>
                    <td className="py-1.5 align-top">Eligible</td>
                    <td className="py-1.5 align-top font-medium text-success">On-chain</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 align-top">Mar 16</td>
                    <td className="py-1.5 align-top">HTN-IV-A</td>
                    <td className="py-1.5 align-top">Not eligible</td>
                    <td className="py-1.5 align-top font-medium text-muted-foreground">Closed</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 align-top">Mar 15</td>
                    <td className="py-1.5 align-top">T2D-2026-04</td>
                    <td className="py-1.5 align-top">7 / 8 criteria</td>
                    <td className="py-1.5 align-top font-medium text-success">On-chain</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
