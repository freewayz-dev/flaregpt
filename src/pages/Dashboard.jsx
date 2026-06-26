import StatCard from "../components/cards/StatCard";
import Footer from "../components/common/Footer";
import PageHeader from "../components/common/PageHeader";

export default function Dashboard() {
  return (
    <>
    <div className="space-y-6 pb-14">

      {/* STAT GRID */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="FLR Price" value="$0.034" change="+5.2%" />

        <StatCard title="Market Cap" value="$2.4B" change="+2.4%" />

        <StatCard title="TVL" value="$450M" change="+7.1%" />

        <StatCard title="Protocols" value="32" change="+3" />
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* CHART */}
        <div
          className="
          col-span-2
          rounded-2xl
          bg-white
          p-6

          shadow-sm

          dark:bg-[#101010]
        "
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              FLR Price Chart
            </h3>

            <span
              className="
              text-xs
              text-[#E62058]
              px-2 py-1
              rounded-full
              bg-[#E62058]/10
              border border-[#E62058]/20
            "
            >
              Live
            </span>
          </div>

          <div
            className="
            flex h-96 items-center justify-center
            rounded-xl

            bg-slate-50
            dark:bg-black

            text-slate-400
          "
          >
            Chart Placeholder
          </div>
        </div>

        {/* ACTIVITY */}
        <div
          className="
          rounded-2xl
          bg-white
          p-6

          shadow-sm

          dark:bg-[#101010]
        "
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Recent Activity
          </h3>

          <div className="space-y-3 text-sm">
            {[
              "Whale moved 5M FLR",
              "New governance proposal created",
              "Rewards claimed",
              "Delegation updated",
            ].map((item, i) => (
              <div
                key={i}
                className="
                  flex items-center gap-2
                  text-slate-600 dark:text-slate-300
                "
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#E62058]" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOLDINGS */}
      <div
        className="
        rounded-2xl
        bg-white
        p-6

        shadow-sm

        dark:bg-[#1a1a1a]
      "
      >
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          My Holdings
        </h3>

        <div className="grid gap-4 md:grid-cols-4 text-sm">
          {[
            { label: "FLR", value: "65%" },
            { label: "SGB", value: "15%" },
            { label: "rFLR", value: "12%" },
            { label: "Others", value: "8%" },
          ].map((item, i) => (
            <div
              key={i}
              className="
                rounded-xl
                border border-slate-200
                bg-slate-50

                dark:bg-[#1a1a1a]
                dark:border-[#27272a]

                p-3
              "
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {item.label}
              </div>

              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {item.value}
              </div>

              <div className="h-1 mt-2 rounded-full bg-[#E62058]/20">
                <div className="h-1 w-2/3 rounded-full bg-[#E62058]" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>

      <Footer/>

    </>
  );
}
