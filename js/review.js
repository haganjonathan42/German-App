/* Smart Review: shows only the words that are "due" according to the
   spaced-repetition engine, weakest first. Rate yourself honestly —
   the app schedules each word's next appearance. */
(function () {
  'use strict';
  window.Modes = window.Modes || {};

  window.Modes.review = function (ctx) {
    var A = window.App;
    var queue = window.SRS.dueQueue(ctx.items);
    var hasConj = ctx.items.some(function (it) { return it.conjugation; });
    var pos = 0, flipped = false, reviewed = 0;

    if (queue.length === 0) return allDone();

    render();

    function allDone() {
      var st = window.SRS.stats(ctx.items);
      A.mount(A.h('div', { class: 'stack center' },
        A.h('div', { class: 'big-emoji' }, '✅'),
        A.h('h2', { class: 'screen-title' }, 'All caught up!'),
        A.h('p', { class: 'muted' }, reviewed > 0
          ? ('You reviewed ' + reviewed + ' word' + (reviewed === 1 ? '' : 's') + '. Come back later for the next batch.')
          : 'No words are due right now in “' + ctx.title + '.” Learn some in Flashcards or Quiz first, then come back.'),
        A.h('div', { class: 'stack' },
          A.statRow('Mastered', st.mastered, st.total),
          A.statRow('Still learning', st.learning, st.total),
          A.statRow('Not started', st.fresh, st.total)),
        A.h('button', { class: 'btn btn--primary', onclick: ctx.onExit }, 'Back to modes')
      ));
    }

    function mark(correct) {
      window.SRS.record(queue[pos].id, correct);
      reviewed++;
      flipped = false;
      pos++;
      if (pos >= queue.length) return allDone();
      render();
    }

    function render() {
      var e = queue[pos];
      var box = window.SRS.get(e.id).box;
      var card = A.h('div', { class: 'card', onclick: function () { flipped = !flipped; render(); } });
      card.appendChild(A.h('div', { class: 'card__hint' }, 'box ' + box + '/5'));
      card.appendChild(A.germanNode(e, 'card__word'));

      if (!flipped) {
        card.appendChild(A.h('div', { class: 'card__sub' }, 'Do you remember it? Tap to check.'));
      } else {
        card.appendChild(A.h('div', { class: 'card__sub' }, e.english));
        if (e.example && A.settings.get('showExample')) card.appendChild(A.h('div', { class: 'card__example' },
          A.h('div', { class: 'de' }, e.example.de), A.h('div', { class: 'en' }, e.example.en)));
        if (e.conjugation && A.settings.get('showConjugation')) card.appendChild(A.conjugationTable(e.conjugation));
      }

      var controls = flipped
        ? A.h('div', { class: 'btn-row' },
            A.h('button', { class: 'btn btn--bad', onclick: function () { mark(false); } }, '↻ Forgot'),
            A.h('button', { class: 'btn btn--good', onclick: function () { mark(true); } }, '✓ Remembered'))
        : A.h('button', { class: 'btn btn--primary btn--block', onclick: function () { flipped = true; render(); } }, 'Show answer');

      A.mount(A.h('div', { class: 'stack' },
        A.h('div', { class: 'scorebar' },
          A.h('span', {}, ctx.title + ' — Review'),
          A.h('span', {}, (pos + 1) + ' / ' + queue.length + ' due')),
        A.progressBar(pos / queue.length),
        card,
        controls,
        A.h('div', { class: 'sr-note' }, 'Show on the answer:'),
        A.displayToggles(function () { render(); }, { conjugation: hasConj })
      ));
    }
  };
})();
