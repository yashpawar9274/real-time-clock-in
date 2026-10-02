import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Building2, CalendarDays, Camera, Clock3, IndianRupee, LogOut, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Attendance Desk | OM Value Homes" },
    { name: "description", content: "Punch attendance and review salary records at OM Value Homes." },
    { property: "og:title", content: "Attendance Desk | OM Value Homes" },
    { property: "og:description", content: "OM Value Homes staff attendance workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Dashboard,
});

type Attendance = Tables<"attendance">;
type Profile = Tables<"profiles">;
type Salary = Tables<"salary_records">;

function Dashboard() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [today, setToday] = useState<Attendance | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [allSalaries, setAllSalaries] = useState<Salary[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"attendance" | "salary" | "admin">("attendance");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [unreadCheckIns, setUnreadCheckIns] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const initializedRealtime = useRef(false);

  const load = useCallback(async () => {
    const date = format(new Date(), "yyyy-MM-dd");
    const [p, t, h, s, r] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("attendance").select("*").eq("user_id", user.id).eq("work_date", date).maybeSingle(),
      supabase.from("attendance").select("*").eq("user_id", user.id).order("work_date", { ascending: false }).limit(31),
      supabase.from("salary_records").select("*").eq("user_id", user.id).order("salary_month", { ascending: false }),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    setProfile(p.data);
    setToday(t.data);
    setHistory(h.data || []);
    setSalaries(s.data || []);
    const admin = (r.data || []).some((item) => item.role === "admin");
    setIsAdmin(admin);
    if (admin) {
      const [ps, at, payroll] = await Promise.all([
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("attendance").select("*").order("work_date", { ascending: false }).limit(500),
        supabase.from("salary_records").select("*").order("salary_month", { ascending: false }).limit(500),
      ]);
      setProfiles(ps.data || []);
      setAllAttendance(at.data || []);
      setAllSalaries(payroll.data || []);
      const paths = (at.data || []).flatMap((row) => row.photo_path ? [row.photo_path] : []);
      if (paths.length) {
        const { data: signed } = await supabase.storage.from("attendance-photos").createSignedUrls(paths, 3600);
        setPhotoUrls(Object.fromEntries((signed || []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl])));
      }
    } else if (t.data?.photo_path) {
      const { data: signed } = await supabase.storage.from("attendance-photos").createSignedUrl(t.data.photo_path, 3600);
      if (signed?.signedUrl) setPhotoUrls({ [t.data.photo_path]: signed.signedUrl });
    }
  }, [user.id]);

  useEffect(() => {
    void load();
    const channel = supabase.channel("live-attendance").on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance" }, () => {
      if (initializedRealtime.current) setUnreadCheckIns((count) => count + 1);
      void load();
    }).subscribe((status) => { if (status === "SUBSCRIBED") initializedRealtime.current = true; });
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setMessage("Please take a photo to check in."); return; }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function punchIn() {
    if (!photo) { setMessage("Take a live photo before checking in."); return; }
    setBusy(true);
    setMessage("");
    const extension = photo.type === "image/png" ? "png" : "jpg";
    const photoPath = `${user.id}/${format(new Date(), "yyyy-MM-dd")}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("attendance-photos").upload(photoPath, photo, { contentType: photo.type, upsert: false });
    if (uploadError) { setBusy(false); setMessage(uploadError.message); return; }
    const { error } = await supabase.rpc("punch_in", { _photo_path: photoPath });
    if (error) await supabase.storage.from("attendance-photos").remove([photoPath]);
    setBusy(false);
    if (error) setMessage(error.message); else { setPhoto(null); setPhotoPreview(null); setMessage("Check-in recorded successfully."); await load(); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return <main className="min-h-screen bg-background">
    <header className="border-b bg-card"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground"><Building2 /></span><div><p className="font-extrabold">OM VALUE HOMES</p><p className="text-xs text-muted-foreground">{isAdmin ? "Admin workspace" : "Staff attendance"}</p></div></div>
      <div className="relative flex items-center gap-2"><Badge variant="outline" className="hidden sm:inline-flex">{profile?.employee_code || user.email}</Badge>{isAdmin && <><Button size="icon" variant="ghost" onClick={() => { setNotificationsOpen((open) => !open); setUnreadCheckIns(0); }} aria-label="Live attendance notifications" title="Live attendance notifications" className="relative"><Bell />{unreadCheckIns > 0 && <span className="absolute right-0 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unreadCheckIns > 9 ? "9+" : unreadCheckIns}</span>}</Button>{notificationsOpen && <div className="absolute right-10 top-12 z-20 w-[min(22rem,calc(100vw-2rem))] border bg-popover p-4 text-popover-foreground shadow-lg"><div className="flex items-center justify-between"><p className="font-extrabold">Live check-ins</p><Button size="icon" variant="ghost" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X /></Button></div><div className="mt-2 max-h-80 divide-y overflow-y-auto">{allAttendance.slice(0, 5).map((row) => { const staff = profiles.find((item) => item.id === row.user_id); return <button type="button" key={row.id} className="flex w-full items-center gap-3 py-3 text-left" onClick={() => { setTab("admin"); setNotificationsOpen(false); }}><AttendancePhoto row={row} urls={photoUrls} className="size-12" /><span className="min-w-0"><span className="block truncate text-sm font-bold">{staff?.full_name || "Staff member"}</span><span className="block text-xs text-muted-foreground">Checked in at {format(new Date(row.check_in), "hh:mm a")}</span></span></button>; })}{!allAttendance.length && <p className="py-6 text-center text-sm text-muted-foreground">No check-ins yet.</p>}</div></div>}</>}<Button size="icon" variant="ghost" onClick={signOut} aria-label="Sign out" title="Sign out"><LogOut /></Button></div>
    </div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <nav className="mb-8 flex gap-1 border-b"><Tab active={tab === "attendance"} onClick={() => setTab("attendance")} icon={<Clock3 />}>Attendance</Tab><Tab active={tab === "salary"} onClick={() => setTab("salary")} icon={<IndianRupee />}>Salary</Tab>{isAdmin && <Tab active={tab === "admin"} onClick={() => setTab("admin")} icon={<ShieldCheck />}>Admin</Tab>}</nav>
      {tab === "attendance" && <section><div className="mb-7"><p className="text-sm font-semibold text-primary">{format(new Date(), "EEEE, d MMMM yyyy")}</p><h1 className="mt-1 text-3xl font-extrabold">Good day, {profile?.full_name?.split(" ")[0] || "team member"}</h1><p className="mt-1 text-sm text-muted-foreground">Staff ID: {profile?.employee_code || "Pending"}</p></div><div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]"><div className="border-t-4 border-primary bg-card p-6 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-muted-foreground">TODAY'S STATUS</p><h2 className="mt-2 text-2xl font-extrabold">{today ? "Checked in" : "Not checked in"}</h2></div><span className={`size-3 rounded-full ${today ? "bg-primary" : "bg-border"}`} /></div>{today ? <div className="mt-6 grid gap-4 sm:grid-cols-[9rem_1fr]"><AttendancePhoto row={today} urls={photoUrls} className="aspect-square w-full" /><TimeBox label="CHECK-IN TIME" value={format(new Date(today.check_in), "hh:mm a")} /></div> : <div className="mt-6"><label className="block cursor-pointer border-2 border-dashed border-input bg-muted p-4 text-center"><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => choosePhoto(event.target.files?.[0])} />{photoPreview ? <img src={photoPreview} alt="Live check-in preview" className="mx-auto aspect-[4/3] max-h-72 w-full object-cover" /> : <span className="grid min-h-44 place-items-center"><span><Camera className="mx-auto size-8 text-primary" /><span className="mt-3 block font-bold">Take live photo</span><span className="mt-1 block text-sm text-muted-foreground">Camera photo is required for attendance</span></span></span>}</label><Button size="lg" className="mt-4 h-14 w-full text-base" disabled={busy || !photo} onClick={() => void punchIn()}><Camera />{busy ? "Uploading…" : "Check in with photo"}</Button></div>}{message && <p className={`mt-4 text-sm ${message.includes("successfully") ? "text-primary" : "text-destructive"}`}>{message}</p>}</div><div className="bg-primary p-6 text-primary-foreground"><CalendarDays /><p className="mt-8 text-sm font-semibold opacity-70">THIS MONTH</p><p className="mt-2 text-5xl font-extrabold">{history.filter((item) => item.work_date.startsWith(format(new Date(), "yyyy-MM"))).length}</p><p className="mt-1 opacity-80">days recorded</p><p className="mt-10 border-t border-primary-foreground/20 pt-5 text-sm opacity-80">Your photo and check-in time update instantly for the administration team.</p></div></div><History rows={history} photoUrls={photoUrls} /></section>}
      {tab === "salary" && <SalaryTable salaries={salaries} />}
      {tab === "admin" && isAdmin && <AdminPanel profiles={profiles} attendance={allAttendance} salaries={allSalaries} photoUrls={photoUrls} refresh={load} />}
    </div>
  </main>;
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) { return <Button variant="ghost" onClick={onClick} className={`h-12 rounded-none border-b-2 px-4 ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{icon}{children}</Button>; }
function TimeBox({ label, value }: { label: string; value: string }) { return <div className="bg-muted p-4"><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-2 text-xl font-extrabold">{value}</p></div>; }

function AttendancePhoto({ row, urls, className }: { row: Attendance; urls: Record<string, string>; className: string }) { const url = row.photo_path ? urls[row.photo_path] : undefined; return url ? <img src={url} alt="Attendance check-in" className={`${className} rounded-md bg-muted object-cover`} /> : <div className={`${className} grid place-items-center rounded-md bg-muted text-muted-foreground`}><Camera /></div>; }

function History({ rows, photoUrls }: { rows: Attendance[]; photoUrls: Record<string, string> }) { return <div className="mt-8"><h2 className="mb-4 text-lg font-extrabold">Recent attendance</h2><div className="divide-y border bg-card">{rows.map((row) => <div key={row.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 p-4"><AttendancePhoto row={row} urls={photoUrls} className="size-14" /><div><p className="font-semibold">{format(new Date(`${row.work_date}T00:00:00`), "d MMM, EEE")}</p><p className="text-xs text-muted-foreground">Checked in at {format(new Date(row.check_in), "hh:mm a")}</p></div><Badge>Recorded</Badge></div>)}{!rows.length && <p className="p-8 text-center text-sm text-muted-foreground">Your attendance history will appear here.</p>}</div></div>; }

function SalaryTable({ salaries, profiles }: { salaries: Salary[]; profiles?: Profile[] }) { return <section><h1 className="text-3xl font-extrabold">{profiles ? "Salary records" : "Monthly salary"}</h1><p className="mt-2 text-muted-foreground">Salary, attendance, adjustments, and payment status.</p><div className="mt-7 overflow-x-auto border bg-card"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted text-xs uppercase text-muted-foreground"><tr>{profiles && <th className="p-4">Staff</th>}<th className="p-4">Month</th><th className="p-4">Attendance</th><th className="p-4">Base</th><th className="p-4">Adjustments</th><th className="p-4">Net salary</th><th className="p-4">Status</th></tr></thead><tbody>{salaries.map((salary) => { const staff = profiles?.find((item) => item.id === salary.user_id); return <tr key={salary.id} className="border-t">{profiles && <td className="p-4"><p className="font-semibold">{staff?.full_name || "Staff member"}</p><p className="text-xs text-muted-foreground">{staff?.employee_code || "—"}</p></td>}<td className="p-4 font-semibold">{format(new Date(`${salary.salary_month}T00:00:00`), "MMMM yyyy")}</td><td className="p-4">{salary.attendance_days}/{salary.working_days} days</td><td className="p-4">₹{Number(salary.base_salary).toLocaleString("en-IN")}</td><td className="p-4">−₹{Number(salary.deductions).toLocaleString("en-IN")} / +₹{Number(salary.bonuses).toLocaleString("en-IN")}</td><td className="p-4 font-bold">₹{Number(salary.net_salary || 0).toLocaleString("en-IN")}</td><td className="p-4"><Badge variant={salary.status === "paid" ? "default" : "secondary"}>{salary.status}</Badge></td></tr>; })}{!salaries.length && <tr><td colSpan={profiles ? 7 : 6} className="p-10 text-center text-muted-foreground">No salary records yet.</td></tr>}</tbody></table></div></section>; }

function AdminPanel({ profiles, attendance, salaries, photoUrls, refresh }: { profiles: Profile[]; attendance: Attendance[]; salaries: Salary[]; photoUrls: Record<string, string>; refresh: () => Promise<void> }) {
  const [selected, setSelected] = useState<Profile | null>(null);
  const [view, setView] = useState<"staff" | "attendance" | "payroll">("staff");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [deductions, setDeductions] = useState("0");
  const [bonuses, setBonuses] = useState("0");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  async function saveProfile(staff: Profile) {
    const { error } = await supabase.from("profiles").update({ full_name: staff.full_name, phone: staff.phone, department: staff.department, job_title: staff.job_title, joining_date: staff.joining_date, monthly_salary: staff.monthly_salary, is_active: staff.is_active }).eq("id", staff.id);
    setMessage(error?.message || "Staff details saved.");
    if (!error) { setSelected(null); await refresh(); }
  }

  async function createSalary() {
    if (!selected) return;
    const { error } = await supabase.from("salary_records").upsert({ user_id: selected.id, salary_month: `${month}-01`, base_salary: selected.monthly_salary, deductions: Number(deductions), bonuses: Number(bonuses) }, { onConflict: "user_id,salary_month" });
    setMessage(error?.message || "Salary record saved.");
    if (!error) await refresh();
  }

  async function generatePayroll() {
    setProcessing(true);
    setMessage("");
    const target = `${format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), "yyyy-MM")}-01`;
    const { data, error } = await supabase.rpc("generate_monthly_salaries", { _salary_month: target });
    setProcessing(false);
    setMessage(error?.message || `${data || 0} salary records prepared.`);
    if (!error) await refresh();
  }

  return <section><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-extrabold">Administration</h1><p className="mt-2 text-muted-foreground">Manage every staff record, attendance entry, and monthly salary.</p></div><div className="flex gap-2"><Button variant="secondary" onClick={() => void generatePayroll()} disabled={processing}><IndianRupee />{processing ? "Calculating…" : "Calculate last month"}</Button><Button variant="outline" size="icon" onClick={() => void refresh()} aria-label="Refresh" title="Refresh"><RefreshCw /></Button></div></div>
    <div className="mt-6 flex gap-2 border-b"><Tab active={view === "staff"} onClick={() => setView("staff")} icon={<Users />}>Staff</Tab><Tab active={view === "attendance"} onClick={() => setView("attendance")} icon={<Clock3 />}>Records</Tab><Tab active={view === "payroll"} onClick={() => setView("payroll")} icon={<IndianRupee />}>Payroll</Tab></div>
    {message && <p className="mt-4 border-l-4 border-primary bg-muted p-3 text-sm font-medium">{message}</p>}
    {view === "staff" && <div className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]"><div className="border bg-card"><div className="flex items-center gap-3 border-b p-4"><Users className="text-primary" /><h2 className="font-extrabold">Staff directory</h2><Badge variant="secondary">{profiles.length}</Badge></div><div className="divide-y">{profiles.map((staff) => <Button key={staff.id} variant="ghost" className="h-auto w-full justify-between rounded-none p-4 text-left" onClick={() => { setSelected(staff); setMessage(""); }}><span><span className="block font-semibold">{staff.full_name}</span><span className="block text-xs font-normal text-muted-foreground">{staff.employee_code} · {staff.job_title || "Position not set"}</span></span><Badge variant={staff.is_active ? "default" : "secondary"}>{staff.is_active ? "Active" : "Inactive"}</Badge></Button>)}</div></div><div className="border bg-card p-6">{selected ? <><div className="flex items-start justify-between"><div><h2 className="text-xl font-extrabold">{selected.full_name}</h2><p className="text-sm text-muted-foreground">Staff ID: {selected.employee_code}</p></div><Badge variant={selected.is_active ? "default" : "secondary"}>{selected.is_active ? "Active" : "Inactive"}</Badge></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Full name"><Input value={selected.full_name} onChange={(event) => setSelected({ ...selected, full_name: event.target.value })} /></Field><Field label="Phone"><Input value={selected.phone || ""} onChange={(event) => setSelected({ ...selected, phone: event.target.value })} /></Field><Field label="Department"><Input value={selected.department || ""} onChange={(event) => setSelected({ ...selected, department: event.target.value })} /></Field><Field label="Job title"><Input value={selected.job_title || ""} onChange={(event) => setSelected({ ...selected, job_title: event.target.value })} /></Field><Field label="Joining date"><Input type="date" value={selected.joining_date || ""} onChange={(event) => setSelected({ ...selected, joining_date: event.target.value || null })} /></Field><Field label="Monthly salary (₹)"><Input type="number" min="0" value={selected.monthly_salary} onChange={(event) => setSelected({ ...selected, monthly_salary: Number(event.target.value) })} /></Field></div><div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => void saveProfile(selected)}>Save staff details</Button><Button variant="outline" onClick={() => setSelected({ ...selected, is_active: !selected.is_active })}>{selected.is_active ? "Mark inactive" : "Mark active"}</Button></div><div className="mt-7 border-t pt-6"><h3 className="font-bold">Salary adjustment</h3><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Field label="Month"><Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field><Field label="Deductions (₹)"><Input type="number" min="0" value={deductions} onChange={(event) => setDeductions(event.target.value)} /></Field><Field label="Bonuses (₹)"><Input type="number" min="0" value={bonuses} onChange={(event) => setBonuses(event.target.value)} /></Field><div className="flex items-end"><Button variant="secondary" className="w-full" onClick={() => void createSalary()}><IndianRupee />Save salary</Button></div></div></div></> : <div className="grid min-h-72 place-items-center text-center text-muted-foreground"><div><Users className="mx-auto mb-3" /><p>Select a staff member to manage their record.</p></div></div>}</div></div>}
    {view === "attendance" && <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{attendance.map((row) => { const staff = profiles.find((item) => item.id === row.user_id); return <article key={row.id} className="grid grid-cols-[6rem_1fr] gap-4 border bg-card p-3"><AttendancePhoto row={row} urls={photoUrls} className="aspect-square w-24" /><div className="min-w-0 self-center"><p className="truncate font-extrabold">{staff?.full_name || "Staff member"}</p><p className="text-xs text-muted-foreground">{staff?.employee_code || "—"}</p><p className="mt-2 text-sm font-semibold">{format(new Date(row.check_in), "hh:mm a")}</p><p className="text-xs text-muted-foreground">{format(new Date(`${row.work_date}T00:00:00`), "d MMM yyyy")}</p></div></article>; })}{!attendance.length && <p className="border bg-card p-10 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">No staff check-ins yet.</p>}</div>}
    {view === "payroll" && <div className="mt-6"><SalaryTable salaries={salaries} profiles={profiles} /></div>}
  </section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label>{label}</Label><div className="mt-2">{children}</div></div>; }