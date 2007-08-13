function eval_synopsis (element) {
    return eval ('{' + HTML.text(element) + '}')
}