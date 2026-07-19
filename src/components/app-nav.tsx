"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Repeat2 } from "lucide-react";
export function AppNav({role}:{role?:"student"|"faculty"}) {
 const path=usePathname(); const active=role||(path.startsWith("/faculty")?"faculty":"student");
 return <header className="border-b rule bg-[#f7f4ed]/95 sticky top-0 z-40 backdrop-blur">
  <div className="shell h-16 flex items-center justify-between gap-4">
   <Link href="/" className="flex items-center gap-2 font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-full bg-[#10283f] text-white"><GraduationCap size={16}/></span>CaseFlow</Link>
   <div className="flex items-center gap-2 text-sm"><span className="hidden sm:inline text-[#6b747b]">Demo as</span><Link href={active==="student"?"/faculty":"/student"} className="btn-secondary !py-2 capitalize"><Repeat2 size={14}/>{active}</Link></div>
  </div>
 </header>
}
