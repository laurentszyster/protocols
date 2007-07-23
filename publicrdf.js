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

var PublicRDF = {}
PublicRDF.initialize = function (statements, indexes, routes) {
    this.statements = statements || {};
    this.indexes = indexes || {};
    this.routes = routes || {};
}
PublicRDF.articulateText = function (text, lang, context) {
    if (lang == null || this.languages[lang] == null) 
        return; // drop unknown language articulations when found!
    this.statement (this.validate (
        this.articulate(text, this.languages[lang], 0), {'': 0}
        ), lang, text, context);
}
PublicRDF.articulateTexts = function (text, lang, context, chunk) {
    if (lang == null || this.languages[lang] == null) 
        return;
    var chunks = this.articulate(text, lang, 0, [], chunk);
    for (var i=0, L=chunks.length; i<L; i++) {
        this.statement(chunks[i][0], lang, chunks[i][1], context)
    }
}
PublicRDF.articulateHTML = function (element, lang, context, chunk) {
    // TODO: override with the lang or xml:lang attribute of the element
    if (lang == null || this.languages[lang] == null) 
        throw "PNS error: undefined language.";
    var children = element.childNodes;
    if (children && children.length > 0) 
        for (var i=0, L=children.length; i<L; i++)
             this.articulateHTML(children[i], lang, context, chunk);
    else
        this.articulateTexts (element.textContent, lang, context, chunk);
}
PublicRDF.statement = function (subject, predicate, object, context) {
    this.index (subject, context);
    var subject_predicate = this.netunicodes([subject, predicate]);
    var objects = this.statements[subject_predicate];
    if (objects == null) 
        this.statements[subject_predicate] = {context: object}; 
    else 
        objects[context] = (!object) ? "": object; // for questions too ;-)
}
PublicRDF.index = function (subject, context) {
    if (this.indexes[subject] == null) {
        var field = {'':0};
        if (subject == this.validate(
            this.netunidecodes (subject), field
            )) {
            var index, names; 
            for (var pn in field) if (pn != '') {
                index = this.indexes[pn];
                if (index == null)
                    this.indexes[pn] = subject;
                else if (index != false){
                   names = this.netunidecodes(index, []);
                   names.push (subject);
                   index = {'':0};
                   this.indexes[pn] = this.validate(names, {'': 0});
                   if (field[''] > this.HORIZON)
                       this.indexes[pn] = false;
                }
                routes = this.routes[pn];
                if (routes == null)
                    this.routes[pn] = [context];
                else
                    if (routes.indexOf (context) == -1)
                        routes.push (context);
            }
        }
    } 
    if (context != null) {
        var routes = this.routes[subject];
        if (routes == null)
            this.routes[subject] = [context];
        else
            if (routes.indexOf (context) == -1)
                routes.push (context);
        // this.graph (context);
    }
}
PublicRDF.search = function(names) {
    // TODO: ...
}
PublicRDF.HTML = function(statement, sb) {
    // TODO: bind a predicate to an HTML template with predicate=name,
    //       map templates on statements to push HTML in sb.
    //       <... class="predicate" pns="subject">object</...>
}
PublicRDF.update = function(statement) {
    // TODO: update a context ID in the DOM with the statement's HTML
}
PublicRDF.replace = function(statement) {
    // TODO: replace a context ID in the DOM with the statement's HTML
}
PublicRDF.insert = function(statement, adjacency) {
    // TODO: insert the statement in the DOM, before or after the beginning
    // or end of its context ID.
}

var Metabase = Protocols ([PublicNames, PublicRDF]);