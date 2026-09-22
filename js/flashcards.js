/* Flashcards mode. Tap the card to flip; then mark whether you knew it
   (feeds the spaced-repetition engine). Toggle direction and shuffle. */
(function () {
  'use strict';
  window.Modes = window.Modes || {};

  window.Modes.flashcards = function (ctx) {
    var A = window.App;
    var items = ctx.items.slice();
    var hasConj = items.some(function (it) { return it.conjugation; });
    var order = items.map(function (_, i) { return i; });
    var pos = 0;
    var flipped = false;
    var deToEn = true; // front shows German by default

    function cur() { return items[order[pos]]; }

    function shuffle() { A.shuffle(order); pos = 0; flipped = false; render(); }

    function advance() {
      flipped = false;
      pos++;
      if (pos >= order.length) { done(); return; }
      render();
    }

    function mark(correct) {
      window.SRS.record(cur().id, correct);
      advance();
    }

    function done() {
      A.mount(A.h('div', { class: 'stack center' },
        A.h('div', { class: 'big-emoji' }, '🎉'),
        A.h('h2', { class: 'screen-title' }, 'Deck complete!'),
        A.h('p', { class: 'muted' }, 'You went through all ' + items.length + ' cards.'),
        A.h('div', { class: 'btn-row' },
          A.h('button', { class: 'btn btn--primary', onclick: function () { pos = 0; flipped = false; render(); } }, 'Study again'),
          A.h('button', { class: 'btn', onclick: ctx.onExit }, 'Back to modes')
        )
      ));
    }

    function render() {
      var e = cur();
      var frontIsGerman = deToEn;

      var frontNode = frontIsGerman
        ? A.germanNode(e, 'card__word')
        : A.h('div', { class: 'card__word' }, e.english);

      var card = A.h('div', { class: 'card', onclick: function () { flipped = !flipped; render(); } });
      card.appendChild(A.h('div', { class: 'card__hint' }, flipped ? 'tap to hide' : 'tap to flip'));

      if (!flipped) {
        card.appendChild(frontNode);
        card.appendChild(A.h('div', { class: 'card__sub' }, frontIsGerman ? 'What does it mean?' : 'Say it in German'));
      } else {
        // Back: show the other side + all extras
        if (frontIsGerman) {
          card.appendChild(A.h('div', { class: 'card__word' }, e.english));
          card.appendChild(A.germanNode(e, 'card__sub'));
        } else {
          card.appendChild(A.germanNode(e, 'card__word'));
          card.appendChild(A.h('div', { class: 'card__sub' }, e.english));
        }
        if (e.example && A.settings.get('showExample')) {
          card.appendChild(A.h('div', { class: 'card__example' },
            A.h('div', { class: 'de' }, e.example.de),
            A.h('div', { class: 'en' }, e.example.en)));
        }
        if (e.conjugation && A.settings.get('showConjugation')) card.appendChild(A.conjugationTable(e.conjugation));
        if (e.article) card.appendChild(A.h('div', { class: 'card__section sr-note' },
          'Article: ', A.articleNode(e.article), ' — ' + genderName(e.article)));
      }

      var controls = flipped
        ? A.h('div', { class: 'btn-row' },
            A.h('button', { class: 'btn btn--bad', onclick: function () { mark(false); } }, '↻ Still learning'),
            A.h('button', { class: 'btn btn--good', onclick: function () { mark(true); } }, '✓ I knew it'))
        : A.h('div', { class: 'btn-row' },
            A.h('button', { class: 'btn', onclick: function () { if (pos > 0) { pos--; flipped = false; render(); } } }, '‹ Prev'),
            A.h('button', { class: 'btn btn--primary', onclick: function () { flipped = true; render(); } }, 'Flip'),
            A.h('button', { class: 'btn', onclick: advance }, 'Skip ›'));

      A.mount(A.h('div', { class: 'stack' },
        A.h('div', { class: 'scorebar' },
          A.h('span', {}, ctx.title),
          A.h('span', {}, (pos + 1) + ' / ' + order.length)),
        A.progressBar((pos) / order.length),
        card,
        controls,
        A.h('div', { class: 'sr-note' }, 'Show on the answer:'),
        A.displayToggles(function () { render(); }, { conjugation: hasConj }),
        A.h('div', { class: 'chips' },
          A.h('button', { class: 'chip' + (deToEn ? ' chip--on' : ''), onclick: function () { deToEn = true; flipped = false; render(); } }, 'German → English'),
          A.h('button', { class: 'chip' + (!deToEn ? ' chip--on' : ''), onclick: function () { deToEn = false; flipped = false; render(); } }, 'English → German'),
          A.h('button', { class: 'chip', onclick: shuffle }, '🔀 Shuffle'))
      ));
    }

    render();
  };

  function genderName(a) {
    return a === 'der' ? 'masculine' : a === 'die' ? 'feminine' : 'neuter';
  }
})();
