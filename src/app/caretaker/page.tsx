import { logout } from "@/app/login/actions";

export default function CaretakerDashboard() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          This Month&apos;s Readings
        </h1>
        <form action={logout}>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </form>
      </div>
      <p className="text-sm text-gray-500">
        Flat list + CER entry + photo upload coming next.
      </p>
    </div>
  );
}
