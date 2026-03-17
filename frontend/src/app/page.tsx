import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
        Autonomous Visual QA Copilot
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
        Provide a URL and a testing objective. VisionQA autonomously discovers your site,
        analyzes the UI visually, generates test cases, executes them, and delivers a
        comprehensive QA report.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/register"
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-indigo-700"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-8 py-3 rounded-lg text-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          Login
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-left">
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Site Discovery</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Automatically crawls and maps your entire website structure without manual configuration.
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Visual AI Analysis</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Uses Gemini Vision to understand UI elements from pixels — no fragile DOM selectors.
          </p>
        </div>
        <div className="p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Autonomous Testing</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Generates and executes end-to-end tests via Playwright, then delivers detailed reports.
          </p>
        </div>
      </div>
    </div>
  );
}
