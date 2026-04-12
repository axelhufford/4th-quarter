import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/auth";
import { getLiveGameCount } from "@/lib/espn/live-count";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const liveCount = await getLiveGameCount();

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a href="/dashboard" className="text-xl font-bold text-orange-500">
            4th Quarter
          </a>
          <div className="flex items-center gap-4">
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                {liveCount} {liveCount === 1 ? "game" : "games"} live
              </span>
            )}
            <a
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              My Teams
            </a>
            <a
              href="/preferences"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Alerts
            </a>
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-zinc-800">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-7 h-7 rounded-full"
                />
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-zinc-500 hover:text-white transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
