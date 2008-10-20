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

import java.util.HashMap;
import java.util.HashSet;
import java.util.Arrays;
import java.util.Locale;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringWriter;
import java.io.FileInputStream;
import java.io.File;
import java.net.URL;

import com.jclark.xml.parse.ApplicationException;
import com.jclark.xml.parse.CharacterDataEvent;
import com.jclark.xml.parse.DocumentParser;
import com.jclark.xml.parse.EndElementEvent;
import com.jclark.xml.parse.EntityManagerImpl;
import com.jclark.xml.parse.OpenEntity;
import com.jclark.xml.parse.StartElementEvent;
import com.jclark.xml.parse.base.ApplicationImpl;

import org.simple.Objects;
import org.protocols.XML;

/**
 * A minimal subset of XPATH to support an event parser for XML data, plus path 
 * outlining and collection convenience, just enough to develop fast and lean 
 * XML data pipelining processors.
 * 
 * XPATH feeds would suite well state-full applications with asynchronous I/O, 
 * alas if XP can implement an incremental parser it does not provide the 
 * implementation offered by its C successor, Expat. 
 * 
 * So, until someone comes up with JNI bindings for Expat, this will stay a
 * synchronous XPATH feed processor .-( 
 * 
 */
public class XPATH {
    public static interface Feed {
        public void start(Feeds feeds);
        public void end(Feeds feeds);
    }
    protected static abstract class _Abstract {
        protected String path;
        protected StringWriter cdata = null;
        protected boolean attributes = false;
        public Feed handle = null;
        public _Abstract (String path) {
            this.path = path;
        }
        public abstract void handleStart (Feeds feeds);
        public abstract void handleEnd (Feeds feeds);
    }
    protected static class _Pass extends _Abstract {
        public _Pass (String path) {
            super(path);
        }
        @Override
        public final void handleStart (Feeds feeds) {}
        @Override
        public final void handleEnd (Feeds feeds) {}
    }
    protected static class _Branch extends _Abstract {
        public _Branch trunk; 
        protected String[] _paths;
        protected int[] _indexes;
        protected int _text = -1;
        public _Branch (String path, String[] paths, Feeds feeds) {
            super(path);
            _paths = paths;
            _indexes = new int[paths.length];
            for (int i=0; i<_paths.length; i++) {
                _indexes[i] = feeds.values.get(path + paths[i]);
                if (paths[i].equals("")) {
                    _text = _indexes[i];
                }
            }
            attributes = (
                _indexes.length > 1 || (_indexes.length == 1 && _text == -1) 
                );
        }
        @Override
        public final void handleStart (Feeds feeds) {
            if (_text > -1) {
                cdata = new StringWriter();
            }
            String[] data = feeds.data;
            for (int i=0, L=_indexes.length; i<L; i++) {
                data[_indexes[i]] = null;
            }
        }
        @Override
        public final void handleEnd (Feeds feeds) {
            if (handle != null) {
                handle.end(feeds);
            }
        }
    }
    protected static final class _Expression {
        protected int _length;
        protected String[] _paths;
        protected String[] _values;
        protected int[] _indexes;
        protected _Branch _branch;
        public _Expression (
            HashMap<String,String> qualifiers, _Branch branch, Feeds feeds
            ) {
            _branch = branch;
            _length = qualifiers.size();
            _paths = new String[_length];
            qualifiers.keySet().toArray(_paths);
            Arrays.sort(_paths);
            _values = new String[_length];
            _indexes = new int[_length];
            for (int i=0; i<_length; i++) {
                _values[i] = qualifiers.get(_paths[i]);
                _indexes[i] = feeds.values.get(_paths[i]);
            }
        }
        public final String toString() {
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            sb.append(_paths[0]);
            if (_values[0] == null || _values[0].equals("")) {
                sb.append("=\"");
                sb.append(_values[0]);
                sb.append("\"");
            }
            for (int i=1; i<_length; i++) {
                sb.append(" and ");
                sb.append(_paths[i]);
                if (_values[i] == null || _values[i].equals("")) {
                    sb.append("=\"");
                    sb.append(_values[i]);
                    sb.append("\"");
                }
            }
            sb.append("]");
            return sb.toString();
        }
        public final boolean eval (String[] data) {
            String value;
            for (int i=0; i<_length; i++) {
                value = data[_indexes[i]];
                if (value == null || !value.equals(_values[i])) {
                    return false;
                }
            }
            return true;
        }
    }
    protected static class _Qualifier extends _Abstract {
        protected _Expression[] _qualifieds = null;
        protected int[] _qualifiers;
        protected int _text = -1;
        public _Qualifier (
            String path, HashMap<String,_Branch> branches, Feeds feeds
            ) {
            super(path);
            int j = 0;
            _Branch branch;
            _Expression qualified;
            _qualifieds = new _Expression[branches.keySet().size()];
            HashSet<String> paths = new HashSet(); 
            HashMap<String,String> qualifiers;
            for (String expression: branches.keySet()) {
                // TODO: parse the XPATH expression into a map of strings
            	qualifiers = new HashMap();
                branch = branches.get(expression);
                qualified = new _Expression(new HashMap(), branch, feeds);
                _qualifieds[j++] = qualified;
                paths.addAll(qualifiers.keySet());
            }
            _qualifiers = new int[paths.size()];
            int i = 0;
            for (String qualifier: paths) {
                _qualifiers[i++] = feeds.values.get(path + qualifier);
            }
        }
        @Override
        public final void handleStart (Feeds feeds) {
            if (_text > -1) {
                cdata = new StringWriter();
            }
            String[] data = feeds.data;
            for (int i=0; i<_qualifiers.length; i++) {
                data[_qualifiers[i]] = null;
            }
        }
        @Override
        public final void handleEnd (Feeds feeds) {
            _Expression qualified;
            for (int i=0; i<_qualifieds.length; i++) {
                qualified = _qualifieds[i];
                if (qualified.eval(feeds.data)) {
                	// TODO: copy unqualified data to the qualified paths
                    qualified._branch.handleEnd(feeds);
                }
            }
        }
    }
    /**
     * ...
     * 
     */
    public static final class Feeds {
        protected String[] data;
        protected HashMap<String,Feed> handlers;
        protected HashMap<String,_Abstract> branches;
        protected HashMap<String,Integer> values = new HashMap();
        public final String[] data () {
        	return data;
        };
        public final int[] indexes (String[] paths) {
        	int[] indexes = new int[paths.length];
            for (int i=0; i<paths.length; i++) {
            	values.get(paths[i]);
            }
            return indexes;
        }
        public final Integer index (String path) {
            return values.get(path);
        }
        public final String get (String path) {
            if (values.containsKey(path)) {
                return data[values.get(path)];
            } 
            return null;
        }
        public final void set (String path, String value) {
            if (values.containsKey(path)) {
                data[values.get(path)] = value;
            }
        }
        public final void parse (InputStream is, String path, URL baseURL) 
        throws IOException, XML.Error {
            FeedParser fp = new FeedParser(this);
            try {
                DocumentParser.parse(new OpenEntity(
                    is, path, baseURL
                    ), new EntityManagerImpl(), fp, Locale.US);
            } catch (ApplicationException e) {
                throw new XML.Error(e);
            }
        }
        public final void parse (File file) throws IOException, XML.Error {
            parse(new FileInputStream(file), file.getAbsolutePath(), file.toURL());
        }
    }
    /**
     * Compiles a simply qualified mapping of branches with paths, returns a 
     * map of branches, qualifiers and leaves <code>Feed</code>s.
     * 
     * @param trunk
     * @param branches with paths
     * @return a map of XPATHs to Feeds: branches, qualifiers and leaves
     */
    public static final Feeds compile (
        HashMap<String,Feed> handlers, String[] values
        ) {
    	Feeds feeds = new Feeds(); 
        feeds.handlers = handlers;
        
        // TODO: outline branches, find qualifiers
         
        String[] qualifiers = new String[]{};
        //
        feeds.data = new String[values.length + qualifiers.length];
        int i;
        for (i=0; i<values.length; i++) {
            feeds.values.put(values[i], i);
        }
        for (int j=0; j<qualifiers.length; j++) {
            feeds.values.put(qualifiers[j], i++);
        }
        return feeds;
    }
    protected static final class FeedParser extends ApplicationImpl {
        protected Feeds feeds;
        protected int depth = -1;
        protected _Abstract[] stack = new _Abstract[1024];
        protected String[] paths = new String[1024];
        public FeedParser (Feeds feeds) {
            this.feeds = feeds;
            };
        public final void startElement(StartElementEvent event) {
            String name = event.getName();
            String path;
            if (depth < 0) {
                path = "";
            } else if (depth < 1024){
                path = paths[depth] + "/" + name;
            } else {
                throw new RuntimeException("XML BranchParser stack overflow");
            }
            _Abstract branch = feeds.branches.get(path);
            depth++;
            if (branch == null) {
                branch = new _Pass(path);
                feeds.branches.put(path, branch);
            }
            stack[depth] = branch;
            paths[depth] = path;
            branch.handleStart(feeds);
            if (branch.attributes) {
                int L = event.getAttributeCount();
                for (int i=0; i < L; i++) { 
                    feeds.set(
                        path + "/@" + event.getAttributeValue(i), 
                        event.getAttributeValue(i)
                        );
                }
            }
            if (branch.handle != null) {
                branch.handle.start(feeds);
            }
        }
        public final void characterData (CharacterDataEvent event) 
        throws IOException {
            StringWriter cdata = stack[depth].cdata;
            if (cdata != null) {
                event.writeChars(cdata);
            }
        }
        public final void endElement(EndElementEvent event) {
            _Abstract branch = stack[depth];
            StringWriter cdata = branch.cdata;
            if (cdata != null) {
                cdata.flush();
                feeds.set(branch.path, cdata.toString());
                branch.cdata = null;
             }
            branch.handleEnd(feeds);
            stack[depth] = null;
            depth--;
        }
    }
    protected static final class FeedParserNS extends ApplicationImpl {
        protected HashMap<String,String> ns = new HashMap();
        protected HashMap<String,String> prefixes = new HashMap();
        protected Feeds feeds;
        protected int depth = -1;
        protected _Abstract[] stack = new _Abstract[1024];
        protected String[] paths = new String[1024];
        public FeedParserNS (Feeds feeds) {
            this.feeds = feeds;
            };
        public final void startElement(StartElementEvent event) {
            String name = XML.fqn(event.getName(), prefixes);
            String path;
            if (depth < 0) {
                path = "";
            } else if (depth < 1024){
                path = paths[depth] + "/" + name;
            } else {
                throw new RuntimeException("XML BranchParser stack overflow");
            }
            _Abstract branch = feeds.branches.get(path);
            depth++;
            if (branch == null) {
                branch = new _Pass(path);
                feeds.branches.put(path, branch);
            }
            stack[depth] = branch;
            branch.path = paths[depth] = path;
            branch.handleStart(feeds);
            String[] attributeNames = XML.xmlns (event, ns, prefixes);
            if (branch.attributes && attributeNames != null) {
                for (int i=0; i < attributeNames.length; i++) { 
                    if (attributeNames[i] != null) {
                        feeds.set(
                            path + "/@" + XML.fqn(attributeNames[i], prefixes), 
                            event.getAttributeValue(i)
                            );
                    }
                }
            }
            if (branch.handle != null) {
                branch.handle.start(feeds);
            }
        }
        public final void characterData (CharacterDataEvent event) 
        throws IOException {
            StringWriter cdata = stack[depth].cdata;
            if (cdata != null) {
                event.writeChars(cdata);
            }
        }
        public final void endElement(EndElementEvent event) {
            _Abstract branch = stack[depth];
            StringWriter cdata = branch.cdata;
            if (cdata != null) {
                cdata.flush();
                feeds.set(branch.path, cdata.toString());
                branch.cdata = null;
            }
            branch.handleEnd(feeds);
            stack[depth] = null;
            depth--;
        }
    }
}
/* Note about this implementation

   A single array of strings is filled with attributes values and first text data
   for each qualified and qualifier value paths.
   
   Feed handlers start and end methods are called with that array of strings
   wrapped into a Feeds instance.

*/
