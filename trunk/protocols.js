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

function Protocols (protocols) {
    var name, Fun = function () {this.initialize.apply(this, arguments)};
    for (i=0, L=protocols.length; i<L; i++)
        for (name in protocols[i]) 
            Fun.prototype[name] = protocols[i][name];
    return Fun;
} // the only OO convenience you need in JavaScript: 7 lines.

Function.prototype.bindAsEventListener = function (object) {
    var method = this;
    return function bound (event) {
        return method.apply(object, [event||window.event]);
    }
} // a simple event listener binding (I mean, simpler than Prototype's ;-)

var $ = function (id) {
    return document.getElementById(id)
} // the simplest implementation of Prototype's defacto standard.

var pass = function () {};

var HTTP = { // may be used as a prototype too, because ...
    requests: {},
} 
HTTP.formencode = function (sb, query) {
    start = sb.length;
    for (key in query) {
        sb.push('&'); 
        sb.push(escape(key));
        sb.push('='); 
        sb.push(escape(query[key]));
    }
    if (sb.length - start > 1) sb[start] = '?';
    return sb;
}
HTTP.request = function (
    method, url, headers, body, ok, error, except, timeout
    ) {
    var key = [method, url].join(' ');
    if (HTTP.requests[key]!=null) return null;
    var headers = request.headers;
    var req = null;
    if (window.XMLHttpRequest) // Mozilla, Safari, ...
        req = new XMLHttpRequest();
        if (req.overrideMimeType && (
            navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005]
            )[1] < 2005)
            headers['Connection'] = 'close';
    else if (window.ActiveXObject) {
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
        if (!req) if (except) except();
        else if (req.readyState == 4) {
            delete HTTP.requests[key];
            if (req.status == 200) 
                try {ok (req.responseText);} 
                catch (e) {if (except) except(e);}
            else if (error) 
                try {error (req.status);} 
                catch (e) {if (except) except(e);}
            }
    } // It's the one obvious way to dispatch a responseText right!
}
HTTP.timeout = function (key) {
    try { // to trigger HTTP.requests[key].onreadystatechange() ...
        HTTP.requests[key].abort();
        delete HTTP.requests[key]; // ... and delete the request after.
    } catch (e) {} // ... or pass.
}

var HTML = {}; // more conveniences for more applications for more ... 
HTML._escaped = {'<': '&lt;', '>': '&gt;', '"': '&quot;', '&': '&amp;'};
HTML._escape = function (a, b) {return HTML._escaped[b];}
HTML.encode = function (string) {
    if (/[<>"&]/.test(string)) 
        return string.replace(/([<>"&])/g, HTML._escape);
    else
        return string;
}
HTML.classAdd = function (element, names) {
    var current = element.className;
    if (current) {
        var sb = [current];
        for (var i=0, L=names.length; i<L; i++)
            if (current.indexOf(names[i]) == -1) sb.push(names[i]);
        element.className = sb.join (' ');
    } else
        element.className = names.join (' ');
}
HTML.classRemove = function (element, names) {
    var current = element.className;
    if (current) {
        for (var pos, i=0, L=names.length; i<L; i++) {
            pos = current.indexOf(names[i]);
            if (pos > -1)
                current = (
                    current.substring(0,pos) + 
                    current.substring(pos+names[i].length,current.length-1) 
                    );
        }
        element.className = current;
    }
} // do not set styles, use them ;-)
HTML.query = function (element) {
    var child, query = {}, children = element.childNodes;
    for (var i=0, L=children.length; i<L; i++) {
        child = children[i];
        if (
            child.name != null && 
            /(input)|(textarea)/.test (child.nodeName.toLowerCase()) && 
             /(text)|(password)|(checkbox)|(radio)|(hidden)/.test(
                 (child.type||'').toLowerCase()
                 )
        )
        query[child.name] = child.value;
    }
    return query;
}
HTML.update = function (element, html) {
    if (element.innerHTML) { // Everybody's fast hack
        element.innerHTML = html;
    } else { // DOM standard, ...
        var range = element.ownerDocument.createRange();
        range.selectNodeContents(element);
        range.collapse(element);
        element.appendChild(range.createContextualFragment(html));
    }
}
HTML.replace = function (element, html) {
    if (element.outerHTML) { // IE fast hack
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
    if (element.insertAdjacentHTML) {
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
                this.encode (k, sb), sb.push (':'); 
                this.encode (value[k], sb); sb.push (',');
                }
            var last = sb.length-1;
            if (sb[last] == ',') sb[last] = '}';
            else sb[last] = '{}'
        } else { // Array
            sb.push ('[');
            for (var i=0, L=value.length; i<L; i++) {
                this.encode (value[i], sb); sb.push (',')
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
JSON.templates = {
    'string': ['<span class="JSONstring">', '</span>'],
    'number': ['<span class="JSONnumber">', '</span>'],
    'boolean': ['<span class="JSONboolean">', '</span>'],
    'object': ['<span class="JSONnumber">', '</span>'],
    'array': ['<span class="JSONnumber">', '</span>'],
    'null': '<span class="JSONnull"/>',
}; // {'class': ['before', 'after']}
JSON.template = function (tags, pattern) {
    var i, LT, els, j, LE, className;
    for (var tag, i=0, LT=tags.length; i<LT; i++) {
	    els = node.getElementsByTagName(tag);
	    for (j=0, LE=els.length; j<LE; j++)
	        if (els[j].id && pattern.test(els[j].className||'')) {
	            ;
	        }
    }
}
JSON.HTML = function (value, sb) {
    switch (typeof value) {
    case 'string':
        sb.push ('<span class="JSONstring">');
        sb.push (HTML.encode(value));
        sb.push ('</span>');
        return sb;
    case 'number':
        sb.push ('<span class="JSONnumber">');
        sb.push (isFinite(value) ? value : "null");
        sb.push ('</span>');
        return sb;
    case 'boolean':
        sb.push ('<span class="JSONboolean">');
        sb.push (value); 
        sb.push ('</span>');
        return sb;
    case 'undefined': case 'function': case 'unknown':
        return sb;
    case 'object': {
        if (value == null) sb.push ('<span class="JSONnull">null</span>'); 
        else if (value.length == null) { // Object
            sb.push ('<div class="JSONobject">');
            for (var k in value) {
                sb.push ('<div class="JSONproperty"><span class="JSONname">');
                sb.push (HTML.encode (k)), 
                sb.push ('</span>');
                this.HTML (value[k], sb); 
                sb.push ('</div>');
                }
            sb.push ('</div>');
        } else { // Array
            sb.push ('<div class="JSONarray">');
            for (var i=0, L=value.length; i<L; i++) 
                this.HTML (value[i], sb)
            sb.push ('</div>');
        }
        return sb;
    } default:
        sb.push ('<span class="JSON');
        sb.push (typeof value);
        sb.push ('">');
        sb.push (HTML.encode(value.toString()));
        sb.push ('</span>');
        return sb;
    }
}
JSON.timeout = 3000; // 3 seconds
JSON.except = null;
JSON.errors = {};
JSON.GET = function (url, query, ok, errors, except, timeout) {
    errors = errors || this.errors;
    except = except || this.except;
    return HTTP.request(
        'GET', HTTP.formencode ([url], query).join (''), {
            'Accept': 'application/json'
            }, null, 
        function _ok (string) {ok(JSON.decode(string));}, 
        function _error (response) {
            (errors[response.toString()]||pass) (url, query);
        }, except, timeout || this.timeout
        );
}
JSON.POST = function (url, payload, ok, errors, except, timeout) {
    errors = errors || this.errors;
    except = except || this.except;
    return HTTP.request(
        'POST', url, {
            'Content-Type': 'application/json; charset=UTF-8', 
            'Accept': 'application/json'
            }, JSON.encode (payload, []).join (''),
        function _ok (string) {ok(JSON.decode(string));}, 
        function _error (response) {
            (errors[response.toString()]||pass) (url, payload);
        }, except, timeout || (this.timeout * 2)
        );
}
JSON.update = function (id) {
    return function ok (json) {
        if (id) HTML.update($(id), this.HTML(json, []).join(''));
        else for (id in json) {
            el = document.getElementById(id);
            if (el) HTML.update(el, this.HTML(json[id], []).join(''));
        }
    }
}
JSON.replace = function (id) {
    return function ok (json) {
        if (id) HTML.replace ($(id), this.HTML(json, []).join(''));
        else for (id in json) {
            el = document.getElementById(id);
            if (el) HTML.replace (el, this.HTML(json[id], []).join(''));
        }
    }
}
JSON.insert = function (adjacency, id) {
    return function ok (json) {
        if (id) HTML.insert(
            $(id), this.HTML(json, []).join(''), adjacency
            );
        else for (id in json) {
            el = document.getElementById(id);
            if (el) HTML.insert(
                el, this.HTML(json[id], []).join(''), adjacency
                );
        }
    }
} // ... just enough to bootstrap a web user interface from JSON.