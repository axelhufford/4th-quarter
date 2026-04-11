import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-orange-500">4th Quarter</span>
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Skip the first three.
            <br />
            <span className="text-orange-500">Catch the fourth.</span>
          </h1>
          <p className="text-xl text-zinc-400 mb-8 max-w-lg mx-auto">
            Get a push notification the moment the 4th quarter starts for your
            NBA team. No more watching blowouts — just tune in when it counts.
          </p>
          <Link
            href="/login"
            className="inline-flex px-8 py-4 rounded-lg bg-orange-500 text-white text-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Get Started — Free
          </Link>

          {/* Feature list */}
          <div className="mt-16 grid sm:grid-cols-3 gap-6 text-left">
            <div className="p-5 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="text-2xl mb-2">&#x1F514;</div>
              <h3 className="font-semibold text-white mb-1">4th Quarter Alerts</h3>
              <p className="text-sm text-zinc-400">
                Get notified the moment the 4th quarter tips off for your team.
              </p>
            </div>
            <div className="p-5 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="text-2xl mb-2">&#x1F3C0;</div>
              <h3 className="font-semibold text-white mb-1">Pick Your Teams</h3>
              <p className="text-sm text-zinc-400">
                Follow one team or all 30 — your choice, your alerts.
              </p>
            </div>
            <div className="p-5 rounded-lg bg-zinc-900 border border-zinc-800">
              <div className="text-2xl mb-2">&#x26A1;</div>
              <h3 className="font-semibold text-white mb-1">Close Game Alerts</h3>
              <p className="text-sm text-zinc-400">
                Optional alerts when games are tight in the final quarter.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-zinc-800">
        <p className="text-center text-sm text-zinc-600">
          4th Quarter — Never miss when the game gets good
        </p>
      </footer>
    </div>
  );
}
