/* ============================================================
   Квест 16.11 — общий конфиг: порядок экранов, подсказки, примогемы.
   Здесь правятся тексты подсказок. Остальные файлы трогать не нужно.
   ============================================================ */
window.QUEST_CONFIG = {

  /* Порядок экранов. path — от корня сайта. theme: pubg | minecraft |
     subnautica | genshin | quest. Кнопка «Дальше» / автопереход ведут
     на следующий пункт списка. */
  FLOW: [
    { id: "start",        path: "start/",                 theme: "quest",      title: "Старт" },
    { id: "pubg-skin",    path: "pubg/skin.html",         theme: "pubg",       title: "Выбор скина" },
    { id: "pubg-flight",  path: "pubg/flight.html",       theme: "pubg",       title: "Полёт" },
    { id: "pubg-landing", path: "pubg/landing.html",      theme: "pubg",       title: "Прыжок и приземление" },
    { id: "pubg-zone-a",  path: "pubg/zone.html",         theme: "pubg",       title: "Зоны, вопросы 1–3" },
    { id: "pubg-airdrop", path: "pubg/airdrop.html",      theme: "pubg",       title: "Аирдроп" },
    { id: "pubg-zone-b",  path: "pubg/zone.html?q=4",     theme: "pubg",       title: "Зоны, вопросы 4–8 и победа" },
    { id: "minecraft",    path: "minecraft/house.html",   theme: "minecraft",  title: "Наш дом" },
    { id: "subnautica",   path: "subnautica/transition.html", theme: "subnautica", title: "Подводный мир" },
    { id: "genshin",      path: "genshin/index.html",     theme: "genshin",    title: "Тейват" },
    { id: "finale",       path: "finale/index.html",      theme: "quest",      title: "Финал" },
    { id: "trust",        path: "finale/trust.html",      theme: "quest",      title: "Ты веришь мне?" },
    { id: "gacha",        path: "gacha/index.html",       theme: "quest",      title: "Крутки" },
    { id: "gifts",        path: "gifts/index.html",       theme: "quest",      title: "Подарки" }
  ],

  /* Тексты подсказок.
     Ключ "экран" — подсказка на весь экран.
     Ключ "экран:шаг" — подсказка на конкретный вопрос/шаг
     (если её нет, берётся подсказка экрана, потом DEFAULT).
     Шаги: pubg-zone-a / pubg-zone-b → q1…q8 (+ "victory"),
           minecraft → q1…q5 (+ "done"),
           subnautica → loc1…loc7. */
  HINTS: {
    DEFAULT: "Подсказка появится позже",
    // "pubg-zone-a:q1": "…",
    // "pubg-zone-b:q5": "Отправь Жене кружочек — и он подскажет голосом 💙",
    // "minecraft:q1": "…",
    // "subnautica:loc2": "…",
  },

  /* Примогемы. Баланс хранится в localStorage (ключ STORAGE_KEY),
     гача читает и тратит тот же баланс. Начисления за вопрос
     даются один раз (повторное прохождение не удваивает). */
  PRIMOS: {
    STORAGE_KEY: "nov16_primos",
    AWARDS_KEY: "nov16_primo_awards",
    START: 0,
    PER_QUESTION: 240
  }
};
