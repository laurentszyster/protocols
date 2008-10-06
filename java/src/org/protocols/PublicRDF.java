/* Copyright (C) 2006-2008 Laurent A.V. Szyster

This library is free software; you can redistribute it and/or modify
it under the terms of version 2 of the GNU Lesser General Public License as
published by the Free Software Foundation.

   http://www.gnu.org/copyleft/lesser.html

This library is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

You should have received a copy of the GNU Lesser General Public License
along with this library; if not, write to the Free Software Foundation, 
Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA */

package org.protocols;

import java.util.Iterator;

/**
 * Defines an interface between Public RDF consumers and producers.
 * 
 * @p The <code>SAT.articulate</code> method applies this interface to 
 * decouple its implementation from the consumer to which it sends
 * Public RDF statements. 
 */
public interface PublicRDF extends Iterator<String[]> {
    /**
     * Send a Public RDF statement to a consumer.
     * 
     * @param subject of the statement
     * @param predicate identifying the object's application
     * @param object of the statement
     * @param context in which the statement is made
     */
    public void send (
        String subject, String predicate, String object, String context
        ) throws Throwable;
}
