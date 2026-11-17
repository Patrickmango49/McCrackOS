(() => {
  "use strict";
  const POSITION_KEY = "vertex-music-widget-position";
  const REMOTE_MESSAGES = "https://raw.githack.com/Patrickmango49/McCrackOS/main/apps/messages/index.html";
  const css = document.createElement("style");
  css.textContent = `
    .messages-background-frame {
      position: fixed !important; left: -2px !important; top: -2px !important;
      width: 1px !important; height: 1px !important; border: 0 !important;
      opacity: 0 !important; pointer-events: none !important; z-index: 1 !important;
    }
    .music-widget {
      border-color: rgba(141,230,255,.26) !important;
      background: linear-gradient(145deg,rgba(10,22,38,.96),rgba(5,11,21,.94)) !important;
      box-shadow: 0 20px 58px rgba(0,0,0,.48), inset 0 1px rgba(255,255,255,.08), 0 0 28px rgba(55,198,237,.07) !important;
    }
    .music-widget-head { cursor: grab !important; touch-action: none; user-select: none; }
    .music-widget-drag-hint { margin-left: 4px; color: rgba(141,230,255,.58); font-size: 8px; letter-spacing: .1em; }
    .music-widget.is-dragging { cursor: grabbing; border-color: rgba(141,230,255,.62) !important; box-shadow: 0 26px 70px rgba(0,0,0,.55), 0 0 34px rgba(55,198,237,.16) !important; }
    .music-widget-reopen { cursor: grab !important; touch-action: none; user-select: none; }
    .os-incoming-call { border: 1px solid rgba(141,230,255,.24); box-shadow: 0 18px 58px rgba(0,0,0,.5), 0 0 26px rgba(55,198,237,.1); }
  `;
  document.head.appendChild(css);

  function savedPosition() {
    try {
      const p = JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
      return p && Number.isFinite(p.left) && Number.isFinite(p.top) ? p : null;
    } catch { return null; }
  }

  function bindWidget(node) {
    if (node.dataset.nativeDrag === "true" || node.dataset.runtimeDragBound === "true") return;
    const handle = node.classList.contains("music-widget-reopen") ? node : node.querySelector(".music-widget-head");
    if (!handle) return;
    node.dataset.runtimeDragBound = "true";
    const saved = savedPosition();
    if (saved) {
      node.style.left = saved.left + "px";
      node.style.top = saved.top + "px";
      node.style.bottom = "auto";
    }
    handle.style.cursor = "grab";
    handle.style.touchAction = "none";
    let drag = null;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (!node.classList.contains("music-widget-reopen") && event.target.closest("button,input")) return;
      const rect = node.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      try { handle.setPointerCapture(event.pointerId); } catch {}
      event.preventDefault();
    });
    handle.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const rect = node.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - rect.width - 8, drag.left + event.clientX - drag.x));
      const top = Math.max(8, Math.min(window.innerHeight - rect.height - 8, drag.top + event.clientY - drag.y));
      node.style.left = left + "px";
      node.style.top = top + "px";
      node.style.bottom = "auto";
      node.classList.add("is-dragging");
    });
    const finish = () => {
      if (!drag) return;
      drag = null;
      node.classList.remove("is-dragging");
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify({
          left: parseFloat(node.style.left),
          top: parseFloat(node.style.top)
        }));
      } catch {}
    };
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  function syncBackgroundMessages() {
    document.querySelectorAll(".music-widget,.music-widget-reopen").forEach(bindWidget);
    const root = document.querySelector(".os-root");
    const boot = document.querySelector(".boot-screen");
    if (!root || !boot || !boot.classList.contains("hidden")) return;
    if (document.querySelector(".profile-screen.active")) return;

    const activeMessages = Array.from(document.querySelectorAll('iframe[title="McCrack Chat"]'))
      .some((frame) => frame.closest(".app-window"));
    const background = document.querySelector('iframe.messages-background-frame[data-runtime-owned="true"]');
    if (activeMessages) {
      if (background) background.remove();
      return;
    }
    if (background) return;

    const frame = document.createElement("iframe");
    frame.className = "messages-background-frame";
    frame.dataset.runtimeOwned = "true";
    frame.title = "McCrack Chat";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.allow = "autoplay; clipboard-write; camera; microphone; fullscreen; display-capture";
    frame.src = location.protocol === "file:"
      ? REMOTE_MESSAGES
      : new URL("apps/messages/index.html", document.baseURI).href;
    document.body.appendChild(frame);
  }

  const observer = new MutationObserver(syncBackgroundMessages);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });
  document.addEventListener("DOMContentLoaded", syncBackgroundMessages, { once: true });
  window.addEventListener("load", syncBackgroundMessages, { once: true });
  window.setInterval(syncBackgroundMessages, 1500);
  syncBackgroundMessages();
})();