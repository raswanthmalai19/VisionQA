"use client";

import Link from "next/link";

interface Session {
  session_id: string;
  url: string;
  prompt: string;
  status: string;
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

export default function SessionCard({ session }: { session: Session }) {
  return (
    <Link
      href={`/dashboard/${session.session_id}`}
      className="block p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {session.url}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {session.prompt}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[session.status] || "bg-gray-100 text-gray-700"}`}
          >
            {session.status}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(session.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
