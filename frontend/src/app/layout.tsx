import type { Metadata } from "next";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { Terminal, ExternalLink, Activity } from "lucide-react";

export const metadata: Metadata = {
  title: `${APP_NAME} — Enterprise PayPal Risk Command Center`,
  description:
    "Autonomous dispute triage and EV optimization platform for PayPal merchants and marketplaces.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#f8fafc] text-slate-900 antialiased min-h-screen flex flex-col selection:bg-[#0070ba]/20 selection:text-[#0070ba]" suppressHydrationWarning>
        {/* Stripe/Ramp Style Clean Top Navbar */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-[#0070ba] flex items-center justify-center font-black text-white text-base shadow-sm tracking-tighter">
                <span className="font-extrabold text-lg leading-none">P</span>
                <span className="font-extrabold text-sm leading-none -ml-1 text-sky-200">P</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    {APP_NAME}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                    Enterprise Risk
                  </span>
                  <span className="text-[10px] font-bold text-[#0070ba] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 hidden sm:inline">
                    PayPal AI Hackathon 2026
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  {APP_TAGLINE}
                </p>
              </div>
            </div>

            {/* Right: Environment & Integration Indicators */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* PayPal Sandbox Status Badge */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-emerald-700">Sandbox Live</span>
                <span className="text-slate-400 text-[11px]">• Disputes v1 &amp; Payments v2</span>
              </div>

              {/* API Specs badge */}
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
                <Activity className="w-3.5 h-3.5 text-[#0070ba]" />
                <span className="font-medium text-slate-700">EV Arbitration</span>
              </div>

              {/* API Docs link */}
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 active:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors border border-slate-300 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
              >
                <Terminal className="w-3.5 h-3.5 text-[#0070ba]" />
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

        {/* Clean Light Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="font-semibold text-slate-700">
                {APP_NAME} &copy; 2026. PayPal AI Global Hackathon Submission.
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Mathematical Expected Value Arbitration &bull; Elasticsearch 8.x Hybrid RAG &bull; PayPal Disputes v1 Integration.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-600 font-mono">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0070ba]"></span>
                PayPal Sandbox
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                FastAPI 0.110
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                AG Studio Matrix
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
