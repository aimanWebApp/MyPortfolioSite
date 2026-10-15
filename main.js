const STORAGE_KEY = "portfolioData";

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Could not read saved data, using defaults.", e);
  }
  return window.DEFAULT_DATA;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

function setText(id, text) {
  document.getElementById(id).textContent = text || "";
}

function render(data) {
  const p = data.profile;

  document.title = `${p.name} | ${p.title}`;
  setText("logo", p.name);
  setText("hero-name", p.name);
  setText("hero-title", p.title);
  setText("hero-tagline", p.tagline);
  setText("about-text", p.about);
  setText("footer-text", `© ${new Date().getFullYear()} ${p.name}. All rights reserved.`);

  document.getElementById("skills-list").innerHTML = data.skills
    .map((s) => `<li>${escapeHtml(s)}</li>`)
    .join("");

  document.getElementById("projects-list").innerHTML = data.projects
    .map((proj) => {
      const tags = (proj.tech || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
        .join("");
      const link = proj.link
        ? `<a class="card-link" href="${escapeHtml(proj.link)}" target="_blank" rel="noopener">View project →</a>`
        : "";
      return `
        <article class="card">
          <h3>${escapeHtml(proj.title)}</h3>
          <p>${escapeHtml(proj.description)}</p>
          <div class="tags">${tags}</div>
          ${link}
        </article>`;
    })
    .join("");

  document.getElementById("experience-list").innerHTML = data.experience
    .map(
      (exp) => `
        <div class="timeline-item">
          <div class="timeline-head">
            <h3>${escapeHtml(exp.role)} <span class="muted">· ${escapeHtml(exp.company)}</span></h3>
            <span class="period">${escapeHtml(exp.period)}</span>
          </div>
          <p>${escapeHtml(exp.description)}</p>
        </div>`
    )
    .join("");

  const emailBtn = document.getElementById("contact-email");
  if (p.email) {
    emailBtn.href = `mailto:${p.email}`;
    emailBtn.style.display = "";
  } else {
    emailBtn.style.display = "none";
  }

  setupCvButtons(p);

  const links = [
    ["GitHub", p.github],
    ["LinkedIn", p.linkedin]
  ].filter(([, url]) => url);
  document.getElementById("socials").innerHTML = links
    .map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`)
    .join("");
  if (p.location) {
    document.getElementById("socials").insertAdjacentHTML(
      "beforeend",
      `<span class="muted">${escapeHtml(p.location)}</span>`
    );
  }
}

// The uploaded CV is stored as a data URL; turn it into a blob URL so large
// PDFs download reliably. Falls back to the Resume URL if no file was uploaded.
function setupCvButtons(p) {
  let href = "";
  let fileName = "";

  if (p.cv) {
    try {
      const [meta, base64] = p.cv.split(",");
      const mime = meta.match(/data:(.*?);/)[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      href = URL.createObjectURL(new Blob([bytes], { type: mime }));
      fileName = p.cvName || `${p.name} CV.pdf`;
    } catch (e) {
      console.warn("Could not load uploaded CV.", e);
    }
  }
  if (!href && p.resume) href = p.resume;

  document.querySelectorAll(".cv-btn").forEach((btn) => {
    btn.hidden = !href;
    btn.href = href || "#";
    if (fileName) {
      btn.setAttribute("download", fileName);
      btn.removeAttribute("target");
    } else {
      btn.removeAttribute("download");
      btn.target = "_blank";
      btn.rel = "noopener";
    }
  });
}

render(loadData());
