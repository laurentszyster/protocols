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
 
JSON.pprint = (function () {
    var _escape = (function () {
        var _escaped = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
            };
        return function (a, b) {
            var c = _escaped[b];
            if (c) return c;
            c = b.charCodeAt();
            return '\\u00'+Math.floor(c/16).toString(16)+(c%16).toString(16);
        }
    })();
    return function (sb, value, indent) {
        switch (typeof value) {
        case 'string': case 'number': case 'boolean':
            return JSON.buffer(sb, value);
        case 'undefined': case 'function': case 'unknown':
            return sb;
        case 'object':
            if (value == null) 
                sb.push ("null");
            else if (value.length == null) { // Object
                sb.push ('{');
                if (indent) {
                    indent += '  ';
                } else
                    indent = '\r\n  ';
                for (k in value) {
                    sb.push (indent);
                    JSON.buffer (sb, k);
                    sb.push (': '); 
                    JSON.pprint (sb, value[k], indent); 
                    sb.push (',');
                    }
                if (sb.pop() == '{') 
                    sb.push('{}');
                else {
                    sb.push(indent);
                    sb.push('}');
                }
            } else { // Array
                var flat = true;
                var v, i, L=value.length;
                for (i=0; i<L; i++) {
                    v = value[i];
                    if (v !== null && (typeof v) == 'object') {
                        flat = false;
                        break;
                    }
                }
                if (flat) {
                    sb.push ('[');
                    for (i=0; i<L; i++) {
                        JSON.buffer (sb, value[i]); 
                        sb.push (', ');
                    }
                    if (sb.pop() == '[') {
                        sb.push('[]');
                    } else {
                        sb.push(']');
                    }
                } else {
                    if (indent) {
                        indent += '  ';
                    } else
                        indent = '\r\n  ';
                    sb.push ('[');
                    for (i=0; i<L; i++) {
                        sb.push (indent);
                        JSON.pprint (sb, value[i], indent); 
                        sb.push (',');
                    }
                    if (sb.pop() == '[') {
                        sb.push('[]');
                    } else {
                        sb.push(indent);
                        sb.push(']');
                    }
                }
            }
            return sb;
        default:
            value = value.toString();
            sb.push ('"');
            if (/["\\\x00-\x1f]/.test(value)) 
                sb.push(value.replace(/([\x00-\x1f\\"])/g, _escape));
            else
                sb.push(value);
            sb.push ('"');
            return sb;
        }
    };
})();
 
JSON.Regular = {};
// JSON.Regular.models = {};
JSON.Regular.initialize = function (name, model, json, extensions) {
    this._this = name;
    // JSON.Regular.models[name] = this;
    this.model = model;
    this.json = json;
    this.extensions = extensions || {};
    this.errors = {};
    this.templates = {
        "null": [null, null, '<div class="column span-15">', '</div>'],
        "boolean": [null, null, '<div class="column span-1">', '</div>'],
        "string": [
            null, null, 
            '<div class="column span-15" style="height: 6em;">', '</div>'
            ],
        "number": [null, null, '<div class="column span-2">', '</div>'],
        "pcre": [null, null, '<div class="column span-5">', '</div>'],
        "namespace": [
            null, null, '<div class="column span-15 last">', '</div>'
            ],
        "relation": [null, null, '<div class="field">', '</div>'],
        "collection": [null, null, '<div class="field">', '</div>']
    };
};
JSON.Regular.type = function () {
    var value = (arguments.length > 0) ? arguments[0]: this.model;
    switch (typeof value) {
    case "boolean": 
        return "boolean";
    case "string": 
        if (value=="")
            return "string";
        else if (this.extensions[value])
            return value;
        else if (this.model[value])
            return "model";
        else
            return "pcre";
    case "number": 
        return "number";  
    case "object":
        if (value===null) 
            return "null";
        else {
            var L=value.length;
            if (L==null) {
                var keys = [];
                for (var k in value) 
                    if (!(typeof value[k]=="function")) 
                        keys.push(k);
                if (keys.length > 1) 
                    return "namespace";
                else if (keys.length > 0)
                    return "dictionary";
                else
                    throw "{} is not a valid JSONR pattern";
            } else if (L==1)
                return "collection";
            else
                return "relation"
        }
    }
};

JSON.Regular.set = function (ns, v) {
    eval("this." + ns + " = v;"); // eval is Evil, unless it does Good
    return v;
};
JSON.Regular.test = function (el, v) {
    this.set(el.id, v); 
    var s = v.toString();
    if (el.value != s) {
        el.value = s; 
        this.error(el, v); 
    } else
        setTimeout(this._this + '.onValid(' + JSON.encode(el.id) + ')', 10);
};
JSON.Regular.error = function (el, v) {
    setTimeout(
        this._this + '.onInvalid(' 
        + JSON.encode(el.id) + ', ' 
        + JSON.encode(v) 
        + ')', 10
        );
};
JSON.Regular.Null = function (el) {
    var v; 
    try {
        v = JSON.decode(el.value);
    } catch (e) {
        v = el.value;
    }
    this.set(el.id, v);
};
JSON.Regular.Boolean = function (el) {
    this.set(el.id, el.checked);
};
JSON.Regular.String = function (el) {
    this.set(el.id, el.value);
};
JSON.Regular.Number = function (el) {
    this.test(el, parseFloat(el.value));
};
JSON.Regular.Integer = function (el) {
    this.test(el, parseInt(el.value));
};
JSON.Regular.Decimal = function (el, pow) {
    this.test(el, Math.round((parseFloat(el.value)*pow))/pow);
};
JSON.Regular.PCRE = function (el, regular) {
    if (el.value.match(regular) == null) 
        this.error(el, el.value);
    else {
        this.set(el.id, el.value);
        setTimeout(this._this + '.onValid(' + JSON.encode(el.id) + ')', 1);
    }
};
JSON.Regular.FloatRange = function (el, lower, higher) {
    var v = parseFloat(el.value);
    if (v < lower) v = lower; 
    else if (v > higher) v = higher;
    this.test(el, v);
};
JSON.Regular.IntegerRange = function (el, lower, higher) {
    var v = parseInt(el.value);
    if (v < lower) v = lower; 
    else if (v > higher) v = higher;
    this.test(el, v);
};
JSON.Regular.DecimalRange = function (el, lower, higher, pow) {
    var v = Math.round((parseFloat(el.value)*pow))/pow;
    if (v < lower) v = lower;
    else if (v > higher) v = higher;
    this.test(el, v);
};
JSON.Regular.htmlNull = function (sb, ns, nm, ob) {
    sb.push('<textarea class="null" rows="4" name="');
    sb.push(HTML.cdata(nm));
    sb.push('" id="');
    sb.push(HTML.cdata(ns));
    sb.push('" onblur="{');
    sb.push(this._this);
    if (ob == null)
        sb.push('.Null(this);}">null</textarea>');
    else {
        sb.push('.Null(this);}">');
        sb.push(HTML.cdata(JSON.pprint([], ob).join('')));
        sb.push("</textarea>");
    }
    return sb;
};
JSON.Regular.htmlBoolean = function (sb, ns, nm, ob) {
    sb.push('<input class="boolean" name="');
    sb.push(HTML.cdata(nm));
    sb.push('" id="');
    sb.push(HTML.cdata(ns));
    sb.push('" onclick="{');
    sb.push(HTML.cdata(this._this));
    if (ob) {
        sb.push('.Boolean(this);}" type="checkbox" checked />');
        this.set(ns, true);
    } else {
        sb.push('.Boolean(this);}" type="checkbox" />');
        this.set(ns, false);
    }
    return sb;
};
JSON.Regular.htmlString = function (sb, ns, nm, ob) {
    sb.push('<textarea class="string" rows="4" name="');
    sb.push(HTML.cdata(nm));
    sb.push('" id="');
    sb.push(HTML.cdata(ns));
    sb.push('" onblur="{');
    sb.push(HTML.cdata(this._this));
    if (ob == null) {
        sb.push('.String(this);}"></textarea>');
        this.set(ns, "");
    } else {
        sb.push('.String(this);}">');
        sb.push(HTML.cdata(ob));
        sb.push("</textarea>");
    } 
    return sb;
};
JSON.Regular.htmlNumber = function (sb, ns, nm, ob, pt) {
    var decimals = 0, s = pt.toString();
    sb.push('<input type="text" class="number"');
    if (ob == null) {
        this.set(ns, 0);
        sb.push(' value="0" name="'); 
    } else {
        sb.push(' value="');
        sb.push(ob.toString());
        sb.push('" name="');
    }
    sb.push(HTML.cdata(nm));
    sb.push('" id="');
    sb.push(HTML.cdata(ns));
    if (pt == 0) {
        sb.push('" onblur="{');
        sb.push(HTML.cdata(this._this));
        sb.push(".Number(this));}\" />");
    } else {
        sb.push('" size="');
        sb.push(pt.toString().length);
        sb.push('" onblur="{');
        sb.push(HTML.cdata(this._this));
        if (parseInt(s)==pt) {
            sb.push(".IntegerRange(this");
        } else {
            sb.push(".DecimalRange(this");
            decimals = s.split('.')[1].length;
        }
        if (pt < 0) {
            sb.push(", ");
            sb.push(pt);
            sb.push(", ");
            sb.push(-pt);
        } else {
            sb.push(", 0, ");
            sb.push(pt);
        }
        if (decimals > 0) {
            for (var i=1, pow=10; i<decimals; i++) pow = pow*10;
            sb.push(", ");
            sb.push(pow);
        }
        sb.push(');}" />');
    }
    return sb;
};
JSON.Regular.htmlPCRE = function (sb, ns, nm, ob, pt) {
    sb.push('<input name="');
    sb.push(HTML.cdata(nm));
    sb.push('" id="');
    sb.push(HTML.cdata((ns=="")?nm:ns));
    sb.push('" onblur="{');
    sb.push(HTML.cdata(this._this));
    sb.push(".PCRE(this, /");
    sb.push(HTML.cdata(pt));
    if (ob == null) {
        sb.push('/);}" type="text"');
        ob = this.set(ns, "");
    } else {
        sb.push('/);}" type="text" value="');
        sb.push(HTML.cdata(ob));
        sb.push('"');
    } 
    if (ob.match(new RegExp(pt))==null) {
        sb.push('class="pcre error" />');
        this.errors += 1;
    } else
        sb.push('class="pcre" />');
    return sb;
};
JSON.Regular.htmlCollection = function (sb, md, ns, nm, ob) {
    sb.push('<div class="collection" id="');
    sb.push(HTML.cdata(ns));
    sb.push('">');
    if (ob != null) for (var i=0, L=ob.length; i<L; i++) 
        this.htmlValue(sb, md+"[0]", ns+"["+i+"]", nm);
    sb.push('<div class="column span-2"><button onclick="{');
    sb.push(HTML.cdata(this._this));
    sb.push(".htmlAdd(this, &quot;");
    sb.push(HTML.cdata(md));
    sb.push("&quot;, &quot;");
    sb.push(HTML.cdata(ns));
    sb.push("&quot;, &quot;");
    sb.push(HTML.cdata(nm));
    sb.push('&quot;);}">add</button></div></div>');
    return sb;
};
JSON.Regular.htmlRelation = function (sb, md, ns, nm, ob, pt) {
    //sb.push('<div class="relation ');
    //sb.push(HTML.cdata(nm));
    //sb.push('" id="');
    //sb.push(HTML.cdata(ns));
    //sb.push('">');
    if (ob == null) ob = this.set(ns, []);
    for (var i=0, L=pt.length; i<L; i++) 
        this.htmlValue(sb, md+"["+i+"]", ns+"["+i+"]", nm+i.toString());
    //sb.push("</div>");
    return sb;
};
JSON.Regular.htmlDictionary = function (sb, md, ns, k, v) {
    ;
};
JSON.Regular.htmlNamespace = function (sb, md, ns, nm, ob, keys) {
    if (ob == null) {
        sb.push('<div class="column span-2">')
        sb.push('<button onclick="{HTML.replace(this.parentNode, ');
        sb.push(HTML.cdata(this._this));
        sb.push(".htmlOpen([], &quot;");
        sb.push(HTML.cdata(md));
        sb.push("&quot;, &quot;");
        sb.push(HTML.cdata(ns));
        sb.push("&quot;, &quot;");
        sb.push(HTML.cdata(nm));
        sb.push("&quot;).join(''));}\" >open</button></div>");
    } else {
        for (var i=0, k; k=keys[i]; i++) {
            this.htmlValue(sb, md + "['" + k + "']", ns + "['" + k + "']", k);
        }
    }
    return sb;
};
JSON.Regular.htmlFocus = function (id) {
    $(id).focus();
};
JSON.Regular.htmlAdd = function (el, md, ns, nm) {
    var id;
    var ob = eval("this." + ns);
    if (ob == null) ob = this.set(ns, []);
    var i = ob.length;
    var path = ns+"["+i+"]";
    var pt = eval("this." + md + "[0]");
    if (typeof pt == "object") {
        if (pt.length == null) {
            ob.push({})
            HTML.insert(el.parentNode, this.htmlValue(
                [], md + "[0]", path, nm + i.toString()
                ).join(''), "beforeBegin");
            for (var k in pt) if (!(typeof pt[k]=="function")) break;
            id = path + "['" + k + "']";
        } else {
            ob.push([]);
            HTML.insert(el.parentNode, this.htmlValue(
                [], md + "[0]", path, nm + i.toString()
                ).join(''), "beforeBegin");
            id = path + "[0]";
        }
    } else {
        HTML.insert(el.parentNode, this.htmlValue(
            [], md + "[0]", path, nm + i.toString()
            ).join(''), "beforeBegin");
        id = path;
    }
    setTimeout('{' + this._this + '.htmlFocus(' 
        + JSON.encode(id)
        + ');}', 10);
};
JSON.Regular.htmlOpen = function (sb, md, ns, nm) {
    var pt = eval("this." + md);
    var ob = eval("this." + ns);
    if (ob == null) ob = this.set(ns, {});
    var keys = [], k;
    for (k in pt) if (!(typeof pt[k]=="function")) keys.push(k);
    this.htmlNamespace(sb, md, ns, nm, ob, keys);
    var id = JSON.encode(ns + "['" + keys[0] + "']");
    setTimeout('{' + this._this + '.htmlFocus(' + id + ');}', 10);
    return sb;
};
JSON.Regular.extensions = {
    "yyyy-MM-ddTHH:mm:ss": function (sb, ns, nm, ob, pt) {
        ; // TODO: implement a DateTime pattern
    }
};
JSON.Regular.htmlValue = function (sb, md, ns, nm) {
    var pt = eval("this." + md); // eval is Evil ...
    var ob = eval("this." + ns); // ... unless it does Good
    var template = (
        this.templates[nm] || this.templates[this.type(pt)] || []);
    if (template[0]) 
        sb.push(template[0]);
    else if (md!="model") {
        sb.push('<div class="field"><div class="clear">');
        sb.push(HTML.cdata(nm));
        sb.push('</div>');
    }
    if (template[2]) sb.push(template[2]);
    switch (typeof pt) {
    case "boolean": 
        this.htmlBoolean(sb, ns, nm, ob); break;
    case "string": ;
        if (pt=="")
            this.htmlString(sb, ns, nm, ob);
        else {
            var extension = this.extensions[pt] || this.model[pt];
            if (extension==null)
                this.htmlPCRE(sb, ns, nm, ob, pt);
            else if (typeof extension == "function")
                extension.apply(this, [sb, ns, nm, ob, pt]);
            else
                this.htmlValue(sb, "['" + pt + "']", ns, nm)
        }
        break;
    case "number":  
        this.htmlNumber(sb, ns, nm, ob, pt); break;
    case "object":
        if (pt==null) 
            this.htmlNull(sb, ns, nm, ob);
        else {
            var L=pt.length;
            if (L==null) {
                var keys = new Array(), k;
                for (k in pt) if (!(typeof pt[k]=="function")) keys.push(k);
                if (keys.length == 0) {keys.push(null); pt[".+"] = null;}
                if (keys.length == 1) 
                    this.htmlDictionary(sb, md, ns, keys[0], pt[keys[0]])
                else
                    this.htmlNamespace(sb, md, ns, nm, ob, keys);
            } else if (L==1)
                this.htmlCollection(sb, md, ns, nm, ob);
            else
                this.htmlRelation(sb, md, ns, nm, ob, pt);
        }
        break;
    }
    if (template[3]) sb.push(template[3]);
    if (template[1]) 
        sb.push(template[1]);
    else
        sb.push('</div>');
    return sb;
};
JSON.Regular.view = function () {
    return this.htmlValue([], "model", "json", this._this).join('');
};
JSON.Regular.onInvalid = function (id, v) {
    var el = $(id); 
    CSS.add(el, ['error']); 
    if (!this.errors) {
        el.focus();
        el.select(); 
        this.errors[id] = true;
    }
    if (el.onRegular) el.onRegular(false);
};
JSON.Regular.onValid = function (id) {
    var el = $(id);
    CSS.remove(el, ['error']);
    if (this.errors[id] == true) delete this.errors[id];
    if (el.onRegular) el.onRegular(true);
};
/**
 * <h3>Synopsis</h3>
 * 
 *<pre>Control = Protocols(JSON.Regular);
 *var control = new Control("control", {
 *     "an": "", "object": 10.01 "model": [true, false]
 *     });
 *HTML.update($('view'), control.view());</pre>
 * 
 * <h3>Note About This Implementation</h3>
 * 
 * <p>You will find no DOM manipulations here, just better conventions and
 * a few good conveniences for HTML and CSS applications.</p>
 * 
 * <p>JSON.Regular implements an controller that regenerates HTML view from
 * two JavaScript object instances: an instance and its model expressed
 * as a regular JSON expression.</p>
 * 
 * <p>Instead of getting tangled in non-trivial DOM manipulations, CSS 
 * stylesheets and HTML templates are leveraged with Regular JSON 
 * expressions to produce consistant and relevant user interfaces.</p>
 * 
 */

