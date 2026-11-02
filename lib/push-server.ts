import webpush from "web-push";
import { getSupabase } from "@/lib/supabase";

let configured = false;
function ensureConfigured() {
  if (configured) return;
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@diporani.com";
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
}

export async function notifyAdmins(title: string, body: string, url = "/") {
  ensureConfigured();
  if (!configured) return;
  try {
    const supabase = getSupabase();
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("target_type", "admin");

    if (!subs || subs.length === 0) return;

    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title, body, url })
          );
        } catch (e: unknown) {
          const statusCode = (e as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
      })
    );

    // Log notifikasi (satu baris per event)
    await supabase.from("notif_log").insert({ target_type: "admin", target_id: null, title, body, url });
  } catch (e) {
    console.error("notifyAdmins error:", e);
  }
}