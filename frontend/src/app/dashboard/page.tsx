"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listSessions } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import SessionCard from "@/components/SessionCard";
import Link from "next/link";

interface Session {
  session_id: string;
  url: string;
  prompt: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    listSessions()
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "completed").length;
  const failedSessions = sessions.filter((s) => s.status === "failed").length;
  const runningSessions = sessions.filter(
    (s) => !["created", "completed", "failed"].includes(s.status)
  ).length;
  const uniqueSites = new Set(sessions.map((s) => new URL(s.url).hostname)).size;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <Link
          href="/new-session"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> New Test Session
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalSessions}</div>
          <div className="text-xs text-gray-500 mt-1">Total Sessions</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{completedSessions}</div>
          <div className="text-xs text-gray-500 mt-1">Completed</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-600">{failedSessions}</div>
          <div className="text-xs text-gray-500 mt-1">Failed</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-yellow-600">{runningSessions}</div>
          <div className="text-xs text-gray-500 mt-1">Running</div>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <div className="text-2xl font-bold text-indigo-600">{uniqueSites}</div>
          <div className="text-xs text-gray-500 mt-1">Sites Tested</div>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="text-5xl mb-4">🧪</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-lg">No testing sessions yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
            Enter a URL and a testing objective — VisionQA will autonomously discover, analyze, and test your website.
          </p>
          <Link
            href="/new-session"
            className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium"
          >
            Start Your First Test
          </Link>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Sessions</h2>
          <div className="grid gap-3">
            {sessions.map((s) => (
              <SessionCard key={s.session_id} session={s} />
            ))}
          </div>
        </div>
      )}

      {/* Footer info */}
      <div className="mt-10 text-center text-xs text-gray-400 dark:text-gray-600">
        Powered by Gemini AI &middot; Google Cloud Run &middot; Firestore &middot; Playwright
      </div>
    </div>
  );
}
