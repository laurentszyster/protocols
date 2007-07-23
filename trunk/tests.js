function eval_synopsis (element) {
    eval (['{', element.textContent, '}'].join(''));
}