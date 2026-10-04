import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  Camera,
  Clock3,
  IndianRupee,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Camera as DeviceCamera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { Network } from "@capacitor/network";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";
import {
  buildCalendarMonthGrid,
  calculateAccruedSalary,
  calculatePayrollBreakdown,
  getCalendarDatesForMonth,
} from "@/lib/payroll";
import { registerForAdminPush } from "@/lib/push-notifications";
import {
  notifyAdminsOfCheckIn,
  registerAdminPushToken,
} from "@/lib/check-in-notifications.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Attendance Desk | OM Value Homes" },
      {
        name: "description",
        content: "Punch attendance and review salary records at OM Value Homes.",
      },
      { property: "og:title", content: "Attendance Desk | OM Value Homes" },
      { property: "og:description", content: "OM Value Homes staff attendance workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Attendance = Tables<"attendance">;
type Profile = Tables<"profiles">;
type Salary = Tables<"salary_records">;
type PunchLocation = { latitude: number; longitude: number };

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
  const [pushStatus, setPushStatus] = useState<"idle" | "busy" | "enabled">("idle");
  const [pushMessage, setPushMessage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [weekOffDates, setWeekOffDates] = useState<string[]>([]);
  const [weekOffMessage, setWeekOffMessage] = useState("");
  const [savingWeekOffs, setSavingWeekOffs] = useState(false);
  const [weeklyOffTableAvailable, setWeeklyOffTableAvailable] = useState(true);
  const initializedRealtime = useRef(false);
  const registerPushToken = useServerFn(registerAdminPushToken);
  const notifyAdmins = useServerFn(notifyAdminsOfCheckIn);

  const load = useCallback(
    async (monthOverride?: string) => {
      const targetMonth = monthOverride ?? format(new Date(), "yyyy-MM");
      const monthDate = new Date(`${targetMonth}-01T00:00:00`);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const date = format(new Date(), "yyyy-MM-dd");

      const [p, t, h, s, r] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .eq("work_date", date)
          .maybeSingle(),
        supabase
          .from("attendance")
          .select("*")
          .eq("user_id", user.id)
          .gte("work_date", format(monthDate, "yyyy-MM-dd"))
          .lt("work_date", format(monthEnd, "yyyy-MM-dd"))
          .order("work_date", { ascending: false }),
        supabase
          .from("salary_records")
          .select("*")
          .eq("user_id", user.id)
          .order("salary_month", { ascending: false }),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      let weekOffs: Array<{ off_date: string }> = [];
      try {
        const { data, error } = await supabase
          .from("weekly_offs")
          .select("off_date")
          .eq("user_id", user.id)
          .gte("off_date", format(monthDate, "yyyy-MM-dd"))
          .lt("off_date", format(monthEnd, "yyyy-MM-dd"));

        if (error) {
          const tableMissing = Boolean(error.message) && /weekly_offs/i.test(error.message);
          setWeeklyOffTableAvailable(!tableMissing);
          if (!tableMissing) throw error;
        } else {
          weekOffs = data ?? [];
          setWeeklyOffTableAvailable(true);
        }
      } catch {
        setWeeklyOffTableAvailable(false);
        setWeekOffMessage(
          "Weekly-off table is not available yet. Run the migration to enable this feature.",
        );
      }

      setProfile(p.data);
      setToday(t.data);
      setHistory(h.data || []);
      setSalaries(s.data || []);
      setWeekOffDates(weekOffs.map((item) => item.off_date));
      const admin = (r.data || []).some((item) => item.role === "admin");
      setIsAdmin(admin);
      if (admin) {
        const [ps, at, payroll] = await Promise.all([
          supabase.from("profiles").select("*").order("full_name"),
          supabase
            .from("attendance")
            .select("*")
            .order("check_in", { ascending: false })
            .limit(500),
          supabase
            .from("salary_records")
            .select("*")
            .order("salary_month", { ascending: false })
            .limit(500),
        ]);
        setProfiles(ps.data || []);
        setAllAttendance(at.data || []);
        setAllSalaries(payroll.data || []);
        const paths = (at.data || []).flatMap((row) => (row.photo_path ? [row.photo_path] : []));
        if (paths.length) {
          const { data: signed } = await supabase.storage
            .from("attendance-photos")
            .createSignedUrls(paths, 3600);
          setPhotoUrls(
            Object.fromEntries(
              (signed || [])
                .filter((item) => item.signedUrl)
                .map((item) => [item.path, item.signedUrl]),
            ),
          );
        }
      } else {
        const paths = (h.data || []).flatMap((row) => (row.photo_path ? [row.photo_path] : []));
        if (paths.length) {
          const { data: signed } = await supabase.storage
            .from("attendance-photos")
            .createSignedUrls(paths, 3600);
          setPhotoUrls(
            Object.fromEntries(
              (signed || [])
                .filter((item) => item.signedUrl)
                .map((item) => [item.path, item.signedUrl]),
            ),
          );
        }
      }
    },
    [user.id],
  );

  useEffect(() => {
    void load(selectedMonth);
    const channel = supabase
      .channel("live-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, (payload) => {
        const newAttendance = payload.new as { note?: string | null };
        if (
          payload.eventType === "INSERT" &&
          initializedRealtime.current &&
          !newAttendance.note?.startsWith("Manual attendance")
        ) {
          setUnreadCheckIns((count) => count + 1);
        }
        void load(selectedMonth);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "weekly_offs" },
        () => void load(selectedMonth),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") initializedRealtime.current = true;
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, selectedMonth]);

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please take a photo to check in.");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setMessage("");
  }

  async function submitAttendance(photoFile: File, location?: PunchLocation) {
    const extension = photoFile.type === "image/png" ? "png" : "jpg";
    const photoPath = `${user.id}/${format(new Date(), "yyyy-MM-dd")}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("attendance-photos")
      .upload(photoPath, photoFile, { contentType: photoFile.type, upsert: false });
    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }
    const { data: attendance, error } = location
      ? await supabase.rpc("punch_in_with_location", {
          _photo_path: photoPath,
          _latitude: location.latitude,
          _longitude: location.longitude,
        })
      : await supabase.rpc("punch_in", { _photo_path: photoPath });
    if (error) await supabase.storage.from("attendance-photos").remove([photoPath]);
    if (error) setMessage(error.message);
    else {
      setPhoto(null);
      setPhotoPreview(null);
      setMessage("Check-in recorded successfully.");
      if (attendance?.id) {
        void notifyAdmins({ data: { attendanceId: attendance.id } }).catch((notificationError) => {
          console.error("Admin push notification failed:", notificationError);
        });
      }
      await load();
    }
  }

  async function enablePhoneAlerts() {
    setPushStatus("busy");
    setPushMessage("");
    try {
      const result = await registerForAdminPush();
      if (result.status === "registered") {
        await registerPushToken({ data: { token: result.token } });
        setPushStatus("enabled");
        setPushMessage("Phone alerts enabled on this device.");
        return;
      }
      setPushStatus("idle");
      const messages = {
        "open-in-new-tab": "Open the app in its own tab or use the installed app to enable phone alerts.",
        denied: "Notifications are blocked. Allow them in this browser's site settings and try again.",
        unsupported: "This browser does not support background notifications.",
        "not-configured": "Web push is not configured for this connection.",
      } as const;
      setPushMessage(messages[result.status]);
    } catch (error) {
      setPushStatus("idle");
      setPushMessage(error instanceof Error ? error.message : "Phone alerts could not be enabled.");
    }
  }

  async function punchIn() {
    if (!photo) {
      setMessage("Take a live photo before checking in.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await submitAttendance(photo);
    } finally {
      setBusy(false);
    }
  }

  async function punchInNative() {
    setBusy(true);
    setMessage("");
    try {
      const network = await Network.getStatus();
      if (!network.connected) throw new Error("An internet connection is required to mark attendance.");

      let locationPermission;
      try {
        locationPermission = await Geolocation.checkPermissions();
        if (locationPermission.location !== "granted") {
          locationPermission = await Geolocation.requestPermissions({ permissions: ["location"] });
        }
      } catch {
        throw new Error("Location is unavailable. Turn on Location services and try again.");
      }
      if (locationPermission.location !== "granted") {
        throw new Error("Location permission was denied. Allow it in Android Settings to mark attendance.");
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      });
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
        throw new Error("The device did not return a valid location. Try again outdoors.");
      }

      let cameraPermission = await DeviceCamera.checkPermissions();
      if (cameraPermission.camera !== "granted") {
        cameraPermission = await DeviceCamera.requestPermissions({ permissions: ["camera"] });
      }
      if (cameraPermission.camera !== "granted") {
        throw new Error("Camera permission was denied. Allow it in Android Settings to take the attendance photo.");
      }

      const captured = await DeviceCamera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.DataUrl,
        quality: 85,
        saveToGallery: false,
        correctOrientation: true,
      });
      if (!captured.dataUrl) throw new Error("The camera did not return a photo. Please try again.");

      const photoBlob = await (await fetch(captured.dataUrl)).blob();
      const photoFile = new File([photoBlob], `attendance.${captured.format || "jpg"}`, {
        type: photoBlob.type || "image/jpeg",
      });
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhoto(photoFile);
      setPhotoPreview(URL.createObjectURL(photoFile));
      await submitAttendance(photoFile, location);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete attendance. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  function toggleWeekOffDate(dateKey: string) {
    setWeekOffDates((current) => {
      const next = new Set(current);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return [...next].sort();
    });
    setWeekOffMessage("");
  }

  async function saveWeekOffSelection() {
    if (!profile) return;

    if (!weeklyOffTableAvailable) {
      setWeekOffMessage(
        "Weekly-off table not found in the database. Please run the migration first.",
      );
      return;
    }

    setSavingWeekOffs(true);
    setWeekOffMessage("");

    const monthDate = new Date(`${selectedMonth}-01T00:00:00`);
    const nextMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const selectedDates = [...new Set(weekOffDates)].sort();

    const { error: deleteError } = await supabase
      .from("weekly_offs")
      .delete()
      .eq("user_id", user.id)
      .gte("off_date", format(monthDate, "yyyy-MM-dd"))
      .lt("off_date", format(nextMonthDate, "yyyy-MM-dd"));

    if (deleteError) {
      setWeekOffMessage(deleteError.message);
      setSavingWeekOffs(false);
      return;
    }

    if (selectedDates.length) {
      const rows = selectedDates.map((offDate) => ({
        user_id: user.id,
        off_date: offDate,
        notes: "week_off",
      }));

      const { error: insertError } = await supabase.from("weekly_offs").upsert(rows, {
        onConflict: "user_id,off_date",
      });

      if (insertError) {
        setWeekOffMessage(insertError.message);
        setSavingWeekOffs(false);
        return;
      }
    }

    const snapshot = calculatePayrollBreakdown({
      monthlySalary: Number(profile.monthly_salary || 0),
      daysInMonth: getCalendarDatesForMonth(monthDate).length,
      attendanceDays: history.filter((row) => row.work_date.startsWith(selectedMonth)).length,
      weekOffDays: selectedDates.length,
    });

    setWeekOffMessage(
      snapshot.extraWeekOffs > 0
        ? `Saved. ${snapshot.extraWeekOffs} extra weekly off day(s) will be deducted at ₹${Math.round(snapshot.dailyRate).toLocaleString("en-IN")} per day.`
        : "Weekly off dates saved successfully.",
    );
    setSavingWeekOffs(false);
  }

  const monthCalendarDays = buildCalendarMonthGrid(new Date(`${selectedMonth}-01T00:00:00`));
  const monthCalendarSet = new Set(weekOffDates);
  const attendanceThisMonth = history.filter((row) =>
    row.work_date.startsWith(selectedMonth),
  ).length;
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const elapsedWeekOffDays = weekOffDates.filter((dateKey) => dateKey <= todayKey).length;
  const liveSalaryEstimate = profile
    ? calculateAccruedSalary({
        monthlySalary: Number(profile.monthly_salary || 0),
        attendanceDays: attendanceThisMonth,
        weekOffDays: elapsedWeekOffDays,
      })
    : 0;
  const liveDailyRate = Number(profile?.monthly_salary || 0) / 30;
  const salarySnapshot = profile
    ? {
        netSalary: liveSalaryEstimate,
        dailyRate: liveDailyRate,
        deductions: Math.max(0, elapsedWeekOffDays - 4) * liveDailyRate,
      }
    : null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <Building2 />
            </span>
            <div>
              <p className="font-extrabold">OM VALUE HOMES</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "Admin workspace" : "Staff attendance"}
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {profile?.employee_code || user.email}
            </Badge>
            {isAdmin && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setNotificationsOpen((open) => !open);
                    setUnreadCheckIns(0);
                  }}
                  aria-label="Live attendance notifications"
                  title="Live attendance notifications"
                  className="relative"
                >
                  <Bell />
                  {unreadCheckIns > 0 && (
                    <span className="absolute right-0 top-0 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unreadCheckIns > 9 ? "9+" : unreadCheckIns}
                    </span>
                  )}
                </Button>
                {notificationsOpen && (
                  <div className="absolute right-10 top-12 z-20 w-[min(22rem,calc(100vw-2rem))] border bg-popover p-4 text-popover-foreground shadow-lg">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold">Live check-ins</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setNotificationsOpen(false)}
                        aria-label="Close notifications"
                      >
                        <X />
                      </Button>
                    </div>
                    <div className="border-b pb-3">
                      <Button
                        type="button"
                        variant={pushStatus === "enabled" ? "secondary" : "outline"}
                        className="w-full"
                        disabled={pushStatus === "busy" || pushStatus === "enabled"}
                        onClick={() => void enablePhoneAlerts()}
                      >
                        <BellRing />
                        {pushStatus === "busy"
                          ? "Enabling…"
                          : pushStatus === "enabled"
                            ? "Phone alerts enabled"
                            : "Enable phone alerts"}
                      </Button>
                      {pushMessage && (
                        <p className="mt-2 text-xs text-muted-foreground">{pushMessage}</p>
                      )}
                    </div>
                    <div className="mt-2 max-h-80 divide-y overflow-y-auto">
                      {allAttendance.slice(0, 5).map((row) => {
                        const staff = profiles.find((item) => item.id === row.user_id);
                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            key={row.id}
                            className="h-auto w-full justify-start rounded-none py-3 text-left"
                            onClick={() => {
                              setTab("admin");
                              setNotificationsOpen(false);
                            }}
                          >
                            <AttendancePhoto row={row} urls={photoUrls} className="size-12" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold">
                                {staff?.full_name || "Staff member"}
                              </span>
                              <span className="block text-xs font-normal text-muted-foreground">
                                Checked in at {format(new Date(row.check_in), "hh:mm a")}
                              </span>
                            </span>
                          </Button>
                        );
                      })}
                      {!allAttendance.length && (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          No check-ins yet.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut />
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <nav className="mb-8 flex gap-1 border-b">
          <Tab active={tab === "attendance"} onClick={() => setTab("attendance")} icon={<Clock3 />}>
            Attendance
          </Tab>
          <Tab active={tab === "salary"} onClick={() => setTab("salary")} icon={<IndianRupee />}>
            Salary
          </Tab>
          {isAdmin && (
            <Tab active={tab === "admin"} onClick={() => setTab("admin")} icon={<ShieldCheck />}>
              Admin
            </Tab>
          )}
        </nav>
        {tab === "attendance" && (
          <section>
            <div className="mb-7">
              <p className="text-sm font-semibold text-primary">
                {format(new Date(), "EEEE, d MMMM yyyy")}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold">
                Good day, {profile?.full_name?.split(" ")[0] || "team member"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Staff ID: {profile?.employee_code || "Pending"}
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-[1.2fr_.8fr]">
              <div className="border-t-4 border-primary bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">TODAY'S STATUS</p>
                    <h2 className="mt-2 text-2xl font-extrabold">
                      {today ? "Checked in" : "Not checked in"}
                    </h2>
                  </div>
                  <span className={`size-3 rounded-full ${today ? "bg-primary" : "bg-border"}`} />
                </div>
                {today ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-[9rem_1fr]">
                    <AttendancePhoto
                      row={today}
                      urls={photoUrls}
                      className="aspect-square w-full"
                    />
                    <TimeBox
                      label="CHECK-IN TIME"
                      value={format(new Date(today.check_in), "hh:mm a")}
                    />
                  </div>
                ) : Capacitor.isNativePlatform() ? (
                  <div className="mt-6">
                    {photoPreview && (
                      <img
                        src={photoPreview}
                        alt="Attendance photo preview"
                        className="mb-4 aspect-[4/3] max-h-72 w-full object-cover"
                      />
                    )}
                    <Button
                      size="lg"
                      className="h-14 w-full text-base"
                      disabled={busy}
                      onClick={() => void punchInNative()}
                    >
                      <Camera />
                      {busy ? "Getting location and camera…" : "Mark attendance"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6">
                    <label className="block cursor-pointer border-2 border-dashed border-input bg-muted p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(event) => choosePhoto(event.target.files?.[0])}
                      />
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt="Live check-in preview"
                          className="mx-auto aspect-[4/3] max-h-72 w-full object-cover"
                        />
                      ) : (
                        <span className="grid min-h-44 place-items-center">
                          <span>
                            <Camera className="mx-auto size-8 text-primary" />
                            <span className="mt-3 block font-bold">Take live photo</span>
                            <span className="mt-1 block text-sm text-muted-foreground">
                              Camera photo is required for attendance
                            </span>
                          </span>
                        </span>
                      )}
                    </label>
                    <Button
                      size="lg"
                      className="mt-4 h-14 w-full text-base"
                      disabled={busy || !photo}
                      onClick={() => void punchIn()}
                    >
                      <Camera />
                      {busy ? "Uploading…" : "Check in with photo"}
                    </Button>
                  </div>
                )}
                {message && (
                  <p
                    className={`mt-4 text-sm ${message.includes("successfully") || message.includes("Saved") ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {message}
                  </p>
                )}
                <div className="mt-6 rounded-md border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Live salary estimate
                      </p>
                      <h3 className="mt-2 text-2xl font-extrabold">
                        ₹{salarySnapshot ? salarySnapshot.netSalary.toLocaleString("en-IN") : "0"}
                      </h3>
                    </div>
                    <Badge variant="outline">{attendanceThisMonth} present</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Daily rate ₹
                    {salarySnapshot
                      ? Math.round(salarySnapshot.dailyRate).toLocaleString("en-IN")
                      : "0"}{" "}
                    · Deduction ₹
                    {salarySnapshot
                      ? Math.round(salarySnapshot.deductions).toLocaleString("en-IN")
                      : "0"}
                  </p>
                </div>
              </div>
              <div className="bg-primary p-6 text-primary-foreground">
                <CalendarDays />
                <p className="mt-8 text-sm font-semibold opacity-70">THIS MONTH</p>
                <p className="mt-2 text-5xl font-extrabold">
                  {
                    history.filter((item) =>
                      item.work_date.startsWith(format(new Date(), "yyyy-MM")),
                    ).length
                  }
                </p>
                <p className="mt-1 opacity-80">days recorded</p>
                <p className="mt-10 border-t border-primary-foreground/20 pt-5 text-sm opacity-80">
                  Your photo and check-in time update instantly for the administration team.
                </p>
              </div>
            </div>
            <History rows={history} photoUrls={photoUrls} />
          </section>
        )}
        {tab === "attendance" && (
          <div className="mt-6 rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold">Weekly off</h3>
                <p className="text-xs text-muted-foreground">
                  Up to 4 week-offs are free in a month. More than 4 will be deducted at the per-day
                  rate.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={savingWeekOffs || !weeklyOffTableAvailable}
                onClick={() => void saveWeekOffSelection()}
              >
                {savingWeekOffs ? "Saving…" : "Save week off"}
              </Button>
            </div>
            <div className="mt-4">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </div>
            <div className="mt-4 grid grid-cols-7 gap-2">
              <div className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Sun
              </div>
              <div className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Mon
              </div>
              <div className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Tue
              </div>
              <div className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Wed
              </div>
              <div className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Thu
              </div>
              <div className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Fri
              </div>
              <div className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
                Sat
              </div>
              {monthCalendarDays.map((dateValue, index) => {
                if (!dateValue)
                  return (
                    <div
                      key={`empty-${index}`}
                      className="h-10 rounded-md border border-dashed border-input bg-muted/30"
                    />
                  );
                const dateKey = format(dateValue, "yyyy-MM-dd");
                const isSelected = monthCalendarSet.has(dateKey);
                return (
                  <button
                    type="button"
                    key={dateKey}
                    onClick={() => toggleWeekOffDate(dateKey)}
                    className={`h-10 rounded-md border text-sm font-medium transition-colors ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-foreground hover:bg-muted"}`}
                  >
                    {dateValue.getDate()}
                  </button>
                );
              })}
            </div>
            {weekOffMessage && (
              <p className="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {weekOffMessage}
              </p>
            )}
          </div>
        )}
        {tab === "salary" && (
          <section>
            <LiveSalaryCard
              amount={liveSalaryEstimate}
              dailyRate={liveDailyRate}
              attendanceDays={attendanceThisMonth}
            />
            <SalaryTable salaries={salaries} />
          </section>
        )}
        {tab === "admin" && isAdmin && (
          <AdminPanel
            profiles={profiles}
            attendance={allAttendance}
            salaries={allSalaries}
            photoUrls={photoUrls}
            refresh={load}
          />
        )}
      </div>
    </main>
  );
}

function Tab({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      onClick={onClick}
      className={`h-12 rounded-none border-b-2 px-4 ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
    >
      {icon}
      {children}
    </Button>
  );
}
function TimeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted p-4">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-extrabold">{value}</p>
    </div>
  );
}
function LiveSalaryCard({
  amount,
  dailyRate,
  attendanceDays,
}: {
  amount: number;
  dailyRate: number;
  attendanceDays: number;
}) {
  return (
    <div className="mb-7 border-l-4 border-primary bg-card p-5">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Salary earned so far</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-3xl font-extrabold">₹{amount.toLocaleString("en-IN")}</p>
        <Badge variant="outline">{attendanceDays} present</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        ₹{Math.round(dailyRate).toLocaleString("en-IN")} per paid day
      </p>
    </div>
  );
}

function AttendancePhoto({
  row,
  urls,
  className,
}: {
  row: Attendance;
  urls: Record<string, string>;
  className: string;
}) {
  const url = row.photo_path ? urls[row.photo_path] : undefined;
  return url ? (
    <img
      src={url}
      alt="Attendance check-in"
      className={`${className} rounded-md bg-muted object-cover`}
    />
  ) : (
    <div
      className={`${className} grid place-items-center rounded-md bg-muted text-muted-foreground`}
    >
      <Camera />
    </div>
  );
}

function History({ rows, photoUrls }: { rows: Attendance[]; photoUrls: Record<string, string> }) {
  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-extrabold">Recent attendance</h2>
      <div className="divide-y border bg-card">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 p-4">
            <AttendancePhoto row={row} urls={photoUrls} className="size-14" />
            <div>
              <p className="font-semibold">
                {format(new Date(`${row.work_date}T00:00:00`), "d MMM, EEE")}
              </p>
              <p className="text-xs text-muted-foreground">
                Checked in at {format(new Date(row.check_in), "hh:mm a")}
              </p>
            </div>
            <Badge>Recorded</Badge>
          </div>
        ))}
        {!rows.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Your attendance history will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

function SalaryTable({ salaries, profiles }: { salaries: Salary[]; profiles?: Profile[] }) {
  return (
    <section>
      <h1 className="text-3xl font-extrabold">{profiles ? "Salary records" : "Monthly salary"}</h1>
      <p className="mt-2 text-muted-foreground">
        Salary, attendance, adjustments, and payment status.
      </p>
      <div className="mt-7 overflow-x-auto border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              {profiles && <th className="p-4">Staff</th>}
              <th className="p-4">Month</th>
              <th className="p-4">Attendance</th>
              <th className="p-4">Base</th>
              <th className="p-4">Adjustments</th>
              <th className="p-4">Net salary</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((salary) => {
              const staff = profiles?.find((item) => item.id === salary.user_id);
              return (
                <tr key={salary.id} className="border-t">
                  {profiles && (
                    <td className="p-4">
                      <p className="font-semibold">{staff?.full_name || "Staff member"}</p>
                      <p className="text-xs text-muted-foreground">{staff?.employee_code || "—"}</p>
                    </td>
                  )}
                  <td className="p-4 font-semibold">
                    {format(new Date(`${salary.salary_month}T00:00:00`), "MMMM yyyy")}
                  </td>
                  <td className="p-4">
                    {salary.attendance_days}/{salary.working_days} days
                  </td>
                  <td className="p-4">₹{Number(salary.base_salary).toLocaleString("en-IN")}</td>
                  <td className="p-4">
                    −₹{Number(salary.deductions).toLocaleString("en-IN")} / +₹
                    {Number(salary.bonuses).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4 font-bold">
                    ₹{Number(salary.net_salary || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="p-4">
                    <Badge variant={salary.status === "paid" ? "default" : "secondary"}>
                      {salary.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {!salaries.length && (
              <tr>
                <td colSpan={profiles ? 7 : 6} className="p-10 text-center text-muted-foreground">
                  No salary records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminPanel({
  profiles,
  attendance,
  salaries,
  photoUrls,
  refresh,
}: {
  profiles: Profile[];
  attendance: Attendance[];
  salaries: Salary[];
  photoUrls: Record<string, string>;
  refresh: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Profile | null>(null);
  const [view, setView] = useState<"staff" | "attendance" | "payroll" | "calendar">("staff");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [deductions, setDeductions] = useState("0");
  const [bonuses, setBonuses] = useState("0");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  async function saveProfile(staff: Profile) {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: staff.full_name,
        phone: staff.phone,
        department: staff.department,
        job_title: staff.job_title,
        joining_date: staff.joining_date,
        monthly_salary: staff.monthly_salary,
        is_active: staff.is_active,
      })
      .eq("id", staff.id);
    setMessage(error?.message || "Staff details saved.");
    if (!error) {
      setSelected(null);
      await refresh();
    }
  }

  async function createSalary() {
    if (!selected) return;
    const { error } = await supabase
      .from("salary_records")
      .upsert(
        {
          user_id: selected.id,
          salary_month: `${month}-01`,
          base_salary: selected.monthly_salary,
          deductions: Number(deductions),
          bonuses: Number(bonuses),
        },
        { onConflict: "user_id,salary_month" },
      );
    setMessage(error?.message || "Salary record saved.");
    if (!error) await refresh();
  }

  async function generatePayroll() {
    setProcessing(true);
    setMessage("");
    const target = `${format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), "yyyy-MM")}-01`;
    const { data, error } = await supabase.rpc("generate_monthly_salaries", {
      _salary_month: target,
    });
    setProcessing(false);
    setMessage(error?.message || `${data || 0} salary records prepared.`);
    if (!error) await refresh();
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Administration</h1>
          <p className="mt-2 text-muted-foreground">
            Manage every staff record, attendance entry, and monthly salary.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void generatePayroll()} disabled={processing}>
            <IndianRupee />
            {processing ? "Calculating…" : "Calculate last month"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refresh()}
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw />
          </Button>
        </div>
      </div>
      <div className="mt-6 flex gap-2 border-b">
        <Tab active={view === "staff"} onClick={() => setView("staff")} icon={<Users />}>
          Staff
        </Tab>
        <Tab
          active={view === "calendar"}
          onClick={() => setView("calendar")}
          icon={<CalendarDays />}
        >
          Calendar
        </Tab>
        <Tab active={view === "attendance"} onClick={() => setView("attendance")} icon={<Clock3 />}>
          Records
        </Tab>
        <Tab active={view === "payroll"} onClick={() => setView("payroll")} icon={<IndianRupee />}>
          Payroll
        </Tab>
      </div>
      {message && (
        <p className="mt-4 border-l-4 border-primary bg-muted p-3 text-sm font-medium">{message}</p>
      )}
      {view === "calendar" && (
        <AdminAttendanceCalendar profiles={profiles} selected={selected} refresh={refresh} />
      )}
      {view === "staff" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
          <div className="border bg-card">
            <div className="flex items-center gap-3 border-b p-4">
              <Users className="text-primary" />
              <h2 className="font-extrabold">Staff directory</h2>
              <Badge variant="secondary">{profiles.length}</Badge>
            </div>
            <div className="divide-y">
              {profiles.map((staff) => (
                <Button
                  key={staff.id}
                  variant="ghost"
                  className="h-auto w-full justify-between rounded-none p-4 text-left"
                  onClick={() => {
                    setSelected(staff);
                    setMessage("");
                  }}
                >
                  <span>
                    <span className="block font-semibold">{staff.full_name}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {staff.employee_code} · {staff.job_title || "Position not set"}
                    </span>
                  </span>
                  <Badge variant={staff.is_active ? "default" : "secondary"}>
                    {staff.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
          <div className="border bg-card p-6">
            {selected ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold">{selected.full_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Staff ID: {selected.employee_code}
                    </p>
                  </div>
                  <Badge variant={selected.is_active ? "default" : "secondary"}>
                    {selected.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <Input
                      value={selected.full_name}
                      onChange={(event) =>
                        setSelected({ ...selected, full_name: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Phone">
                    <Input
                      value={selected.phone || ""}
                      onChange={(event) => setSelected({ ...selected, phone: event.target.value })}
                    />
                  </Field>
                  <Field label="Department">
                    <Input
                      value={selected.department || ""}
                      onChange={(event) =>
                        setSelected({ ...selected, department: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Job title">
                    <Input
                      value={selected.job_title || ""}
                      onChange={(event) =>
                        setSelected({ ...selected, job_title: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Joining date">
                    <Input
                      type="date"
                      value={selected.joining_date || ""}
                      onChange={(event) =>
                        setSelected({ ...selected, joining_date: event.target.value || null })
                      }
                    />
                  </Field>
                  <Field label="Monthly salary (₹)">
                    <Input
                      type="number"
                      min="0"
                      value={selected.monthly_salary}
                      onChange={(event) =>
                        setSelected({ ...selected, monthly_salary: Number(event.target.value) })
                      }
                    />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button onClick={() => void saveProfile(selected)}>Save staff details</Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelected({ ...selected, is_active: !selected.is_active })}
                  >
                    {selected.is_active ? "Mark inactive" : "Mark active"}
                  </Button>
                </div>
                <div className="mt-7 border-t pt-6">
                  <h3 className="font-bold">Salary adjustment</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Month">
                      <Input
                        type="month"
                        value={month}
                        onChange={(event) => setMonth(event.target.value)}
                      />
                    </Field>
                    <Field label="Deductions (₹)">
                      <Input
                        type="number"
                        min="0"
                        value={deductions}
                        onChange={(event) => setDeductions(event.target.value)}
                      />
                    </Field>
                    <Field label="Bonuses (₹)">
                      <Input
                        type="number"
                        min="0"
                        value={bonuses}
                        onChange={(event) => setBonuses(event.target.value)}
                      />
                    </Field>
                    <div className="flex items-end">
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={() => void createSalary()}
                      >
                        <IndianRupee />
                        Save salary
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid min-h-72 place-items-center text-center text-muted-foreground">
                <div>
                  <Users className="mx-auto mb-3" />
                  <p>Select a staff member to manage their record.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {view === "attendance" && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {attendance.map((row) => {
            const staff = profiles.find((item) => item.id === row.user_id);
            return (
              <article key={row.id} className="grid grid-cols-[6rem_1fr] gap-4 border bg-card p-3">
                <AttendancePhoto row={row} urls={photoUrls} className="aspect-square w-24" />
                <div className="min-w-0 self-center">
                  <p className="truncate font-extrabold">{staff?.full_name || "Staff member"}</p>
                  <p className="text-xs text-muted-foreground">{staff?.employee_code || "—"}</p>
                  <p className="mt-2 text-sm font-semibold">
                    {format(new Date(row.check_in), "hh:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(`${row.work_date}T00:00:00`), "d MMM yyyy")}
                  </p>
                </div>
              </article>
            );
          })}
          {!attendance.length && (
            <p className="border bg-card p-10 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              No staff check-ins yet.
            </p>
          )}
        </div>
      )}
      {view === "payroll" && (
        <div className="mt-6">
          <SalaryTable salaries={salaries} profiles={profiles} />
        </div>
      )}
    </section>
  );
}

function AdminAttendanceCalendar({
  profiles,
  selected,
  refresh,
}: {
  profiles: Profile[];
  selected: Profile | null;
  refresh: () => Promise<void>;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState(selected?.id || profiles[0]?.id || "");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [weekOffDates, setWeekOffDates] = useState<string[]>([]);
  const [savingDate, setSavingDate] = useState("");
  const [message, setMessage] = useState("");
  const staff = profiles.find((item) => item.id === selectedStaffId) || null;
  const monthDate = new Date(`${month}-01T00:00:00`);
  const monthStart = format(monthDate, "yyyy-MM-dd");
  const monthEnd = format(
    new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1),
    "yyyy-MM-dd",
  );
  const calendarDays = buildCalendarMonthGrid(monthDate);
  const todayKey = format(new Date(), "yyyy-MM-dd");

  const loadCalendar = useCallback(async () => {
    if (!selectedStaffId) return;
    const [attendanceResult, weekOffResult] = await Promise.all([
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", selectedStaffId)
        .gte("work_date", monthStart)
        .lt("work_date", monthEnd),
      supabase
        .from("weekly_offs")
        .select("off_date")
        .eq("user_id", selectedStaffId)
        .gte("off_date", monthStart)
        .lt("off_date", monthEnd),
    ]);
    if (attendanceResult.error || weekOffResult.error) {
      setMessage(
        attendanceResult.error?.message ||
          weekOffResult.error?.message ||
          "Could not load this calendar.",
      );
      return;
    }
    setAttendance(attendanceResult.data || []);
    setWeekOffDates((weekOffResult.data || []).map((item) => item.off_date));
  }, [monthEnd, monthStart, selectedStaffId]);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  async function saveDayStatus(dateKey: string, status: "present" | "absent" | "week_off") {
    if (!staff) return;
    setSavingDate(dateKey);
    setMessage("");
    const { error } = await supabase.rpc("admin_set_attendance_status", {
      _user_id: staff.id,
      _work_date: dateKey,
      _status: status,
    });

    if (error) setMessage(error.message);
    else {
      setMessage(
        `${format(new Date(`${dateKey}T00:00:00`), "d MMMM")} marked ${status.replace("_", " ")}.`,
      );
      await Promise.all([loadCalendar(), refresh()]);
    }
    setSavingDate("");
  }

  const attendanceByDate = new Map(attendance.map((row) => [row.work_date, row]));
  const weekOffSet = new Set(weekOffDates);
  const attendanceDays = attendance.length;
  const elapsedWeekOffDays = weekOffDates.filter((dateKey) => dateKey <= todayKey).length;
  const liveSalary = staff
    ? calculateAccruedSalary({
        monthlySalary: Number(staff.monthly_salary),
        attendanceDays,
        weekOffDays: elapsedWeekOffDays,
      })
    : 0;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold">Staff attendance calendar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a staff member and update past dates. Manual Present does not require a photo.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Staff member">
            <select
              className="h-10 w-full min-w-56 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedStaffId}
              onChange={(event) => setSelectedStaffId(event.target.value)}
            >
              <option value="" disabled>
                Select staff
              </option>
              {profiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.employee_code} · {item.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Month">
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </Field>
        </div>
      </div>
      {staff && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y py-3">
          <p className="font-semibold">
            {staff.full_name}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              · {staff.employee_code}
            </span>
          </p>
          <p className="text-sm">
            Live accrued salary: <strong>₹{liveSalary.toLocaleString("en-IN")}</strong>{" "}
            <span className="text-muted-foreground">({attendanceDays} present)</span>
          </p>
        </div>
      )}
      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground sm:text-xs"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((dateValue, index) => {
          if (!dateValue)
            return (
              <div
                key={`blank-${index}`}
                className="min-h-20 rounded-md border border-dashed border-input bg-muted/20 sm:min-h-24"
              />
            );
          const dateKey = format(dateValue, "yyyy-MM-dd");
          const dateStatus = attendanceByDate.has(dateKey)
            ? "present"
            : weekOffSet.has(dateKey)
              ? "week_off"
              : "absent";
          const isBeforeJoining = Boolean(staff?.joining_date && dateKey < staff.joining_date);
          const disabled = !staff || dateKey > todayKey || isBeforeJoining || Boolean(savingDate);
          return (
            <div key={dateKey} className="min-w-0 rounded-md border bg-card p-1.5 sm:p-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold sm:text-sm">{dateValue.getDate()}</span>
                {attendanceByDate.get(dateKey)?.note?.includes("Manual attendance") && (
                  <span className="text-[9px] text-muted-foreground">Manual</span>
                )}
              </div>
              <select
                aria-label={`${format(dateValue, "d MMMM")} attendance status`}
                className="h-8 w-full min-w-0 rounded border border-input bg-background px-1 text-[10px] sm:text-xs"
                value={dateStatus}
                disabled={disabled}
                onChange={(event) =>
                  void saveDayStatus(
                    dateKey,
                    event.target.value as "present" | "absent" | "week_off",
                  )
                }
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="week_off">Week off</option>
              </select>
            </div>
          );
        })}
      </div>
      {message && <p className="mt-4 border-l-4 border-primary bg-muted p-3 text-sm">{message}</p>}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
