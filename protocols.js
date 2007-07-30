/* Copyright (C) 2007 Laurent A.V. Szyster

This library is free software; you can redistribute it and/or modify
it under the terms of version 2 of the GNU General Public License as
published by the Free Software Foundation.

    http://www.gnu.org/copyleft/gpl.html

This library is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

You should have received a copy of the GNU General Public License
along with this library; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA */

function _ie_purge(d) {
    var a = d.attributes, i, l, n;
    if (a) {
        l = a.length; for (i = 0; i < l; i += 1) {
            n = a[i].name;
            if (typeof d[n] === 'function') d[n] = null;
        }
    }
    a = d.childNodes;
    if (a) {
        l = a.length;
        for (i = 0; i < l; i += 1) _ie_purge(d.childNodes[i]);
    }
} // see http://javascript.crockford.com/memory/leak.html

function pass() {}; // noop, nada, niks, rien.

function map(fun, list) {
    var r = [];
    for (var i=0, L=list.length; i<L; i++) 
        r.push(fun(list[i]));
    return r;
}
function filter(fun, list) {
    var r = [];
    for (var i=0, L=list.length; i<L; i++) 
        if (fun(list[i]))
            r.push(list[i]);
    return r;
} // a functional duo waiting for JavaScript 1.7 list comprehension

function $(id) {
    return document.getElementById(id);
} // the simplest implementation of Prototype's defacto standard.

function bindAsEventListener(object, fun) {
    return function bound (event) {
        return fun.apply(object, [event||window.event]);
    }
} // a different event listener binding than Prototype's, as effective.

var Protocols = function () {
    var n, f = function () {this.initialize.apply(this, arguments)};
    for (var i=0, L=arguments.length; i<L; i++)
        for (n in arguments[i]) {
            f.prototype[n] = arguments[i][n];
        }
    return f;
} // the only OO convenience you need in JavaScript 1.5: 7 lines.
Protocols.version = "1.0";
Protocols.onload = [];
(function () {
    var _onload = function () {
        for (var i=0, L=Protocols.onload.length; i<L; i++) 
            Protocols.onload[i]();
    };
    if (document.addEventListener) { // Mozilla
        document.addEventListener("DOMContentLoaded", _onload, false);
    } else if (/WebKit/i.test(navigator.userAgent)) { // Safari
        var _timer = setInterval(function() {
            if (/loaded|complete/.test(document.readyState)) {
                clearInterval(_timer); 
                _onload();
            }
        }, 10);
    } else // IE is somehow supported ...
        document.onload = _onload;
})(); // see http://dean.edwards.name/weblog/2006/06/again/
var HTTP = {requests: {}} 
HTTP.fieldencode = function (s) {
	var a = s.split("+");
	for (var i=0, L=a.length; i<L; i++) {
		a[i] = escape(a[i]);
	}
	return a.join("%2B");
}
HTTP.formencode = function (sb, query) {
    start = sb.length;
    for (key in query) {
        sb.push('&'); 
        sb.push(this.fieldencode(key));
        sb.push('='); 
        sb.push(this.fieldencode(query[key]));
    }
    if (sb.length - start > 1) sb[start] = '?';
    return sb;
}
HTTP.request = function (
    method, url, headers, body, ok, error, except, timeout
    ) {
    var key = [method, url].join(' ');
    if (HTTP.requests[key]!=null) return null;
    var req = null;
    if (window.XMLHttpRequest) { // Mozilla, Safari, ...
        req = new XMLHttpRequest();
        if (req.overrideMimeType && (
            navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005]
            )[1] < 2005)
            headers['Connection'] = 'close';
    } else if (window.ActiveXObject) {
        try { // IE
            req = new ActiveXObject("Msxml2.XMLHTTP");
        } catch (e) {
            try {req = new ActiveXObject("Microsoft.XMLHTTP");} 
            catch (e) {;}
        }
    }
    if (!req) {(request.except||pass)(); return null;}
    HTTP.requests[key] = req;
    req.open(method, url, true);
    for (var name in headers) 
        req.setRequestHeader(name, headers[name]);
    req.onreadystatechange = this.response(key, ok, error, except);
    req.send(body);
    setTimeout('HTTP.timeout("' + key + '")', timeout);
    return key;
}
HTTP.response = function (key, ok, error, except) {
    return function onReadyStateChange () {
        var req = HTTP.requests[key];
        try {
            if (req.readyState == 4) {
                HTTP.requests[key] = null;
                if (req.status == 200) 
                    try {ok (req.responseText);} 
                    catch (e) {if (except) except(e);}
                else if (error) 
                    try {error (req.status, req.responseText);} 
                    catch (e) {if (except) except(e);}
            }
        } catch (e) {if (except) except(e);}
    } // It's the one obvious way to dispatch a responseText right!
}
HTTP.timeout = function (key) {
    try { // to trigger HTTP.requests[key].onreadystatechange() ...
        HTTP.requests[key].abort();
    } catch (e) {} // ... or pass.
    finally {
        delete HTTP.requests[key]; // ... and delete the request after.
    }
}

var HTML = {}; // more conveniences for more applications for more ... 
HTML._escaped = {'<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;'};
HTML._escape = function (a, b) {return HTML._escaped[b];}
HTML.cdata = function (string) {
    if (/[<>"&]/.test(string)) 
        return string.replace(/([<>"&])/g, HTML._escape);
    else
        return string;
}
HTML.query = function (element) {
    var child, query = {}, children = element.childNodes;
    for (var i=0, L=children.length; i<L; i++) {
        child = children[i]; if (
            child.name != null && 
            /(input)|(textarea)/.test (child.nodeName.toLowerCase()) && 
             /(text)|(password)|(checkbox)|(radio)|(hidden)/.test(
                 (child.type||'').toLowerCase()
                 )
            ) query[child.name] = child.value;
    }
    return query;
}
if (window.XMLHttpRequest) { // Mozilla, Safari, ...
    HTML.onEvent = function (element, type, listener) {
        element.addEventListener(type, listener, false);
    };
    HTML.text = function (element) {return element.innerText;}
    HTML.classSet = function (element, names) {
        element.className = names.join(' ');
    };
} else { // IE ...
    HTML.onEvent = function (element, type, listener) {
        element.attachEvent(type, listener);
    };
    HTML.text = function (element) {return element.textContent;}
    HTML.classSet = function (element, names) {
        element.setAttribute("className", names.join(' '));
    };
} // this prevents IDE to display a nice outline but runs faster.
HTML.classAdd = function (element, names) {
    var current = element.className;
    if (current) {
        var sb = [current];
        for (var i=0, L=names.length; i<L; i++)
            if (current.indexOf(names[i]) == -1) sb.push(names[i]);
        HTML.classSet(element, sb);
    } else
        HTML.classSet(element, names);
}
HTML.classRemove = function (element, names) {
    var current = element.className;
    if (current) {
        for (var pos, i=0, L=names.length; i<L; i++) {
            pos = current.indexOf(names[i]);
            if (pos > -1) current = (
                current.substring(0,pos) + 
                current.substring(pos+names[i].length,current.length-1) 
                );
        }
        HTML.classSet(element, [current]);
    }
} // do not set styles, use them ;-)
HTML.update = function (element, html) {
    if (element.innerHTML!=null) { // Everybody's fast hack
        _ie_purge (element);
        element.innerHTML = html;
    } else { // DOM standard, ...
        var range = element.ownerDocument.createRange();
        range.selectNodeContents(element);
        range.collapse(element);
        element.appendChild(range.createContextualFragment(html));
    }
}
HTML.replace = function (element, html) {
    if (element.outerHTML!=null) { // IE fast hack
        _ie_purge (element);
        element.outerHTML = html;
    } else { // DOM standard, ...
        var range = element.ownerDocument.createRange();
        range.selectNodeContents(element);
        element.parentNode.replaceChild(
            range.createContextualFragment(html), element
            );
    }
}
HTML.insert = function (element, html, adjacency) {
    var fragments, range = null;
    if (element.insertAdjacentHTML!=null) {
        try { // IE fast hack
            element.insertAdjacentHTML(adjacency, html); return;
        } catch (e) { // and its the fast catch.
            var tagName = element.tagName.toUpperCase();
            if (['TBODY', 'TR'].include(tagName)) {
                var div = document.createElement('div');
                div.innerHTML = (
                    '<table><tbody>' + html + '</tbody></table>'
                    );
                fragments = div.childNodes[0].childNodes[0].childNodes;
            } else {throw e;}
        }
    } else {  // DOM standard
        range = element.ownerDocument.createRange();
    } // Prototype's complicated Insertion untwisted ;-)
    switch (adjacency) {
    case 'beforeBegin':
        if (range!=null) {
            range.setStartBefore(element); // ... Mozilla only
            fragments = [range.createContextualFragment(html)];
        }
        for (var i=0, L=fragments.length; i<L; i++)
            element.parentNode.insertBefore(fragments[i], element);
        break;
    case 'afterBegin':
        if (range!=null) {
            range.selectNodeContents(element);
            range.collapse(true);
            fragments = [range.createContextualFragment(html)];
        }
        for (var i=fragments.length-1; i>-1; i--)
            element.insertBefore(fragments[i], element.firstChild)
        break;
    case 'beforeEnd':
        if (range!=null) {
            range.selectNodeContents(element);
            range.collapse(element);
            fragments = [range.createContextualFragment(html)];
        }
        for (var i=0, L=fragments.length; i<L; i++)
              element.appendChild(fragments[i]);
        break;
    case 'afterEnd':
        if (range!=null) {
            range.setStartAfter(element);
            fragments = [range.createContextualFragment(html)];
        }
        for (var i=0, L=fragments.length; i<L; i++)
            element.parentNode.insertBefore(
                fragments[i], element.nextSibling
                );
    }
}
HTML.bind = function (element, type, listener) {
    HTML.onEvent(element, type, bindAsEventListener(element, listener));
}

var JSON = {}
JSON._escaped = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"' : '\\"',
    '\\': '\\\\'
    };
JSON._escape = function (a, b) {
    var c = JSON._escaped[b];
    if (c) return c;
    c = b.charCodeAt();
    return '\\u00'+Math.floor(c/16).toString(16)+(c%16).toString(16);
    }
JSON.decode = function (string) {
    try {
        if (/^("(\\.|[^"\\\n\r])*?"|[,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t])+?$/.
                test(string))
            return eval('(' + string + ')');
    } catch (e) {
        throw new SyntaxError("parseJSON");
    }
}
JSON.encode = function (value, sb) {
    switch (typeof value) {
    case 'string':
        sb.push ('"');
        if (/["\\\x00-\x1f]/.test(value)) 
            sb.push(value.replace(/([\x00-\x1f\\"])/g, JSON._escape));
        else
            sb.push(value);
        sb.push ('"');
        return sb;
    case 'number':
        sb.push (isFinite(value) ? value : "null"); return sb;
    case 'boolean':
        sb.push (value); return sb;
    case 'undefined': case 'function': case 'unknown':
        return sb;
    case 'object': {
        if (value == null) sb.push ("null");
        else if (value.length == null) { // Object
            sb.push ('{');
            for (k in value) {
                JSON.encode (k, sb), sb.push (':'); 
                JSON.encode (value[k], sb); sb.push (',');
                }
            var last = sb.length-1;
            if (sb[last] == ',') sb[last] = '}';
            else sb[last] = '{}'
        } else { // Array
            sb.push ('[');
            for (var i=0, L=value.length; i<L; i++) {
                JSON.encode (value[i], sb); sb.push (',')
                }
            var last = sb.length-1;
            if (sb[last] == ',') sb[last] = ']';
            else sb[last] = '[]'
        }
        return sb;
    } default:
        value = value.toString();
        sb.push ('"');
        if (/["\\\x00-\x1f]/.test(value)) 
            sb.push(value.replace(/([\x00-\x1f\\"])/g, JSON._escape));
        else
            sb.push(value);
        sb.push ('"');
        return sb;
    }
}
JSON.string = function (value) {
    return this.encode(value, []).join('');
}
JSON.templates = {} // {'class': ['before', 'after']}
JSON.HTML = function (value, sb, className) {
    var t = typeof value;
    var template = (JSON.templates[className] || JSON.templates[t]);
    switch (t) {
    case 'string':
        if (template) {
            sb.push(template[0]);
            sb.push(HTML.cdata(value));
            sb.push(template[1]);
        } else {
            sb.push('<span class="string">');
            sb.push(HTML.cdata(value)); 
            sb.push('</span>');
        }
        break;
    case 'number':
        if (template) {
            sb.push(template[0]);
            sb.push(isFinite(value) ? value : "null");
            sb.push(template[1]);
        } else {
            sb.push('<span class="number">');
            sb.push(isFinite(value) ? value : "null");
            sb.push('</span>');
        }
        break;
    case 'boolean':
        if (template) {
            sb.push(template[0]);
            sb.push(value); 
            sb.push(template[1]);
        } else {
            sb.push('<span class="boolean">');
            sb.push(value); 
            sb.push('</span>');
        }
        break;
    case 'undefined': case 'function': case 'unknown':
        break;
    case 'object': {
        if (value == null) 
            if (template) {
                sb.push(template[0]);
                sb.push(template[1]);
            } else
                sb.push('<span class="null"/>'); 
        else if (value.length == null) { // Object
            if (template) {
                sb.push (template[0]);
                for (var k in value) JSON.HTML (value[k], sb, k); 
                sb.push (template[1]);
            } else {
                sb.push ('<div class="object">');
                for (var k in value) {
                    sb.push('<div class="property"><span class="name">');
                    sb.push(HTML.cdata (k)), 
                    sb.push('</span>');
                    JSON.HTML (value[k], sb, k); 
                    sb.push ('</div>');
                    }
                sb.push('</div>');
            }
        } else { // Array
            if (template) {
                sb.push(template[0]);
                for (var i=0, L=value.length; i<L; i++) 
                    JSON.HTML(value[i], sb, className)
                sb.push(template[1]);
            } else {
                sb.push('<div class="array">');
                for (var i=0, L=value.length; i<L; i++) 
                    JSON.HTML(value[i], sb, className)
                sb.push('</div>');
            }
        }
        break;
    } default:
        sb.push(HTML.cdata(value.toString())); break;
    }
    if (template) sb.push(template[1]);
    return sb;
}
JSON.timeout = 3000; // 3 seconds
JSON.errors = {};
JSON.exceptions = [];
JSON.GET = function (url, query, ok, timeout) {
    if (query != null)
        var url = HTTP.formencode([url], query).join ('')
    return HTTP.request(
        'GET', url, {
            'Accept': 'text/javascript'
            }, null, ok, 
        function (status, text) {
            (JSON.errors[status.toString()]||pass)(url, query, text);
        }, 
        function (e) {JSON.exceptions.push(e);}, 
        timeout || JSON.timeout
        );
}
JSON.POST = function (url, payload, ok, timeout) {
    return HTTP.request(
        'POST', url, {
            'Content-Type': 'application/json; charset=UTF-8', 
            'Accept': 'text/javascript'
            }, JSON.encode (payload, []).join (''), ok, 
        function (status, text) {
            (JSON.errors[status.toString()]||pass)(url, payload, text);
        }, 
        function (e) {JSON.exceptions.push(e);}, 
        timeout || (JSON.timeout * 2)
        );
}
JSON.update = function (id) {
    if (id == null)
       return function (text) {
            var json = JSON.decode(text);
            for (var key in json) try { 
                HTML.update($(key), JSON.HTML(json[key], []).join(''));
            } catch (e) {}
        }
    return function (text) {
        HTML.update($(id), JSON.HTML(JSON.decode(text), []).join(''));
    }
}
JSON.replace = function (id) {
    if (id == null)
        return function (text) {
            var json = JSON.decode(text);
            for (var key in json) try { 
                HTML.replace($(key), JSON.HTML(json[key], []).join(''));
            } catch (e) {}
        }
    return function (text) {
        HTML.replace($(id), JSON.HTML(JSON.decode(text), []).join(''));
    }
}
JSON.insert = function (adjacency, id) {
    if (id == null)
        return function (text) {
            var json = JSON.decode(text);
            for (var key in json) try { 
                HTML.insert(
                    $(key), JSON.HTML(json[key], []).join(''), adjacency
                    );
            } catch (e) {}
        }
    return function (text) {
        HTML.insert($(id), JSON.HTML(
            JSON.decode(text), []
            ).join(''), adjacency);
    }
}

Protocols.onload.push(
    function () {
        var templates = $('templates'), child;
        if (templates && templates.childNodes != null) {
            for (child in templates.childNodes) if (child.className) {
               JSON.templates[child.className] = child.innerHTML.split(
                   '<json/>'
                   );
            }
        }
    });