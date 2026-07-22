import { createCaretaker } from "../actions";

export default async function NewCaretakerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; method?: string }>;
}) {
  const params = await searchParams;
  const method = params.method === "email" ? "email" : "phone";

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-xl font-semibold text-ink">
        Add Caretaker
      </h1>

      {params.error && (
        <p className="mb-4 rounded bg-red-soft px-3 py-2 text-sm text-red">
          {params.error}
        </p>
      )}

      <div className="mb-6 flex rounded border border-line text-sm">
        <a
          href="/owner/caretakers/new?method=email"
          className={`flex-1 px-3 py-2 text-center ${
            method === "email"
              ? "bg-ink text-white"
              : "text-ink-muted hover:bg-paper"
          }`}
        >
          Email login
        </a>
        <a
          href="/owner/caretakers/new?method=phone"
          className={`flex-1 px-3 py-2 text-center ${
            method === "phone"
              ? "bg-ink text-white"
              : "text-ink-muted hover:bg-paper"
          }`}
        >
          Phone only (WhatsApp)
        </a>
      </div>

      <form action={createCaretaker} className="space-y-4">
        <input type="hidden" name="method" value={method} />
        <div>
          <label className="block text-sm text-ink">Name</label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          />
        </div>

        {method === "email" ? (
          <div>
            <label className="block text-sm text-ink">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-ink-muted">
              They&apos;ll get an email invite to set their own password.
            </p>
          </div>
        ) : (
          <p className="rounded border border-line bg-paper px-3 py-2 text-xs text-ink-muted">
            No email or password is created. This caretaker interacts only
            through WhatsApp, identified by the phone number below.
          </p>
        )}

        <div>
          <label className="block text-sm text-ink">
            Phone {method === "phone" && <span className="text-red">*</span>}
          </label>
          <input
            name="phone"
            required={method === "phone"}
            placeholder="+91XXXXXXXXXX"
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm"
          />
          {method === "phone" && (
            <p className="mt-1 text-xs text-ink-muted">
              Include country code — this is how the WhatsApp bot identifies
              them.
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full rounded bg-ink py-2 text-sm font-medium text-white hover:bg-ink/90"
        >
          {method === "email" ? "Send Invite" : "Add Caretaker"}
        </button>
      </form>
    </div>
  );
}
