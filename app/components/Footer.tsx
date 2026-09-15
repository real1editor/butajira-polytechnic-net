export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-zinc-500 sm:flex-row sm:px-6">
        <p>&copy; {new Date().getFullYear()} Butajira Polytechnic College</p>
        <p>Network Asset & Cable Infrastructure Management</p>
      </div>
    </footer>
  );
}