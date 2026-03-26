import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <h1 className="text-4xl md:text-6xl font-bold text-center max-w-3xl mb-6">
          Reclaim your focus with{" "}
          <span className="text-emerald-600 dark:text-emerald-400">Jarvis</span>
        </h1>
        <p className="text-lg md:text-xl text-center text-gray-600 dark:text-gray-400 max-w-2xl mb-12">
          A proactive preparation engine powered by local AI. It understands your context,
          anticipates your needs, and keeps everything ready exactly when you need it.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/chat"
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            Try Chat
          </Link>
          <Link
            href="/schedule"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            View Schedule
          </Link>
          <Link
            href="/documents"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Documents
          </Link>
          <Link
            href="/architecture"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            How it Works
          </Link>
        </div>
      </section>

      {/* Navigation footer */}
      <nav className="border-t border-gray-200 dark:border-gray-800 py-4 px-6">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-6 justify-center text-sm">
          <Link href="/chat" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600">
            Chat
          </Link>
          <Link href="/schedule" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600">
            Schedule
          </Link>
          <Link href="/architecture" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600">
            Architecture
          </Link>
          <Link href="/documents" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600">
            Documents
          </Link>
          <Link href="/habits" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600">
            Habits
          </Link>
        </div>
      </nav>
    </main>
  );
}
