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

var PublicNames = {
    HORIZON: 126 // lower to limit CPU usage ?
};
PublicNames.netunicode = function (s, sb) {
    sb.push(s.length); sb.push(":"); sb.push(s); sb.push(",");
}
/**
 * Encode an array of strings (or anything that [].join('') can join) into
 * netunicodes, return a string.
 */
PublicNames.netunicodes = function (list) {
    var s, sb = [];
    for (var i=0; i < list.length; i++) {
        s=list[i]; 
        sb.push(s.length); sb.push(":"); sb.push(s); sb.push(",");
    };
    return sb.join('');
};
/**
 * Push in a list the unidecoded strings found in the buffer, eventually
 * stripping empty strings (0:,) if strip is true, returns the extended
 * array or the one created if the list given was null and that at least
 * one netunicoded string was found at the buffer's start.
 */
PublicNames.netunidecodes = function (buffer, list, strip) {
    var size = buffer.length;
    var prev = 0;
    var pos, L, next;
    while (prev < size) {
        pos = buffer.indexOf(":", prev);
        if (pos < 1) prev = size; else {
            L = parseInt(buffer.substring(prev, pos))
            if (isNaN(L)) prev = size; else {
                next = pos + L + 1;
                if (next >= size) prev = size; else {
                    if (buffer.charAt(next) != ",") prev = size; else {
                        if (list==null) list = [];
                        if (strip | next-pos>1)
                            list.push(buffer.substring(pos+1, next));
                        prev = next + 1;
                    }
                }
            }
        }
    }
    return list;
};
/**
 * Push in sb an HTML representation of the nested netunicodes found in
 * the buffer, as nested SPAN elements with articulated Public Names set
 * as title attribute and inarticulated unidecoded strings as CDATA.
 */
PublicNames.HTML = function (names, sb) {
    var articulated = this.netunidecodes (names, [], false);
    if (articulated.length == 0) {
        sb.push('<span>'); 
        sb.push(HTML.encode(names));
    } else {
        sb.push('<span pns="'); 
        sb.push(HTML.encode(names));
        sb.push('">');
        for (var i=0, L=articulated.length; i < L; i++)
            PublicNames.HTML(articulated[i], sb);
    }
    sb.push('</span>');
    return sb;
}
PublicNames.encode = function (item, field) {
    if (typeof item == 'object') {
        var list = [], L=item.length, n;
        if (L == null) for (var k in item) {
            n = this.encode([k, item[k]], field);
            if (n!=null) list.push(n);
        } else for (var i=0; i < L; i++) {
            n = this.encode(item[i], field);
            if (n!=null) list.push(n);
        }
        L = list.length;
        if (L > 1) {list.sort(); return this.netunicodes(list);}
        else if (L == 1) return list[0];
        else return null;
    } else item = item.toString(); 
    if (field[item] == null) {field[item] = true; return item;}
    else return null;
}
PublicNames.validate = function (names, field) {
    var n, s, buffer, valid=[];
    for (var L=names.length, i=0; i<L; i++) {
        buffer = names[i];
        if (field[buffer] != null) continue;
        n = this.netunidecodes (buffer, null, true)
        if (n == null) {
            valid.push(buffer); field[buffer] = true; field[''] += 1;
        } else {
            s = this.validate (n, field);
            if (s != null) {
                valid.push(s); field[s] = true; field[''] += 1;
            }
        }
        if (field[''] > this.HORIZON) break;
    };
    if (valid.length > 1) {valid.sort(); return this.netunicodes(valid);};
    if (valid.length > 0) return valid[0];
    return null;
}
PublicNames.languages = {
    'SAT':[
        /\s*[?!.](?:\s+|$)/, // point, split sentences
        /\s*[:;](?:\s+|$)/, // split head from sequence
        /\s*,(?:\s+|$)/, // split the sentence articulations
        /(?:(?:^|\s+)[({\[]+\s*)|(?:\s*[})\]]+(?:$|\s+))/, // parentheses
        /\s+[-]+\s+/, // disgression
        /["]/, // citation
        /(?:^|\s+)(?:(?:([A-Z]+[\S]*)(?:$|\s)?)+)/, // private names
        /\s+/, // white spaces
        /['\\\/*+\-#]/ // common hyphens
        ]
    };
PublicNames.articulator = function (words) {
    return new RegExp(
        '(?:^|\\s+)((?:' + words.join (')|(?:') + '))(?:$|\\s+)'
        );
}
PublicNames.articulate = function (
    text, articulators, depth, chunks, chunk
    ) {
    var i, L, texts, articulated, subject;
    var bottom = articulators.length;
    while (true) {
        texts = text.split(articulators[depth]); depth++;
        if (texts.length > 1) {
            articulated = [];
            for (i=0, L=texts.length; i<L; i++) 
                if (texts[i].length > 0) articulated.push(texts[i]);
            L=articulated.length;
            if (L > 1) break; 
            else if (L == 1) 
                text = articulated[0];
        } else if (texts.length == 1 && texts[0].length > 0) 
            text = texts[0];
        if (depth == bottom) return [text];
    }
    if (depth < bottom) 
        if (chunk == null) {
            var sat, names = [], field = {'': 0}; 
            for (i=0; i<L; i++) {
                sat = this.validate (this.articulate (
                    articulated[i], articulators, depth
                    ), field);
                if (sat != null) names.push (sat);
            }
            return names;
        } else {
            var sat, field = {'': 0};
            for (i=0; i<L; i++) {
                text = articulated[i];
                if (text.length > chunk)
                    this.articulate (text, articulators, depth, chunks, chunk);
                else {
                    sat = this.validate (
                        this.articulate (text, articulators, depth), field
                        );
                    if (sat!=null) chunks.push([sat, text]);
                } 
            } return chunks;
        }
    else return articulated;
}