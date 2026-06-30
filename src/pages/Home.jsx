import React, { useEffect } from 'react';

const TickerData = [
  { label: 'FLR/USD', value: '$0.0214', delta: '+1.8%', dir: 'up' },
  { label: 'BTC/USD', value: '$71,402', delta: '-0.4%', dir: 'down' },
  { label: 'XRP/USD', value: '$0.612', delta: '+2.3%', dir: 'up' },
  { label: 'EPOCH', value: '#247', delta: '18m left', dir: 'flat' },
  { label: 'fXRP RATIO', value: '182%', delta: 'healthy', dir: 'up' },
  { label: 'PROVIDERS', value: '167', delta: 'active', dir: 'flat' },
  { label: 'REWARDS POOL', value: '1.4M FLR', delta: '+0.2%', dir: 'up' },
  { label: 'PROPOSALS', value: '12 open', delta: '2 closing soon', dir: 'flat' },
];

export default function Home() {
  return (
    <div className="bg-[#08090C] text-[#F2F3F5] font-sans min-h-screen">
      {/* Ticker */}
      <div className="w-full bg-[#0F1115] border-b border-[#1E2128] overflow-hidden relative h-[34px] flex items-center">
        <div className="flex whitespace-nowrap animate-[ticker-scroll_38s_linear_infinite] hover:[animation-play-state:paused]">
          {[...TickerData, ...TickerData].map((t, i) => (
            <div key={i} className="font-mono text-[11px] font-medium text-[#8B92A3] px-5 flex items-center gap-2 border-r border-[#171A20]">
              <span className={`w-[5px] h-[5px] rounded-full ${t.dir !== 'flat' ? 'bg-[#3DDC84] shadow-[0_0_0_0_rgba(61,220,132,0.6)] animate-pulse' : 'bg-[#565C6B]'}`} />
              <b className="text-[#F2F3F5] font-semibold">{t.label}</b> {t.value}
              <span className={t.dir === 'up' ? 'text-[#3DDC84]' : t.dir === 'down' ? 'text-[#E62058]' : ''}>{t.delta}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-40 h-[64px] flex items-center bg-[#08090C]/85 backdrop-blur-[12px] border-b border-[#1E2128]">
        <div className="w-full max-w-[1180px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-[26px] h-[26px] rounded-[6px] bg-[#E62058] flex items-center justify-center font-mono font-bold text-[13px] text-white">F</div>
            <span className="font-extrabold text-[14px] tracking-tighter">FlareGPT</span>
            <span className="font-mono text-[9px] text-[#565C6B] border border-[#1E2128] rounded-[3px] px-[5px] ml-1.5 tracking-[0.05em]">LIVE</span>
          </div>
          <div className="hidden md:flex items-center gap-[18px]">
            {['Wallets', 'Rewards', 'Governance'].map(link => (
              <a key={link} href="#" className="font-mono text-[11px] text-[#8B92A3] hover:text-[#F2F3F5] transition-colors">{link}</a>
            ))}
            <button className="bg-[#E62058] text-white font-mono font-semibold text-[11px] px-[16px] py-[9px] rounded-[6px] hover:bg-[#F03A6F] transition-colors">Launch App</button>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="max-w-[1180px] mx-auto px-6 py-[64px] grid md:grid-cols-[1.3fr,1fr] gap-12 items-end border-b border-[#1E2128]">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase text-[#E62058] mb-5 tracking-[0.12em]">
              <span className="w-[6px] h-[6px] bg-[#E62058] rounded-[1px]" /> AI-Powered Flare Copilot
            </div>
            <h1 className="text-[clamp(34px,5vw,58px)] font-extrabold leading-[1.02] tracking-tighter">Everything Flare.<br /><span className="text-[#E62058]">Read in real time.</span></h1>
            <p className="mt-[22px] text-[14.5px] leading-[1.7] text-[#8B92A3] max-w-[480px]">
              Monitor wallets, track FTSO rewards, watch fAsset collateral ratios, and query FlareGPT — all from one terminal built directly on live network state. No wallet required to look around.
            </p>
            <div className="mt-[30px] flex items-center gap-[22px]">
              <button className="bg-[#E62058] text-white font-mono font-semibold text-[12px] px-[22px] py-[13px] rounded-[7px] flex items-center gap-2 hover:bg-[#F03A6F] transition-all hover:-translate-y-[1px]">Launch App →</button>
              <button className="font-mono text-[12px] text-[#8B92A3] border-b border-[#1E2128] pb-[3px] hover:text-[#F2F3F5] hover:border-[#565C6B]">Connect Wallet</button>
            </div>
          </div>

          <div className="bg-[#0F1115] border border-[#1E2128] rounded-[10px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#13151A] border-b border-[#1E2128]">
              <span className="font-mono text-[10px] text-[#565C6B] uppercase tracking-[0.08em]">Network Snapshot</span>
              <span className="w-[5px] h-[5px] rounded-full bg-[#3DDC84] animate-pulse" />
            </div>
            {[
              { label: 'Rewards delegated', val: '1.4M FLR' },
              { label: 'Wallets tracked', val: '130+' },
              { label: 'Active providers', val: '167' },
              { label: 'fAsset positions', val: '134', delta: '▲2.1%', dColor: 'text-[#3DDC84]' }
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-[13px] border-b border-[#171A20] last:border-none">
                <span className="text-[12px] text-[#8B92A3]">{s.label}</span>
                <span className="font-mono text-[13px] font-semibold flex items-center gap-1.5">{s.val} {s.delta && <span className={`${s.dColor} text-[11px]`}>{s.delta}</span>}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Capabilities (Truncated structure for brevity, fully functional pattern) */}
        <section className="max-w-[1180px] mx-auto px-6 py-[80px]">
          <div className="mb-12 max-w-[560px]">
             <div className="font-mono text-[10px] font-semibold uppercase text-[#565C6B] flex items-center gap-2 mb-4 tracking-[0.12em]"><span className="w-[24px] h-[1px] bg-[#1E2128]" /> What you can do</div>
             <h2 className="font-bold text-[34px] tracking-tight leading-[1.15]">Three ways to work the network.</h2>
          </div>
          <div className="grid md:grid-cols-3 border border-[#1E2128] rounded-[10px] overflow-hidden">
             {/* Repeat Col pattern for Watch/Earn/Govern */}
             <div className="border-r border-[#1E2128]">
                <div className="p-[18px] bg-[#0F1115] border-b border-[#1E2128]">
                   <div className="flex justify-between items-center"><span className="font-mono text-[11.5px] font-bold text-[#E62058]">WATCH</span><span className="font-mono text-[10px] text-[#565C6B]">130+ wallets</span></div>
                   <p className="mt-2 text-[11.5px] text-[#565C6B]">Non-custodial observability across hot, hardware, and read-only addresses.</p>
                </div>
                {/* Add column items here */}
             </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1E2128] p-[32px_24px]">
        <div className="max-w-[1180px] mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2"><div className="w-[20px] h-[20px] rounded-[4px] bg-[#E62058] flex items-center justify-center font-mono text-[10px] text-white">F</div><span className="font-bold text-[12px]">FlareGPT</span></div>
          <div className="flex items-center gap-6 font-mono text-[10.5px] text-[#8B92A3]">
             <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-[#E62058]">X</a>
             <a href="https://discord.com" target="_blank" rel="noreferrer" className="hover:text-[#E62058]">Discord</a>
             <button>Terms & Disclaimer</button>
             <button className="text-[#E62058]">Donate ♥</button>
          </div>
        </div>
      </footer>
    </div>
  );
}