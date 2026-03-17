"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSession, executeSession, getReport, getTestcases } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ReportView from "@/components/ReportView";
import SiteStructureTree from "@/components/SiteStructureTree";
import Link from "next/link";

interface Session {
  session_id: string;
  url: string;
  prompt: string;
  status: string;
  site_structure: any;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-100 text-gray-700",
  crawling: "bg-yellow-100 text-yellow-700",
  analyzing: "bg-blue-100 text-blue-700",
  generating: "bg-purple-100 text-purple-700",
  executing: "bg-orange-100 text-orange-700",
  reporting: "bg-cyan-100 text-cyan-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { user } = useAuth();
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [report, setReport] = useState<any>(null);
  const [testcases, setTestcases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");

  const fetchSession = async () => {
    try {
      const s = await getSession(sessionId);
      setSession(s);
      if (s.status === "completed") {
        try {
          const [r, tc] = await Promise.all([
            getReport(sessionId),
            getTestcases(sessionId),
          ]);
          setReport(r);
          setTestcases(tc);
        } catch {}
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchSession();
  }, [user, sessionId]);

  // Poll for status updates when session is in progress
  useEffect(() => {
    if (session && !["created", "completed", "failed"].includes(session.status)) {
      const interval = setInterval(fetchSession, 3000);
      return () => clearInterval(interval);
    }
  }, [session?.status]);

  const handleExecute = async () => {
    setExecuting(true);
    setError("");
    try {
      await executeSession(sessionId);
      router.push(`/session/${sessionId}/live`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>;
  }

  if (!session) {
    return <div className="text-center py-20 text-red-500">Session not found</div>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-xs text-gray-400 mb-4">
        <Link href="/dashboard" className="hover:text-indigo-500">
          Dashboard
        </Link>
        <span className="mx-1">/</span>
        <span className="text-gray-600 dark:text-gray-300">{sessionId.slice(0, 8)}...</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{session.url}</h1>
          <p className="text-sm text-gray-500 mt-1">{session.prompt}</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              STATUS_COLORS[session.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {session.status}
          </span>
          {(session.status === "created" ||
            session.status === "completed" ||
            session.status === "failed") && (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm"
            >
              {executing
                ? "Starting..."
                : session.status === "created"
                  ? "Run Tests"
                  : "Re-run"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Active status indicator */}
      {!["created", "completed", "failed"].includes(session.status) && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              {session.status === "crawling" && "Discovering site structure..."}
              {session.status === "analyzing" && "Analyzing UI elements with Gemini Vision..."}
              {session.status === "generating" && "Generating test cases..."}
              {session.status === "executing" && "Executing tests via Playwright..."}
              {session.status === "reporting" && "Generating QA report..."}
            </span>
          </div>
          <Link
            href={`/session/${sessionId}/live`}
            className="text-xs text-indigo-600 hover:underline mt-2 inline-block"
          >
            View Live Pipeline →
          </Link>
        </div>
      )}

      {/* Site Structure */}
      {session.site_structure && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Site Structure
          </h2>
          <SiteStructureTree structure={session.site_structure} />
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Test Report
          </h2>
          <ReportView report={report} testcases={testcases} />
        </div>
      )}
    </div>
  );
}
