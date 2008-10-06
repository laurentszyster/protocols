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

/**
 * Add a stack of english articulators to the SAT.languages map.
 * 
 */
SAT.languages['EN'] = [
    /\s*[?!.](?:\s+|$)/, // point, split sentences
    /\s*[:;](?:\s+|$)/, // split head from sequence
    /\s*,(?:\s+|$)/, // split the sentence articulations
    /(?:(?:^|\s+)[({\[]+\s*)|(?:\s*[})\]]+(?:$|\s+))/, // parentheses
    /\s+[-]+\s+/, // disgression
    /["]/, // citation
    // Subordinating Conjunctions
    SAT.articulators ([ 
        'after', 'although', 'because', 'before', 
        'once', 'since', 'though', 'till', 'unless', 'until', 'when', 
        'whenever', 'where', 'whereas', 'wherever', 'while', 
        'as', 'even', 'if', 'that', 'than',
        ]), 
    // Coordinating and Correlative Conjunctions
    SAT.articulators ([ 
        'and', 'or', 'not', 'but', 'yet', 
        'for', 'so', 
        'both', 'either', 'nor', 'neither', 'whether', 
        ]), 
    // Prepositions: Locators in Time and Place
    SAT.articulators (['in', 'at', 'on', 'to']),
    // Articles
    SAT.articulators (['a', 'an', 'the']),
    // ? Pronoun and sundry ...
    SAT.articulators ([
        'it', 'I', 'you', 'he', 'she', 'we', 'they', 
        'my', 'your', 'his', 'her', 'our', 'their',
        'this', 'these', 'those', 'them', 'of'
        ]),
    /(?:^|\s+)(?:(?:([A-Z]+[\S]*)(?:$|\s)?)+)/, // private names
    /\s+/, // white spaces
    /['\\\/*+\-#]/ // common hyphens
];