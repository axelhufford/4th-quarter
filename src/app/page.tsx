import Link from "next/link";
import { Logo, PulseDot } from "@/components/logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-7 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <Logo size={26} />
          <span className="font-medium text-[15px] tracking-tight">4th Quarter</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <PulseDot />
            3 games live
          </div>
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
            <div className="w-7 h-7 rounded-full bg-[#006bb6] flex items-center justify-center text-[10px] font-medium">
              NYK
            </div>
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
            <div className="w-7 h-7 rounded-full bg-[#007a33] flex items-center justify-center text-[10px] font-medium">
              BOS
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="how" className="px-7 pb-11 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FeatureCard
          icon={<Logo size={22} />}
          title="Q4 alerts"
          body="Push the moment the final frame tips off."
          live
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
        <span className="absolute top-4 right-4">
          <PulseDot size={6} />
        </span>
      )}
      <div className="mb-3">{icon}</div>
      <div className="text-sm font-medium mb-1.5">{title}</div>
      <div className="text-[13px] text-zinc-400 leading-[1.5]">{body}</div>
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
