"use client";

import { useState } from "react";

interface Failure {
  test_id: string;
  test_name: string;
  page: string;
  issue: string;
  screenshot_url?: string | null;
}

interface TestCase {
  test_id: string;
  name: string;
  status: string;
  steps?: Array<{ action: string; target?: string; value?: string }>;
  expected_result?: string;
  error?: string | null;
}

interface Report {
  session_id: string;
  total_tests: number;
  passed: number;
  failed: number;
  failures: Failure[];
  analysis?: {
    executive_summary: string;
    risk_assessment: string;
    recommendations: string[];
    priority_fixes: string[];
  };
  created_at: string;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

function DonutChart({ passed, failed, total }: { passed: number; failed: number; total: number }) {
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  const passedStroke = (passRate / 100) * circumference;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="8" opacity="0.2" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="#22c55e"
          strokeWidth="8"
          strokeDasharray={`${passedStroke} ${circumference}`}
          strokeLinecap="round"
          className="animate-donut"
          style={{ strokeDashoffset: 0 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {Math.round(passRate)}%
        </span>
        <span className="text-[10px] text-gray-500">pass rate</span>
      </div>
    </div>
  );
}

function TestRow({ tc, failure }: { tc?: TestCase; failure?: Failure }) {
  const [expanded, setExpanded] = useState(false);
  const name = tc?.name || failure?.test_name || "Unknown";
  const status = tc?.status || "failed";

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
            status === "passed" ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{name}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded font-medium ${
            status === "passed"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {status === "passed" ? "PASSED" : "FAILED"}
        </span>
        <span className="text-gray-400 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs space-y-2 bg-gray-50/50 dark:bg-gray-900/50">
          {/* Steps */}
          {tc?.steps && tc.steps.length > 0 && (
            <div>
              <div className="text-gray-500 font-medium mb-1">Steps:</div>
              {tc.steps.map((step, i) => (
                <div key={i} className="text-gray-600 dark:text-gray-400 ml-2">
                  <span className="text-gray-400">{i + 1}.</span>{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">{step.action}</span>
                  {step.target && <span> → {step.target}</span>}
                  {step.value && <span className="text-indigo-600 dark:text-indigo-400"> "{step.value}"</span>}
                </div>
              ))}
            </div>
          )}

          {/* Expected result */}
          {tc?.expected_result && (
            <div>
              <span className="text-gray-500 font-medium">Expected: </span>
              <span className="text-gray-600 dark:text-gray-400">{tc.expected_result}</span>
            </div>
          )}

          {/* Error */}
          {(tc?.error || failure?.issue) && (
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-600 dark:text-red-400">
              <span className="font-medium">Error: </span>
              {tc?.error || failure?.issue}
            </div>
          )}

          {failure?.page && (
            <div>
              <span className="text-gray-500 font-medium">Page: </span>
              <span className="text-gray-600 dark:text-gray-400">{failure.page}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportView({
  report,
  testcases,
}: {
  report: Report;
  testcases?: TestCase[];
}) {
  const passRate =
    report.total_tests > 0 ? Math.round((report.passed / report.total_tests) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary stats + donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {report.total_tests}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total Tests</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{report.passed}</div>
            <div className="text-xs text-gray-500 mt-1">Passed</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{report.failed}</div>
            <div className="text-xs text-gray-500 mt-1">Failed</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
            <div
              className={`text-3xl font-bold ${
                passRate >= 80 ? "text-green-600" : passRate >= 50 ? "text-yellow-600" : "text-red-600"
              }`}
            >
              {passRate}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Pass Rate</div>
          </div>
        </div>
        <div className="flex items-center justify-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
          <DonutChart passed={report.passed} failed={report.failed} total={report.total_tests} />
        </div>
      </div>

      {/* Analysis */}
      {report.analysis && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Executive Summary
            </h3>
            {report.analysis.risk_assessment && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  RISK_COLORS[report.analysis.risk_assessment] || RISK_COLORS["medium"]
                }`}
              >
                {report.analysis.risk_assessment} risk
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {report.analysis.executive_summary}
          </p>

          {report.analysis.recommendations && report.analysis.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Recommendations
              </h4>
              <ul className="space-y-1.5">
                {report.analysis.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                  >
                    <span className="text-indigo-500 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.analysis.priority_fixes && report.analysis.priority_fixes.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Priority Fixes
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.analysis.priority_fixes.map((fix, i) => (
                  <span
                    key={i}
                    className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-full"
                  >
                    {fix}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test results table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Test Results ({report.total_tests})
        </h3>
        <div className="space-y-2">
          {testcases && testcases.length > 0
            ? testcases.map((tc, i) => {
                const failure = report.failures.find((f) => f.test_id === tc.test_id);
                return <TestRow key={tc.test_id || i} tc={tc} failure={failure} />;
              })
            : report.failures.map((f, i) => <TestRow key={f.test_id || i} failure={f} />)}
        </div>
      </div>
    </div>
  );
}
