import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Clock3, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";

// No head() here: the home route inherits title/description/og/twitter from
// __root.tsx, and ships no og:image so serve-time hosting can inject the
// project's social preview (explicit og:image or latest screenshot).
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "OM Value Homes | Staff Attendance" },
    { name: "description", content: "Secure real-time staff attendance and monthly salary records for OM Value Homes." },
    { property: "og:title", content: "OM Value Homes | Staff Attendance" },
    { property: "og:description", content: "Secure real-time staff attendance and monthly salary records." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return <main className="min-h-screen bg-background">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground"><Building2 /></span><div><p className="font-extrabold">OM VALUE HOMES</p><p className="text-xs text-muted-foreground">Workforce desk</p></div></div>
      <Button asChild><Link to="/auth">Staff sign in <ArrowRight /></Link></Button>
    </header>
    <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-16 md:grid-cols-[1.2fr_.8fr] md:px-8 md:pt-28">
      <div><p className="mb-5 text-sm font-bold uppercase text-primary">Attendance, made accountable</p><h1 className="max-w-3xl text-5xl font-extrabold leading-[1.08] md:text-7xl">Every workday.<br/>Right on time.</h1><p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">A secure place for OM Value Homes staff to punch in, punch out, and keep monthly salary records clear.</p><Button asChild size="lg" className="mt-9 h-12 px-6"><Link to="/auth">Open attendance desk <ArrowRight /></Link></Button></div>
      <div className="border-l-4 border-accent bg-card p-7 shadow-sm md:self-end"><p className="text-sm font-semibold text-muted-foreground">TODAY'S WORKFLOW</p><div className="mt-7 space-y-6"><div className="flex gap-4"><Clock3 className="text-primary"/><div><p className="font-bold">Live attendance</p><p className="text-sm text-muted-foreground">Verified timestamps from each staff phone.</p></div></div><div className="flex gap-4"><IndianRupee className="text-primary"/><div><p className="font-bold">Monthly salary</p><p className="text-sm text-muted-foreground">One clear record of pay, deductions, and bonuses.</p></div></div></div></div>
    </section>
  </main>;
}
