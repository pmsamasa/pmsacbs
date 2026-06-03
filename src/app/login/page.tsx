import { Suspense } from "react";
import { Landmark } from "lucide-react";
import { signInAction } from "@/app/actions/auth";
import { ActionForm } from "@/components/action-form";
import { Logo } from "@/components/logo";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[linear-gradient(135deg,#062d24,#0d5f43_52%,#f6d16b)] p-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden rounded-4xl border border-white/15 bg-emerald-950/40 p-10 text-white shadow-soft lg:block">
        <video src="/cbslogovideo.mp4" autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative z-10 flex h-full flex-col justify-between">
          <Logo className="[&_p]:text-white" />
          <div className="max-w-xl">
            <p className="mb-4 inline-flex rounded-full border border-gold-200/40 bg-white/10 px-3 py-1 text-sm text-gold-100">Internal college savings Bank</p>
            <h1 className="text-5xl font-semibold leading-tight">CBS MASA</h1>
            <p className="mt-4 text-lg text-emerald-50">Secure saving, current, and fixed account records for students, managers, and head approval workflows.</p>
          </div>
        </div>
      </section>
      <section className="grid place-items-center px-2 py-8">
        <div className="glass-card w-full max-w-md p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-emerald-900 text-gold-100 shadow-glow">
              <Landmark className="size-7" />
            </div>
            <h2 className="text-2xl font-semibold text-emerald-950">Sign in to CBS MASA</h2>
            <p className="mt-2 text-sm text-emerald-700">Only authenticated students, managers, and head users can access the Bank.</p>
          </div>
          <Suspense>
            <ActionForm action={signInAction} submitLabel="Sign in" className="space-y-4 [&_button]:w-full">
              <label className="field-label">Email
                <input className="input" name="email" type="email" autoComplete="email" required placeholder="cicno@pmsa.com" />
              </label>
              <label className="field-label">Password
                <input className="input" name="password" type="password" autoComplete="current-password" required placeholder="********" />
              </label>
            </ActionForm>
          </Suspense>
          <div className="mt-6 rounded-2xl border border-emerald-900/10 bg-emerald-100/70 p-4 text-sm leading-6 text-emerald-800">
            <p className="font-semibold text-emerald-950">Trust is an amanah.</p>
            <p className="mt-1">“The treasurer who gives what he is ordered to give, fully and willingly, is one of the two charitable givers.”</p>
          </div>
        </div>
      </section>
    </main>
  );
}
