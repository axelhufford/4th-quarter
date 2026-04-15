import Link from "next/link";
import { Logo, PulseDot } from "@/components/logo";
import { getLiveGameCount } from "@/lib/espn/live-count";

export default async function LandingPage() {
  const liveCount = await getLiveGameCount();
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-7 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="font-medium text-[15px] tracking-tight">4th Quarter</span>
        </div>
        <div className="flex items-center gap-4">
          {liveCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
              <PulseDot />
              {liveCount} {liveCount === 1 ? "game" : "games"} live
            </div>
          )}
          <Link
            href="/scores"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Scores
          </Link>
          <Link
            href="/login"
            className="border border-zinc-800 text-white px-3.5 py-1.5 rounded-md text-[13px] hover:bg-zinc-900 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-7 pt-16 pb-12 text-center max-w-4xl mx-auto">
        <div className="flex justify-center mb-7">
          <Logo size={88} />
        </div>

        <h1 className="text-5xl sm:text-[54px] font-medium tracking-tight leading-[1.02] mb-[18px]">
          Skip the first three.
          <br />
          <span className="text-orange-500">Catch the fourth.</span>
        </h1>

        <p className="text-base text-zinc-400 max-w-md mx-auto mb-8 leading-[1.55]">
          A notification when your team&apos;s game hits the final quarter. Nothing
          more, nothing less.
        </p>

        <div className="inline-flex gap-2.5">
          <Link
            href="/login"
            className="bg-orange-500 text-zinc-950 px-[22px] py-[11px] rounded-md text-sm font-medium hover:bg-orange-400 transition-colors"
          >
            Get started — free
          </Link>
          <a
            href="#how"
            className="border border-zinc-800 text-white px-[22px] py-[11px] rounded-md text-sm hover:bg-zinc-900 transition-colors"
          >
            How it works
          </a>
        </div>

        {/* Sample alert scoreboard */}
        <div className="mt-12 max-w-lg mx-auto bg-zinc-900 border border-zinc-800 rounded-[10px] px-5 py-4 flex items-center justify-between relative tabular-nums">
          <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] text-orange-500 tracking-[0.08em]">
            <PulseDot size={6} />
            LIVE
          </div>
          <div className="flex items-center gap-3 mt-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://a.espncdn.com/i/teamlogos/nba/500/nyk.png"
              alt="New York Knicks"
              className="w-8 h-8 object-contain"
            />
            <span className="text-[22px] font-medium tracking-tight">98</span>
          </div>
          <div className="text-center mt-3">
            <div className="text-[11px] text-orange-500 tracking-[0.08em] mb-0.5">
              4TH · 9:42
            </div>
            <div className="text-[10px] text-zinc-600">alert sent to you</div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[22px] font-medium tracking-tight">94</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://a.espncdn.com/i/teamlogos/nba/500/bos.png"
              alt="Boston Celtics"
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-7 pb-14 max-w-2xl mx-auto">
        <h2 className="text-xl font-medium text-center mb-8">How it works</h2>
        <div className="space-y-6">
          <Step number="1" title="Sign up for free" desc="Log in with Google or GitHub. No passwords, no credit card." />
          <Step number="2" title="Pick your teams" desc="Choose the NBA teams you follow. One team or all 30 — your call." />
          <Step number="3" title="Choose your alerts" desc="4th quarter starting, close games, tip-off — toggle what matters to you." />
          <Step number="4" title="Get notified" desc="Push notification or email the moment it happens. Never miss the clutch moments." />
        </div>
      </section>

      {/* Features */}
      <section className="px-7 pb-11 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FeatureCard
          icon={<Logo size={22} />}
          title="Q4 alerts"
          body="Push the moment the final frame tips off."
        />
        <FeatureCard
          icon={<TeamsIcon />}
          title="Pick your teams"
          body="Follow one team or the whole league."
        />
        <FeatureCard
          icon={<CloseGameIcon />}
          title="Close game alerts"
          body="Only ping when it's within five."
        />
      </section>

      {/* Footer */}
      <footer className="px-7 py-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600 max-w-4xl mx-auto">
        <span>4th Quarter · Never miss when the game gets good</span>
        <div className="flex items-center gap-1.5">
          <PulseDot size={5} />
          <span>All systems go</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  live = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  live?: boolean;
}) {
  return (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-[9px] p-[18px]">
      {live && (
        <span className="absolute top-1/2 right-4 -translate-y-1/2">
          <PulseDot size={6} />
        </span>
      )}
      <div className="mb-3">{icon}</div>
      <div className="text-sm font-medium mb-1.5">{title}</div>
      <div className="text-[13px] text-zinc-400 leading-[1.5]">{body}</div>
    </div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-8 h-8 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center text-sm font-bold shrink-0">
        {number}
      </div>
      <div>
        <div className="font-medium text-[15px] mb-0.5">{title}</div>
        <div className="text-sm text-zinc-400 leading-[1.5]">{desc}</div>
      </div>
    </div>
  );
}

/** 2×2 grid with the bottom-left tile lit — echoes the Q's quadrant motif. */
function TeamsIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#3f3f46" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#3f3f46" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#f97316" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#3f3f46" />
    </svg>
  );
}

/** Three bars, middle one lit — the "close game" is the one in the middle. */
function CloseGameIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="10" width="6" height="10" rx="1" fill="#3f3f46" />
      <rect x="9" y="7" width="6" height="13" rx="1" fill="#f97316" />
      <rect x="16" y="4" width="6" height="16" rx="1" fill="#3f3f46" />
    </svg>
  );
}
