/*  Copyright(c) 2006-2007, Jack Slocum.

    http://extjs.com/license.txt

Copyright � 2007 Laurent A.V. Szyster

This library is free software; you can redistribute it and/or modify it under 
the terms of version 3 of the GNU Lesser General Public License as published 
by the Free Software Foundation.

    http://www.gnu.org/licenses/lgpl-3.0.txt

This library is distributed in the hope that it will be useful, but WITHOUT 
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS 
FOR A PARTICULAR PURPOSE.

You should have received a copy of the GNU General Public License along with 
this library; if not, write to the Free Software Foundation, Inc., 59 Temple 
Place, Suite 330, Boston, MA 02111-1307 USA */

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
Protocols.version = "0.40";
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
    setTimeout('HTTP.timeout("' + key + '")', timeout || 3000);
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
HTML.input = function (element) {
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
    HTML.listen = function (element, type, listener) {
        element.addEventListener(type, listener, false);
    };
    HTML.text = function (element) {return element.textContent;}
} else { // IE ...
    HTML.listen = function (element, type, listener) {
        element.attachEvent("on" + type, listener);
    }; 
    HTML.text = function (element) {return element.innerText;}
}
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
    HTML.listen(element, type, bindAsEventListener(element, listener));
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
JSON.strb = function (value, sb) {
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
                JSON.strb (k, sb), sb.push (':'); 
                JSON.strb (value[k], sb); sb.push (',');
                }
            var last = sb.length-1;
            if (sb[last] == ',') sb[last] = '}';
            else sb[last] = '{}'
        } else { // Array
            sb.push ('[');
            for (var i=0, L=value.length; i<L; i++) {
                JSON.strb (value[i], sb); sb.push (',')
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
JSON.encode = function (value) {
    return this.strb(value, []).join('');
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
JSON.GET = function (url, query, ok, headers, timeout) {
    if (query != null)
        var url = HTTP.formencode([url], query).join ('')
    if (headers) {
        headers['Accept'] = 'application/json, text/javascript';
    } else {
        headers = {'Accept': 'application/json, text/javascript'};
    }
    return HTTP.request(
        'GET', url, headers, null, ok, 
        function (status, text) {
            (JSON.errors[status.toString()]||pass)(url, query, text);
        }, 
        function (e) {JSON.exceptions.push(e);}, 
        timeout || JSON.timeout
        );
}
JSON.POST = function (url, payload, ok, headers, timeout) {
    if (headers) {
        headers['Content-Type'] = 'application/json; charset=UTF-8';
        headers['Accept'] = 'application/json, text/javascript';
    } else {
        headers = {
            'Content-Type': 'application/json; charset=UTF-8', 
            'Accept': 'application/json, text/javascript'
            };
    }
    return HTTP.request(
        'POST', url, headers, JSON.strb (payload, []).join (''), ok, 
        function (status, text) {
            (JSON.errors[status.toString()]||pass)(url, payload, text);
        }, 
        function (e) {JSON.exceptions.push(e);}, 
        timeout || JSON.timeout
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

var CSS = (function(){
    /*
     * Ext - JS Library 1.0 Alpha 3 - Rev 4
     * Copyright(c) 2006-2007, Jack Slocum.
     * 
     * http://www.extjs.com/license.txt
     * 
     * This is code is also distributed under MIT license for use
     * with jQuery and prototype JavaScript libraries.
     * 
     * Modified by Laurent Szyster as a standalone CSS namespace to add
     * the power of selector to protocols.js, under LGPL 3.0 licence.
     */ 
     
    var cache = {}, simpleCache = {}, valueCache = {};
    var nonSpace = /\S/;
    var trimRe = /^\s*(.*?)\s*$/;
    var tplRe = /\{(\d+)\}/g;
    var modeRe = /^(\s?[\/>]\s?|\s|$)/;
    var tagTokenRe = /^(#)?([\w-\*]+)/;
    
    function child(p, index){
        var i = 0;
        var n = p.firstChild;
        while(n){
            if(n.nodeType == 1){
               if(++i == index){
                   return n;
               }
            }
            n = n.nextSibling;
        }
        return null;
    };
    
    function next(n){
        while((n = n.nextSibling) && n.nodeType != 1);
        return n;
    };
    
    function prev(n){
        while((n = n.previousSibling) && n.nodeType != 1);
        return n;
    };
    
    function clean(d){
        var n = d.firstChild, ni = -1;
 	    while(n){
 	        var nx = n.nextSibling;
 	        if(n.nodeType == 3 && !nonSpace.test(n.nodeValue)){
 	            d.removeChild(n);
 	        }else{
 	            n.nodeIndex = ++ni;
 	        }
 	        n = nx;
 	    }
 	    return this;
 	};

    function byClassName(c, a, v, re, cn){
        if(!v){
            return c;
        }
        var r = [];
        for(var i = 0, ci; ci = c[i]; i++){
            cn = ci.className;
            if(cn && (' '+cn+' ').indexOf(v) != -1){
                r[r.length] = ci;
            }
        }
        return r;
    };

    function attrValue(n, attr){
        if(!n.tagName && typeof n.length != "undefined"){
            n = n[0];
        }
        if(!n){
            return null;
        }
        if(attr == "for"){
            return n.htmlFor;
        }
        if(attr == "class" || attr == "className"){
            return n.className;
        }
        return n.getAttribute(attr) || n[attr];
          
    };
    
    function getNodes(ns, mode, tagName){
        var result = [], cs;
        if(!ns){
            return result;
        }
        mode = mode ? mode.replace(trimRe, "$1") : "";
        tagName = tagName || "*";
        if(typeof ns.getElementsByTagName != "undefined"){
            ns = [ns];   
        }
        if(mode != "/" && mode != ">"){
            for(var i = 0, ni; ni = ns[i]; i++){
                cs = ni.getElementsByTagName(tagName);
                for(var j = 0, ci; ci = cs[j]; j++){
                    result[result.length] = ci;
                }
            }
        }else{
            for(var i = 0, ni; ni = ns[i]; i++){
                var cn = ni.getElementsByTagName(tagName);
                for(var j = 0, cj; cj = cn[j]; j++){
                    if(cj.parentNode == ni){
                        result[result.length] = cj;
                    }
                }
            }
        }
        return result;
    };
    
    function concat(a, b){
        if(b.slice){
            return a.concat(b);
        }
        for(var i = 0, l = b.length; i < l; i++){
            a[a.length] = b[i];
        }
        return a;
    }
    
    function byTag(cs, tagName){
        if(cs.tagName || cs == document){
            cs = [cs];
        }
        if(!tagName){
            return cs;
        }
        var r = []; tagName = tagName.toLowerCase();
        for(var i = 0, ci; ci = cs[i]; i++){
            if(ci.nodeType == 1 && ci.tagName.toLowerCase()==tagName){
                r[r.length] = ci;
            }
        }
        return r; 
    };
    
    function byId(cs, attr, id){
        if(cs.tagName || cs == document){
            cs = [cs];
        }
        if(!id){
            return cs;
        }
        var r = [];
        for(var i = 0,ci; ci = cs[i]; i++){
            if(ci && ci.id == id){
                r[r.length] = ci;
                return r;
            }
        }
        return r; 
    };
    
    function byAttribute(cs, attr, value, op, custom){
        var r = [], st = custom=="{";
        var f = CSS.operators[op];
        for(var i = 0; ci = cs[i]; i++){
            var a;
            if(st){
                a = CSS.getStyle(ci, attr);
            }
            else if(attr == "class" || attr == "className"){
                a = ci.className;
            }else if(attr == "for"){
                a = ci.htmlFor;
            }else if(attr == "href"){
                a = ci.getAttribute("href", 2);
            }else{
                a = ci.getAttribute(attr);
            }
            if((f && f(a, value)) || (!f && a)){
                r[r.length] = ci;
            }
        }
        return r;
    };
    
    function byPseudo(cs, name, value){
        return CSS.pseudos[name](cs, value);
    };
    
    // This is for IE MSXML which does not support expandos.
    // IE runs the same speed using setAttribute, however FF slows way down
    // and Safari completely fails so they need to continue to use expandos.
    var isIE = window.ActiveXObject ? true : false;

    var key = 30803;

    function nodupIEXml(cs){
        var d = ++key;
        cs[0].setAttribute("_nodup", d);
        var r = [cs[0]];
        for(var i = 1, len = cs.length; i < len; i++){
            var c = cs[i];
            if(!c.getAttribute("_nodup") != d){
                c.setAttribute("_nodup", d);
                r[r.length] = c;
            }
        }
        for(var i = 0, len = cs.length; i < len; i++){
            cs[i].removeAttribute("_nodup");
        }
        return r;
    }

    function nodup(cs){
        var len = cs.length, c, i, r = cs, cj;
        if(!len || typeof cs.nodeType != "undefined" || len == 1){
            return cs;
        }
        if(isIE && typeof cs[0].selectSingleNode != "undefined"){
            return nodupIEXml(cs);
        }
        var d = ++key;
        cs[0]._nodup = d;
        for(i = 1; c = cs[i]; i++){
            if(c._nodup != d){
                c._nodup = d;
            }else{
                r = [];
                for(var j = 0; j < i; j++){
                    r[r.length] = cs[j];
                }
                for(j = i+1; cj = cs[j]; j++){
                    if(cj._nodup != d){
                        cj._nodup = d;
                        r[r.length] = cj;
                    }
                }
                return r;
            }
        }
        return r;
    }

    function quickDiffIEXml(c1, c2){
        var d = ++key;
        for(var i = 0, len = c1.length; i < len; i++){
            c1[i].setAttribute("_qdiff", d);
        }
        var r = [];
        for(var i = 0, len = c2.length; i < len; i++){
            if(c2[i].getAttribute("_qdiff") != d){
                r[r.length] = c2[i];
            }
        }
        for(var i = 0, len = c1.length; i < len; i++){
           c1[i].removeAttribute("_qdiff");
        }
        return r;
    }

    function quickDiff(c1, c2){
        var len1 = c1.length;
        if(!len1){
            return c2;
        }
        if(isIE && c1[0].selectSingleNode){
            return quickDiffIEXml(c1, c2);
        }
        var d = ++key;
        for(var i = 0; i < len1; i++){
            c1[i]._qdiff = d;
        }
        var r = [];
        for(var i = 0, len = c2.length; i < len; i++){
            if(c2[i]._qdiff != d){
                r[r.length] = c2[i];
            }
        }
        return r;
    }
    
    function quickId(ns, mode, root, id){
        if(ns == root){
           var d = root.ownerDocument || root;
           return d.getElementById(id);
        }
        ns = getNodes(ns, mode, "*");
        return byId(ns, null, id);
    }

    if (isIE) { // IE ...
        var cssSet = function (element, names) {
            element.setAttribute("className", names.join(' '));
        };
    } else { // Mozilla, Safari, ...
        var cssSet = function (element, names) {
            element.className = names.join(' ');
        };
    }
    
    return {
        getStyle : function(el, style){
        	if (el.currentStyle)
        		var v = el.currentStyle[style];
        	else if (window.getComputedStyle)
        		var v = document.defaultView.getComputedStyle(
        		    el, null
        		    ).getPropertyValue(style);
        	return v;
        },
        /**
         * Compiles a selector/xpath query into a reusable function. The 
         * returned function takes one parameter "root" (optional), which is 
         * the context node from where the query should start. 
         * @param {String} selector The selector/xpath query
         * @param {String} type (optional) Either "select" (the default) or 
         * "simple" for a simple selector match
         * @return {Function}
         */
        compile : function(path, type){
            // strip leading slashes
            while(path.substr(0, 1)=="/"){
                path = path.substr(1);
            }
            type = type || "select";
            
            var fn = ["var f = function(root){\n var mode; var n = root || document;\n"];
            var q = path, mode, lq;
            var tk = CSS.matchers;
            var tklen = tk.length;
            var mm;
            while(q && lq != q){
                lq = q;
                var tm = q.match(tagTokenRe);
                if(type == "select"){
                    if(tm){
                        if(tm[1] == "#"){
                            fn[fn.length] = 'n = quickId(n, mode, root, "'+tm[2]+'");';
                        }else{
                            fn[fn.length] = 'n = getNodes(n, mode, "'+tm[2]+'");';
                        }
                        q = q.replace(tm[0], "");
                    }else if(q.substr(0, 1) != '@'){
                        fn[fn.length] = 'n = getNodes(n, mode, "*");';
                    }
                }else{
                    if(tm){
                        if(tm[1] == "#"){
                            fn[fn.length] = 'n = byId(n, null, "'+tm[2]+'");';
                        }else{
                            fn[fn.length] = 'n = byTag(n, "'+tm[2]+'");';
                        }
                        q = q.replace(tm[0], "");
                    }
                }
                while(!(mm = q.match(modeRe))){
                    var matched = false;
                    for(var j = 0; j < tklen; j++){
                        var t = tk[j];
                        var m = q.match(t.re);
                        if(m){
                            fn[fn.length] = t.select.replace(
                                tplRe, function(x, i){return m[i];}
                                );
                            q = q.replace(m[0], "");
                            matched = true;
                            break;
                        }
                    }
                    // prevent infinite loop on bad selector
                    if(!matched){
                        throw 'Error parsing selector, parsing failed at "' + q + '"';
                    }
                }
                if(mm[1]){
                    fn[fn.length] = 'mode="'+mm[1]+'";';
                    q = q.replace(mm[1], "");
                }
            }
            fn[fn.length] = "return nodup(n);\n}";
            eval(fn.join(""));
            return f;
        },
        
        /**
         * Selects a group of elements.
         * @param {String} selector The selector/xpath query
         * @param {Node} root (optional) The start of the query (defaults to 
         * document).
         * @return {Array}
         */
        select : function(path, root, type){
            if(!root || root == document){
                root = document;
            }
            if(typeof root == "string"){
                root = document.getElementById(root);
            }
            var paths = path.split(",");
            var results = [];
            for(var i = 0, len = paths.length; i < len; i++){
                var p = paths[i].replace(trimRe, "$1");
                if(!cache[p]){
                    cache[p] = CSS.compile(p);
                    if(!cache[p]){
                        throw p + " is not a valid selector";
                    }
                }
                var result = cache[p](root);
                if(result && result != document){
                    results = results.concat(result);
                }
            }
            return results;
        },
        
        /**
         * Selects a single element.
         * @param {String} selector The selector/xpath query
         * @param {Node} root (optional) The start of the query (defaults to 
         * document).
         * @return {Element}
         */
        selectNode : function(path, root){
            return CSS.select(path, root)[0];
        },
        
        /**
         * Selects the value of a node, optionally replacing null with the 
         * defaultValue.
         * @param {String} selector The selector/xpath query
         * @param {Node} root (optional) The start of the query (defaults to 
         * document).
         * @param {String} defaultValue
         */
        selectValue : function(path, root, defaultValue){
            path = path.replace(trimRe, "$1");
            if(!valueCache[path]){
                valueCache[path] = CSS.compile(path, "select");
            }
            var n = valueCache[path](root);
            n = n[0] ? n[0] : n;
            var v = (n && n.firstChild ? n.firstChild.nodeValue : null);
            return (v === null ? defaultValue : v);
        },
        
        /**
         * Selects the value of a node, parsing integers and floats.
         * @param {String} selector The selector/xpath query
         * @param {Node} root (optional) The start of the query (defaults to 
         * document).
         * @param {Number} defaultValue
         * @return {Number}
         */
        selectNumber : function(path, root, defaultValue){
            var v = CSS.selectValue(path, root, defaultValue || 0);
            return parseFloat(v);
        },
        
        /**
         * Returns true if the passed element(s) match the passed simple 
         * selector (e.g. div.some-class or span:first-child)
         * @param {String/HTMLElement/Array} el An element id, element or 
         * array of elements
         * @param {String} selector The simple selector to test
         * @return {Boolean}
         */
        is : function(el, ss){
            if(typeof el == "string"){
                el = document.getElementById(el);
            }
            var isArray = (el instanceof Array);
            var result = CSS.filter(isArray ? el : [el], ss);
            return isArray ? (result.length == el.length) : (result.length > 0);
        },
        
        /**
         * Filters an array of elements to only include matches of a simple 
         * selector (e.g. div.some-class or span:first-child)
         * @param {Array} el An array of elements to filter
         * @param {String} selector The simple selector to test
         * @param {Boolean} nonMatches If true, it returns the elements that 
         * DON'T match the selector instead of the ones that match
         * @return {Array}
         */
        filter : function(els, ss, nonMatches){
            ss = ss.replace(trimRe, "$1");
            if(!simpleCache[ss]){
                simpleCache[ss] = CSS.compile(ss, "simple");
            }
            var result = simpleCache[ss](els);
            return nonMatches ? quickDiff(result, els) : result;
        },
        
        /**
         * Collection of matching regular expressions and code snippets. 
         */
        matchers : [{
                re: /^\.([\w-]+)/,
                select: 'n = byClassName(n, null, " {1} ");'
            }, {
                re: /^\:([\w-]+)(?:\(((?:[^\s>\/]*|.*?))\))?/,
                select: 'n = byPseudo(n, "{1}", "{2}");'
            },{
                re: /^(?:([\[\{])(?:@)?([\w-]+)\s?(?:(=|.=)\s?['"]?(.*?)["']?)?[\]\}])/,
                select: 'n = byAttribute(n, "{2}", "{4}", "{3}", "{1}");'
            }, {
                re: /^#([\w-]+)/,
                select: 'n = byId(n, null, "{1}");'
            },{
                re: /^@([\w-]+)/,
                select: 'return {firstChild:{nodeValue:attrValue(n, "{1}")}};'
            }
        ],
        
        /**
         * Collection of operator comparison functions. The default operators 
         * are =, !=, ^=, $=, *= and %=. New operators can be added as long as 
         * the match the format <i>c</i>= where <i>c<i> is any character other 
         * than space, &gt; &lt;.
         */
        operators : {
            "=" : function(a, v){
                return a == v;
            },
            "!=" : function(a, v){
                return a != v;
            },
            "^=" : function(a, v){
                return a && a.substr(0, v.length) == v;
            },
            "$=" : function(a, v){
                return a && a.substr(a.length-v.length) == v;
            },
            "*=" : function(a, v){
                return a && a.indexOf(v) !== -1;
            },
            "%=" : function(a, v){
                return (a % v) == 0;
            }
        },
        
        set: cssSet,

        add: function (element, names) {
            var current = element.className;
            if (current) {
                var sb = [current];
                for (var i=0, L=names.length; i<L; i++)
                    if (current.indexOf(names[i]) == -1) sb.push(names[i]);
                cssSet(element, sb);
            } else
                cssSet(element, names);
        },
        
        remove: function (element, names) {
            var current = element.className;
            if (current) {
                for (var pos, i=0, L=names.length; i<L; i++) {
                    pos = current.indexOf(names[i]);
                    if (pos > -1) current = (
                        current.substring(0,pos) + 
                        current.substring(pos+names[i].length,current.length-1) 
                        );
                }
                cssSet(element, [current]);
            }
        }, // do not set styles, use them ;-)
        
        /**
         * Collection of "pseudo class" processors. Each processor is passed 
         * the current nodeset (array) and the argument (if any) supplied in 
         * the selector.
         */
        pseudos : {
            "first-child" : function(c){
                var r = [], n;
                for(var i = 0, ci; ci = n = c[i]; i++){
                    while((n = n.previousSibling) && n.nodeType != 1);
                    if(!n){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "last-child" : function(c){
                var r = [];
                for(var i = 0, ci; ci = n = c[i]; i++){
                    while((n = n.nextSibling) && n.nodeType != 1);
                    if(!n){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "nth-child" : function(c, a){
                var r = [];
                if(a != "odd" && a != "even"){
                    for(var i = 0, ci; ci = c[i]; i++){
                        var m = child(ci.parentNode, a);
                        if(m == ci){
                            r[r.length] = m;
                        }
                    }
                    return r;
                }
                var p;
                // first let's clean up the parent nodes
                for(var i = 0, l = c.length; i < l; i++){
                    var cp = c[i].parentNode;
                    if(cp != p){
                        clean(cp);
                        p = cp;
                    }
                }
                // then lets see if we match
                for(var i = 0, ci; ci = c[i]; i++){
                    var m = false;
                    if(a == "odd"){
                        m = ((ci.nodeIndex+1) % 2 == 1);
                    }else if(a == "even"){
                        m = ((ci.nodeIndex+1) % 2 == 0);
                    }
                    if(m){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "only-child" : function(c){
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    if(!prev(ci) && !next(ci)){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "empty" : function(c){
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    var cns = ci.childNodes, j = 0, cn, empty = true;
                    while(cn = cns[j]){
                        ++j;
                        if(cn.nodeType == 1 || cn.nodeType == 3){
                            empty = false;
                            break;
                        }
                    }
                    if(empty){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "contains" : function(c, v){
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    if(ci.innerHTML.indexOf(v) !== -1){
                        r[r.length] = ci;
                    }
                }
                return r;
            },

            "nodeValue" : function(c, v){
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    if(ci.firstChild && ci.firstChild.nodeValue == v){
                        r[r.length] = ci;
                    }
                }
                return r;
            },

            "checked" : function(c){
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    if(ci.checked == true){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "not" : function(c, ss){
                return CSS.filter(c, ss, true);
            },
            
            "odd" : function(c){
                return this["nth-child"](c, "odd");
            },
            
            "even" : function(c){
                return this["nth-child"](c, "even");
            },
            
            "nth" : function(c, a){
                return c[a-1];
            },
            
            "first" : function(c){
                return c[0];
            },
            
            "last" : function(c){
                return c[c.length-1];
            },
            
            "has" : function(c, ss){
                var s = CSS.select;
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    if(s(ss, ci).length > 0){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "next" : function(c, ss){
                var is = CSS.is;
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    var n = next(ci);
                    if(n && is(n, ss)){
                        r[r.length] = ci;
                    }
                }
                return r;
            },
            
            "prev" : function(c, ss){
                var is = CSS.is;
                var r = [];
                for(var i = 0, ci; ci = c[i]; i++){
                    var n = prev(ci);
                    if(n && is(n, ss)){
                        r[r.length] = ci;
                    }
                }
                return r;
            }
        }
    };
})();

/**
 * Selects an array of DOM nodes by CSS/XPath selector. Shorthand 
 * of {@link CSS#select}
 * @param {String} path The selector/xpath query
 * @param {Node} root (optional) The start of the query (defaults to document).
 * @return {Array}
 */
function $$(selector) {return CSS.select(selector);}

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