import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-6">
      <Link href="/" className="font-bebas text-2xl tracking-[4px] text-white hover:text-cyan-400 transition-colors">
        NOTE<span className="text-cyan-400">∞</span>STAMP
      </Link>
      <a
        href="mailto:hello@notestamp.com"
        className="font-raleway text-xs font-semibold tracking-[2px] uppercase text-white/60 border border-white/20 px-5 py-2 hover:border-cyan-400 hover:text-cyan-400 transition-all"
      >
        Contact
      </a>
    </nav>
  );
}
