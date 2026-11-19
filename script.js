const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
$("year").textContent = new Date().getFullYear();

/* ---------- Render content (from profile.js) ---------- */
function timeline(target, items) {
  items.forEach((it) => {
    const li = el("li");
    li.append(el("b", it.title), el("small", `${it.org} · ${it.period}`));
    if (it.note) li.append(el("small", it.note));
    if (it.points) { const ul = el("ul"); it.points.forEach((p) => ul.append(el("li", p))); li.append(ul); }
    target.append(li);
  });
}

function render(p) {
  $("summary").textContent = p.summary;
  p.skills.forEach((g) => {
    const row = el("div", "", "skill-row"); row.append(el("b", g.group));
    const s = el("span"); g.items.forEach((i) => s.append(el("i", i))); row.append(s);
    $("skills").append(row);
  });
  p.projects.forEach((pr) => {
    const a = el("article", "", "project" + (pr.featured ? " featured" : ""));
    const head = el("div"); head.append(el("h3", pr.title), el("p", pr.subtitle, "sub"));
    const body = el("div"); body.append(el("p", pr.text));
    const tags = el("ul", "", "tags"); pr.tags.forEach((t) => tags.append(el("li", t))); body.append(tags);
    a.append(head, body); $("projectList").append(a);
  });
  timeline($("experience"), p.experience);
  timeline($("education"), p.education);
  p.achievements.forEach((t) => $("achievements").append(el("li", t)));
  p.certifications.forEach((t) => $("certifications").append(el("li", t)));
  p.leadership.forEach((t) => $("leadership").append(el("li", t)));
  $("languages").textContent = p.languages.join(", ");
  $("softSkills").textContent = p.softSkills.join(", ");
  const c = p.contact;
  [["Email", c.email, "mailto:" + c.email], ["Phone", c.phone, "tel:" + c.phone.replace(/\s/g, "")],
   ["LinkedIn", c.linkedin.replace("https://", ""), c.linkedin], ["GitHub", c.github.replace("https://", ""), c.github]]
    .forEach(([label, text, href]) => {
      const li = el("li"); const a = el("a", text); a.href = href;
      if (href.startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; }
      li.append(el("b", label + ": "), a); $("links").append(li);
    });
}

render(window.PROFILE);

/* ---------- Contact form ---------- */
$("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = $("formStatus"); status.className = ""; status.textContent = "Sending…";
  const body = Object.fromEntries(new FormData(e.target));
  try {
    if (location.protocol === "file:") throw new Error("no-backend");
    const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    e.target.reset(); status.className = "ok"; status.textContent = "Message sent. Thank you, I’ll reply soon.";
  } catch (err) {
    if (err.message === "no-backend" || err instanceof TypeError) {
      // No backend running: open the visitor's email app with the message filled in
      const subject = encodeURIComponent("Portfolio message from " + body.name);
      const text = encodeURIComponent(body.message + "\n\n" + body.name + " (" + body.email + ")");
      location.href = "mailto:" + window.PROFILE.contact.email + "?subject=" + subject + "&body=" + text;
      status.className = "ok"; status.textContent = "Opening your email app to send this message.";
    } else { status.className = "err"; status.textContent = err.message; }
  }
});

/* ---------- Hero: heat grid (hotspots follow the cursor) ---------- */
(function () {
  const cv = $("heat"), ctx = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GAP = 26; let W, H, cols, rows, heat, mouse = null, t = 0;
  function size() {
    const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    cols = Math.ceil(W / GAP) + 1; rows = Math.ceil(H / GAP) + 1; heat = new Float32Array(cols * rows);
  }
  function spot(x, y, power) {
    const R = 5;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const cx = Math.round(x / GAP) + i, cy = Math.round(y / GAP) + j;
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      const k = Math.max(0, 1 - Math.hypot(i, j) / R) * power;
      heat[cy * cols + cx] = Math.min(1, Math.max(heat[cy * cols + cx], k));
    }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H); t += 0.004;
    if (!still) {
      spot(W * (0.72 + 0.12 * Math.sin(t * 1.3)), H * (0.4 + 0.18 * Math.cos(t)), 0.55);
      spot(W * (0.88 + 0.06 * Math.cos(t * 0.8)), H * (0.75 + 0.1 * Math.sin(t * 1.1)), 0.4);
      if (mouse) spot(mouse.x, mouse.y, 1);
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, h = heat[k];
      const r = 1.6 + h * 6;
      ctx.fillStyle = h > 0.03 ? `rgba(214,51,108,${0.25 + h * 0.75})` : "rgba(59,63,168,.28)";
      ctx.beginPath(); ctx.arc(i * GAP, j * GAP, r, 0, 6.2832); ctx.fill();
      heat[k] = h * 0.94;
    }
    if (!still) requestAnimationFrame(draw);
  }
  addEventListener("resize", () => { size(); if (still) draw(); });
  cv.parentElement.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mouse = { x: e.clientX - r.left, y: e.clientY - r.top }; });
  cv.parentElement.addEventListener("pointerleave", () => (mouse = null));
  size(); if (still) { spot(W * 0.75, H * 0.45, 0.8); } draw();
})();
