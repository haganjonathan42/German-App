/* Quiz mode: multiple-choice, type-the-answer, or der/die/das.
   Every answer is recorded in the spaced-repetition engine. */
(function () {
  'use strict';
  window.Modes = window.Modes || {};

  var DEFAULT_ROUND = 12; // questions per round (or fewer if the set is small)

  window.Modes.quiz = function (ctx) {
    var A = window.App;
    // Words to test come from ctx.items; distractor options are drawn from
    // ctx.pool if given (lets "Reinforce" test a small subset while still
    // building 4-option questions from the whole category).
    var testItems = ctx.items.slice();
    var pool = (ctx.pool || ctx.items).slice();
    var ROUND = ctx.round || DEFAULT_ROUND;
    var subtitle = ctx.subtitle || 'Choose how you want to be tested.';
    var titleSuffix = ctx.titleSuffix || 'Quiz';
    var hasNouns = testItems.some(function (it) { return it.article; });

    var style = 'mc';      // 'mc' | 'type' | 'article'
    var deToEn = true;     // for mc/type
    setup();

    function setup() {
      var styleChips = A.h('div', { class: 'chips' },
        chip('Multiple choice', function () { style = 'mc'; }, function () { return style === 'mc'; }),
        chip('Type the answer', function () { style = 'type'; }, function () { return style === 'type'; }));
      if (hasNouns) styleChips.appendChild(chip('der / die / das', function () { style = 'article'; }, function () { return style === 'article'; }));

      var dirChips = A.h('div', { class: 'chips' },
        chip('German → English', function () { deToEn = true; }, function () { return deToEn; }),
        chip('English → German', function () { deToEn = false; }, function () { return !deToEn; }));

      function chip(label, on, isOn) {
        var b = A.h('button', { class: 'chip' + (isOn() ? ' chip--on' : '') }, label);
        b.onclick = function () { on(); setup(); };
        return b;
      }

      A.mount(A.h('div', { class: 'stack' },
        A.h('h2', { class: 'screen-title' }, ctx.title + ' — ' + titleSuffix),
        A.h('p', { class: 'screen-sub' }, subtitle),
        A.h('div', { class: 'stack' }, A.h('div', { class: 'sr-note' }, 'Question type'), styleChips),
        style === 'article' ? A.h('div', {}) :
          A.h('div', { class: 'stack' }, A.h('div', { class: 'sr-note' }, 'Direction'), dirChips),
        A.h('div', { class: 'spacer' }),
        A.h('button', { class: 'btn btn--primary btn--block', onclick: run }, ctx.startLabel || 'Start quiz')
      ));
    }

    function run() {
      var queue;
      if (style === 'article') queue = testItems.filter(function (it) { return it.article; });
      else queue = testItems.slice();
      A.shuffle(queue);
      queue = queue.slice(0, Math.min(ROUND, queue.length));

      // Per-question state so you can skip, go back, and review answers.
      var results = queue.map(function () { return { answered: false, correct: null, chosen: null }; });
      var mcCache = {}; // pos -> stable option list (so revisiting shows the same options)
      var pos = 0;
      render();

      function scoreSoFar() { var s = 0; results.forEach(function (r) { if (r.correct) s++; }); return s; }
      function answeredCount() { var c = 0; results.forEach(function (r) { if (r.answered) c++; }); return c; }
      function go(d) { var n = pos + d; if (n < 0 || n >= queue.length) return; pos = n; render(); }
      function commit(correct, chosen) {
        if (!results[pos].answered) {
          results[pos] = { answered: true, correct: correct, chosen: chosen };
          window.SRS.record(queue[pos].id, correct);
        }
        render();
      }

      // Build a prompt node; add a 🔊 button when the prompt word is German.
      function qprompt(text, germanEntry) {
        var node = A.h('div', { class: 'q-prompt' }, text);
        if (germanEntry && A.canHear) node.appendChild(A.speakerButton(germanEntry.speakText, 'spk--sm', germanEntry.id));
        return node;
      }

      function renderMC(e, r, answerText) {
        if (!mcCache[pos]) mcCache[pos] = buildOptions(e, deToEn);
        var box = A.h('div', { class: 'options' });
        mcCache[pos].forEach(function (opt) {
          var b = A.h('button', { class: 'option' }, opt);
          if (r.answered) {
            b.disabled = true;
            if (opt === answerText) b.classList.add('option--correct');
            else if (opt === r.chosen) b.classList.add('option--wrong');
          } else {
            b.onclick = function () { commit(opt === answerText, opt); };
          }
          box.appendChild(b);
        });
        return box;
      }

      function renderArticle(e, r) {
        var box = A.h('div', { class: 'options' });
        ['der', 'die', 'das'].forEach(function (art) {
          var b = A.h('button', { class: 'option art-' + art }, art);
          if (r.answered) {
            b.disabled = true;
            if (art === e.article) b.classList.add('option--correct');
            else if (art === r.chosen) b.classList.add('option--wrong');
          } else {
            b.onclick = function () { commit(art === e.article, art); };
          }
          box.appendChild(b);
        });
        return box;
      }

      function renderType(e, r) {
        if (r.answered) {
          return A.h('div', { class: 'text-answer', style: 'opacity:.75' }, r.chosen || '(skipped)');
        }
        var accepts = acceptable(e, deToEn ? 'en' : 'de');
        var input = A.h('input', { class: 'text-answer', type: 'text', autocomplete: 'off',
          autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
          placeholder: deToEn ? 'type the meaning…' : 'type the German…' });
        function submit() { commit(accepts.indexOf(norm(input.value)) !== -1, input.value.trim()); }
        input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') submit(); });
        setTimeout(function () { try { input.focus(); } catch (e) {} }, 30);
        return A.h('div', { class: 'stack' }, input,
          A.h('button', { class: 'btn btn--primary btn--block', onclick: submit }, 'Check'));
      }

      function render() {
        A.scrollTop();
        var e = queue[pos], r = results[pos];
        var promptNode, sub, body, answerText;

        if (style === 'article') {
          promptNode = qprompt(e.noun, e);
          sub = 'Which article? (' + cleanEn(e.english) + ')';
          answerText = e.article + ' ' + e.noun;
          body = renderArticle(e, r);
        } else if (style === 'type') {
          promptNode = qprompt(deToEn ? e.germanDisplay : cleanEn(e.english), deToEn ? e : null);
          sub = deToEn ? 'Type what it means' : 'Type it in German';
          answerText = deToEn ? cleanEn(e.english) : e.germanDisplay;
          body = renderType(e, r);
        } else {
          answerText = deToEn ? cleanEn(e.english) : e.germanDisplay;
          promptNode = qprompt(deToEn ? e.germanDisplay : cleanEn(e.english), deToEn ? e : null);
          sub = deToEn ? 'What does it mean?' : 'How do you say it in German?';
          body = renderMC(e, r, answerText);
        }

        var feedback = A.h('div', { class: 'feedback' });
        if (r.answered) {
          feedback.className = 'feedback ' + (r.correct ? 'feedback--good' : 'feedback--bad');
          feedback.textContent = r.correct ? '✓ Correct!' : '✗ Answer: ' + answerText;
        }

        var last = pos === queue.length - 1;
        var prevBtn = A.h('button', { class: 'btn', onclick: function () { go(-1); } }, '‹ Prev');
        if (pos === 0) prevBtn.disabled = true;
        var rightBtn = A.h('button', { class: 'btn btn--primary', onclick: function () { if (last) finish(); else go(1); } },
          last ? 'Finish' : (r.answered ? 'Next ›' : 'Skip ›'));

        A.mount(A.h('div', { class: 'stack' },
          A.h('div', { class: 'scorebar' },
            A.h('span', {}, 'Question ' + (pos + 1) + ' / ' + queue.length),
            A.h('span', {}, 'Score: ' + scoreSoFar())),
          A.progressBar((pos + (r.answered ? 1 : 0)) / queue.length),
          promptNode,
          A.h('p', { class: 'q-sub' }, sub),
          body,
          feedback,
          A.h('div', { class: 'btn-row' }, prevBtn, rightBtn),
          last ? null : A.h('button', { class: 'btn btn--ghost btn--block', onclick: finish }, 'Finish now')
        ));
      }

      function finish() {
        var ans = answeredCount(), score = scoreSoFar(), skipped = queue.length - ans;
        var pct = ans ? Math.round(score / ans * 100) : 0;
        A.mount(A.h('div', { class: 'stack center' },
          A.h('div', { class: 'big-emoji' }, pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'),
          A.h('h2', { class: 'screen-title' }, 'You got ' + score + ' of ' + ans + ' correct'),
          A.h('p', { class: 'muted' }, (skipped ? skipped + ' skipped · ' : '') + pct + '% of answered'),
          A.h('div', { class: 'btn-row' },
            A.h('button', { class: 'btn btn--primary', onclick: run }, 'New round'),
            A.h('button', { class: 'btn', onclick: setup }, 'Change settings'),
            A.h('button', { class: 'btn', onclick: ctx.onExit }, 'Back to modes'))
        ));
      }
    }

    // ---- helpers ----
    var padPool = ctx.padPool ? ctx.padPool.slice() : null;
    function buildOptions(e, deToEn) {
      var correct = deToEn ? cleanEn(e.english) : e.germanDisplay;
      var set = [correct], seen = {}; seen[correct] = 1;
      // Prefer distractors from the primary pool (e.g. your learning words),
      // then top up from padPool (the whole category) if we still need 4.
      addFrom(pool);
      if (set.length < 4 && padPool) addFrom(padPool);
      A.shuffle(set);
      return set;

      function addFrom(list) {
        var others = list.filter(function (it) { return it.id !== e.id; });
        A.shuffle(others);
        for (var k = 0; k < others.length && set.length < 4; k++) {
          var t = deToEn ? cleanEn(others[k].english) : others[k].germanDisplay;
          if (!seen[t]) { seen[t] = 1; set.push(t); }
        }
      }
    }
    function lockOptions(box, answerText) {
      Array.prototype.forEach.call(box.children, function (b) {
        b.disabled = true;
        if (b.textContent === answerText) b.classList.add('option--correct');
      });
    }
    function cleanEn(s) { return String(s).replace(/\s*\(.*?\)\s*/g, ' ').trim(); }
    function norm(s) {
      return String(s).toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/^(der|die|das)\s+/, '')
        .replace(/^(to|the)\s+/, '')
        .replace(/[.!?,]/g, '')
        .replace(/\s+/g, ' ').trim();
    }
    function acceptable(e, side) {
      var raw = side === 'en' ? e.english : e.raw;
      var forms = String(raw).split('/');
      if (side === 'de') { forms.push(e.germanDisplay); if (e.noun) forms.push(e.noun); }
      return forms.map(norm).filter(Boolean);
    }
  };
})();
