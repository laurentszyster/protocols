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
 
JSON.Regular = {}
JSON.Regular.initialize = function (name, model, json, extensions) {
    this.name = name;
    this.model = model;
    this.json = json;
    this.extensions = extensions;
    this.templates = {}; // TODO: collect HTML templates from the document!
    this.errors = {};
}
JSON.Regular.set = function (ns, v) {
    eval("this.json" + ns + " = v;"); return v;
}
JSON.Regular.test = function (el, v) {
    var s = v.toString();
    if (el.value != s) {
        el.value = s; this.error(el, v); 
    } else
        setTimeout(this._this + '.onValid(' + el.id + ')', 10);
}
JSON.Regular.error = function (el, v) {
    setTimeout(
        this._this + '.onInvalid(' + el.id + ', ' + JSON.string(v) + ')', 10
        );
}
JSON.Regular.Null = function (el) {
    var v; try {v = el.value.parseJSON();} catch (e) {v = el.value;}
    this.set(el.id, v);
}
JSON.Regular.Boolean = function (el) {
    this.set(el.id, el.checked);
}
JSON.Regular.String = function (el) {
    this.set(el.id, el.value);
}
JSON.Regular.Number = function (el) {
    var v = parseFloat(el.value); this.set(el.id, v); this.test(el, v);
}
JSON.Regular.PCRE = function (el, regular) {
    if (el.value.match(regular) == null) 
        this.error(el, el.value);
    else {
        this.set(el.id, el.value);
        setTimeout(this._this + '.onValid(' + el.id.toJSONString() + ')', 1);
    }
}
JSON.Regular.Decimal = function (el, pow) {
    var v = Math.round((parseFloat(el.value)*pow))/pow;
    this.set(el.id, v); this.test(el, v);
}
JSON.Regular.IntegerRange = function (el, lower, higher) {
    var v = parseInt(el.value);
    if (v < lower) v = lower; else if (v > higher) v = higher;
    this.set(el.id, v); this.test(el, v);
}
JSON.Regular.FloatRange = function (el, lower, higher) {
    var v = parseFloat(el.value);
    if (v < lower) v = lower;else if (v > higher) v = higher;
    this.set(el.id, v);this.test(el, v);
}
JSON.Regular.DecimalRange = function (el, lower, higher, pow) {
    var v = Math.round((parseFloat(el.value)*pow))/pow;
    if (v < lower) v = lower;else if (v > higher) v = higher;
    this.set(el.id, v);this.test(el, v);
}
JSON.Regular.htmlNull = function (sb, ns, nm, ob) {
    sb.push('<textarea class="jsonrNull" name="');
    sb.push(nm);
    sb.push('" id="');
    sb.push(ns.replace('"', '&quot;'));
    sb.push('" onblur="{');
    sb.push(this._this);
    if (ob == null)
        sb.push('.Null(this);}">null</textarea>');
    else {
        sb.push('.Null(this);}">');
        sb.push(ob.toString());
        sb.push("</textarea>");
    }
    return sb;
} 
JSON.Regular.htmlBoolean = function (sb, ns, nm, ob) {
    sb.push('<input class="jsonrBoolean" name="');
    sb.push(nm);
    sb.push('" id="');
    sb.push(ns.replace('"', '&quot;'));
    sb.push('" onclick="{');
    sb.push(this._this);
    if (ob) {
        sb.push('.Boolean(this);}" type="checkbox" checked />');
        this.set(ns, true);
    } else {
        sb.push('.Boolean(this);}" type="checkbox" />');
        this.set(ns, false);
    }
    return sb;
}
JSON.Regular.htmlString = function (sb, ns, nm, ob) {
    sb.push('<textarea class="jsonrString" name="');
    sb.push(nm);
    sb.push('" id="');
    sb.push(ns.replace('"', '&quot;'));
    sb.push('" onblur="{');
    sb.push(this._this);
    if (ob == null) {
        sb.push('.String(this);}"></textarea>');
        this.set(ns, "");
    } else {
        sb.push('.String(this);}">');
        sb.push(ob);
        sb.push("</textarea>");
    } 
    return sb;
}
JSON.Regular.htmlNumber = function (sb, ns, nm, ob, pt) {
    var decimals = 0, s = pt.toString();
    sb.push('<input type="text"');
    if (ob == null) {
        sb.push(' value="0" name="'); 
        this.set(ns, 0);
    } else {
        sb.push(' value="');
        sb.push(ob.toString());
        sb.push('" name="');
    }
    sb.push(nm);
    sb.push('" id="');
    sb.push(ns.replace('"', '&quot;'));
    if (pt == 0) {
        sb.push('" onblur="{');
        sb.push(this._this);
        sb.push(".Number(this));}\" class='jsonrNumber' />");
    } else {
        sb.push('" size="');
        sb.push(pt.toString().length);
        sb.push('" onblur="{');
        sb.push(this._this);
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
        sb.push(');}" class="jsonrNumber" />');
    }
    return sb;
}
JSON.Regular.htmlRegular = function (sb, ns, nm, ob, pt) {
    sb.push('<input name="');
    sb.push(nm);
    sb.push('" id="');
    sb.push(ns.replace('"', '&quot;'));
    sb.push('" onblur="{');
    sb.push(this._this);
    sb.push(".Regular(this, /");
    sb.push(pt);
    if (ob == null) {
        sb.push('/);}" type="text"');
        ob = this.set(ns, "");
    } else {
        sb.push('/);}" type="text" value="');
        sb.push(ob);
        sb.push('"');
    } 
    if (ob.match(new RegExp(pt))==null) {
        sb.push('class="jsonrRegular jsonrError" />');
        this.errors += 1;
    } else
        sb.push('class="jsonrRegular" />');
    return sb;
}
JSON.Regular.htmlCollection = function (sb, md, ns, nm, ob) {
    sb.push('<div class="jsonrCollection" id="');
    sb.push(ns.replace('"', '&quot;'));
    sb.push('">');
    if (ob != null) for (var i=0, L=ob.length; i<L; i++) 
        this.htmlValue(sb, md + "[0]", ns + "[" + i + "]", nm);
    sb.push('<input class="jsonrAdd" onclick="{');
    sb.push(this._this);
    sb.push(".htmlExtend(this, &quot;");
    sb.push(md);
    sb.push("&quot;, &quot;");
    sb.push(ns.replace('"', '\&quot;'));
    sb.push("&quot;, &quot;");
    sb.push(nm);
    sb.push("&quot;);}\" type='button' value='+' /></div>");
    return sb;
}
JSON.Regular.htmlRelation = function (sb, md, ns, nm, ob, pt) {
    sb.push('<div class="jsonrRelation ');
    sb.push(nm);
    sb.push('" id="');
    sb.push(ns.replace('"', '&quot;'));
    sb.push('">');
    if (ob == null) ob = this.set(ns, new Array());
    for (var i=0, L=pt.length; i<L; i++) 
        this.htmlValue(sb, md+"["+i+"]", ns+"["+i+"]", nm+i.toString());
    sb.push("</div>");
    return sb;
}
JSON.Regular.htmlDictionnary = function (sb, md, ns, k, v) {
    ;
}
JSON.Regular.htmlNamespace = function (sb, md, ns, nm, ob, keys) {
    if (ob == null) {
        sb.push("<input class='jsonrOpen' onclick=\"{this.parentNode.innerHTML=");
        sb.push(this._this);
        sb.push(".htmlOpen(new Array(), &quot;");
        sb.push(md);
        sb.push("&quot;, &quot;");
        sb.push(ns.replace('"', '\&quot;'));
        sb.push("&quot;).join('');}\" type='button' value='+' />");
    } else {
        sb.push('<table><tbody>');
        for (var i=0; i<keys.length; i++) {
            k = keys[i];
            sb.push("<tr><td class='jsonrName'>");
            sb.push(k.escapeHTML());
            sb.push("</td><td class='jsonrValue'>");
            this.htmlValue(sb, md + "['" + k + "']", ns + "['" + k + "']", k);
            sb.push("</td></tr>");
        }
        sb.push("</tbody></table>");
    }
    return sb;
}
JSON.Regular.htmlExtend = function (el, md, ns, nm) {
    var ob = eval("this.json" + ns);
    if (ob == null)
        ob = this.set(ns, new Array());
    var i = ob.length;
    var id = ns+"["+i+"]"
    HTML.insert(this.htmlValue(
        new Array(), md + "[0]", id, nm + i.toString()
        ).join(''), "beforeEnd", el);
    var pt = eval("this.model" + md + "[0]");
    if (typeof pt == "object" && ob != null) {
        if (pt.length == null) {
            for (var k in pt) if (!(typeof pt[k]=="function")) break;
            id += "['" + k + "']";
        } else
            id += "[0]";
    }
    setTimeout(
        '{el=$(' + id + '); el.focus(); el.select();}', 10
        );
}
JSON.Regular.htmlOpen = function (sb, md, ns, nm) {
    var pt = eval("this.model" + md);
    var ob = eval("this.json" + ns);
    if (ob == null)
        ob = this.set(ns, new Object());
    var keys = new Array(), k;
    for (k in pt) if (!(typeof pt[k]=="function")) keys.push(k);
    this.htmlNamespace(sb, md, ns, nm, ob, keys);
    var id = JSON.string(md + "['" + keys[0] + "']");
    setTimeout(
        '{el=$(' + id + '); el.focus(); el.select();}', 10
        );
    return sb;
}
JSON.Regular.htmlExtensions = {
    "yyyy-MM-ddTHH:mm:ss": function (sb, ns, nm, ob, pt) {
        ; // TODO: implement a DateTime pattern
    }
}
JSON.Regular.HTML = function (sb, md, ns, nm) {
    var pt = eval("this.model" + (md || ""));
    var ob = eval("this.json" + (ns || ""));
    switch (typeof pt) {
    case "boolean": 
        sb.push('<input class="jsonrBoolean" name="');
        sb.push(nm);
        sb.push('" id="');
        sb.push(ns.replace('"', '&quot;'));
        sb.push('" onclick="{');
        sb.push(this._this);
        if (ob==true||(pt==true&&ob==null)) {
            sb.push('.Boolean(this);}" type="checkbox" checked />');
            this.set(ns, true);
        } else {
            sb.push('.Boolean(this);}" type="checkbox" />');
            this.set(ns, false);
        }
        return sb;
    case "string": ;
        if (pt=="") {
            sb.push('<textarea class="jsonrString" name="');
            sb.push(nm);
            sb.push('" id="');
            sb.push(ns.replace('"', '&quot;'));
            sb.push('" onblur="{');
            sb.push(this.name);
            if (ob == null) {
                sb.push('.String(this);}"></textarea>');
                this.set(ns, "");
            } else {
                sb.push('.String(this);}">');
                sb.push(ob);
                sb.push("</textarea>");
            } 
        } else {
            var htmlExtension = this.htmlExtensions[pt];
            if (htmlExtension==null)
                return this.htmlRegular(sb, ns, nm, ob, pt);
            else
                return htmlExtension(sb, ns, nm, ob, pt);
        }
        return sb;
    case "number":  return this.htmlNumber(sb, ns, nm, ob, pt);
    case "object":
        if (pt==null) 
            return this.htmlNull(sb, ns, nm, ob);
        var L=pt.length;
        if (L==null) {
            sb.push('<div class="jsonrObject">');
            var keys = new Array(), k;
            for (k in pt) if (!(typeof pt[k]=="function")) keys.push(k);
            if (keys.length == 0) {keys.push(null); pt[".+"] = null;}
            if (keys.length == 1) 
                return this.htmlDictionnary(sb, md, ns, keys[0], pt[keys[0]])
            else
                return this.htmlNamespace(sb, md, ns, nm, ob, keys);
            sb.push('</div>');
        } else if (L==1)
            return this.htmlCollection(sb, md, ns, nm, ob);
        else
            return this.htmlRelation(sb, md, ns, nm, ob, pt);
    }
}
JSON.Regular.onInvalid = function (id, v) {
    var el = $(id); 
    HTML.class_add(el, 'jsonrError'); 
    if (!this.errors) {
        el.focus();
        el.select(); 
        this.errors[id] = true;
    }
}
JSON.Regular.onValid = function (id) {
    HTML.class_remove($(id), 'jsonrError');
    if (this.errors[id] == true) delete this.errors[id];
}
/**
 * Synopsis
 * 
 * Control = Protocols([JSON.Regular]);
 * 
 * model = {"an": "", "object": 10.01 "model": [true, false]}
 * control = new Control("control", model);
 * HTML.update($('view'), control.HTML ([]).join(''));
 * 
 */

