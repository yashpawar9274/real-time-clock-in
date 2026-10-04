import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const tokenSchema = z.object({ token: z.string().min(20).max(4096) });
const attendanceSchema = z.object({ attendanceId: z.string().uuid() });

export const registerAdminPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Administrator access required");

    const { error } = await context.supabase.from("admin_push_tokens").upsert(
      {
        user_id: context.userId,
        token: data.token,
        platform: "web",
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const notifyAdminsOfCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => attendanceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: attendance, error: attendanceError } = await context.supabase
      .from("attendance")
      .select("id,user_id,check_in,note,push_notified_at")
      .eq("id", data.attendanceId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (attendanceError || !attendance) throw new Error("Check-in could not be verified");
    if (attendance.note?.startsWith("Manual attendance") || attendance.push_notified_at) {
      return { delivered: 0 };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile }, { data: adminRoles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name,employee_code").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
    ]);
    const adminIds = (adminRoles ?? []).map((item) => item.user_id);
    if (!adminIds.length) return { delivered: 0 };

    const { data: registrations } = await supabaseAdmin
      .from("admin_push_tokens")
      .select("id,token")
      .in("user_id", adminIds);
    if (!registrations?.length) return { delivered: 0 };

    const lovableApiKey = process.env["LOVABLE_API_KEY"];
    const connectionApiKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableApiKey || !connectionApiKey) throw new Error("Phone alerts are not configured");

    const staleIds: string[] = [];
    let delivered = 0;
    const title = `${profile?.full_name || "A staff member"} checked in`;
    const body = `${profile?.employee_code || "Staff"} · ${new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(new Date(attendance.check_in))}`;

    await Promise.all(
      registrations.map(async (registration) => {
        const response = await fetch(
          "https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": connectionApiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token: registration.token,
                notification: { title, body },
                data: { path: "/dashboard", attendanceId: attendance.id },
                webpush: {
                  fcm_options: { link: "/dashboard" },
                  notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
                },
              },
            }),
          },
        );
        if (response.ok) {
          delivered += 1;
          return;
        }
        const errorBody = await response.text();
        console.error(`FCM send failed [${response.status}]: ${errorBody}`);
        if (response.status === 404 || (response.status === 400 && /INVALID_ARGUMENT|UNREGISTERED/i.test(errorBody))) {
          staleIds.push(registration.id);
        }
      }),
    );

    if (staleIds.length) await supabaseAdmin.from("admin_push_tokens").delete().in("id", staleIds);
    await supabaseAdmin
      .from("attendance")
      .update({ push_notified_at: new Date().toISOString() })
      .eq("id", attendance.id)
      .is("push_notified_at", null);
    return { delivered };
  });
