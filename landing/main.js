/* global window */

function getConfig() {
  const cfg = window.__EMBEDDED_WALLET_CONFIG__ || {};
  return {
    appUrl: typeof cfg.appUrl === "string" ? cfg.appUrl : "",
    docsUrl: typeof cfg.docsUrl === "string" ? cfg.docsUrl : "",
    githubUrl: typeof cfg.githubUrl === "string" ? cfg.githubUrl : "",
    statusUrl: typeof cfg.statusUrl === "string" ? cfg.statusUrl : ""
  };
}

function setHref(id, href) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!href) {
    el.style.display = "none";
    return;
  }
  el.setAttribute("href", href);
}

function initCtas() {
  const { appUrl } = getConfig();
  setHref("ctaMvpTop", appUrl);
  setHref("ctaMvp", appUrl);
  setHref("ctaOnramp", appUrl);
  setHref("ctaMvpBottom", appUrl);
  setHref("footerApp", appUrl);

  // If appUrl not configured, keep links on-page and show a subtle warning in console.
  if (!appUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      "[Landing] appUrl is not configured. Set it in landing/config.js to your deployed wallet URL (e.g. https://app.yourdomain.com)."
    );
  }
}

function initYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = String(new Date().getFullYear());
}

function initStars() {
  const canvas = document.getElementById("stars");
  if (!(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  let w = 0;
  let h = 0;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  const stars = [];
  const STAR_COUNT = 140;

  function resize() {
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars.length = 0;
    const density = STAR_COUNT;
    for (let i = 0; i < density; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random() * 0.65 + 0.15,
        v: Math.random() * 0.18 + 0.03
      });
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.9)";

    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      if (!prefersReduced) {
        s.y += s.v;
        if (s.y > h + 10) {
          s.y = -10;
          s.x = Math.random() * w;
        }
      }
    }

    ctx.globalAlpha = 1;
    if (!prefersReduced) requestAnimationFrame(tick);
  }

  window.addEventListener("resize", resize, { passive: true });
  resize();
  tick();
}

initCtas();
initYear();
initStars();


