function eval_synopsis (element) {
    if (element.textContent)
        return eval (['{', element.textContent, '}'].join(''));
    else
        return eval (['{', element.innerText, '}'].join(''));
}