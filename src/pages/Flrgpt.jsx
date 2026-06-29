import { useState } from "react";
import PageHeader from "../components/common/PageHeader";

export default function FLRGPT() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to FLRGPT — Ask anything about Flare, your portfolio, or on-chain activity.",
    },
  ]);

  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        content:
          "This is a demo response. Later we’ll connect this to real Flare data + AI.",
      },
    ]);

    setInput("");
  };

  return (
    <>
      <PageHeader
        title="flrgpt"
        description="Flare Intelligence Chat Interface"
      />

      <div className="flex h-full gap-4 pb-14 md:px-8">
        {/* LEFT - CHAT AREA */}
        <div
          className="
        flex flex-col flex-1
        rounded-2xl
        border border-slate-200
        bg-white

        dark:bg-[#1A1A1A]
        dark:border-[#27272A]
      "
        >
          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                  max-w-[75%]
                  rounded-2xl
                  px-4 py-3
                  text-sm

                  ${
                    msg.role === "user"
                      ? "bg-[#E62058] text-white"
                      : "bg-slate-100 text-slate-800 dark:bg-[#0A0A0A] dark:text-slate-200"
                  }
                `}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* INPUT */}
          <div className="border-t border-slate-200 dark:border-[#27272A] p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about FLR, rewards, wallets..."
              className="
              flex-1
              rounded-xl
              border border-slate-200

              bg-slate-50
              px-3 py-2
              text-base

              outline-none

              dark:bg-[#0A0A0A]
              dark:border-[#27272A]
              dark:text-white
            "
            />

            <button
              onClick={sendMessage}
              className="
              rounded-xl
              bg-[#E62058]
              px-4 py-2
              text-sm
              text-white
              hover:bg-[#d81e52]
              transition
            "
            >
              Send
            </button>
          </div>
        </div>

        {/* RIGHT - CONTEXT PANEL */}
        <div
          className="
        hidden lg:block
        w-80
        rounded-2xl
        border border-slate-200
        bg-white
        p-4

        dark:bg-[#1A1A1A]
        dark:border-[#27272A]
      "
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
            Portfolio Context
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">FLR</span>
              <span className="text-white">65%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">SGB</span>
              <span className="text-white">15%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">rFLR</span>
              <span className="text-white">12%</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Others</span>
              <span className="text-white">8%</span>
            </div>

            <div className="pt-3 border-t border-[#27272A]">
              <p className="text-xs text-slate-500">
                AI will use this data for insights
              </p>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
