/* Andi local chat — connects to local Ollama on Andi1. Private and urgent words never leave this page. */
(function () {
  var path = null;
  var firstReply = true;
  var history = []; // in-memory only, cleared on Start / Start over
  var HISTORY_MAX = 12;
  var busy = false;

  // ---- Config ----------------------------------------------------------
  // Override with ?ollama=http://host:11434 and ?model=qwen3:8b,
  // or localStorage.andiOllamaBase / localStorage.andiModel.
  // When the page is served by serve.py on Andi1 (port 8088), the default
  // is the same origin: serve.py forwards /v1/* to Ollama on 127.0.0.1:11434
  // (no CORS or OLLAMA_HOST change needed).
  var params = new URLSearchParams(window.location.search);
  function stored(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  var DEFAULT_BASE = window.location.port === "8088" ? window.location.origin : "http://100.95.163.125:11434";
  var OLLAMA_BASE = (params.get("ollama") || stored("andiOllamaBase") || DEFAULT_BASE).replace(/\/+$/, "");
  var MODEL = params.get("model") || stored("andiModel") || "qwen3:8b";
  var TIMEOUT_MS = 120000;

  var SYSTEM = "You are Andi, a calm Ask & Answer computer helper for students, seniors, parents, and people who prefer simple language. You are not in charge; the person thinks and chooses. Use short plain sentences. Follow SafeSteps: Stop and Notice; Ask a Caring Grown-Up; Keep Private Things Private; Check Together. Never ask for or store names, addresses, phones, schools, passwords, or photos. Do not give medical, legal, money, or emergency advice — tell them to ask a caring person or local help. If unsure, say so and suggest checking a book or a trusted person. AI can make mistakes. Match the user's language (English or Spanish). Keep replies brief (a few short sentences).";

  var copy = {
    helper: {
      lang: "en",
      title: "You are helping a child",
      body: "You are a parent, a teacher, or a librarian. A child or a student is with you. Andi can help you begin. Andi is not in charge. You stay close. We can use AI more safely when we follow SafeSteps. AI can make mistakes, so we check together.",
      chantLabel: "Say this together",
      chant: "Stop and notice. Ask a grown-up, too. Keep private things private. Check what AI says with you.",
      steps: [
        "Stop and Notice",
        "Ask a Caring Grown-Up",
        "Keep Private Things Private",
        "Check Together"
      ],
      promiseLabel: "A small promise",
      promise: "Ask clearly. Think carefully. Check important answers. Make it your own.",
      start: "Start",
      back: "Back",
      hello: "Hello. I am Andi, a computer helper. Thank you for staying with this child. We can begin with one question. What do you wonder about?",
      placeholder: "What do you wonder about?",
      ask: "Ask",
      restart: "Start over",
      tagline: "Big questions. Bright ideas. Kind helpers.",
      series: "Learn Safe AI with Andi",
      empty: "Add a few words, then press Ask.",
      kept: "That message was not kept on this page.",
      privacy: "Please stop. Keep that private. Do not share a name, address, phone, school, password, or photo here. Ask a caring grown-up.",
      urgent: "A caring person should answer that, not Andi. If someone is hurt or in danger, ask a grown-up now, or call for local help. I will not guess about health, safety, or money.",
      greet: "Hello. I am glad you are here. I am Andi, a computer helper. What is one thing you wonder about?",
      cloud: "Clouds are a good thing to look at slowly. Step to a window, or go outside with a grown-up. What shapes do you see? You can draw them. Later, you can read a book about clouds together. You do the looking. I do not decide for you.",
      bird: "Birds reward a quiet look. Sit by a window or a tree. What colors do you notice? What sound? You can sketch one bird. Ask a grown-up to help you find a library book. The wonder stays with you.",
      art: "Art can start with one mark. Pick a color you like. There is no grade and no rush. Look at something real, then draw what you notice. A grown-up can sit with you. The idea is yours.",
      welcomeFriend: "A kind welcome can be small. You can smile, say hello, and ask one easy question, like what they like to read or play. You choose the words. A grown-up can help you practice. The welcome comes from you.",
      stepsLine: "SafeSteps: Stop and Notice. Ask a Caring Grown-Up. Keep Private Things Private. Check Together.",
      thinking: "Andi is thinking…",
      offline: "Sorry. Andi could not reach the helper computer right now. Ollama may be off, Tailscale may be disconnected, or the Ollama CORS/origins setting may need fixing. Address tried: "
    },
    adult: {
      lang: "en",
      title: "We can go slowly",
      body: "You want a little help. You may not trust AI. That is all right. Andi is a kind computer helper, not a robot in charge. Nothing here is a rush. We can use AI more safely when we follow SafeSteps. AI can make mistakes, so we check together. You choose what to do next.",
      chantLabel: "Say this together",
      chant: "Stop and notice. Ask a grown-up, too. Keep private things private. Check what AI says with you.",
      steps: [
        "Stop and Notice",
        "Ask a Caring Grown-Up",
        "Keep Private Things Private",
        "Check Together"
      ],
      promiseLabel: "A small promise",
      promise: "Ask clearly. Think carefully. Check important answers. Make it your own.",
      start: "Start",
      back: "Back",
      hello: "Hello. I am Andi, a computer helper. We can take one small step. You do the thinking. What do you wonder about?",
      placeholder: "What do you wonder about?",
      ask: "Ask",
      restart: "Start over",
      tagline: "Big questions. Bright ideas. Kind helpers.",
      series: "Learn Safe AI with Andi",
      empty: "Add a few words, then press Ask.",
      kept: "That message was not kept on this page.",
      privacy: "Please stop. Keep that private. Do not share a name, address, phone, school, password, or photo here. Ask a caring grown-up.",
      urgent: "A caring person should answer that, not Andi. If someone is hurt or in danger, ask a grown-up now, or call for local help. I will not guess about health, safety, or money.",
      greet: "Hello. I am glad you are here. We can go at your pace. What do you wonder about?",
      cloud: "Clouds are a good thing to look at slowly. Step to a window, or go outside if you like. What shapes do you see? You can draw them. A book from the library can wait until you want it. You do the looking.",
      bird: "Birds reward a quiet look. Sit by a window or a tree. What colors do you notice? What sound? You can sketch one bird. A library book can help later. The wonder stays with you.",
      art: "Art can start with one mark. Pick a color you like. There is no grade and no rush. Look at something real, then draw what you notice. The idea is yours.",
      welcomeFriend: "A kind welcome can be small. You can smile, say hello, and ask one easy question. You choose the words. You can practice once with someone you trust. The welcome comes from you.",
      stepsLine: "SafeSteps: Stop and Notice. Ask a Caring Grown-Up. Keep Private Things Private. Check Together.",
      thinking: "Andi is thinking…",
      offline: "Sorry. Andi could not reach the helper computer right now. Ollama may be off, Tailscale may be disconnected, or the Ollama CORS/origins setting may need fixing. Address tried: "
    },
    es: {
      lang: "es",
      title: "Hablemos en español",
      body: "Qué bueno que prefieres español. Andi es un ayudante amable de la computadora. No es un niño. No manda. Vamos despacio, con frases cortas. Podemos usar la IA con más cuidado si seguimos los Pasos Seguros. La IA puede equivocarse. Por eso revisamos juntos.",
      chantLabel: "Díganlo juntos",
      chant: "Para y observa. Pregúntale también a una persona que te cuida. Guarda en privado lo que es privado. Revisa con alguien lo que dice la IA.",
      steps: [
        "Para y observa",
        "Pregunta a una persona que te cuida",
        "Guarda lo privado en privado",
        "Revisen juntos"
      ],
      promiseLabel: "Una promesa pequeña",
      promise: "Pregunta con claridad. Piensa con calma. Revisa las respuestas importantes. Hazlo tuyo.",
      start: "Empezar",
      back: "Volver",
      hello: "Hola. Soy Andi, un ayudante de la computadora. Podemos ir despacio. Tú piensas. Yo ayudo a empezar. ¿Qué te preguntas?",
      placeholder: "¿Qué te preguntas?",
      ask: "Preguntar",
      restart: "Volver al inicio",
      tagline: "Preguntas grandes. Ideas brillantes. Ayudantes amables.",
      series: "Learn Safe AI with Andi",
      empty: "Escribe unas palabras y pulsa Preguntar.",
      kept: "Ese mensaje no se guardó en esta página.",
      privacy: "Para, por favor. Eso se queda en privado. No compartas un nombre, una dirección, un teléfono, una escuela, una contraseña o una foto aquí. Pregúntale a una persona que te cuida.",
      urgent: "Eso lo debe responder una persona que te cuida, no Andi. Si alguien está herido o en peligro, pide ayuda ahora. No voy a adivinar sobre la salud, la seguridad o el dinero.",
      greet: "Hola. Me alegra que estés aquí. Soy Andi. ¿Qué te preguntas?",
      cloud: "Las nubes se miran despacio. Acércate a una ventana, o sal con una persona que te cuida. ¿Qué formas ves? Puedes dibujarlas. Después pueden leer un libro juntos. Tú miras. Yo no decido por ti.",
      bird: "Los pájaros piden una mirada quieta. Siéntate junto a una ventana o un árbol. ¿Qué colores notas? ¿Qué sonido? Puedes dibujar un pájaro. Una persona que te cuida puede buscar un libro contigo. La curiosidad es tuya.",
      art: "El arte puede empezar con una marca. Elige un color que te guste. No hay nota ni prisa. Mira algo real y dibuja lo que notas. Una persona que te cuida puede sentarse contigo. La idea es tuya.",
      welcomeFriend: "Una bienvenida amable puede ser pequeña. Puedes sonreír, decir hola y hacer una pregunta fácil, como qué le gusta leer o jugar. Tú eliges las palabras. Puedes practicar con una persona que te cuida. La bienvenida sale de ti.",
      stepsLine: "Pasos Seguros: Para y observa. Pregunta a una persona que te cuida. Guarda lo privado en privado. Revisen juntos.",
      thinking: "Andi está pensando…",
      offline: "Lo siento. Andi no pudo llegar a la computadora ayudante ahora. Puede que Ollama esté apagado, que Tailscale esté desconectado, o que haya que ajustar CORS/orígenes de Ollama. Dirección probada: "
    }
  };

  var welcome = document.getElementById("welcome");
  var pathScreen = document.getElementById("path");
  var chat = document.getElementById("chat");
  var messages = document.getElementById("messages");
  var askInput = document.getElementById("ask");
  var form = document.getElementById("ask-form");

  function show(which) {
    welcome.hidden = which !== "welcome";
    pathScreen.hidden = which !== "path";
    chat.hidden = which !== "chat";
    document.documentElement.lang = which === "welcome" || !path ? "en" : copy[path].lang;
  }

  function fillPath(id) {
    var c = copy[id];
    document.getElementById("path-title").textContent = c.title;
    document.getElementById("path-body").textContent = c.body;
    document.getElementById("chant-label").textContent = c.chantLabel;
    document.getElementById("chant-text").textContent = c.chant;
    document.getElementById("promise-label").textContent = c.promiseLabel;
    document.getElementById("promise-text").textContent = c.promise;
    document.getElementById("start").textContent = c.start;
    document.getElementById("path-back").textContent = c.back;
    document.getElementById("path-series").textContent = c.series;
    var list = document.getElementById("step-list");
    list.innerHTML = "";
    c.steps.forEach(function (step, i) {
      var li = document.createElement("li");
      var n = document.createElement("span");
      n.textContent = String(i + 1);
      li.appendChild(n);
      li.appendChild(document.createTextNode(step));
      list.appendChild(li);
    });
  }

  function addPerson(text) {
    var row = document.createElement("div");
    row.className = "msg person";
    var bubble = document.createElement("p");
    bubble.className = "bubble";
    bubble.textContent = text;
    row.appendChild(bubble);
    messages.appendChild(row);
  }

  function addAndi(paragraphs) {
    var row = document.createElement("div");
    row.className = "msg andi";
    var face = document.createElement("span");
    face.className = "mark mark-sm";
    face.setAttribute("aria-hidden", "true");
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    paragraphs.forEach(function (line) {
      var p = document.createElement("p");
      p.textContent = line;
      bubble.appendChild(p);
    });
    row.appendChild(face);
    row.appendChild(bubble);
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function addKeptNote(text) {
    var p = document.createElement("p");
    p.className = "kept-note";
    p.textContent = text;
    messages.appendChild(p);
  }

  function looksPrivate(text) {
    var rules = [
      /\b(password|passcode|passphrase|contrase[nñ]a)\b/i,
      /\bmy name is\b/i,
      /\bi am called\b/i,
      /\bi'm called\b/i,
      /\bme llamo\b/i,
      /\bmi nombre es\b/i,
      /\bmy full name\b/i,
      /\bmy address\b/i,
      /\bi live at\b/i,
      /\bviv[oa] en\b/i,
      /\bmi direcci[oó]n\b/i,
      /\b\d{1,6}\s+[A-Za-z0-9.'’-]+\s+(street|st\.?|avenue|ave\.?|road|rd\.?|blvd\.?|boulevard|lane|ln\.?|drive|dr\.?)\b/i,
      /\bmy phone\b/i,
      /\bmy number is\b/i,
      /\bphone (number|is)\b/i,
      /\bmi tel[eé]fono\b/i,
      /\b\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b/,
      /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
      /\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/,
      /\b\d{3}-\d{2}-\d{4}\b/,
      /\bmy school\b/i,
      /\bmi escuela\b/i,
      /\bescuela se llama\b/i,
      /\b(i attend|i go to)\s+[A-Z][\w'’-]+(?:\s+[A-Z][\w'’-]+){0,4}\s+(school|elementary|academy)\b/,
      /\b(selfie|photo of me|picture of me|pic of me)\b/i,
      /\bmy (photo|selfie)\b/i,
      /\b(here'?s|here is|this is)\s+(my\s+|a\s+)?(photo|picture|selfie|foto)\b/i,
      /\b(foto|fotograf[ií]a) m[ií]a\b/i,
      /\bmi foto\b/i,
      /\bte (mando|env[ií]o) (una )?foto\b/i
    ];
    return rules.some(function (r) { return r.test(text); });
  }

  function needsPerson(text) {
    return /\b(911|emergency|emergencia|suicide|suicidio|hurt myself|kill myself|chest pain|can't breathe|cannot breathe|overdose|bleeding|ambulance|ambulancia|doctor|m[eé]dico|medicine|medicina|medication|diagnosis|symptom|hospital|sick|illness|pregnant|dose|health|hurt|injury|injured|herid[oa]|money|dollar|dollars|price|prices|invest|investment|stocks?|bank account|my bank|the bank|loan|tax|dinero|banco|precio|cuesta|lawyer|lawsuit|legal advice|attorney|police|abogado|danger|unsafe|safety|seguridad)\b/i.test(text);
  }

  function isGreeting(text) {
    var t = text.trim().toLowerCase().replace(/[¡!¿?.,]/g, "");
    return /^(hi|hello|hey|hiya|good morning|good afternoon|good evening|hola|buenas|buenos dias|buenos días|buenas tardes|buenas noches)$/.test(t);
  }

  function topicOf(text, lang) {
    var t = text.toLowerCase();
    if (lang === "es") {
      if (/nube/.test(t)) return "cloud";
      if (/p[aá]jaro|\baves?\b/.test(t)) return "bird";
      if (/bienvenid|amigo nuevo|dar la bienvenida/.test(t)) return "welcomeFriend";
      if (/\barte\b|dibuj|pint/.test(t)) return "art";
      return null;
    }
    if (/cloud/.test(t)) return "cloud";
    if (/\bbirds?\b/.test(t)) return "bird";
    if (/welcom|new friend|welcome a friend/.test(t)) return "welcomeFriend";
    if (/\bart\b|\bdraw|\bpaint|\bsketch/.test(t)) return "art";
    return null;
  }

  function simpler(text) {
    var s = text.replace(/\s+/g, " ").trim();
    if (s.length > 160) s = s.slice(0, 157).replace(/\s+\S*$/, "") + "…";
    return s;
  }

  function generalReply(text, lang) {
    var s = simpler(text);
    if (lang === "es") {
      return "En palabras más simples, preguntas esto: “" + s + "”. Un paso: dilo en una frase corta a una persona que te cuida, o búsquenlo en un libro. No invento datos. Revisen juntos. La IA puede equivocarse.";
    }
    return "In simpler words, you are asking this: “" + s + "”. One next step: say it in one short sentence to a person you trust, or look in a book together. I will not invent facts. Check together. AI can make mistakes.";
  }

  function cleanReply(text) {
    return String(text || "")
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^[\s\S]*?<\/think>/i, "")
      .trim();
  }

  function askOllama(text) {
    var msgs = [{ role: "system", content: SYSTEM }].concat(history, [{ role: "user", content: text }]);
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
    return fetch(OLLAMA_BASE + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: msgs,
        stream: false,
        temperature: 0.4,
        reasoning_effort: "none" // qwen3: skip long hidden thinking, reply faster
      }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      var answer = cleanReply(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
      if (!answer) throw new Error("empty reply");
      return answer;
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function finish(lines, c) {
    if (firstReply) {
      lines.push(c.stepsLine);
      firstReply = false;
    }
    addAndi(lines);
  }

  async function replyTo(text) {
    var c = copy[path];
    // SafeSteps filters: these always answer locally and never call the LLM.
    if (looksPrivate(text)) {
      addKeptNote(c.kept);
      finish([c.privacy], c);
      return;
    }
    if (needsPerson(text)) {
      addPerson(text);
      finish([c.urgent], c);
      return;
    }
    if (isGreeting(text)) {
      addPerson(text);
      finish([c.greet], c);
      return;
    }
    addPerson(text);
    var thinkingRow = addAndi([c.thinking]);
    thinkingRow.classList.add("thinking");
    var startedPath = path;
    busy = true;
    try {
      var answer = await askOllama(text);
      if (path !== startedPath || !thinkingRow.parentNode) return; // restarted meanwhile
      thinkingRow.remove();
      history.push({ role: "user", content: text }, { role: "assistant", content: answer });
      if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX);
      finish(answer.split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean), c);
    } catch (err) {
      if (path !== startedPath || !thinkingRow.parentNode) return;
      thinkingRow.remove();
      addAndi([c.offline + OLLAMA_BASE + " (" + MODEL + ")"]);
      if (window.console) console.warn("Andi: Ollama request failed", OLLAMA_BASE, err);
    } finally {
      busy = false;
    }
  }

  document.querySelectorAll(".choice").forEach(function (btn) {
    btn.addEventListener("click", function () {
      path = btn.getAttribute("data-path");
      fillPath(path);
      show("path");
      document.getElementById("path-title").focus();
    });
  });

  document.getElementById("path-back").addEventListener("click", function () {
    show("welcome");
  });

  document.getElementById("start").addEventListener("click", function () {
    var c = copy[path];
    messages.innerHTML = "";
    firstReply = true;
    history = [];
    askInput.value = "";
    askInput.placeholder = c.placeholder;
    document.getElementById("ask-btn").textContent = c.ask;
    document.getElementById("ask-label").textContent = c.placeholder;
    document.getElementById("restart").textContent = c.restart;
    document.getElementById("chat-tagline").textContent = c.tagline;
    show("chat");
    addAndi([c.hello]);
    askInput.focus();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy) return;
    var text = askInput.value.trim();
    askInput.value = "";
    if (!text) {
      addAndi([copy[path].empty]);
      return;
    }
    replyTo(text);
  });

  document.getElementById("restart").addEventListener("click", function () {
    path = null;
    firstReply = true;
    history = [];
    busy = false;
    messages.innerHTML = "";
    askInput.value = "";
    show("welcome");
  });

  show("welcome");
})();
