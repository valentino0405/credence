import React from 'react';
import Link from 'next/link';

export default function Footer(): React.ReactElement {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/90 text-white/70 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wide text-white">Credence: AI in Finance</h3>
            <p className="text-xs leading-relaxed text-white/60">
              Next-Generation Algorithmic Trading Platform delivering real-time market data, AI-driven insights, and interactive analytics.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-white">Contact</h4>
            <ul className="space-y-1.5 text-xs">
              <li><span className="text-white/50">Email:</span> <a className="hover:text-white transition" href="mailto:contact@aifinance.dev">contact@aifinance.dev</a></li>
              <li><span className="text-white/50">Support:</span> <a className="hover:text-white transition" href="mailto:support@aifinance.dev">support@aifinance.dev</a></li>
              <li><span className="text-white/50">Phone:</span> <span>+1 (000) 000-0000</span></li>
            </ul>
          </div>

          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-white">Feedback</h4>
            <p className="text-xs text-white/60">We&apos;d love to improve. Share ideas or issues with us.</p>
            <div className="flex flex-col gap-2">
              <Link href="mailto:feedback@aifinance.dev" className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition">
                Send Email Feedback
              </Link>
              <Link href="/feedback" className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition">
                Open Feedback Page
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] text-white/50 md:flex-row">
          <p>© {year} Credence: AI in Finance. All rights reserved.</p>
          <p className="text-white/40">Update placeholder contacts in <code>app/components/Footer.tsx</code> with real info.</p>
        </div>
      </div>
    </footer>
  );
}
