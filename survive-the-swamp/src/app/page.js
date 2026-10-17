import SyllabusForm from "@/components/syllabus-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-emerald-50 px-6 py-16 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
          Survive the Swamp
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Turn your syllabus into a plan.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
          Paste your syllabus and Gemini will identify assignments, due dates,
          and practical next steps. Dates that aren&apos;t in the syllabus will
          be marked as unspecified.
        </p>
        <SyllabusForm />
        <p className="mt-6 text-sm text-slate-600">
          Your syllabus text is sent to Gemini for analysis. Don&apos;t include
          sensitive information that isn&apos;t needed for this task.
        </p>
      </div>
    </main>
  );
}
