import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCaseFlowSession } from "@/lib/insforge/server";
import { isInsForgePersistenceEnabled } from "@/lib/insforge/config";
import { AuthForm } from "./auth-form";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verified?: string }>;
}) {
  if (!isInsForgePersistenceEnabled()) redirect("/demo");

  const session = await getCaseFlowSession();
  if (session) redirect(session.role === "faculty" ? "/faculty" : "/student");

  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/student";

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden bg-[#10283f] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 font-bold">
          <span className="grid size-9 place-items-center rounded-full bg-white text-[#10283f]"><GraduationCap size={18} /></span>
          CaseFlow
        </Link>
        <div className="max-w-xl">
          <div className="eyebrow !text-[#d6b77e]">Your reasoning, carried forward</div>
          <h1 className="serif mt-5 text-5xl leading-tight">Prepare once. Continue from anywhere.</h1>
          <p className="mt-5 max-w-lg leading-7 text-[#cfdae1]">
            Secure persistence keeps each student&apos;s diagnostic, coaching responses, committed decision, brief, and reflection together.
          </p>
        </div>
        <div className="flex gap-3 text-sm text-[#cfdae1]"><ShieldCheck size={18} className="text-[#d6b77e]" />Student work is private and protected by row-level security.</div>
      </section>
      <section className="grid place-items-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-2 font-bold"><GraduationCap size={20} />CaseFlow</div>
          <div className="eyebrow">CaseFlow account</div>
          <h2 className="serif mt-3 text-4xl">Welcome to class preparation.</h2>
          <p className="mt-3 text-sm leading-6 text-[#68727b]">Sign in to resume your private workspace.</p>
          {params.verified === "true" && <p className="mt-4 text-sm text-[#355b40]">Email verified. You can sign in now.</p>}
          <div className="mt-8"><AuthForm nextPath={nextPath} /></div>
        </div>
      </section>
    </main>
  );
}
