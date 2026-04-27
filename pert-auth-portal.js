function getSupabaseClient() {
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

function setStatus(message, type = "info") {
  const statusBox = document.getElementById("statusBox");
  statusBox.className = `notice notice-${type}`;
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
  statusBox.hidden = false;
}

function showResetSection() {
  const section = document.getElementById("resetPasswordSection");
  if (!section) return;
  section.classList.remove("hidden");
  section.hidden = false;
}

function hideResetSection() {
  const section = document.getElementById("resetPasswordSection");
  if (!section) return;
  section.classList.add("hidden");
  section.hidden = true;
}

function setResetIntro(message, type = "info") {
  const intro = document.getElementById("resetPasswordIntro");
  if (!intro) return;
  showResetSection();
  intro.className = `notice notice-${type}`;
  intro.textContent = message;
  intro.classList.remove("hidden");
  intro.hidden = false;
}

function hideResetIntro() {
  const intro = document.getElementById("resetPasswordIntro");
  if (!intro) return;
  intro.classList.add("hidden");
  intro.hidden = true;
}

function toggleResetPasswordForm(isVisible) {
  const form = document.getElementById("resetPasswordForm");
  if (!form) return;
  if (isVisible) {
    showResetSection();
  }
  form.classList.toggle("hidden", !isVisible);
  form.hidden = !isVisible;
}

function isInvalidCredentialsError(error) {
  return typeof error?.message === "string" &&
    error.message.toLowerCase().includes("invalid login credentials");
}

function disableConfigWarningIfReady(supabaseClient) {
  const warning = document.getElementById("configWarning");
  if (supabaseClient) {
    warning.style.display = "none";
  }
}

async function redirectIfAlreadyLoggedIn(supabaseClient) {
  if (!supabaseClient) return;

  if (
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("access_token=")
  ) {
    return;
  }

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (session) {
    window.location.href = "./pert-dashboard.html";
  }
}

async function handleLogin(event, supabaseClient) {
  event.preventDefault();
  if (!supabaseClient) {
    setStatus("Der Zugang ist im Moment noch nicht vollständig eingerichtet. Bitte versuchen Sie es später erneut oder wenden Sie sich an info@built-smart-hub.com.", "warn");
    return;
  }

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (isInvalidCredentialsError(error)) {
      setResetIntro(
        "Passwort nicht erkannt. Wenn Sie Ihr Passwort vergessen haben, klicken Sie jetzt auf Passwort vergessen. Nach dem Link aus der E-Mail erscheint hier das Formular für Ihr neues Passwort.",
        "warn"
      );
      toggleResetPasswordForm(false);
    }
    setStatus(`Login fehlgeschlagen: ${error.message}`, "error");
    return;
  }

  hideResetSection();
  hideResetIntro();
  setStatus("Login erfolgreich. Sie werden jetzt in den geschützten Bereich weitergeleitet.", "success");
  window.location.href = "./pert-dashboard.html";
}

async function handleForgotPassword(supabaseClient) {
  if (!supabaseClient) {
    setStatus("Der Zugang ist im Moment noch nicht vollständig eingerichtet. Bitte versuchen Sie es später erneut oder wenden Sie sich an info@built-smart-hub.com.", "warn");
    return;
  }

  const email = document.getElementById("email").value.trim();
  if (!email) {
    setStatus("Bitte zuerst Ihre E-Mail-Adresse im Login-Feld eintragen.", "warn");
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}`,
  });

  if (error) {
    setStatus(`Passwort-Reset fehlgeschlagen: ${error.message}`, "error");
    return;
  }

  setResetIntro(
    "Passwort-Reset gesendet. Bitte öffnen Sie die E-Mail und klicken Sie auf den Link. Danach können Sie auf dieser Seite unten Ihr neues Passwort speichern.",
    "success"
  );
  setStatus(
    "Passwort-Reset gesendet. Bitte öffnen Sie die E-Mail und setzen Sie danach auf dieser Seite ein neues Passwort.",
    "success"
  );
}

async function handleResetPassword(event, supabaseClient) {
  event.preventDefault();
  if (!supabaseClient) {
    setStatus("Der Zugang ist im Moment noch nicht vollständig eingerichtet. Bitte versuchen Sie es später erneut oder wenden Sie sich an info@built-smart-hub.com.", "warn");
    return;
  }

  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmNewPassword").value;

  if (newPassword.length < 8) {
    setStatus("Das neue Passwort sollte mindestens 8 Zeichen lang sein.", "warn");
    return;
  }

  if (newPassword !== confirmPassword) {
    setStatus("Die beiden neuen Passwörter stimmen nicht überein.", "warn");
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    setStatus(`Neues Passwort konnte nicht gespeichert werden: ${error.message}`, "error");
    return;
  }

  toggleResetPasswordForm(false);
  hideResetIntro();
  hideResetSection();
  window.history.replaceState({}, document.title, window.location.pathname);
  setStatus("Neues Passwort gespeichert. Sie können sich jetzt direkt einloggen.", "success");
}

async function initRecoveryState(supabaseClient) {
  if (!supabaseClient) return;

  const hash = window.location.hash || "";
  const isRecoveryFlow =
    hash.includes("type=recovery") || hash.includes("access_token=");

  if (!isRecoveryFlow) return;

  setResetIntro(
    "Passwort-Reset erkannt. Bitte vergeben Sie jetzt Ihr neues Passwort.",
    "info"
  );
  toggleResetPasswordForm(true);
  setStatus(
    "Passwort-Reset erkannt. Bitte vergeben Sie unten jetzt ein neues Passwort.",
    "info"
  );
}

async function handleRegister(event, supabaseClient) {
  event.preventDefault();
  if (!supabaseClient) {
    setStatus("Der Zugang ist im Moment noch nicht vollständig eingerichtet. Bitte versuchen Sie es später erneut oder wenden Sie sich an info@built-smart-hub.com.", "warn");
    return;
  }

  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}${window.location.pathname.replace("pert-auth-portal.html", "pert-dashboard.html")}`,
    },
  });

  if (error) {
    setStatus(`Registrierung fehlgeschlagen: ${error.message}`, "error");
    return;
  }

  setStatus(
    "Zugang angelegt. Falls eine E-Mail-Bestätigung erforderlich ist, prüfen Sie bitte Ihr E-Mail-Postfach und bestätigen Sie zuerst Ihre E-Mail-Adresse.",
    "success"
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  const supabaseClient = getSupabaseClient();
  hideResetSection();
  disableConfigWarningIfReady(supabaseClient);
  await initRecoveryState(supabaseClient);
  await redirectIfAlreadyLoggedIn(supabaseClient);

  document
    .getElementById("loginForm")
    .addEventListener("submit", (event) => handleLogin(event, supabaseClient));

  document
    .getElementById("registerForm")
    .addEventListener("submit", (event) => handleRegister(event, supabaseClient));

  document
    .getElementById("forgotPasswordButton")
    .addEventListener("click", () => handleForgotPassword(supabaseClient));

  document
    .getElementById("resetPasswordForm")
    .addEventListener("submit", (event) => handleResetPassword(event, supabaseClient));

  supabaseClient?.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      setResetIntro(
        "Passwort-Reset erkannt. Bitte vergeben Sie jetzt Ihr neues Passwort.",
        "info"
      );
      toggleResetPasswordForm(true);
      setStatus(
        "Passwort-Reset erkannt. Bitte vergeben Sie unten jetzt ein neues Passwort.",
        "info"
      );
    }
  });
});
