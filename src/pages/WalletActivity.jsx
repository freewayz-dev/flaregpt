import React from "react";
import { useTranslation } from "react-i18next";
import { 
  ArrowUpRightIcon, 
  ArrowDownLeftIcon, 
  CircleStackIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from "@heroicons/react/24/outline";
import StatCard from "../components/cards/StatCard";

const WalletActivity = () => {
  const { t } = useTranslation();

  // Mock data for testing table localization
  const transactions = [
    { id: "0x7a...3b41", type: "send", amount: "-1.50 ETH", status: "success", date: "2 mins ago" },
    { id: "0x2c...9e12", type: "receive", amount: "+450.00 USDT", status: "success", date: "1 hour ago" },
    { id: "0xf4...88cd", type: "contract", amount: "-0.012 ETH", status: "pending", date: "Just now" },
  ];

  return (
    <div className="space-y-6">
      {/* Dynamic Section Header */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
          {t("wallet.activity.title", "Recent Terminal Activity")}
        </h3>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
          {t("wallet.activity.subtitle", "Real-time monitoring of incoming and outgoing blockchain interactions.")}
        </p>
      </div>

      {/* Stats Grid Layout */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title={t("wallet.stats.sent", "Total Sent Assets")}
          value="$14,205.80"
          icon={ArrowUpRightIcon}
        />
        <StatCard
          title={t("wallet.stats.received", "Total Received Assets")}
          value="$28,940.12"
          icon={ArrowDownLeftIcon}
        />
        <StatCard
          title={t("wallet.stats.gas", "Gas Fees Paid")}
          value="0.042 ETH"
          icon={CircleStackIcon}
        />
      </div>

      {/* ─── NEW STUFF: TRANSACTION HISTORY TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("wallet.table.heading", "Transaction Log")}
          </h4>
          <span className="text-xs text-indigo-500 font-medium cursor-pointer hover:underline">
            {t("wallet.table.viewAll", "View Full History")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-500 dark:text-slate-400">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-3">{t("wallet.table.cols.txHash", "Tx Hash")}</th>
                <th className="p-3">{t("wallet.table.cols.type", "Type")}</th>
                <th className="p-3">{t("wallet.table.cols.amount", "Amount")}</th>
                <th className="p-3">{t("wallet.table.cols.status", "Status")}</th>
                <th className="p-3 text-right">{t("wallet.table.cols.time", "Time")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{tx.id}</td>
                  <td className="p-3 capitalize font-medium">
                    {tx.type === "send" && t("wallet.type.sent", "Sent")}
                    {tx.type === "receive" && t("wallet.type.received", "Received")}
                    {tx.type === "contract" && t("wallet.type.contract", "Contract Execution")}
                  </td>
                  <td className={`p-3 font-semibold ${tx.type === 'receive' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>
                    {tx.amount}
                  </td>
                  <td className="p-3">
                    {tx.status === "success" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        {t("wallet.status.success", "Success")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full font-medium animate-pulse">
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        {t("wallet.status.pending", "Pending")}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right text-slate-400">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WalletActivity;