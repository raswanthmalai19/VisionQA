"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { executeSession, streamSessionStatus, getSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const AGENT_STAGES = [
  {
    key: "crawling",
    name: "Site Structure Agent",
    icon: "🕷️",
    description: "Crawling website and discovering pages, routes, and navigation paths...",
  },
  {
    key: "analyzing",
    name: "Visual UI Agent",
    icon: "👁️",
    description: "Analyzing UI elements using Gemini Vision AI...",
  },
  {
    key: "generating",
    name: "Test Case Generator",
    icon: "🧪",
    description: "Generating intelligent end-to-end test cases with Gemini...",
  },
  {
    key: "executing",
    name: "Execution Agent",
    icon: "🤖",
    description: "Running Playwright browser tests against the live site...",
  },
  {
    key: "reporting",
    name: "Report Generator",
    icon: "📊",
    description: "Synthesizing QA report with executive summary...",
  },
];

function getStageIndex(status: string): number {
  return AGENT_STAGES.findIndex((s) => s.key === status);
}

function Confetti() {
  const colors = ["#6366f1", "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#f97316"];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const duration = 2 + Math.random() * 2;
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 8;
        return (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${left}%`,
              top: "-20px",
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function LivePipelinePage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { user } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState("created");
  const [siteStructure, setSiteStructure] = useState<any>(null);
  const [testcases, setTestcases] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const cancelRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed timer
  useEffect(() => {
    if (status !== "created" && status !== "completed" && status !== "failed") {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const startStreaming = useCallback(() => {
    const cancel = streamSessionStatus(
      sessionId,
      (data) => {
        setStatus(data.status);
        if (data.site_structure) setSiteStructure(data.site_structure);
        if (data.testcases) setTestcases(data.testcases);
        if (data.report) setReport(data.report);

        if (data.status === "completed") {
          setShowConfetti(true);
          setTimeout(() => router.push(`/dashboard/${sessionId}`), 3000);
        }
      },
      () => {},
    );
    cancelRef.current = cancel;
  }, [sessionId, router]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    getSession(sessionId).then((s) => {
      setStatus(s.status);
      if (s.site_structure) setSiteStructure(s.site_structure);

      if (s.status === "created") {
        // Try to execute — backend may have auto-started already, ignore 409
        executeSession(sessionId).catch(() => {});
        startStreaming();
      } else if (!["completed", "failed"].includes(s.status)) {
        startStreaming();
      } else if (s.status === "completed") {
        router.push(`/dashboard/${sessionId}`);
      }
    });

    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, [sessionId, user, router, startStreaming]);

  const activeIndex = getStageIndex(status);
  const passedCount = testcases.filter((t: any) => t.status === "passed").length;
  const failedCount = testcases.filter((t: any) => t.status === "failed").length;
  const totalTests = testcases.length;

  return (
    <div className="max-w-4xl mx-auto">
      {showConfetti && <Confetti />}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Agent Pipeline</h1>
          <p className="text-sm text-gray-500 mt-1">Session: {sessionId.slice(0, 8)}...</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-gray-500">
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(elapsed % 60).toString().padStart(2, "0")}
          </div>
          {totalTests > 0 && (
            <div className="text-xs text-gray-400 mt-1">
              {passedCount + failedCount}/{totalTests} tests done
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Agent stages */}
      <div className="space-y-4">
        {AGENT_STAGES.map((stage, i) => {
          const isDone = activeIndex > i;
          const isActive = activeIndex === i;

          return (
            <div
              key={stage.key}
              className={`border rounded-xl p-5 transition-all duration-700 ${
                isActive
                  ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 scale-[1.01]"
                  : isDone
                    ? "border-green-300 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-lg">
                  {isDone ? (
                    <span className="text-green-500 text-xl">✓</span>
                  ) : isActive ? (
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-gray-300 text-xl">○</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{stage.icon}</span>
                    <span
                      className={`font-semibold ${
                        isActive
                          ? "text-indigo-700 dark:text-indigo-300"
                          : isDone
                            ? "text-green-700 dark:text-green-400"
                            : "text-gray-400"
                      }`}
                    >
                      {stage.name}
                    </span>
                  </div>
                  {(isActive || isDone) && (
                    <p
                      className={`text-sm mt-1 ${
                        isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500"
                      }`}
                    >
                      {isActive ? stage.description : "Completed"}
                    </p>
                  )}
                </div>
              </div>

              {/* Active progress bar */}
              {isActive && (
                <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-progress-indeterminate" />
                </div>
              )}

              {/* Site Structure results */}
              {isDone && stage.key === "crawling" && siteStructure && (
                <div className="mt-3 ml-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 font-mono text-xs space-y-0.5 max-h-36 overflow-y-auto">
                  <div className="text-gray-500 mb-1">
                    {siteStructure.total_pages} pages discovered
                  </div>
                  {siteStructure.pages?.slice(0, 15).map((p: any, j: number) => (
                    <div key={j} className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span
                        className={`inline-block w-8 text-center text-[10px] rounded px-1 ${
                          p.status === 200
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {p.status}
                      </span>
                      <span>{p.path}</span>
                      {p.title && <span className="text-gray-400 truncate">— {p.title}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* UI Analysis results */}
              {isDone && stage.key === "analyzing" && siteStructure?.analysis && (
                <div className="mt-3 ml-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs">
                  <p className="text-gray-600 dark:text-gray-400">
                    {siteStructure.analysis.summary}
                  </p>
                  {siteStructure.analysis.key_flows?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {siteStructure.analysis.key_flows.map((flow: string, j: number) => (
                        <span
                          key={j}
                          className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px]"
                        >
                          {flow}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Test Case generation results */}
              {isDone && stage.key === "generating" && testcases.length > 0 && (
                <div className="mt-3 ml-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 max-h-44 overflow-y-auto">
                  {testcases.map((tc: any, j: number) => (
                    <div key={j} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-5">#{j + 1}</span>
                      <span className="text-gray-700 dark:text-gray-300 flex-1">{tc.name}</span>
                      <span className="text-gray-400">{tc.steps?.length || 0} steps</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Execution results */}
              {(isDone || isActive) && stage.key === "executing" && testcases.length > 0 && (
                <div className="mt-3 ml-12">
                  {/* Progress counters */}
                  <div className="flex items-center gap-6 text-sm mb-3">
                    <span className="text-green-600 font-semibold">{passedCount} passed</span>
                    <span className="text-red-600 font-semibold">{failedCount} failed</span>
                    <span className="text-gray-400">
                      {passedCount + failedCount} / {totalTests}
                    </span>
                  </div>
                  {/* Progress bar */}
                  {totalTests > 0 && (
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                      <div
                        className="bg-green-500 transition-all duration-500"
                        style={{
                          width: `${(passedCount / totalTests) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-red-500 transition-all duration-500"
                        style={{
                          width: `${(failedCount / totalTests) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                  {/* Individual test results */}
                  <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                    {testcases.map((tc: any, j: number) => (
                      <div key={j} className="flex items-center gap-2 text-xs">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            tc.status === "passed"
                              ? "bg-green-500"
                              : tc.status === "failed"
                                ? "bg-red-500"
                                : tc.status === "running"
                                  ? "bg-yellow-500 animate-pulse"
                                  : "bg-gray-300"
                          }`}
                        />
                        <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">
                          {tc.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            tc.status === "passed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : tc.status === "failed"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : tc.status === "running"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tc.status || "pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion */}
      {status === "completed" && (
        <div className="mt-8 text-center animate-fade-in">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-xl font-bold text-green-600">Pipeline Complete!</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to report...</p>
        </div>
      )}

      {status === "failed" && (
        <div className="mt-8 text-center">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-xl font-bold text-red-600">Pipeline Failed</p>
          <button
            onClick={() => router.push(`/dashboard/${sessionId}`)}
            className="mt-3 text-sm text-indigo-600 hover:underline"
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
}
