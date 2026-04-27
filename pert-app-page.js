function createSupabaseClient() {
  const publicKey =
    typeof window.SUPABASE_PUBLISHABLE_KEY === "string"
      ? window.SUPABASE_PUBLISHABLE_KEY
      : window.SUPABASE_ANON_KEY;

  if (
    typeof window.supabase === "undefined" ||
    typeof window.SUPABASE_URL !== "string" ||
    typeof publicKey !== "string" ||
    window.SUPABASE_URL.includes("YOUR-") ||
    publicKey.includes("YOUR-")
  ) {
    return null;
  }

  return window.supabase.createClient(window.SUPABASE_URL, publicKey);
}

function showBlocked(message) {
  document.getElementById("loadingState").classList.add("hidden");
  document.getElementById("activeState").classList.add("hidden");
  document.getElementById("blockedState").classList.remove("hidden");
  document.getElementById("blockedMessage").textContent = message;
}

function hasActiveAccess(record) {
  if (!record) return false;

  const statusAllowsAccess =
    record.access_status === "active" || record.access_status === "canceled_pending";
  const accessUntil = record.access_until ? new Date(record.access_until).getTime() : 0;

  return statusAllowsAccess && accessUntil > Date.now();
}

async function fetchAccessRecord(supabaseClient, userId) {
  const { data, error } = await supabaseClient
    .from("customer_access")
    .select("access_status, access_until")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data[0] || null : null;
}

document.addEventListener("DOMContentLoaded", async () => {
  const supabaseClient = createSupabaseClient();
  if (!supabaseClient) {
    showBlocked(
      "Der Zugang ist im Moment noch nicht vollständig eingerichtet. Bitte versuchen Sie es später erneut oder wenden Sie sich an info@built-smart-hub.com."
    );
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "./pert-auth-portal.html";
    return;
  }

  document.getElementById("logoutButton").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "./pert-auth-portal.html";
  });

  try {
    const accessRecord = await fetchAccessRecord(supabaseClient, session.user.id);

    if (!hasActiveAccess(accessRecord)) {
      showBlocked(
        "Der Login war erfolgreich, aber für diese E-Mail-Adresse ist aktuell kein aktiver Zugang freigeschaltet. Bitte prüfen Sie Ihren Kauf oder wenden Sie sich an info@built-smart-hub.com."
      );
      return;
    }

    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("blockedState").classList.add("hidden");
    document.getElementById("activeState").classList.remove("hidden");
  } catch (error) {
    showBlocked(`Die Zugriffsprüfung konnte nicht abgeschlossen werden: ${error.message}`);
  }
});
