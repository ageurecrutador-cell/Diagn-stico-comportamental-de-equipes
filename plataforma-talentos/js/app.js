/* =====================================================================
   TalentHub — Vitrine de Talentos (protótipo front-end)
   Dados persistidos em localStorage. Sem backend.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------------- Store ---------------- */
  const DB_KEY = "talenthub.db.v1";
  const SESSION_KEY = "talenthub.session.v1";

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // Primeira visita: semeia candidatos de demonstração
    const db = { users: (window.SEED_CANDIDATES || []).map(clone) };
    saveDB(db);
    return db;
  }
  function saveDB(db) {
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { toast("Armazenamento cheio ou indisponível.", "err"); }
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  let DB = loadDB();

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  function setSession(s) {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  }
  function currentUser() {
    const s = getSession();
    if (!s) return null;
    return DB.users.find(u => u.id === s.id) || null;
  }

  /* ---------------- Utilidades ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const uid = () => "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const initials = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

  const STATUS = {
    aberto:       { label: "Aberto a propostas", css: "ok" },
    empregado:    { label: "Empregado",          css: "warn" },
    desempregado: { label: "Buscando recolocação", css: "bad" }
  };

  let toastTimer;
  function toast(msg, kind) {
    const t = $("#toast");
    t.textContent = msg;
    t.className = "toast show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.className = "toast"), 3200);
  }

  function go(hash) { location.hash = hash; }

  /* ---------------- Autenticação ---------------- */
  function signup({ role, name, email, password }) {
    email = (email || "").trim().toLowerCase();
    if (!name || !email || !password) throw new Error("Preencha todos os campos.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("E-mail inválido.");
    if (DB.users.some(u => u.email === email)) throw new Error("Já existe uma conta com este e-mail.");
    const user = role === "company"
      ? { id: uid(), role, name, email, password, company: { name, about: "", site: "", location: "" } }
      : {
          id: uid(), role: "candidate", name, email, password, photo: "",
          headline: "", area: "", location: "", status: "aberto", about: "",
          skills: [], academics: [], experiences: [], cases: [],
          contact: { phone: "", linkedin: "", email }, visibility: "public", accessPassword: ""
        };
    DB.users.push(user);
    saveDB(DB);
    setSession({ id: user.id });
    return user;
  }
  function login({ email, password }) {
    email = (email || "").trim().toLowerCase();
    const u = DB.users.find(x => x.email === email);
    if (!u || u.password !== password) throw new Error("E-mail ou senha incorretos.");
    setSession({ id: u.id });
    return u;
  }
  function logout() { setSession(null); go("#/"); render(); }

  /* ---------------- Match por IA (heurística local) ---------------- */
  // Pontua candidato x vaga por sobreposição de skills, área, texto e status.
  function normalize(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function tokenize(s) {
    return normalize(s).split(/[^a-z0-9+#.]+/).filter(w => w.length > 2);
  }
  function matchScore(cand, job) {
    const reqSkills = job.skills.map(normalize);
    const candSkills = (cand.skills || []).map(normalize);
    let skillHits = 0;
    const matched = [];
    reqSkills.forEach((rs, i) => {
      if (candSkills.some(cs => cs === rs || cs.includes(rs) || rs.includes(cs))) {
        skillHits++; matched.push(job.skills[i]);
      }
    });
    const skillScore = reqSkills.length ? skillHits / reqSkills.length : 0;

    // Texto livre da vaga x perfil do candidato
    const jobText = new Set(tokenize(job.title + " " + job.description + " " + job.skills.join(" ")));
    const candText = tokenize(
      cand.headline + " " + cand.about + " " + (cand.skills || []).join(" ") + " " +
      (cand.experiences || []).map(e => e.role + " " + e.desc).join(" ") + " " +
      (cand.cases || []).map(c => c.title + " " + c.desc).join(" ")
    );
    let textHits = 0;
    const candSet = new Set(candText);
    jobText.forEach(w => { if (candSet.has(w)) textHits++; });
    const textScore = jobText.size ? Math.min(1, textHits / jobText.size * 1.8) : 0;

    const areaScore = job.area && normalize(cand.area) === normalize(job.area) ? 1 : 0;
    const statusBonus = cand.status === "desempregado" ? 1 : cand.status === "aberto" ? 0.85 : 0.4;

    // Pesos
    const raw = skillScore * 0.55 + textScore * 0.25 + areaScore * 0.12 + statusBonus * 0.08;
    return { pct: Math.round(raw * 100), matched, skillHits, reqCount: reqSkills.length };
  }

  /* ---------------- Roteamento ---------------- */
  function parseHash() {
    const h = (location.hash || "#/").slice(1);
    const [path, qs] = h.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = {};
    if (qs) qs.split("&").forEach(kv => { const [k, v] = kv.split("="); params[k] = decodeURIComponent(v || ""); });
    return { parts, params };
  }

  function render() {
    DB = loadDB();
    renderNav();
    const { parts, params } = parseHash();
    const app = $("#app");
    const route = parts[0] || "";
    const me = currentUser();

    window.scrollTo(0, 0);

    if (route === "" ) return me ? routeDashboard(app, me) : routeHome(app);
    if (route === "entrar") return routeAuth(app, params.tab || "login");
    if (route === "painel") return me ? routeDashboard(app, me) : go("#/entrar");
    if (route === "perfil") {
      if (parts[1] === "editar") return me && me.role === "candidate" ? routeEditProfile(app, me) : go("#/entrar");
      return routePublicProfile(app, parts[1]);
    }
    if (route === "buscar") return me && me.role === "company" ? routeBrowse(app, me, params) : requireCompany(app);
    if (route === "match") return me && me.role === "company" ? routeMatch(app, me) : requireCompany(app);
    if (route === "conta") return me ? routeAccount(app, me) : go("#/entrar");
    return routeHome(app);
  }

  function requireCompany(app) {
    app.innerHTML = `<div class="empty card"><span class="ico">🔒</span>
      Esta área é exclusiva para empresas. <br/><br/>
      <a class="btn primary" href="#/entrar?tab=signup">Criar conta de empresa</a></div>`;
  }

  /* ---------------- Navegação ---------------- */
  function renderNav() {
    const nav = $("#topnav");
    const me = currentUser();
    if (!me) {
      nav.innerHTML = `
        <a class="btn ghost" href="#/entrar?tab=login">Entrar</a>
        <a class="btn primary" href="#/entrar?tab=signup">Criar conta grátis</a>`;
      return;
    }
    if (me.role === "company") {
      nav.innerHTML = `
        <a class="btn ghost sm" href="#/buscar">Buscar talentos</a>
        <a class="btn ghost sm" href="#/match">Match com IA</a>
        ${userChip(me)}`;
    } else {
      nav.innerHTML = `
        <a class="btn ghost sm" href="#/perfil/${me.id}">Ver meu perfil</a>
        <a class="btn ghost sm" href="#/perfil/editar">Editar perfil</a>
        ${userChip(me)}`;
    }
    const chip = $("#userMenuBtn", nav);
    if (chip) chip.onclick = () => go("#/conta");
  }
  function userChip(me) {
    const ava = me.photo
      ? `<img src="${esc(me.photo)}" alt="">`
      : `<span class="ava">${initials(me.name)}</span>`;
    return `<button id="userMenuBtn" class="chip-user" title="Minha conta">${ava}<span>${esc(me.name.split(" ")[0])}</span></button>`;
  }

  /* ---------------- Home ---------------- */
  function routeHome(app) {
    const total = DB.users.filter(u => u.role === "candidate").length;
    app.innerHTML = `
      <section class="hero">
        <h1>Seu talento merece ser encontrado.</h1>
        <p>Crie seu perfil profissional gratuito, publique seu currículo como uma vitrine e deixe que as empresas cheguem até você — com busca por filtros e match inteligente por IA.</p>
        <div class="cta">
          <a class="btn primary" href="#/entrar?tab=signup">Publicar meu perfil</a>
          <a class="btn ghost" href="#/entrar?tab=signup">Sou empresa, quero contratar</a>
        </div>
        <p class="muted" style="margin-top:14px;font-size:14px">${total} talentos já na vitrine</p>
      </section>

      <section class="features grid cols-3">
        ${feature("👤", "Perfil completo", "Foto, formação acadêmica, experiências, cases de sucesso e skills — tudo em uma página elegante e compartilhável.")}
        ${feature("🔗", "Público ou com senha", "Escolha deixar seu perfil aberto na vitrine ou protegido por senha para enviar só a quem você quiser.")}
        ${feature("🟢", "Status em tempo real", "Sinalize se está empregado, buscando recolocação ou aberto a propostas.")}
        ${feature("🔍", "Filtros para empresas", "Empresas encontram candidatos por área, localização, skills e status de disponibilidade.")}
        ${feature("🤖", "Match com IA", "A empresa descreve a vaga e o sistema ranqueia automaticamente os perfis mais compatíveis, com contato.")}
        ${feature("🆓", "100% gratuito", "Crie sua conta com qualquer e-mail, sem custo, em menos de um minuto.")}
      </section>

      <section class="card mt center" style="margin-top:40px">
        <h2>Comece agora</h2>
        <p class="muted">Leva menos de um minuto para publicar seu currículo.</p>
        <div class="cta" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:8px">
          <a class="btn primary" href="#/entrar?tab=signup">Criar conta grátis</a>
          <a class="btn ghost" href="#/entrar?tab=login">Já tenho conta</a>
        </div>
      </section>`;
  }
  function feature(ico, h, p) {
    return `<div class="card feature"><div class="ico">${ico}</div><h3>${h}</h3><p>${p}</p></div>`;
  }

  /* ---------------- Auth ---------------- */
  function routeAuth(app, tab) {
    app.innerHTML = `
      <div class="authwrap card">
        <div class="seg">
          <button data-tab="login" class="${tab === "login" ? "active" : ""}">Entrar</button>
          <button data-tab="signup" class="${tab === "signup" ? "active" : ""}">Criar conta</button>
        </div>
        <div id="authBody"></div>
      </div>`;
    $(".seg", app).addEventListener("click", e => {
      const b = e.target.closest("button[data-tab]");
      if (b) go("#/entrar?tab=" + b.dataset.tab);
    });
    if (tab === "signup") renderSignup(); else renderLogin();

    function renderLogin() {
      $("#authBody").innerHTML = `
        <h2>Bem-vindo de volta</h2>
        <form id="f">
          <label class="field"><span>E-mail</span><input name="email" type="email" required></label>
          <label class="field"><span>Senha</span><input name="password" type="password" required></label>
          <button class="btn primary block" type="submit">Entrar</button>
        </form>
        <p class="hint mt">Dica: experimente um candidato demo — <b>ana.demo@talenthub.app</b> / senha <b>demo</b>.</p>`;
      $("#f").onsubmit = e => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        try { login(d); toast("Login efetuado!", "ok"); go("#/painel"); render(); }
        catch (err) { toast(err.message, "err"); }
      };
    }
    function renderSignup() {
      $("#authBody").innerHTML = `
        <h2>Criar conta grátis</h2>
        <div class="seg" id="roleSeg">
          <button data-role="candidate" class="active">Sou candidato</button>
          <button data-role="company">Sou empresa</button>
        </div>
        <form id="f">
          <input type="hidden" name="role" value="candidate">
          <label class="field"><span id="nameLbl">Nome completo</span><input name="name" required></label>
          <label class="field"><span>E-mail (qualquer e-mail)</span><input name="email" type="email" required></label>
          <label class="field"><span>Senha</span><input name="password" type="password" required minlength="3"></label>
          <button class="btn primary block" type="submit">Criar minha conta</button>
        </form>`;
      const seg = $("#roleSeg");
      seg.addEventListener("click", e => {
        const b = e.target.closest("button[data-role]");
        if (!b) return;
        seg.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
        $("#f [name=role]").value = b.dataset.role;
        $("#nameLbl").textContent = b.dataset.role === "company" ? "Nome da empresa" : "Nome completo";
      });
      $("#f").onsubmit = e => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        try {
          const u = signup(d);
          toast("Conta criada! Bem-vindo(a).", "ok");
          go(u.role === "candidate" ? "#/perfil/editar" : "#/buscar");
          render();
        } catch (err) { toast(err.message, "err"); }
      };
    }
  }

  /* ---------------- Dashboard ---------------- */
  function routeDashboard(app, me) {
    if (me.role === "company") return routeBrowse(app, me, {});
    // Candidato
    const pubLink = location.origin + location.pathname + "#/perfil/" + me.id;
    const st = STATUS[me.status] || STATUS.aberto;
    const completeness = profileCompleteness(me);
    app.innerHTML = `
      <div class="flex between wrap mb">
        <div><h1 style="margin:0">Olá, ${esc(me.name.split(" ")[0])} 👋</h1>
        <p class="muted" style="margin:4px 0 0">Este é o seu painel. Mantenha seu perfil atualizado para aparecer melhor nas buscas.</p></div>
        <a class="btn primary" href="#/perfil/editar">Editar perfil</a>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="profile-head">
            ${me.photo ? `<img class="avatar" src="${esc(me.photo)}">` : `<div class="avatar">${initials(me.name)}</div>`}
            <div>
              <h2 style="margin:0 0 4px">${esc(me.name)}</h2>
              <p class="muted" style="margin:0 0 8px">${esc(me.headline || "Adicione seu título profissional")}</p>
              <span class="badge ${st.css}">${st.label}</span>
            </div>
          </div>
          <div class="divider"></div>
          <div class="kv"><b>Área</b> ${esc(me.area || "—")}</div>
          <div class="kv"><b>Local</b> ${esc(me.location || "—")}</div>
          <div class="kv"><b>Visibilidade</b> ${me.visibility === "password" ? "Protegido por senha 🔒" : "Público na vitrine 🌐"}</div>
        </div>

        <div class="card">
          <h3>Força do perfil</h3>
          <div class="flex between"><span class="muted">Preenchimento</span><b>${completeness}%</b></div>
          <div class="scorebar"><i style="width:${completeness}%"></i></div>
          <div class="divider"></div>
          <h3>Seu link público</h3>
          <p class="muted" style="font-size:13px;word-break:break-all">${esc(pubLink)}</p>
          <div class="pill-row mt">
            <a class="btn sm" href="#/perfil/${me.id}">Ver como público</a>
            <button class="btn sm" id="copyLink">Copiar link</button>
          </div>
        </div>
      </div>`;
    $("#copyLink").onclick = () => {
      navigator.clipboard?.writeText(pubLink).then(() => toast("Link copiado!", "ok"), () => toast("Copie manualmente o link acima."));
    };
  }
  function profileCompleteness(u) {
    let n = 0, t = 7;
    if (u.photo) n++; if (u.headline) n++; if (u.area) n++;
    if (u.about) n++; if ((u.skills || []).length) n++;
    if ((u.experiences || []).length) n++; if ((u.academics || []).length) n++;
    return Math.round(n / t * 100);
  }

  /* ---------------- Editar perfil ---------------- */
  function routeEditProfile(app, me) {
    // Estado de edição em memória
    const d = clone(me);
    d.skills = d.skills || []; d.academics = d.academics || [];
    d.experiences = d.experiences || []; d.cases = d.cases || [];
    d.contact = d.contact || { phone: "", linkedin: "", email: me.email };

    app.innerHTML = `
      <div class="flex between wrap mb">
        <h1 style="margin:0">Editar perfil</h1>
        <div class="pill-row"><a class="btn ghost" href="#/painel">Cancelar</a><button class="btn primary" id="save">Salvar perfil</button></div>
      </div>

      <div class="card mb">
        <div class="profile-head mb">
          <div id="avaBox">${d.photo ? `<img class="avatar" src="${esc(d.photo)}">` : `<div class="avatar">${initials(d.name)}</div>`}</div>
          <div>
            <label class="btn sm">Enviar foto<input id="photo" type="file" accept="image/*" hidden></label>
            ${d.photo ? `<button class="btn sm ghost" id="rmPhoto">Remover</button>` : ""}
            <p class="hint">PNG ou JPG. Guardada só neste navegador.</p>
          </div>
        </div>
        <div class="row">
          <label class="field"><span>Nome completo</span><input id="name" value="${esc(d.name)}"></label>
          <label class="field"><span>Título profissional</span><input id="headline" placeholder="Ex.: Desenvolvedora Front-end Sênior" value="${esc(d.headline)}"></label>
        </div>
        <div class="row">
          <label class="field"><span>Área</span><input id="area" placeholder="Ex.: Tecnologia" value="${esc(d.area)}"></label>
          <label class="field"><span>Localização</span><input id="location" placeholder="Ex.: São Paulo, SP ou Remoto" value="${esc(d.location)}"></label>
          <label class="field"><span>Status</span>
            <select id="status">
              ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${d.status === k ? "selected" : ""}>${v.label}</option>`).join("")}
            </select>
          </label>
        </div>
        <label class="field"><span>Resumo / Sobre você</span><textarea id="about" placeholder="Fale um pouco da sua trajetória...">${esc(d.about)}</textarea></label>
      </div>

      <div class="card mb">
        <h3>Skills / Competências</h3>
        <div class="row" style="align-items:flex-end">
          <label class="field" style="margin:0"><span>Adicionar skill</span><input id="skillInput" placeholder="Ex.: React, SQL, Liderança..."></label>
          <button class="btn" id="addSkill" style="flex:0">Adicionar</button>
        </div>
        <div class="tags mt" id="skillList"></div>
      </div>

      <div class="card mb">
        <div class="flex between"><h3 style="margin:0">Qualificação acadêmica</h3><button class="btn sm" id="addAcad">+ Adicionar</button></div>
        <div id="acadList" class="mt"></div>
      </div>

      <div class="card mb">
        <div class="flex between"><h3 style="margin:0">Experiências profissionais</h3><button class="btn sm" id="addExp">+ Adicionar</button></div>
        <div id="expList" class="mt"></div>
      </div>

      <div class="card mb">
        <div class="flex between"><h3 style="margin:0">Cases de sucesso</h3><button class="btn sm" id="addCase">+ Adicionar</button></div>
        <div id="caseList" class="mt"></div>
      </div>

      <div class="card mb">
        <h3>Contato</h3>
        <div class="row">
          <label class="field"><span>E-mail de contato</span><input id="cEmail" value="${esc(d.contact.email || "")}"></label>
          <label class="field"><span>Telefone</span><input id="cPhone" value="${esc(d.contact.phone || "")}"></label>
          <label class="field"><span>LinkedIn / site</span><input id="cLinkedin" value="${esc(d.contact.linkedin || "")}"></label>
        </div>
      </div>

      <div class="card mb">
        <h3>Privacidade do perfil</h3>
        <label class="field"><span>Quem pode ver seu perfil?</span>
          <select id="visibility">
            <option value="public" ${d.visibility === "public" ? "selected" : ""}>Público — aparece na vitrine e nas buscas</option>
            <option value="password" ${d.visibility === "password" ? "selected" : ""}>Protegido — só com senha de acesso</option>
          </select>
        </label>
        <label class="field" id="pwField" style="${d.visibility === "password" ? "" : "display:none"}">
          <span>Senha de acesso (compartilhe só com quem você quiser)</span>
          <input id="accessPassword" value="${esc(d.accessPassword || "")}" placeholder="defina uma senha">
        </label>
        <p class="hint">Perfis protegidos não aparecem na vitrine pública nem no match das empresas.</p>
      </div>

      <div class="flex between wrap">
        <a class="btn ghost" href="#/painel">Cancelar</a>
        <button class="btn primary" id="save2">Salvar perfil</button>
      </div>`;

    /* Foto */
    $("#photo").onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 2.5 * 1024 * 1024) return toast("Imagem muito grande (máx. ~2,5MB).", "err");
      const r = new FileReader();
      r.onload = () => { d.photo = r.result; $("#avaBox").innerHTML = `<img class="avatar" src="${esc(d.photo)}">`; toast("Foto carregada.", "ok"); };
      r.readAsDataURL(file);
    };
    if ($("#rmPhoto")) $("#rmPhoto").onclick = () => { d.photo = ""; $("#avaBox").innerHTML = `<div class="avatar">${initials(d.name)}</div>`; };

    /* Skills */
    function drawSkills() {
      $("#skillList").innerHTML = d.skills.length
        ? d.skills.map((s, i) => `<span class="tag brand removable">${esc(s)}<button data-i="${i}">×</button></span>`).join("")
        : `<span class="muted">Nenhuma skill ainda.</span>`;
      $("#skillList").querySelectorAll("button[data-i]").forEach(b =>
        b.onclick = () => { d.skills.splice(+b.dataset.i, 1); drawSkills(); });
    }
    function addSkill() {
      const v = $("#skillInput").value.trim();
      if (!v) return;
      v.split(",").map(s => s.trim()).filter(Boolean).forEach(s => { if (!d.skills.includes(s)) d.skills.push(s); });
      $("#skillInput").value = ""; drawSkills();
    }
    $("#addSkill").onclick = addSkill;
    $("#skillInput").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } });
    drawSkills();

    /* Blocos repetíveis (acad, exp, case) */
    function repeatable(listEl, arr, fields, redraw) {
      listEl.innerHTML = arr.length ? "" : `<p class="muted">Nada adicionado ainda.</p>`;
      arr.forEach((item, idx) => {
        const block = document.createElement("div");
        block.className = "editable-block";
        block.innerHTML = `<button class="btn sm danger rm">Remover</button>` +
          fields.map(f => f.type === "textarea"
            ? `<label class="field"><span>${f.label}</span><textarea data-k="${f.key}">${esc(item[f.key] || "")}</textarea></label>`
            : `<label class="field"><span>${f.label}</span><input data-k="${f.key}" value="${esc(item[f.key] || "")}" placeholder="${esc(f.ph || "")}"></label>`
          ).join("");
        block.querySelectorAll("[data-k]").forEach(inp =>
          inp.oninput = () => { item[inp.dataset.k] = inp.value; });
        block.querySelector(".rm").onclick = () => { arr.splice(idx, 1); redraw(); };
        listEl.appendChild(block);
      });
    }
    const acadFields = [
      { key: "title", label: "Curso / Título", ph: "Ex.: Bacharel em Administração" },
      { key: "org", label: "Instituição", ph: "Ex.: USP" },
      { key: "period", label: "Período", ph: "Ex.: 2016 — 2020" }
    ];
    const expFields = [
      { key: "role", label: "Cargo", ph: "Ex.: Analista de Marketing" },
      { key: "org", label: "Empresa", ph: "Ex.: Acme Ltda" },
      { key: "period", label: "Período", ph: "Ex.: 2020 — atual" },
      { key: "desc", label: "O que você fez", type: "textarea" }
    ];
    const caseFields = [
      { key: "title", label: "Título do case", ph: "Ex.: Projeto que dobrou as vendas" },
      { key: "desc", label: "Resultado / impacto", type: "textarea" }
    ];
    const drawAcad = () => repeatable($("#acadList"), d.academics, acadFields, drawAcad);
    const drawExp = () => repeatable($("#expList"), d.experiences, expFields, drawExp);
    const drawCase = () => repeatable($("#caseList"), d.cases, caseFields, drawCase);
    $("#addAcad").onclick = () => { d.academics.push({}); drawAcad(); };
    $("#addExp").onclick = () => { d.experiences.push({}); drawExp(); };
    $("#addCase").onclick = () => { d.cases.push({}); drawCase(); };
    drawAcad(); drawExp(); drawCase();

    /* Visibilidade */
    $("#visibility").onchange = e => { $("#pwField").style.display = e.target.value === "password" ? "" : "none"; };

    /* Salvar */
    function save() {
      d.name = $("#name").value.trim() || d.name;
      d.headline = $("#headline").value.trim();
      d.area = $("#area").value.trim();
      d.location = $("#location").value.trim();
      d.status = $("#status").value;
      d.about = $("#about").value.trim();
      d.contact.email = $("#cEmail").value.trim();
      d.contact.phone = $("#cPhone").value.trim();
      d.contact.linkedin = $("#cLinkedin").value.trim();
      d.visibility = $("#visibility").value;
      d.accessPassword = $("#accessPassword") ? $("#accessPassword").value.trim() : "";
      if (d.visibility === "password" && !d.accessPassword) return toast("Defina uma senha de acesso.", "err");
      // limpa blocos vazios
      d.academics = d.academics.filter(a => a.title || a.org);
      d.experiences = d.experiences.filter(x => x.role || x.org);
      d.cases = d.cases.filter(c => c.title || c.desc);
      const i = DB.users.findIndex(u => u.id === me.id);
      DB.users[i] = Object.assign(DB.users[i], d);
      saveDB(DB);
      toast("Perfil salvo!", "ok");
      go("#/painel");
    }
    $("#save").onclick = save;
    $("#save2").onclick = save;
  }

  /* ---------------- Perfil público ---------------- */
  function routePublicProfile(app, id) {
    const u = DB.users.find(x => x.id === id && x.role === "candidate");
    if (!u) {
      app.innerHTML = `<div class="empty card"><span class="ico">🔍</span>Perfil não encontrado.</div>`;
      return;
    }
    const me = currentUser();
    const isOwner = me && me.id === u.id;

    // Perfil protegido por senha
    if (u.visibility === "password" && !isOwner) {
      const okKey = "talenthub.unlock." + u.id;
      if (sessionStorage.getItem(okKey) !== "1") {
        app.innerHTML = `
          <div class="authwrap card center">
            <span class="ico" style="font-size:40px">🔒</span>
            <h2>Perfil protegido</h2>
            <p class="muted">Este candidato compartilhou o perfil com senha.</p>
            <form id="pw"><label class="field"><input name="p" type="password" placeholder="Senha de acesso" required></label>
            <button class="btn primary block">Acessar</button></form>
          </div>`;
        $("#pw").onsubmit = e => {
          e.preventDefault();
          if (new FormData(e.target).get("p") === u.accessPassword) {
            sessionStorage.setItem(okKey, "1"); render();
          } else toast("Senha incorreta.", "err");
        };
        return;
      }
    }

    const st = STATUS[u.status] || STATUS.aberto;
    const canSeeContact = (me && me.role === "company") || isOwner;
    app.innerHTML = `
      ${isOwner ? `<div class="flex between wrap mb"><span class="muted">👁️ Pré-visualização pública do seu perfil</span><a class="btn sm" href="#/perfil/editar">Editar</a></div>` : ""}
      <div class="card mb">
        <div class="profile-head">
          ${u.photo ? `<img class="avatar lg" src="${esc(u.photo)}">` : `<div class="avatar lg">${initials(u.name)}</div>`}
          <div style="flex:1;min-width:220px">
            <h1 style="margin:0 0 4px">${esc(u.name)}</h1>
            <p class="muted" style="margin:0 0 10px;font-size:17px">${esc(u.headline || "")}</p>
            <div class="pill-row">
              <span class="badge ${st.css}">${st.label}</span>
              ${u.area ? `<span class="tag">${esc(u.area)}</span>` : ""}
              ${u.location ? `<span class="tag">📍 ${esc(u.location)}</span>` : ""}
            </div>
          </div>
        </div>
        ${u.about ? `<div class="divider"></div><p>${esc(u.about)}</p>` : ""}
      </div>

      ${(u.skills || []).length ? `<div class="card mb"><div class="section-title">Competências</div><div class="tags">${u.skills.map(s => `<span class="tag brand">${esc(s)}</span>`).join("")}</div></div>` : ""}

      ${(u.experiences || []).length ? `<div class="card mb"><div class="section-title">Experiências</div>${u.experiences.map(e => `
        <div class="timeline-item"><h4>${esc(e.role || "")}${e.org ? ` · ${esc(e.org)}` : ""}</h4>
        <div class="meta">${esc(e.period || "")}</div>${e.desc ? `<p style="margin:0">${esc(e.desc)}</p>` : ""}</div>`).join("")}</div>` : ""}

      ${(u.academics || []).length ? `<div class="card mb"><div class="section-title">Formação acadêmica</div>${u.academics.map(a => `
        <div class="timeline-item"><h4>${esc(a.title || "")}</h4><div class="meta">${esc(a.org || "")} · ${esc(a.period || "")}</div></div>`).join("")}</div>` : ""}

      ${(u.cases || []).length ? `<div class="card mb"><div class="section-title">Cases de sucesso</div>${u.cases.map(c => `
        <div class="timeline-item"><h4>🏆 ${esc(c.title || "")}</h4>${c.desc ? `<p style="margin:0">${esc(c.desc)}</p>` : ""}</div>`).join("")}</div>` : ""}

      <div class="card">
        <div class="section-title">Contato</div>
        ${canSeeContact ? `
          <div class="kv"><b>E-mail</b> <a href="mailto:${esc(u.contact.email)}">${esc(u.contact.email || "—")}</a></div>
          <div class="kv"><b>Telefone</b> ${esc(u.contact.phone || "—")}</div>
          <div class="kv"><b>LinkedIn</b> ${u.contact.linkedin ? `<a href="${normUrl(u.contact.linkedin)}" target="_blank" rel="noopener">${esc(u.contact.linkedin)}</a>` : "—"}</div>`
        : `<p class="muted">🔒 Os dados de contato ficam visíveis para empresas cadastradas. <a href="#/entrar?tab=signup">Crie uma conta de empresa</a> para ver.</p>`}
      </div>`;
  }
  function normUrl(u) { return /^https?:\/\//.test(u) ? u : "https://" + u; }

  /* ---------------- Empresa: buscar talentos ---------------- */
  function publicCandidates() {
    return DB.users.filter(u => u.role === "candidate" && u.visibility !== "password");
  }
  function routeBrowse(app, me, params) {
    const all = publicCandidates();
    const areas = [...new Set(all.map(c => c.area).filter(Boolean))].sort();
    const f = {
      q: params.q || "", area: params.area || "", status: params.status || "", location: params.location || ""
    };
    let list = all.filter(c => {
      if (f.area && c.area !== f.area) return false;
      if (f.status && c.status !== f.status) return false;
      if (f.location && !normalize(c.location).includes(normalize(f.location))) return false;
      if (f.q) {
        const hay = normalize(c.name + " " + c.headline + " " + (c.skills || []).join(" ") + " " + c.about);
        if (!normalize(f.q).split(/\s+/).every(w => hay.includes(w))) return false;
      }
      return true;
    });

    app.innerHTML = `
      <div class="flex between wrap mb">
        <div><h1 style="margin:0">Buscar talentos</h1><p class="muted" style="margin:4px 0 0">${all.length} perfis públicos na vitrine · ${list.length} no filtro atual</p></div>
        <a class="btn primary" href="#/match">🤖 Match com IA</a>
      </div>
      <div class="card mb">
        <div class="filters">
          <label class="field"><span>Palavra-chave / skill</span><input id="q" value="${esc(f.q)}" placeholder="Ex.: React, vendas, Python"></label>
          <label class="field"><span>Área</span><select id="area"><option value="">Todas</option>${areas.map(a => `<option ${f.area === a ? "selected" : ""}>${esc(a)}</option>`).join("")}</select></label>
          <label class="field"><span>Status</span><select id="status"><option value="">Todos</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${f.status === k ? "selected" : ""}>${v.label}</option>`).join("")}</select></label>
          <label class="field"><span>Localização</span><input id="location" value="${esc(f.location)}" placeholder="Ex.: São Paulo"></label>
          <button class="btn primary" id="apply" style="flex:0">Filtrar</button>
          <button class="btn ghost" id="clear" style="flex:0">Limpar</button>
        </div>
      </div>
      <div class="grid cols-2" id="results"></div>`;

    $("#results").innerHTML = list.length
      ? list.map(c => candidateCard(c)).join("")
      : `<div class="empty card" style="grid-column:1/-1"><span class="ico">🤷</span>Nenhum candidato com esses filtros.</div>`;

    function applyFilters() {
      const q = encodeURIComponent($("#q").value.trim());
      const area = encodeURIComponent($("#area").value);
      const status = encodeURIComponent($("#status").value);
      const location = encodeURIComponent($("#location").value.trim());
      go(`#/buscar?q=${q}&area=${area}&status=${status}&location=${location}`);
    }
    $("#apply").onclick = applyFilters;
    $("#q").addEventListener("keydown", e => { if (e.key === "Enter") applyFilters(); });
    $("#clear").onclick = () => go("#/buscar");
  }

  function candidateCard(c, match) {
    const st = STATUS[c.status] || STATUS.aberto;
    const ava = c.photo ? `<img class="ava" src="${esc(c.photo)}">` : `<div class="ava">${initials(c.name)}</div>`;
    return `
      <div class="card candidate-card">
        <div class="top">
          ${ava}
          <div style="flex:1">
            <h3>${esc(c.name)}</h3>
            <div class="headline">${esc(c.headline || "")}</div>
          </div>
          ${match ? `<div class="match-ring"><div class="pct">${match.pct}%</div><small>match</small></div>` : ""}
        </div>
        <div class="pill-row">
          <span class="badge ${st.css}">${st.label}</span>
          ${c.area ? `<span class="tag">${esc(c.area)}</span>` : ""}
          ${c.location ? `<span class="tag">📍 ${esc(c.location)}</span>` : ""}
        </div>
        <div class="tags">${(c.skills || []).slice(0, 6).map(s => `<span class="tag ${match && match.matched.map(normalize).includes(normalize(s)) ? "brand" : ""}">${esc(s)}</span>`).join("")}</div>
        ${match ? `<div class="scorebar"><i style="width:${match.pct}%"></i></div>
          <small>${match.skillHits}/${match.reqCount} skills da vaga · contato: ${esc(c.contact.email || "")} ${c.contact.phone ? "· " + esc(c.contact.phone) : ""}</small>` : ""}
        <div class="pill-row">
          <a class="btn sm primary" href="#/perfil/${c.id}">Ver perfil completo</a>
          ${c.contact.email ? `<a class="btn sm" href="mailto:${esc(c.contact.email)}">Contato</a>` : ""}
        </div>
      </div>`;
  }

  /* ---------------- Empresa: Match com IA ---------------- */
  function routeMatch(app, me) {
    const saved = JSON.parse(sessionStorage.getItem("talenthub.job") || "null");
    app.innerHTML = `
      <div class="flex between wrap mb">
        <div><h1 style="margin:0">🤖 Match com IA</h1><p class="muted" style="margin:4px 0 0">Descreva a vaga. O sistema ranqueia os candidatos mais compatíveis e mostra o contato.</p></div>
        <a class="btn ghost" href="#/buscar">Busca manual</a>
      </div>
      <div class="card mb">
        <div class="row">
          <label class="field"><span>Título da vaga</span><input id="jtitle" placeholder="Ex.: Desenvolvedor(a) Front-end" value="${esc(saved?.title || "")}"></label>
          <label class="field"><span>Área</span><input id="jarea" placeholder="Ex.: Tecnologia" value="${esc(saved?.area || "")}"></label>
        </div>
        <label class="field"><span>Skills desejadas (separe por vírgula)</span><input id="jskills" placeholder="Ex.: React, TypeScript, Next.js, Design System" value="${esc((saved?.skills || []).join(", "))}"></label>
        <label class="field"><span>Descrição da vaga</span><textarea id="jdesc" placeholder="Responsabilidades, requisitos, perfil desejado...">${esc(saved?.description || "")}</textarea></label>
        <div class="flex between wrap">
          <small class="hint">Dica: quanto mais detalhada a descrição, melhor o match.</small>
          <button class="btn primary" id="run">Encontrar candidatos</button>
        </div>
      </div>
      <div id="matchResults"></div>`;

    if (saved) runMatch(saved);

    $("#run").onclick = () => {
      const job = {
        title: $("#jtitle").value.trim(),
        area: $("#jarea").value.trim(),
        skills: $("#jskills").value.split(",").map(s => s.trim()).filter(Boolean),
        description: $("#jdesc").value.trim()
      };
      if (!job.title && !job.skills.length && !job.description) return toast("Descreva a vaga primeiro.", "err");
      sessionStorage.setItem("talenthub.job", JSON.stringify(job));
      runMatch(job);
    };

    function runMatch(job) {
      const scored = publicCandidates()
        .map(c => ({ c, m: matchScore(c, job) }))
        .filter(x => x.m.pct > 0)
        .sort((a, b) => b.m.pct - a.m.pct);
      const box = $("#matchResults");
      if (!scored.length) {
        box.innerHTML = `<div class="empty card"><span class="ico">🤷</span>Nenhum candidato compatível encontrado. Tente outras skills.</div>`;
        return;
      }
      box.innerHTML = `
        <div class="flex between wrap mb"><h2 style="margin:0">${scored.length} candidatos compatíveis</h2>
        <span class="muted">ordenados por compatibilidade</span></div>
        <div class="grid cols-2">${scored.map(x => candidateCard(x.c, x.m)).join("")}</div>`;
      toast(`${scored.length} candidatos encontrados!`, "ok");
    }
  }

  /* ---------------- Conta ---------------- */
  function routeAccount(app, me) {
    app.innerHTML = `
      <h1>Minha conta</h1>
      <div class="card mb">
        <div class="kv"><b>Tipo</b> ${me.role === "company" ? "Empresa" : "Candidato"}</div>
        <div class="kv"><b>Nome</b> ${esc(me.name)}</div>
        <div class="kv"><b>E-mail</b> ${esc(me.email)}</div>
      </div>
      <div class="card mb">
        <h3>Preferências</h3>
        ${me.role === "candidate"
          ? `<a class="btn" href="#/perfil/editar">Editar meu perfil</a> <a class="btn" href="#/perfil/${me.id}">Ver perfil público</a>`
          : `<a class="btn" href="#/buscar">Buscar talentos</a> <a class="btn" href="#/match">Match com IA</a>`}
      </div>
      <div class="card">
        <h3>Sessão</h3>
        <button class="btn danger" id="logout">Sair da conta</button>
      </div>`;
    $("#logout").onclick = logout;
  }

  /* ---------------- Boot ---------------- */
  window.addEventListener("hashchange", render);
  document.addEventListener("click", e => {
    const a = e.target.closest("a[data-nav]");
    if (a) { /* permite navegação normal por hash */ }
  });
  render();
})();
