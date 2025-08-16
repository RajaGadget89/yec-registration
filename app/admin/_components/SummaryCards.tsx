import { Users, Clock, Eye, CheckCircle, XCircle } from "lucide-react";

interface SummaryCardsProps {
  totalRegistrations: number;
  pendingCount: number;
  waitingForReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  filteredTotal?: number;
}

export default function SummaryCards({
  totalRegistrations,
  pendingCount,
  waitingForReviewCount,
  approvedCount,
  rejectedCount,
  filteredTotal,
}: SummaryCardsProps) {
  const cards = [
    {
      title: "Total Registrations",
      count: totalRegistrations,
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/20 to-blue-600/20",
      borderGradient: "from-blue-400/50 to-blue-500/50",
      delay: "0ms",
    },
    {
      title: "Pending",
      count: pendingCount,
      icon: Clock,
      gradient: "from-gray-500 to-gray-600",
      bgGradient: "from-gray-500/20 to-gray-600/20",
      borderGradient: "from-gray-400/50 to-gray-500/50",
      delay: "100ms",
    },
    {
      title: "Waiting for Review",
      count: waitingForReviewCount,
      icon: Eye,
      gradient: "from-yellow-500 to-yellow-600",
      bgGradient: "from-yellow-500/20 to-yellow-600/20",
      borderGradient: "from-yellow-400/50 to-yellow-500/50",
      delay: "200ms",
    },
    {
      title: "Approved",
      count: approvedCount,
      icon: CheckCircle,
      gradient: "from-green-500 to-green-600",
      bgGradient: "from-green-500/20 to-green-600/20",
      borderGradient: "from-green-400/50 to-green-500/50",
      delay: "300ms",
    },
    {
      title: "Rejected",
      count: rejectedCount,
      icon: XCircle,
      gradient: "from-red-500 to-red-600",
      bgGradient: "from-red-500/20 to-red-600/20",
      borderGradient: "from-red-400/50 to-red-500/50",
      delay: "400ms",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="group relative overflow-hidden card-modern dark:card-modern-dark rounded-2xl p-6 hover:scale-105 transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 animate-fade-in-up backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-white/20 dark:border-gray-700/20"
            style={{ animationDelay: card.delay }}
          >
            {/* Enhanced light overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-blue-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Animated background gradient */}
            <div
              className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
            ></div>

            {/* Border gradient */}
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.borderGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
            ></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors drop-shadow-sm">
                    {card.title}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300 drop-shadow-lg">
                      {card.count.toLocaleString()}
                    </p>
                    {filteredTotal &&
                      filteredTotal !== totalRegistrations &&
                      card.title === "Total Registrations" && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-700/80 px-2 py-1 rounded-full backdrop-blur-sm">
                          of {totalRegistrations.toLocaleString()}
                        </span>
                      )}
                  </div>
                </div>

                {/* Icon with animated background */}
                <div
                  className={`relative p-3 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
                >
                  <Icon className="h-6 w-6 text-white" />

                  {/* Animated ring effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br ${card.gradient} opacity-20 group-hover:opacity-40 group-hover:scale-150 transition-all duration-500"></div>
                </div>
              </div>

              {/* Progress indicator */}
              {card.title === "Total Registrations" &&
                totalRegistrations > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Registration Progress</span>
                      <span className="font-medium">
                        {Math.round((approvedCount / totalRegistrations) * 100)}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                      <div
                        className={`h-full bg-gradient-to-r ${card.gradient} rounded-full transition-all duration-1000 ease-out`}
                        style={{
                          width: `${(approvedCount / totalRegistrations) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
            </div>

            {/* Enhanced shimmer effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
