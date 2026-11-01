import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { ShieldCheck, Cpu, Terminal, Sparkles, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Autonomous dispute triage and EV optimization platform for PayPal merchants and marketplaces.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col selection:bg-blue-600/30 selection:text-white">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-white text-lg ring-1 ring-blue-400/30">
                S
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                  {APP_NAME}
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20 shadow-sm">
                    PayPal AI 2026
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  {APP_TAGLINE}
                </p>
              </div>
            </div>

            {/* Right: Environment & Integration Indicators */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* PayPal Sandbox Status Badge */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-300 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-200">Sandbox Live</span>
                <span className="text-slate-500 text-[11px]">• Disputes v1 &amp; Payments v2</span>
              </div>

              {/* Engine Spec Badge */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-300 font-medium">Gemini 2.0 Flash</span>
              </div>

              {/* API Docs link */}
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 px-3 py-1.5 rounded-lg transition-colors border border-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>API Docs</span>
                <ExternalLink className="w-3 h-3 text-slate-400 hidden sm:inline" />
              </a>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900 bg-slate-950/90 py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="font-semibold text-slate-400">
                {APP_NAME} &copy; 2026. Built for the PayPal AI Global Hackathon.
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Autonomous PayPal Dispute Ingestion, Elasticsearch Hybrid RAG &amp; Expected Value Optimization.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                FastAPI 0.110+
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                Next.js 14 App Router
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                AG Studio Matrix
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
