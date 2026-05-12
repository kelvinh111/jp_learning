(() => {
  const { createApp } = Vue;

  const GROUP_LABELS = {
    g1: "第一類（五段）",
    g2: "第二類（一段）",
    g3: "第三類（不規則）",
  };

  const QUESTION_DATA_FILES = {
    verbClass: "quiz-data/verbClass.json",
    basicForms: "quiz-data/basicForms.json",
    teAux: "quiz-data/teAux.json",
    stemPlus: "quiz-data/stemPlus.json",
    posTransform: "quiz-data/posTransform.json",
    givingReceiving: "quiz-data/grammar-giving-receiving.json",
    auxiliaryVerbs: "quiz-data/grammar-auxiliary-verbs.json",
    aspectAndChange: "quiz-data/grammar-aspect-and-change.json",
    potentialConditional: "quiz-data/grammar-potential-and-conditional.json",
  };

  const VERB_REQUIRED_MODULES = ["verbClass", "basicForms", "teAux", "stemPlus"];
  const ALL_GROUPS = ["g1", "g2", "g3"];

  const DEFAULT_SETTINGS = {
    modules: ["verbClass", "basicForms", "teAux", "stemPlus", "posTransform", "givingReceiving", "auxiliaryVerbs", "aspectAndChange", "potentialConditional"],
    groups: [...ALL_GROUPS],
    roundSize: 20,
    repeatWrong: true,
    autoNext: true,
  };

  function sanitizeSettings(settings, validModuleKeys) {
    const validSet = new Set(validModuleKeys);
    const sanitizedModules = (Array.isArray(settings.modules) ? settings.modules : [])
      .filter((m) => validSet.has(m));

    return {
      ...settings,
      modules: sanitizedModules.length > 0 ? sanitizedModules : [...DEFAULT_SETTINGS.modules],
      groups: [...ALL_GROUPS],
    };
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(input) {
    const arr = [...input];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function unique(arr) {
    return [...new Set(arr)];
  }

  function buildChoices(answer, pool, count) {
    const cleanPool = unique(pool.filter((x) => x && x !== answer));
    const distractors = shuffle(cleanPool).slice(0, Math.max(0, count - 1));
    const merged = shuffle([answer, ...distractors]);
    return {
      choices: merged,
      answerIndex: merged.indexOf(answer),
    };
  }

  function sameVerbFormPool(verb) {
    if (!verb || !verb.forms || typeof verb.forms !== "object") {
      return [];
    }
    return unique(Object.values(verb.forms));
  }

  function joinHintLines(lines) {
    return lines.filter(Boolean).join("\n");
  }

  function firstHintLine(text, fallback) {
    if (typeof text !== "string" || !text) {
      return fallback || "";
    }
    const first = text.split("\n")[0].replace(/^步驟\d+：\s*/, "").trim();
    if (first) {
      return first;
    }
    return fallback || "";
  }

  function buildVerbClassHint(verb) {
    return joinHintLines([
      "步驟1：先看辭書形最後語尾（う段、る結尾等）。",
      "步驟2：若是「る」結尾，再判斷前一拍是否為 い/え 段，並留意第一類例外（如 入る、帰る）。",
      "步驟3：用 て形音便交叉驗算：" + verb.sound,
    ]);
  }

  const BASIC_FORM_HINT_MAP = {
    masu: [
      "第一類：語尾換到 i 段再接 ます。",
      "第二類：去掉「る」直接接 ます。",
      "第三類：する→します，来る→来ます。",
    ],
    te: [
      "第一類音便：う/つ/る→って；む/ぶ/ぬ→んで；く→いて；ぐ→いで；す→して。",
      "第二類：去る + て；第三類：して／来て。",
      "例外：行く→行って。",
    ],
    ta: [
      "第一類音便規則和 て形相同，結尾改成 た/だ。",
      "第二類：去る + た；第三類：した／来た。",
      "例外：行く→行った。",
    ],
    nai: [
      "第一類：語尾換到 a 段 + ない（う→わ）。",
      "第二類：去る + ない；第三類：しない／来ない。",
    ],
    potential: [
      "第一類：語尾換到 e 段 + る（書く→書ける）。",
      "第二類：去る + られる；第三類：する→できる，来る→来られる。",
      "可能形常見助詞從 を 變成 が。",
    ],
    ba: [
      "第一類：語尾換到 e 段 + ば（書く→書けば）。",
      "第二類：去る + れば；第三類：すれば／来れば。",
    ],
    volitional: [
      "第一類：語尾換到 o 段 + う（書く→書こう）。",
      "第二類：去る + よう；第三類：しよう／来よう。",
    ],
    imperative: [
      "第一類：語尾換到 e 段（書く→書け）。",
      "第二類：去る + ろ（口語）或 よ（書面）；第三類：しろ／来い。",
    ],
  };

  const BASIC_FORM_PREVIEW_HINT_MAP = {
    masu: "第一類換 i 段；第二類去る；第三類不規則。",
    te: "先判斷音便群，再做 て形。",
    ta: "て形規則平移到 た形（行く例外）。",
    nai: "第一類 a 段 + ない（う→わ）；第二/三類分開記。",
    potential: "先分動詞類別，再套可能形規則。",
    ba: "第一類 e 段 + ば；第二類去る + れば。",
    volitional: "第一類 o 段 + う；第二類去る + よう。",
    imperative: "第一類 e 段；第二類去る + ろ；第三類不規則。",
  };

  const BASIC_FORM_MEANING_MAP = {
    masu: "ます形是禮貌敘述基本型，常用於一般陳述。",
    te: "て形可用於接續、請託與補助動詞連接，是高頻核心形。",
    ta: "た形多用於過去、完了與經驗描述。",
    nai: "ない形表示否定，並可延伸到否定假定與禁止句型。",
    potential: "可能形表示能力、可行性或客觀可見可聞。",
    ba: "ば形是條件假定，常表一般條件關係。",
    volitional: "意向形表示說話者意志、邀約或提議。",
    imperative: "命令形表示直接命令，語氣較強需注意場合。",
  };

  function sanitizeStepText(line) {
    if (!line) {
      return "";
    }
    return line.replace(/^步驟\d+：\s*/, "").trim();
  }

  function asNumberedLines(lines) {
    return lines
      .map((line) => sanitizeStepText(line))
      .filter(Boolean)
      .map((line, idx) => String(idx + 1) + ". " + line);
  }

  function buildBasicFormHint(targetKey) {
    const details = BASIC_FORM_HINT_MAP[targetKey] || ["先判斷動詞類別，再套入對應活用規則。"];
    return joinHintLines([
      "步驟1：先判斷是第一類、第二類還是第三類。",
      "步驟2：" + details[0],
      details[1] ? "步驟3：" + details[1] : "",
      details[2] ? "步驟4：" + details[2] : "",
    ]);
  }

  function buildTeAuxHint(aux) {
    return joinHintLines([
      "步驟1：先把原動詞變成正確 て形（行く例外：行って）。",
      "步驟2：再接指定外掛「" + aux.label + "」，不要回到辭書形。",
      "步驟3：語意核對：" + aux.explain,
    ]);
  }

  function buildStemPlusHint(plugin) {
    return joinHintLines([
      "步驟1：先做連用形（ます形去ます）。",
      "步驟2：連用形直接接「" + plugin.label + "」，不要誤接 て形。",
      "步驟3：語意核對：" + plugin.explain,
    ]);
  }

  function buildFixedQuestionHint(moduleKey, baseHint) {
    let moduleHint = [];

    if (moduleKey === "givingReceiving") {
      moduleHint = [
        "先抓動作發出者（誰做）。",
        "再抓受惠者（誰得利）。",
        "依人際關係選 あげる / もらう / くれる 與敬語版本。",
      ];
    } else if (moduleKey === "auxiliaryVerbs") {
      moduleHint = [
        "先確認前項一定是 て形。",
        "判斷語感：進行/狀態(ている)、人為結果保留(てある)、完成或遺憾(てしまう)、準備或維持(ておく)、嘗試(てみる)。",
        "若是 てある，常見助詞會從 を 轉成 が。",
      ];
    } else if (moduleKey === "aspectAndChange") {
      moduleHint = [
        "先看時間方向：往未來常用 ていく，累積到現在常用 てくる。",
        "再分辨程度/難易：すぎる、やすい、にくい。",
        "最後判斷自然變化(なる)或人為決定(する/にする)。",
      ];
    } else if (moduleKey === "potentialConditional") {
      moduleHint = [
        "先判斷動詞類別再變可能形。",
        "條件接續分清：ば / なければ / なら / ばいい。",
        "可能形常見 を→が；しか 需和否定搭配。",
      ];
    }

    const numbered = moduleHint.map((line, idx) => "步驟" + String(idx + 1) + "：" + line);

    return joinHintLines([
      baseHint ? "題眼：" + baseHint : "",
      ...numbered,
    ]);
  }

  function safeJsonParse(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return fallback;
    }
  }

  function getCurrentTheme() {
    const theme = document.documentElement.getAttribute("data-theme");
    if (theme === "sunrise") {
      return "sunrise";
    }
    return "dark";
  }

  function getSavedSettings() {
    const raw = localStorage.getItem("jp-quiz-settings");
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed = safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SETTINGS };
    }
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      modules: Array.isArray(parsed.modules) ? parsed.modules : [...DEFAULT_SETTINGS.modules],
      groups: [...ALL_GROUPS],
    };
  }

  function getVerbPoolByGroups(verbs, groups) {
    if (!Array.isArray(verbs)) {
      return [];
    }
    return verbs.filter((v) => groups.includes(v.group));
  }

  function buildFingerprint(moduleKey, prompt, answer) {
    return moduleKey + "|" + prompt + "|" + answer;
  }

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("載入失敗: " + path + " (" + res.status + ")");
    }
    return res.json();
  }

  async function loadQuestionData() {
    const entries = await Promise.all(
      Object.entries(QUESTION_DATA_FILES).map(async ([key, path]) => [key, await fetchJson(path)])
    );
    return Object.fromEntries(entries);
  }

  function showLoadError(message) {
    const app = document.getElementById("app");
    if (!app) {
      return;
    }

    app.innerHTML =
      '<div style="max-width:780px;margin:14px auto;padding:14px;border-radius:14px;border:1px solid #7f5832;background:#2a2118;color:#ffc3bc;line-height:1.6;">' +
      message +
      "</div>";
  }

  function normalizeQuestionData(rawData) {
    const normalized = {};
    Object.keys(QUESTION_DATA_FILES).forEach((key) => {
      const item = rawData[key] || {};
      normalized[key] = {
        module: item.module || { key, name: key, desc: "" },
        verbs: Array.isArray(item.verbs) ? item.verbs : [],
        targets: Array.isArray(item.targets) ? item.targets : [],
        aux: Array.isArray(item.aux) ? item.aux : [],
        plugins: Array.isArray(item.plugins) ? item.plugins : [],
        iAdj: Array.isArray(item.iAdj) ? item.iAdj : [],
        naAdj: Array.isArray(item.naAdj) ? item.naAdj : [],
        noun: Array.isArray(item.noun) ? item.noun : [],
        questions: Array.isArray(item.questions) ? item.questions : [],
      };
    });
    return normalized;
  }

  (async () => {
    let questionData;
    try {
      const loaded = await loadQuestionData();
      questionData = normalizeQuestionData(loaded);
    } catch (err) {
      console.error(err);
      showLoadError("題庫 JSON 載入失敗。請確認本地伺服器有啟動，且 quiz-data/*.json 路徑存在。<br>錯誤訊息：" + err.message);
      return;
    }

    const moduleCatalog = Object.values(questionData)
      .map((x) => x.module)
      .filter((x) => x && x.key);

    const moduleKeys = moduleCatalog.map((m) => m.key);

    const moduleNameMap = moduleCatalog.reduce((acc, m) => {
      acc[m.key] = m.name;
      return acc;
    }, {});

    createApp({
      data() {
        return {
          phase: "setup",
          theme: getCurrentTheme(),
          moduleCatalog,
          questionData,
          settings: sanitizeSettings(getSavedSettings(), moduleKeys),
          currentQuestion: null,
          answered: false,
          selectedIndex: -1,
          answerCorrect: false,
          askedCount: 0,
          correctCount: 0,
          streak: 0,
          wrongQueue: [],
          queuedFingerprints: {},
          weakMap: {},
          nextTimer: null,
        };
      },
      computed: {
        canStart() {
          return this.settings.modules.length > 0;
        },
        accuracy() {
          if (this.askedCount === 0) {
            return 0;
          }
          return Math.round((this.correctCount / this.askedCount) * 100);
        },
        progressLabel() {
          if (this.settings.roundSize === -1) {
            return this.askedCount + " / ∞";
          }
          return this.askedCount + " / " + this.settings.roundSize;
        },
        weakAreas() {
          return Object.keys(this.weakMap)
            .map((key) => ({ key, wrong: this.weakMap[key].wrong }))
            .filter((x) => x.wrong > 0)
            .sort((a, b) => b.wrong - a.wrong)
            .slice(0, 5);
        },
      },
      watch: {
        settings: {
          deep: true,
          handler(val) {
            localStorage.setItem("jp-quiz-settings", JSON.stringify(val));
          },
        },
      },
      mounted() {
        window.addEventListener("keydown", this.onKeydown);
      },
      beforeUnmount() {
        window.removeEventListener("keydown", this.onKeydown);
        this.clearNextTimer();
      },
      methods: {
        getVerbPool(moduleKey) {
          const dataset = this.questionData[moduleKey];
          if (!dataset) {
            return [];
          }
          return getVerbPoolByGroups(dataset.verbs, ALL_GROUPS);
        },
        getFixedQuestionPool(moduleKey) {
          const dataset = this.questionData[moduleKey];
          if (!dataset || !Array.isArray(dataset.questions)) {
            return [];
          }
          return dataset.questions;
        },
        getKana(dictForm) {
          const fromVerbClass = (this.questionData.verbClass && this.questionData.verbClass.verbs) || [];
          const hitVerbClass = fromVerbClass.find((v) => v.dict === dictForm && v.kana);
          if (hitVerbClass) {
            return hitVerbClass.kana;
          }

          const fromBasicForms = (this.questionData.basicForms && this.questionData.basicForms.verbs) || [];
          const hitBasic = fromBasicForms.find((v) => v.dict === dictForm && v.kana);
          if (hitBasic) {
            return hitBasic.kana;
          }

          return "";
        },
        clearNextTimer() {
          if (this.nextTimer) {
            clearTimeout(this.nextTimer);
            this.nextTimer = null;
          }
        },
        toggleModule(key) {
          const idx = this.settings.modules.indexOf(key);
          if (idx >= 0) {
            this.settings.modules.splice(idx, 1);
          } else {
            this.settings.modules.push(key);
          }
        },
        toggleTheme() {
          const next = this.theme === "dark" ? "sunrise" : "dark";
          this.theme = next;
          document.documentElement.setAttribute("data-theme", next);
          localStorage.setItem("jp-quiz-theme", next);
        },
        toggleGroup(groupKey) {
          const idx = this.settings.groups.indexOf(groupKey);
          if (idx >= 0) {
            this.settings.groups.splice(idx, 1);
          } else {
            this.settings.groups.push(groupKey);
          }
        },
        startRound() {
          if (!this.canStart) {
            return;
          }
          this.settings.groups = [...ALL_GROUPS];
          this.phase = "quiz";
          this.askedCount = 0;
          this.correctCount = 0;
          this.streak = 0;
          this.wrongQueue = [];
          this.queuedFingerprints = {};
          this.weakMap = {};
          this.answered = false;
          this.selectedIndex = -1;
          this.answerCorrect = false;
          this.clearNextTimer();
          this.nextQuestion();
        },
        restartRound() {
          this.startRound();
        },
        goSetup() {
          this.phase = "setup";
          this.clearNextTimer();
        },
        onKeydown(evt) {
          if (this.phase === "setup") {
            if (evt.key === "Enter" && this.canStart) {
              evt.preventDefault();
              this.startRound();
            }
            return;
          }

          if (this.phase !== "quiz" || !this.currentQuestion) {
            return;
          }

          if ((evt.key === "r" || evt.key === "R") && !evt.metaKey && !evt.ctrlKey) {
            evt.preventDefault();
            this.restartRound();
            return;
          }

          if (["1", "2", "3", "4"].includes(evt.key) && !this.answered) {
            evt.preventDefault();
            const idx = Number(evt.key) - 1;
            if (idx < this.currentQuestion.choices.length) {
              this.submitAnswer(idx);
            }
            return;
          }

          if (evt.key === "Enter" && this.answered) {
            evt.preventDefault();
            this.nextQuestion();
          }
        },
        updateWeak(tag, isCorrect) {
          if (!this.weakMap[tag]) {
            this.weakMap[tag] = { total: 0, wrong: 0 };
          }
          this.weakMap[tag].total += 1;
          if (!isCorrect) {
            this.weakMap[tag].wrong += 1;
          }
        },
        enqueueWrongQuestion(q) {
          if (!this.settings.repeatWrong) {
            return;
          }
          if (this.queuedFingerprints[q.fingerprint]) {
            return;
          }
          this.wrongQueue.push({
            ...q,
            moduleName: q.moduleName + "（錯題回鍋）",
          });
          this.queuedFingerprints[q.fingerprint] = true;
        },
        popWrongQuestion() {
          const q = this.wrongQueue.shift();
          if (!q) {
            return null;
          }
          delete this.queuedFingerprints[q.fingerprint];
          return q;
        },
        submitAnswer(idx) {
          if (this.answered || !this.currentQuestion) {
            return;
          }

          this.selectedIndex = idx;
          this.answered = true;
          this.answerCorrect = idx === this.currentQuestion.answerIndex;

          if (this.answerCorrect) {
            this.correctCount += 1;
            this.streak += 1;
          } else {
            this.streak = 0;
            this.enqueueWrongQuestion(this.currentQuestion);
          }

          this.updateWeak(this.currentQuestion.tag, this.answerCorrect);

          if (this.settings.autoNext) {
            this.clearNextTimer();
            this.nextTimer = setTimeout(() => {
              this.nextQuestion();
            }, 3000);
          }
        },
        choiceClass(idx) {
          if (!this.answered || !this.currentQuestion) {
            return "";
          }
          if (idx === this.currentQuestion.answerIndex) {
            return "correct";
          }
          if (idx === this.selectedIndex && !this.answerCorrect) {
            return "wrong";
          }
          return "dim";
        },
        shouldFinishRound() {
          if (this.settings.roundSize === -1) {
            return false;
          }
          if (this.askedCount < this.settings.roundSize) {
            return false;
          }
          if (this.settings.repeatWrong && this.wrongQueue.length > 0) {
            return false;
          }
          return true;
        },
        nextQuestion() {
          this.clearNextTimer();
          if (this.shouldFinishRound()) {
            this.phase = "done";
            this.currentQuestion = null;
            this.answered = false;
            return;
          }

          let q = null;
          if (this.settings.repeatWrong && this.wrongQueue.length > 0 && this.askedCount > 0 && this.askedCount % 3 === 0) {
            q = this.popWrongQuestion();
          }

          if (!q) {
            q = this.generateQuestion();
          }

          if (!q) {
            this.phase = "setup";
            return;
          }

          this.currentQuestion = q;
          this.askedCount += 1;
          this.answered = false;
          this.selectedIndex = -1;
          this.answerCorrect = false;
          if (this.phase !== "quiz") {
            this.phase = "quiz";
          }
        },
        generateQuestion() {
          const modulePool = this.settings.modules.filter((m) => moduleNameMap[m] && this.questionData[m]);

          if (!modulePool.length) {
            return null;
          }

          let safety = 30;
          while (safety > 0) {
            safety -= 1;
            const moduleKey = pickRandom(modulePool);
            if (VERB_REQUIRED_MODULES.includes(moduleKey) && this.getVerbPool(moduleKey).length === 0) {
              continue;
            }
            if (moduleKey.startsWith("chapter") && this.getFixedQuestionPool(moduleKey).length === 0) {
              continue;
            }

            if (moduleKey === "verbClass") {
              return this.makeVerbClassQuestion();
            }
            if (moduleKey === "basicForms") {
              return this.makeBasicFormQuestion();
            }
            if (moduleKey === "teAux") {
              return this.makeTeAuxQuestion();
            }
            if (moduleKey === "stemPlus") {
              return this.makeStemPlusQuestion();
            }
            if (moduleKey === "posTransform") {
              return this.makePosTransformQuestion();
            }
            if (this.getFixedQuestionPool(moduleKey).length > 0) {
              return this.makeFixedQuestion(moduleKey);
            }
          }

          return null;
        },
        makeVerbClassQuestion() {
          const dataset = this.questionData.verbClass;
          const verbPool = this.getVerbPool("verbClass");
          const verb = pickRandom(verbPool);
          const choices = [GROUP_LABELS.g1, GROUP_LABELS.g2, GROUP_LABELS.g3];
          const answerIndex = choices.indexOf(GROUP_LABELS[verb.group]);
          const prompt = verb.dict + "（" + verb.kana + "）是第幾類動詞？";
          const explain = "音便驗算：" + verb.sound;
          const wrongHint = buildVerbClassHint(verb);
          const tag = "動詞類別";

          return {
            moduleKey: "verbClass",
            moduleName: dataset.module.name,
            tag,
            prompt,
            hint: "先看語尾，再判斷是否例外。",
            wrongHint,
            choices,
            answerIndex,
            explain,
            fingerprint: buildFingerprint("verbClass", prompt, choices[answerIndex]),
          };
        },
        makeBasicFormQuestion() {
          const dataset = this.questionData.basicForms;
          const verbPool = this.getVerbPool("basicForms");
          const verb = pickRandom(verbPool);
          const target = pickRandom(dataset.targets);
          const answer = verb.forms[target.key];

          const pool = sameVerbFormPool(verb);

          const built = buildChoices(answer, pool, 4);
          const prompt = verb.dict + "（" + verb.kana + "）→ " + target.label + " 是？";
          const explain = verb.dict + " 是" + GROUP_LABELS[verb.group] + "。" + target.label + "：" + answer + "。";
          const wrongHint = buildBasicFormHint(target.key);

          return {
            moduleKey: "basicForms",
            moduleName: dataset.module.name,
            tag: target.label,
            prompt,
            hint: "先判斷動詞類別，再套入對應活用。",
            wrongHint,
            choices: built.choices,
            answerIndex: built.answerIndex,
            explain,
            fingerprint: buildFingerprint("basicForms", prompt, answer),
          };
        },
        makeTeAuxQuestion() {
          const dataset = this.questionData.teAux;
          const verbPool = this.getVerbPool("teAux");
          const verb = pickRandom(verbPool);
          const aux = pickRandom(dataset.aux);
          const answer = verb.te + aux.suffix;

          const pool = dataset.aux.map((a) => verb.te + a.suffix);
          const built = buildChoices(answer, pool, 4);
          const prompt = "把「" + verb.dict + "」接成「" + aux.label + "」是？";
          const wrongHint = buildTeAuxHint(aux);

          return {
            moduleKey: "teAux",
            moduleName: dataset.module.name,
            tag: aux.label,
            prompt,
            hint: "先做正確 て形，再接外掛。",
            wrongHint,
            choices: built.choices,
            answerIndex: built.answerIndex,
            explain: aux.explain + " 組合檢查：先 て形，再接外掛。",
            fingerprint: buildFingerprint("teAux", prompt, answer),
          };
        },
        makeStemPlusQuestion() {
          const dataset = this.questionData.stemPlus;
          const verbPool = this.getVerbPool("stemPlus");
          const verb = pickRandom(verbPool);
          const plugin = pickRandom(dataset.plugins);
          const answer = verb.stem + plugin.suffix;

          const pool = dataset.plugins.map((p) => verb.stem + p.suffix);
          const built = buildChoices(answer, pool, 4);
          const prompt = "把「" + verb.dict + "」接成「" + plugin.label + "」是？";
          const wrongHint = buildStemPlusHint(plugin);

          return {
            moduleKey: "stemPlus",
            moduleName: dataset.module.name,
            tag: plugin.label,
            prompt,
            hint: "先做連用形（ます形去ます），再接外掛。",
            wrongHint,
            choices: built.choices,
            answerIndex: built.answerIndex,
            explain: plugin.explain + " 組合檢查：連用形 + 外掛。",
            fingerprint: buildFingerprint("stemPlus", prompt, answer),
          };
        },
        makePosTransformQuestion() {
          const mode = pickRandom(["i-adj", "na-adj", "noun"]);

          if (mode === "i-adj") {
            return this.makeIAdjQuestion();
          }
          if (mode === "na-adj") {
            return this.makeNaAdjQuestion();
          }
          return this.makeNounQuestion();
        },
        makeIAdjQuestion() {
          const dataset = this.questionData.posTransform;
          const item = pickRandom(dataset.iAdj);
          const template = pickRandom(["adverb", "become", "teiku", "tekuru", "te"]);

          const allPool = unique([
            item.adverb,
            item.become,
            item.becomeTeIku,
            item.becomeTeKuru,
            item.te,
            item.negative,
          ]);

          let prompt = "";
          let answer = "";
          let hint = "";
          let explain = "";
          let tag = "い形容詞";

          if (template === "adverb") {
            prompt = "「" + item.base + "」變副詞形（接動詞前）是？";
            answer = item.adverb;
            hint = joinHintLines([
              "步驟1：先把 い形容詞句尾「い」拿掉。",
              "步驟2：接「く」形成副詞形。",
              "步驟3：不要誤用「に」（那是な形容詞/名詞規則）。",
            ]);
            explain = item.base + " → " + answer + "（例如：" + answer + "なる）。";
            tag = "い形容詞→副詞";
          } else if (template === "become") {
            prompt = "「" + item.base + "」接「なる」是？";
            answer = item.become;
            hint = joinHintLines([
              "步驟1：先把「" + item.base + "」改成副詞形（...く）。",
              "步驟2：副詞形後面接 なる。",
              "步驟3：檢查是否保留了原本句尾「い」（保留就錯）。",
            ]);
            explain = item.base + " → " + item.adverb + " + なる。";
            tag = "い形容詞→なる";
          } else if (template === "teiku") {
            prompt = "「" + item.base + "」接「〜ていく」是？";
            answer = item.becomeTeIku;
            hint = joinHintLines([
              "步驟1：先做「...くなる」。",
              "步驟2：把 なる 改成 て形（なって）。",
              "步驟3：最後接 いく。",
            ]);
            explain = item.base + " → " + item.become + " → " + answer + "。";
            tag = "い形容詞→ていく";
          } else if (template === "tekuru") {
            prompt = "「" + item.base + "」接「〜てくる」是？";
            answer = item.becomeTeKuru;
            hint = joinHintLines([
              "步驟1：先做「...くなる」。",
              "步驟2：把 なる 改成 て形（なって）。",
              "步驟3：最後接 くる。",
            ]);
            explain = item.base + " → " + item.become + " → " + answer + "。";
            tag = "い形容詞→てくる";
          } else {
            prompt = "「" + item.base + "」的 て形是？";
            answer = item.te;
            hint = joinHintLines([
              "步驟1：先去掉句尾「い」。",
              "步驟2：接「くて」形成接續型。",
              "步驟3：不要和否定形（...くない）混淆。",
            ]);
            explain = item.base + " → " + answer + "。";
            tag = "い形容詞→て形";
          }

          const wrongHint = hint;
          hint = firstHintLine(wrongHint, "先判斷詞性，再套入變化規則。");

          const built = buildChoices(answer, allPool, 4);

          return {
            moduleKey: "posTransform",
            moduleName: dataset.module.name,
            tag,
            prompt,
            hint,
            wrongHint,
            choices: built.choices,
            answerIndex: built.answerIndex,
            explain,
            fingerprint: buildFingerprint("posTransform", prompt, answer),
          };
        },
        makeNaAdjQuestion() {
          const dataset = this.questionData.posTransform;
          const item = pickRandom(dataset.naAdj);
          const template = pickRandom(["adverb", "become", "teiku", "te"]);

          const allPool = unique([
            item.adverb,
            item.become,
            item.becomeTeIku,
            item.te,
            item.negative,
          ]);

          let prompt = "";
          let answer = "";
          let hint = "";
          let explain = "";
          let tag = "な形容詞";

          if (template === "adverb") {
            prompt = "「" + item.base + "」變副詞形（接動詞前）是？";
            answer = item.adverb;
            hint = joinHintLines([
              "步驟1：な形容詞副詞化時，詞幹後直接接「に」。",
              "步驟2：不要加「な」再接に。",
              "步驟3：和並列接續「で」分清用途。",
            ]);
            explain = item.base + " → " + answer + "。";
            tag = "な形容詞→副詞";
          } else if (template === "become") {
            prompt = "「" + item.base + "」接「なる」是？";
            answer = item.become;
            hint = joinHintLines([
              "步驟1：先做副詞形（...に）。",
              "步驟2：再接 なる 形成變化。",
              "步驟3：不要誤接成 ...でなる。",
            ]);
            explain = item.base + " → " + item.adverb + " + なる。";
            tag = "な形容詞→なる";
          } else if (template === "teiku") {
            prompt = "「" + item.base + "」接「〜ていく」是？";
            answer = item.becomeTeIku;
            hint = joinHintLines([
              "步驟1：先做「...になる」。",
              "步驟2：把 なる 變 て形（なって）。",
              "步驟3：最後接 いく。",
            ]);
            explain = item.base + " → " + item.become + " → " + answer + "。";
            tag = "な形容詞→ていく";
          } else {
            prompt = "「" + item.base + "」接續並列的形是？";
            answer = item.te;
            hint = joinHintLines([
              "步驟1：な形容詞接續並列或理由時，用「で」。",
              "步驟2：這裡不是副詞用途，所以不用「に」。",
              "步驟3：確認後句是描述並列或原因語意。",
            ]);
            explain = item.base + " → " + answer + "。";
            tag = "な形容詞→で";
          }

          const wrongHint = hint;
          hint = firstHintLine(wrongHint, "先判斷詞性，再套入變化規則。");

          const built = buildChoices(answer, allPool, 4);

          return {
            moduleKey: "posTransform",
            moduleName: dataset.module.name,
            tag,
            prompt,
            hint,
            wrongHint,
            choices: built.choices,
            answerIndex: built.answerIndex,
            explain,
            fingerprint: buildFingerprint("posTransform", prompt, answer),
          };
        },
        makeNounQuestion() {
          const dataset = this.questionData.posTransform;
          const item = pickRandom(dataset.noun);
          const template = pickRandom(["become", "bete", "teiku"]);

          const allPool = unique([
            item.become,
            item.becomeTe,
            item.becomeTeIku,
            item.base,
          ]);

          let prompt = "";
          let answer = "";
          let hint = "";
          let explain = "";
          let tag = "名詞轉換";

          if (template === "become") {
            prompt = "「" + item.base + "」接「なる」是？";
            answer = item.become;
            hint = joinHintLines([
              "步驟1：名詞表示變化時，用「名詞 + に + なる」。",
              "步驟2：注意是「に」不是「で」。",
              "步驟3：和人為決定「にする」分開。",
            ]);
            explain = item.base + " → " + answer + "。";
            tag = "名詞→になる";
          } else if (template === "bete") {
            prompt = "「" + item.base + "」接成「〜になって」是？";
            answer = item.becomeTe;
            hint = joinHintLines([
              "步驟1：先做「名詞 + になる」。",
              "步驟2：把 なる 變成 て形（なって）。",
              "步驟3：確認句子要接續後項動作。",
            ]);
            explain = item.base + " → " + answer + "。";
            tag = "名詞→になって";
          } else {
            prompt = "「" + item.base + "」接成「〜になっていく」是？";
            answer = item.becomeTeIku;
            hint = joinHintLines([
              "步驟1：先做「名詞 + になる」。",
              "步驟2：再做 て形成「なって」。",
              "步驟3：最後接 いく 表示往未來推進。",
            ]);
            explain = item.base + " → " + item.become + " → " + answer + "。";
            tag = "名詞→になっていく";
          }

          const wrongHint = hint;
          hint = firstHintLine(wrongHint, "先判斷名詞變化方向，再組合句型。");

          const built = buildChoices(answer, allPool, 4);

          return {
            moduleKey: "posTransform",
            moduleName: dataset.module.name,
            tag,
            prompt,
            hint,
            wrongHint,
            choices: built.choices,
            answerIndex: built.answerIndex,
            explain,
            fingerprint: buildFingerprint("posTransform", prompt, answer),
          };
        },
        makeFixedQuestion(moduleKey) {
          const dataset = this.questionData[moduleKey];
          const pool = this.getFixedQuestionPool(moduleKey);
          const picked = pickRandom(pool);
          if (!picked) {
            return null;
          }

          const answer = picked.choices[picked.answerIndex] || "";
          const wrongHint = buildFixedQuestionHint(moduleKey, picked.hint || "");

          return {
            moduleKey,
            moduleName: dataset.module.name,
            tag: picked.tag || dataset.module.name,
            prompt: picked.prompt,
            hint: picked.hint || firstHintLine(wrongHint, "先抓句型核心再判斷。"),
            wrongHint,
            choices: picked.choices,
            answerIndex: picked.answerIndex,
            explain: picked.explain || "",
            fingerprint: buildFingerprint(moduleKey, picked.prompt, answer),
          };
        },
      },
    }).mount("#app");
  })();
})();
