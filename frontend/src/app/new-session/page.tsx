"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function NewSessionPage() {
  const { user, loading: authLoading } = useAuth();
  const [url, setUrl] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await createSession(url, prompt);
      // Session auto-executes on the backend — go straight to live pipeline
      router.push(`/session/${session.session_id}/live`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">New Testing Session</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Enter a URL and describe what you want to test. VisionQA will autonomously crawl, analyze,
        generate tests, execute them, and deliver a report.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Website URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-base"
          />
          <p className="mt-1 text-xs text-gray-500">The website you want to test</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Testing Objective
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Test login and signup flows. Verify form validation works correctly. Check that navigation links lead to the right pages."
            required
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-base"
          />
          <p className="mt-1 text-xs text-gray-500">
            Describe what you want to test. Be specific about flows, pages, and expected behaviors.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold text-base flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Initializing AI agents...
            </>
          ) : (
            "Start AI Testing"
          )}
        </button>
      </form>

      {/* Feature cards */}
      <div className="mt-10 grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-lg mb-1">🕷️</div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Auto Crawl</h3>
          <p className="text-xs text-gray-500 mt-1">Discovers all pages and routes automatically</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-lg mb-1">👁️</div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Visual AI</h3>
          <p className="text-xs text-gray-500 mt-1">Gemini Vision understands UI from pixels</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-lg mb-1">🧪</div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Smart Tests</h3>
          <p className="text-xs text-gray-500 mt-1">AI generates test cases from context</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="text-lg mb-1">📊</div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Full Reports</h3>
          <p className="text-xs text-gray-500 mt-1">Detailed bug reports with AI analysis</p>
        </div>
      </div>
    </div>
  );
}
