/* Browse mode: searchable, scrollable list of every word in the set,
   showing translation, article, and example sentence. */
(function () {
  'use strict';
  window.Modes = window.Modes || {};

  window.Modes.browse = function (ctx) {
    var A = window.App;
    var items = ctx.items.slice().sort(function (a, b) {
      return a.germanDisplay.localeCompare(b.germanDisplay, 'de');
    });
    var query = '';

    function matches(e) {
      if (!query) return true;
      var q = query.toLowerCase();
      return e.germanDisplay.toLowerCase().indexOf(q) !== -1 ||
             e.english.toLowerCase().indexOf(q) !== -1 ||
             (e.raw && e.raw.toLowerCase().indexOf(q) !== -1);
    }

    function render() {
      var visible = items.filter(matches);
      var list = A.h('div', { class: 'list' });
      visible.forEach(function (e) {
        var row = A.h('div', { class: 'row' });
        row.appendChild(A.germanNode(e, 'row__de'));
        row.appendChild(A.h('div', { class: 'row__en' }, e.english));
        if (e.example && A.settings.get('showExample')) row.appendChild(A.h('div', { class: 'row__ex' },
          A.h('span', { class: 'de' }, e.example.de + ' '),
          A.h('span', {}, '— ' + e.example.en)));
        list.appendChild(row);
      });
      if (visible.length === 0) list.appendChild(A.h('p', { class: 'muted center' }, 'No words match “' + query + '.”'));

      var search = A.h('input', { class: 'search', type: 'search', placeholder: 'Search German or English…', value: query });
      search.addEventListener('input', function () {
        query = search.value;
        // update just the list to keep focus in the search box
        var container = document.getElementById('browseList');
        if (container) container.replaceWith(buildList());
      });

      function buildList() {
        var vis = items.filter(matches);
        var l = A.h('div', { class: 'list', id: 'browseList' });
        vis.forEach(function (e) {
          var row = A.h('div', { class: 'row' });
          row.appendChild(A.germanNode(e, 'row__de'));
          row.appendChild(A.h('div', { class: 'row__en' }, e.english));
          if (e.example && A.settings.get('showExample')) row.appendChild(A.h('div', { class: 'row__ex' },
            A.h('span', { class: 'de' }, e.example.de + ' '),
            A.h('span', {}, '— ' + e.example.en)));
          l.appendChild(row);
        });
        if (vis.length === 0) l.appendChild(A.h('p', { class: 'muted center' }, 'No words match “' + query + '.”'));
        return l;
      }

      list.id = 'browseList';
      A.mount(A.h('div', { class: 'stack' },
        A.h('div', { class: 'scorebar' },
          A.h('span', {}, ctx.title + ' — Browse'),
          A.h('span', {}, items.length + ' words')),
        A.displayToggles(function () { render(); }, {}),
        search,
        list
      ));
    }

    render();
  };
})();
