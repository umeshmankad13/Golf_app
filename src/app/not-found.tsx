import Link from "next/link";
import Button from "@/components/Button";

/** Custom 404 page with a link back to the homepage. */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-muted mb-4">404</div>
        <h2 className="text-xl font-bold mb-2">Page Not Found</h2>
        <p className="text-muted text-sm mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
