"use client";

interface SiteStructure {
  base_url: string;
  total_pages: number;
  pages: Array<{
    url: string;
    path: string;
    status: number;
    title: string | null;
    links: string[];
  }>;
  analysis?: {
    summary: string;
    key_flows: string[];
    total_routes: number;
  };
}

export default function SiteStructureTree({ structure }: { structure: SiteStructure }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      {structure.analysis && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {structure.analysis.summary}
        </p>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-medium text-gray-500">
          {structure.total_pages} pages discovered
        </span>
        {structure.analysis?.key_flows && structure.analysis.key_flows.length > 0 && (
          <div className="flex gap-1">
            {structure.analysis.key_flows.map((flow, i) => (
              <span
                key={i}
                className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded"
              >
                {flow}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="font-mono text-xs space-y-1">
        {structure.pages.map((page, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className={`w-8 text-center rounded text-xs ${
                page.status === 200
                  ? "text-green-600"
                  : page.status === 0
                    ? "text-gray-400"
                    : "text-red-600"
              }`}
            >
              {page.status || "ERR"}
            </span>
            <span className="text-gray-700 dark:text-gray-300">{page.path}</span>
            {page.title && (
              <span className="text-gray-400 truncate">— {page.title}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
