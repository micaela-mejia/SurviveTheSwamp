import { auth0 } from "@/lib/auth0";

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <main className="min-h-screen bg-emerald-50 px-6 py-24 text-slate-900">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight">Survive the Swamp</h1>
        <p className="mt-4 text-lg text-slate-700">
          Don&apos;t just manage your workload. Survive it.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          {session ? (
            <>
              <a
                href="/syllabus"
                className="rounded-full bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900"
              >
                Open my syllabus
              </a>
              <a
                href="/auth/logout"
                className="rounded-full border border-emerald-800 px-6 py-3 font-semibold text-emerald-900 hover:bg-emerald-100"
              >
                Log out
              </a>
            </>
          ) : (
            <a
              href="/auth/login?returnTo=/syllabus"
              className="rounded-full bg-emerald-800 px-6 py-3 font-semibold text-white hover:bg-emerald-900"
            >
              Log in
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
