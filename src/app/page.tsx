import Link from "next/link";
import { ArrowRight, BookOpen, Users, Sparkles, ShieldCheck } from "lucide-react";
export default function Home(){return <main>
 <section className="min-h-[78svh] bg-[#10283f] text-white relative overflow-hidden flex items-center">
  <div className="absolute inset-0 opacity-20" style={{backgroundImage:"radial-gradient(circle at 75% 30%, #d5ae69 0, transparent 28%), linear-gradient(115deg, transparent 55%, #31516b 55%, transparent 56%)"}}/>
  <div className="shell relative py-24 fade-up">
   <div className="eyebrow !text-[#d6b77e]">OpenAI Build Week · Education</div>
   <h1 className="serif mt-6 max-w-4xl text-6xl sm:text-7xl lg:text-[6.8rem] leading-[.88] tracking-[-.045em]">Think before<br/>the room speaks.</h1>
   <p className="mt-8 max-w-xl text-lg leading-8 text-[#d8e0e5]">CaseFlow turns case preparation into a disciplined cycle of evidence, commitment, challenge, and reflection.</p>
   <div className="mt-9 flex flex-wrap gap-3"><Link href="/demo" className="inline-flex items-center gap-2 rounded-full bg-[#d1aa66] px-5 py-3 font-bold text-[#10283f] hover:bg-[#e0c18a]">Enter the demo <ArrowRight size={17}/></Link><a href="#workflow" className="rounded-full border border-white/30 px-5 py-3 font-bold hover:bg-white/10">See the workflow</a></div>
  </div>
 </section>
 <section id="workflow" className="shell py-24"><div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><div className="eyebrow">One learning loop</div><h2 className="serif mt-4 text-4xl sm:text-5xl leading-tight">AI built into the work of forming judgment.</h2></div><div className="divide-y rule border-y rule">
  {[[BookOpen,"Prepare","Ground every claim in the case, then commit to a recommendation."],[Sparkles,"Get challenged","A Socratic coach probes assumptions before offering synthesis."],[Users,"Teach the room","Faculty see anonymized patterns, not a pile of summaries."],[ShieldCheck,"Reflect","Compare how reasoning changed without automated high-stakes grading."]].map(([Icon,title,text])=><div key={String(title)} className="grid grid-cols-[40px_1fr] gap-4 py-6"><Icon className="text-[#a27b3c]"/><div><h3 className="font-bold">{String(title)}</h3><p className="mt-1 text-[#65717a]">{String(text)}</p></div></div>)}
 </div></div></section>
 <section className="bg-[#e9e2d4] py-20"><div className="shell flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8"><div><div className="eyebrow">Fictional case · real workflow</div><h2 className="serif mt-4 max-w-2xl text-4xl">Choose Hikari Foods’ entry strategy—and defend it.</h2></div><Link href="/demo" className="btn-primary shrink-0">Start demo <ArrowRight size={16}/></Link></div></section>
 </main>}
