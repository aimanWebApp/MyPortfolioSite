const STORAGE_KEY = "portfolioData";

const EMPTY_ITEMS = {
  projects: { title: "", description: "", tech: "", link: "" },
  experience: { role: "", company: "", period: "", description: "" }
};

const FIELDS = {
  projects: [
    { key: "title", label: "Title" },
    { key: "tech", label: "Technologies (comma separated)" },
    { key: "link", label: "Link (optional)" },
    { key: "description", label: "Description", textarea: true }
  ],
  experience: [
    { key: "role", label: "Role" },
    { key: "company", label: "Company" },
    { key: "period", label: "Period, e.g. 2023 - Present" },
    { key: "description", label: "Description", textarea: true }
  ]
};

let state = loadData();
let unsaved = false;

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn("Could not read saved data, using defaults.", e);
  }
  return structuredClone(window.DEFAULT_DATA);
}

function markDirty() {
  unsaved = true;
  document.getElementById("save-btn").textContent = "Save changes •";
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function escapeAttr(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* ---------- Profile ---------- */
function renderProfile() {
  document.querySelectorAll("[data-profile]").forEach((input) => {
    input.value = state.profile[input.dataset.profile] || "";
  });
}

document.querySelectorAll("[data-profile]").forEach((input) => {
  input.addEventListener("input", () => {
    state.profile[input.dataset.profile] = input.value;
    markDirty();
  });
});

/* ---------- CV upload ---------- */
// Browser storage holds about 5 MB and base64 adds ~33%, so keep the PDF small.
const MAX_CV_MB = 3;

function renderCv() {
  const hasCv = Boolean(state.profile.cv);
  document.getElementById("cv-status").textContent = hasCv
    ? `Current file: ${state.profile.cvName || "cv.pdf"}`
    : "No CV uploaded";
  document.getElementById("cv-remove").hidden = !hasCv;
}

document.getElementById("cv-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  if (file.type !== "application/pdf") {
    alert("Please choose a PDF file.");
    return;
  }
  if (file.size > MAX_CV_MB * 1024 * 1024) {
    alert(`This PDF is larger than ${MAX_CV_MB} MB. Please compress it and try again.`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.profile.cv = reader.result;
    state.profile.cvName = file.name;
    renderCv();
    markDirty();
    toast("CV uploaded. Click Save to apply.");
  };
  reader.readAsDataURL(file);
});

document.getElementById("cv-remove").addEventListener("click", () => {
  if (!confirm("Remove the uploaded CV?")) return;
  state.profile.cv = "";
  state.profile.cvName = "";
  renderCv();
  markDirty();
});

/* ---------- Skills ---------- */
function renderSkills() {
  document.getElementById("skill-editor").innerHTML = state.skills
    .map(
      (skill, i) => `
        <li>
          ${escapeAttr(skill)}
          <button class="icon-btn delete" data-remove-skill="${i}" title="Remove">✕</button>
        </li>`
    )
    .join("");
}

document.getElementById("add-skill-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("new-skill");
  const value = input.value.trim();
  if (!value) return;
  state.skills.push(value);
  input.value = "";
  renderSkills();
  markDirty();
});

document.getElementById("skill-editor").addEventListener("click", (e) => {
  const index = e.target.dataset.removeSkill;
  if (index === undefined) return;
  state.skills.splice(Number(index), 1);
  renderSkills();
  markDirty();
});

/* ---------- Projects & Experience ---------- */
function renderList(listName) {
  const container = document.getElementById(
    listName === "projects" ? "project-editor" : "experience-editor"
  );
  const items = state[listName];
  const label = listName === "projects" ? "Project" : "Experience";

  if (!items.length) {
    container.innerHTML = `<p class="muted">No ${listName} yet. Add one below.</p>`;
    return;
  }

  container.innerHTML = items
    .map((item, i) => {
      const fields = FIELDS[listName]
        .map((f) => {
          const attrs = `data-list="${listName}" data-index="${i}" data-field="${f.key}"`;
          const control = f.textarea
            ? `<textarea rows="3" ${attrs}>${escapeAttr(item[f.key])}</textarea>`
            : `<input ${attrs} value="${escapeAttr(item[f.key])}">`;
          return `<label class="${f.textarea ? "full" : ""}">${f.label} ${control}</label>`;
        })
        .join("");

      return `
        <div class="item">
          <div class="item-head">
            <strong>${label} ${i + 1}</strong>
            <div class="controls">
              <button class="icon-btn" data-move="${listName}" data-index="${i}" data-dir="-1" title="Move up">↑</button>
              <button class="icon-btn" data-move="${listName}" data-index="${i}" data-dir="1" title="Move down">↓</button>
              <button class="icon-btn delete" data-delete="${listName}" data-index="${i}" title="Delete">Delete</button>
            </div>
          </div>
          <div class="form-grid">${fields}</div>
        </div>`;
    })
    .join("");
}

document.querySelectorAll(".item-list").forEach((container) => {
  container.addEventListener("input", (e) => {
    const { list, index, field } = e.target.dataset;
    if (!list) return;
    state[list][Number(index)][field] = e.target.value;
    markDirty();
  });

  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const index = Number(btn.dataset.index);

    if (btn.dataset.delete) {
      const list = btn.dataset.delete;
      if (!confirm("Delete this item?")) return;
      state[list].splice(index, 1);
      renderList(list);
      markDirty();
    }

    if (btn.dataset.move) {
      const list = btn.dataset.move;
      const target = index + Number(btn.dataset.dir);
      if (target < 0 || target >= state[list].length) return;
      const items = state[list];
      [items[index], items[target]] = [items[target], items[index]];
      renderList(list);
      markDirty();
    }
  });
});

document.querySelectorAll("[data-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const list = btn.dataset.add;
    state[list].push({ ...EMPTY_ITEMS[list] });
    renderList(list);
    markDirty();
  });
});

/* ---------- Tabs ---------- */
document.getElementById("tabs").addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
  document.querySelectorAll(".panel").forEach((p) =>
    p.classList.toggle("active", p.id === `panel-${tab.dataset.tab}`)
  );
});

/* ---------- Save / Export / Import / Reset ---------- */
document.getElementById("save-btn").addEventListener("click", () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    alert("Could not save: browser storage is full. Try uploading a smaller CV PDF.");
    return;
  }
  unsaved = false;
  document.getElementById("save-btn").textContent = "Save changes";
  toast("Saved! Refresh the site to see changes.");
});

document.getElementById("export-btn").addEventListener("click", () => {
  const content =
    "// Default portfolio content. Exported from dashboard.html.\n" +
    "window.DEFAULT_DATA = " + JSON.stringify(state, null, 2) + ";\n";
  const blob = new Blob([content], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.js";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("data.js downloaded");
});

document.getElementById("import-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    let text = await file.text();
    // Accept both an exported data.js and a plain JSON file.
    text = text.replace(/^[\s\S]*?window\.DEFAULT_DATA\s*=\s*/, "").replace(/;\s*$/, "");
    const data = JSON.parse(text);
    if (!data.profile || !Array.isArray(data.skills)) throw new Error("Invalid format");
    state = data;
    renderAll();
    markDirty();
    toast("Imported. Click Save to apply.");
  } catch (err) {
    alert("Could not import this file. Please use a data.js exported from this dashboard.");
  }
  e.target.value = "";
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("Discard your saved changes and go back to the content in data.js?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(window.DEFAULT_DATA);
  unsaved = false;
  document.getElementById("save-btn").textContent = "Save changes";
  renderAll();
  toast("Reset to defaults");
});

window.addEventListener("beforeunload", (e) => {
  if (unsaved) e.preventDefault();
});

function renderAll() {
  state.experience = state.experience || [];
  state.projects = state.projects || [];
  renderProfile();
  renderCv();
  renderSkills();
  renderList("projects");
  renderList("experience");
}

renderAll();
