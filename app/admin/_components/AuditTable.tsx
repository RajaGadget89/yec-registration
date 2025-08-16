import { format, formatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import CopyButton from "./CopyButton";

interface AuditTableProps {
  data: Array<{
    id: number;
    occurred_at_utc: string;
    action: string;
    resource: string | null;
    result: string;
    request_id?: string;
    correlation_id?: string;
    latency_ms?: number | null;
    src_ip?: string | null;
    user_agent?: string | null;
  }>;
  type: "access" | "event";
}

export default function AuditTable({ data, type }: AuditTableProps) {
  const formatTime = (utcTime: string) => {
    try {
      const thTime = toZonedTime(new Date(utcTime), "Asia/Bangkok");
      const timeStr = format(thTime, "yyyy-MM-dd HH:mm:ss");
      const timeAgo = formatDistanceToNow(thTime, { addSuffix: true });
      return { timeStr, timeAgo };
    } catch {
      return { timeStr: utcTime, timeAgo: "" };
    }
  };

  const getStatusColor = (result: string) => {
    if (result.startsWith("2"))
      return "text-green-600 bg-green-50 dark:bg-green-900/20";
    if (result.startsWith("4"))
      return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
    if (result.startsWith("5"))
      return "text-red-600 bg-red-50 dark:bg-red-900/20";
    return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-gray-300">
          <div className="text-lg font-medium mb-2">No {type} logs found</div>
          <div className="text-sm">
            Try adjusting your filters or check back later
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Time (TH)
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Action
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Resource
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Result
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {type === "access" ? "Request ID" : "Correlation ID"}
            </th>
            {type === "access" && (
              <>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Latency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  IP
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <div>
                  <div>{formatTime(row.occurred_at_utc).timeStr}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {formatTime(row.occurred_at_utc).timeAgo}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <div className="max-w-xs truncate" title={row.action}>
                  {row.action}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <div className="max-w-xs truncate" title={row.resource || ""}>
                  {row.resource || "-"}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(row.result)}`}
                >
                  {row.result}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                <div className="flex items-center space-x-2">
                  <div
                    className="max-w-xs truncate font-mono text-xs"
                    title={row.request_id || row.correlation_id}
                  >
                    {row.request_id || row.correlation_id}
                  </div>
                  <CopyButton
                    text={row.request_id || row.correlation_id || ""}
                  />
                </div>
              </td>
              {type === "access" && (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {row.latency_ms ? `${row.latency_ms}ms` : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <div
                      className="max-w-xs truncate font-mono text-xs"
                      title={row.src_ip || ""}
                    >
                      {row.src_ip || "-"}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
