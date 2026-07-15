import { logout } from "@/app/login/actions";
import Link from "next/link";

export default function OwnerDashboard() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Your Buildings</h1>
        <div className="flex gap-3">
          <Link
            href="/owner/caretakers"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Manage Caretakers
          </Link>
          <form action={logout}>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Bills view coming next — this month&apos;s flats, mark paid, verify readings.
      </p>
    </div>
  );
}
