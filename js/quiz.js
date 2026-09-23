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

      var i = 0, score = 0;
      ask();

      function ask() {
        if (i >= queue.length) return finish();
        var e = queue[i];
        A.scrollTop();
        if (style === 'article') return askArticle(e);
        if (style === 'type') return askType(e);
        return askMC(e);
      }

      function next(correct) {
        window.SRS.record(queue[i].id, correct);
        if (correct) score++;
        i++;
        setTimeout(ask, correct ? 550 : 1250);
      }

      function frame(promptNode, subText, body, feedbackId) {
        A.mount(A.h('div', { class: 'stack' },
          A.h('div', { class: 'scorebar' },
            A.h('span', {}, 'Question ' + (i + 1) + ' / ' + queue.length),
            A.h('span', {}, 'Score: ' + score)),
          A.progressBar(i / queue.length),
          promptNode,
          subText ? A.h('p', { class: 'q-sub' }, subText) : A.h('div', {}),
          body,
          A.h('div', { class: 'feedback', id: feedbackId || 'fb' })
        ));
      }

      function askMC(e) {
        var answerText = deToEn ? cleanEn(e.english) : e.germanDisplay;
        var promptText = deToEn ? e.germanDisplay : cleanEn(e.english);
        var opts = buildOptions(e, deToEn);
        var box = A.h('div', { class: 'options' });
        opts.forEach(function (opt) {
          var b = A.h('button', { class: 'option' }, opt);
          b.onclick = function () {
            var correct = opt === answerText;
            lockOptions(box, answerText);
            b.classList.add(correct ? 'option--correct' : 'option--wrong');
            fb(correct, answerText);
            next(correct);
          };
          box.appendChild(b);
        });
        frame(A.h('div', { class: 'q-prompt' }, promptText), deToEn ? 'What does it mean?' : 'How do you say it in German?', box);
      }

      function askArticle(e) {
        var box = A.h('div', { class: 'options' });
        ['der', 'die', 'das'].forEach(function (art) {
          var b = A.h('button', { class: 'option art-' + art }, art);
          b.onclick = function () {
            var correct = art === e.article;
            lockOptions(box, e.article);
            b.classList.add(correct ? 'option--correct' : 'option--wrong');
            fb(correct, e.article + ' ' + e.noun);
            next(correct);
          };
          box.appendChild(b);
        });
        frame(A.h('div', { class: 'q-prompt' }, e.noun), 'Which article? (' + cleanEn(e.english) + ')', box);
      }

      function askType(e) {
        var accepts = acceptable(e, deToEn ? 'en' : 'de');
        var answerShown = deToEn ? cleanEn(e.english) : e.germanDisplay;
        var promptText = deToEn ? e.germanDisplay : cleanEn(e.english);
        var input = A.h('input', { class: 'text-answer', type: 'text', autocomplete: 'off',
          autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
          placeholder: deToEn ? 'type the meaning…' : 'type the German…' });
        var submitted = false;
        function submit() {
          if (submitted) return; submitted = true;
          var correct = accepts.indexOf(norm(input.value)) !== -1;
          input.disabled = true;
          fb(correct, answerShown);
          next(correct);
        }
        input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') submit(); });
        frame(A.h('div', { class: 'q-prompt' }, promptText), deToEn ? 'Type what it means' : 'Type it in German',
          A.h('div', { class: 'stack' }, input,
            A.h('button', { class: 'btn btn--primary btn--block', onclick: submit }, 'Check')));
        setTimeout(function () { input.focus(); }, 30);
      }

      function fb(correct, answer) {
        var el = document.getElementById('fb');
        if (!el) return;
        el.className = 'feedback ' + (correct ? 'feedback--good' : 'feedback--bad');
        el.textContent = correct ? '✓ Correct!' : '✗ Answer: ' + answer;
      }

      function finish() {
        var pct = Math.round((score / queue.length) * 100);
        A.mount(A.h('div', { class: 'stack center' },
          A.h('div', { class: 'big-emoji' }, pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'),
          A.h('h2', { class: 'screen-title' }, 'You scored ' + score + ' / ' + queue.length),
          A.h('p', { class: 'muted' }, pct + '% correct'),
          A.h('div', { class: 'btn-row' },
            A.h('button', { class: 'btn btn--primary', onclick: run }, 'New round'),
            A.h('button', { class: 'btn', onclick: setup }, 'Change settings'),
            A.h('button', { class: 'btn', onclick: ctx.onExit }, 'Back to modes'))
        ));
      }
    }

    // ---- helpers ----
    function buildOptions(e, deToEn) {
      var correct = deToEn ? cleanEn(e.english) : e.germanDisplay;
      var others = pool.filter(function (it) { return it.id !== e.id; });
      A.shuffle(others);
      var set = [correct], seen = {}; seen[correct] = 1;
      for (var k = 0; k < others.length && set.length < 4; k++) {
        var t = deToEn ? cleanEn(others[k].english) : others[k].germanDisplay;
        if (!seen[t]) { seen[t] = 1; set.push(t); }
      }
      A.shuffle(set);
      return set;
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
