import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold gradient-text">404</h1>
        <p className="mt-4 text-xl font-semibold">Page Not Found</p>
        <p className="mt-2 text-muted">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
