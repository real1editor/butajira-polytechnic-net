export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/60 bg-white/40 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.02]">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6 dark:text-slate-400">
        <p>&copy; {new Date().getFullYear()} Butajira Polytechnic College</p>
        <p className="inline-flex items-center gap-2">
          <span className="live-dot inline-flex h-1.5 w-1.5 rounded-full text-emerald-500" />
          Network Asset &amp; Cable Infrastructure Management
        </p>
      </div>
    </footer>
  );
}
