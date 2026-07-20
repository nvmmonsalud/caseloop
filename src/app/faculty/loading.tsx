import { AppNav } from "@/components/app-nav";

export default function FacultyLoading() {
  return (
    <>
      <AppNav role="faculty" />
      <main className="shell py-10 sm:py-16" aria-busy="true" aria-label="Loading faculty analytics">
        <div className="h-4 w-44 animate-pulse rounded bg-[#ddd7ca]" />
        <div className="mt-4 h-12 max-w-lg animate-pulse rounded bg-[#e8e2d7]" />
        <div className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-[#e8e2d7]" />)}
        </div>
        <div className="mt-12 h-72 animate-pulse rounded-2xl bg-[#e8e2d7]" />
      </main>
    </>
  );
}
