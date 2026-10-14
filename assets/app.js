/* ============================================================
   Федеральный Центр «Гектар» — логика лендинга
   Чистый JS, без зависимостей.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Конфигурация контактов (легко менять при запуске) ---- */
  var CONFIG = {
    waPhone: "79017293919",
  };

  /* Предзаполненные сообщения по ТЗ (раздел 15) */
  var MESSAGES = {
    heroWa: "Здравствуйте! Хочу узнать, могу ли я получить бесплатный гектар. Интересует регион: ",
    regionWa: "Здравствуйте! Хочу проверить наличие участков по программе «Гектар». Регион: {region}. Подскажите, с чего начать?",
    refusalWa: "Здравствуйте! Мне отказали по заявке на гектар. Хочу понять причину отказа и возможность повторной подачи.",
    childWa: "Здравствуйте! Хочу узнать, можно ли оформить участок на ребёнка или для семьи. Интересует программа «Гектар».",
    finalWa: "Здравствуйте! Хочу проверить, могу ли я получить бесплатный гектар. Интересует программа «Гектар».",
    tg: "Здравствуйте! Хочу получить консультацию по программе «Гектар». Регион: {region}. Цель участка: {goal}.",
  };

  function waLink(text) {
    return "https://wa.me/" + CONFIG.waPhone + "?text=" + encodeURIComponent(text);
  }
  function tgLink() {
    return waLink(MESSAGES.finalWa); // Telegram не подключён: используем действующий контакт.
  }

  /* Псевдо-аналитика: место для целей Яндекс.Метрики */
  function track(goal, extra) {
    try {
      if (window.ym && window.YM_ID) { window.ym(window.YM_ID, "reachGoal", goal, extra || {}); }
    } catch (e) {}
    // console.debug("track:", goal, extra || {});
  }

  document.addEventListener("DOMContentLoaded", function () {

    /* ---------- Заполнение всех CTA-ссылок ---------- */
    document.querySelectorAll("[data-wa]").forEach(function (el) {
      var type = el.getAttribute("data-wa");
      var text;
      if (type === "hero") text = MESSAGES.heroWa;
      else if (type === "refusal") text = MESSAGES.refusalWa;
      else if (type === "child") text = MESSAGES.childWa;
      else if (type === "final") text = MESSAGES.finalWa;
      else if (type === "region") text = MESSAGES.regionWa.replace("{region}", el.getAttribute("data-region") || "");
      else text = MESSAGES.finalWa;
      el.setAttribute("href", waLink(text));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
      el.addEventListener("click", function () { track("wa_click", { src: type }); });
    });

    document.querySelectorAll("[data-tg]").forEach(function (el) {
      el.setAttribute("href", tgLink());
      el.innerHTML = el.innerHTML.replace(/Telegram/g, "WhatsApp");
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
      el.addEventListener("click", function () { track("wa_click", { src: el.getAttribute("data-tg") }); });
    });

    /* ---------- Header shadow on scroll ---------- */
    var header = document.querySelector(".site-header");
    var onScroll = function () {
      if (header) header.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      q.addEventListener("click", function () {
        var open = item.classList.contains("open");
        // закрыть остальные
        document.querySelectorAll(".faq-item.open").forEach(function (other) {
          if (other !== item) {
            other.classList.remove("open");
            other.querySelector(".faq-a").style.maxHeight = null;
            other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
          }
        });
        if (open) {
          item.classList.remove("open");
          a.style.maxHeight = null;
          q.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("open");
          a.style.maxHeight = a.scrollHeight + "px";
          q.setAttribute("aria-expanded", "true");
          track("faq_open", { q: q.textContent.trim().slice(0, 40) });
        }
      });
    });

    /* ---------- Scroll reveal ---------- */
    var reveals = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add("in"); });
    }

    /* ---------- Scroll depth goals ---------- */
    var depthFired = {};
    window.addEventListener("scroll", function () {
      var pct = (window.scrollY + window.innerHeight) / document.body.scrollHeight * 100;
      [50, 90].forEach(function (mark) {
        if (pct >= mark && !depthFired[mark]) { depthFired[mark] = true; track("scroll_" + mark); }
      });
    }, { passive: true });

    /* ---------- Helpers for validation ---------- */
    function setError(field, on) {
      if (!field) return;
      field.classList.toggle("field--error", !!on);
    }

    /* ---------- Capture form (Блок 5) ---------- */
    var form = document.getElementById("captureForm");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var ok = true;

        var name = form.querySelector('[name="name"]');
        var region = form.querySelector('[name="region"]');
        var contact = form.querySelector('[name="contact"]');
        var consent = form.querySelector('[name="consent"]');
        var goalEl = form.querySelector('[name="goal"]:checked');

        [ [name, name.value.trim().length >= 2],
          [region, region.value.trim().length >= 2],
          [contact, contact.value.trim().length >= 3] ].forEach(function (pair) {
          setError(pair[0].closest(".field"), !pair[1]);
          if (!pair[1]) ok = false;
        });

        var consentField = consent.closest(".consent");
        setError(consentField, !consent.checked);
        if (!consent.checked) ok = false;

        if (!ok) {
          var firstErr = form.querySelector(".field--error");
          if (firstErr) firstErr.scrollIntoView ? null : null; // avoid scrollIntoView per guidelines
          return;
        }

        var channel = "wa";
        var goal = goalEl ? goalEl.value : "для себя";
        track("contact_draft", { channel: channel, region: region.value.trim(), goal: goal });
        var text = "Здравствуйте! Меня зовут " + name.value.trim() +
          ". Регион: " + region.value.trim() + ". Цель участка: " + goal +
          ". Контакт для ответа: " + contact.value.trim() + ".";
        var link = waLink(text);

        // показать экран «спасибо»
        var card = document.getElementById("formBody");
        var success = document.getElementById("formSuccess");
        if (card && success) {
          card.style.display = "none";
          success.classList.add("show");
        }
        // Открытие чата не подтверждает отправку. Оставляем ссылку для повторного открытия.
        if (success) {
          var retry = success.querySelector("a") || document.createElement("a");
          retry.removeAttribute("data-wa");
          retry.href = link; retry.target = "_blank"; retry.rel = "noopener";
          retry.className = "btn btn--orange"; retry.textContent = "Открыть WhatsApp и отправить";
          success.appendChild(retry);
        }
        window.open(link, "_blank", "noopener");
      });
    }

    /* ---------- Waitlist form (Блок 3) ---------- */
    var wl = document.getElementById("waitlistForm");
    if (wl) {
      wl.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var ok = true;
        ["name", "region", "contact"].forEach(function (n) {
          var inp = wl.querySelector('[name="' + n + '"]');
          var valid = inp.value.trim().length >= 2;
          setError(inp.closest(".field"), !valid);
          if (!valid) ok = false;
        });
        if (!ok) return;
        track("waitlist_draft", { region: wl.querySelector('[name="region"]').value.trim() });
        var draft = waLink("Здравствуйте! Хочу узнать о доступности региона. Имя: " +
          wl.querySelector('[name="name"]').value.trim() + ". Регион: " +
          wl.querySelector('[name="region"]').value.trim() + ". Контакт: " +
          wl.querySelector('[name="contact"]').value.trim() + ".");
        var done = wl.querySelector("[data-wl-done]");
        var retry = document.createElement("a");
        retry.href = draft; retry.target = "_blank"; retry.rel = "noopener";
        retry.textContent = "Открыть WhatsApp и отправить"; done.appendChild(retry);
        window.open(draft, "_blank", "noopener");
        wl.querySelector("[data-wl-form]").style.display = "none";
        wl.querySelector("[data-wl-done]").style.display = "flex";
      });
    }

  });
})();

