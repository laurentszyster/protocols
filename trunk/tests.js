function eval_synopsis (element) {
    return eval ('{' + HTML.text(element) + '}')
}

Protocols.onload.push(function () {
    var hover = ['hover'];
    map(function (el) {
        HTML.listen(el, 'mouseover', function () {
            CSS.add(el, hover);
        });
        HTML.listen(el, 'mouseout', function () {
            CSS.remove(el, /hover\s*/g);
        });
    }, $$('pre.synopsis'));
});