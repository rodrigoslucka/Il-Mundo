function showStartupError(message) {
  const root = document.querySelector("#app");
  if (!root || !root.querySelector(".boot-screen")) return;

  const screen = document.createElement("main");
  screen.className = "error-screen";
  screen.setAttribute("role", "alert");
  const title = document.createElement("h1");
  title.textContent = "No se pudo iniciar la aplicación";
  const description = document.createElement("p");
  description.textContent = "Comprueba que abriste el proyecto con start.ps1 y que los archivos se descargaron completos. Detalle técnico:";
  const detail = document.createElement("code");
  detail.style.overflowWrap = "anywhere";
  detail.textContent = message;
  screen.append(title, description, detail);
  root.replaceChildren(screen);
}

window.addEventListener("error", (event) => {
  if (event.target instanceof HTMLScriptElement || !event.filename || !document.querySelector("#app .app-shell")) {
    console.error("Error al cargar o iniciar Il Mundo.", event.error || event.message || event.target?.src);
    const location = event.filename ? ` (${event.filename}:${event.lineno}:${event.colno})` : "";
    showStartupError(`${event.message || "No se pudo cargar el código JavaScript. Revisa que la ruta del proyecto sea correcta."}${location}`);
  }
}, true);

window.addEventListener("unhandledrejection", (event) => {
  console.error("Error inesperado en Il Mundo.", event.reason);
  const root = document.querySelector("#app");
  const toast = root?.querySelector("#toast-container");
  if (toast) {
    const errorToast = document.createElement("div");
    errorToast.className = "toast error";
    errorToast.setAttribute("role", "alert");
    errorToast.textContent = `No se pudo completar la acción: ${event.reason?.message || "error inesperado"}.`;
    toast.append(errorToast);
  } else {
    showStartupError(event.reason?.message || "Ocurrió un error inesperado al iniciar la aplicación.");
  }
});
