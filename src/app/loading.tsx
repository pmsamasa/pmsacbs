import { Logo } from "@/components/logo";

export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-emerald-950 p-6 text-white">
      <div className="text-center">
        <video src="/cbslogovideo.mp4" autoPlay muted loop playsInline className="mx-auto mb-5 size-24 rounded-3xl object-cover shadow-glow" />
        <Logo className="justify-center [&_p]:text-white" />
      </div>
    </div>
  );
}

