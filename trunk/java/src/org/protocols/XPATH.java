/* Copyright (C) 2008 Laurent A.V. Szyster

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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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

import org.protocols.XML;
import org.simple.Fun;

/**
 * A minimal subset of XPATH to support an event parser for XML data, plus path 
 * outlining and collection convenience, just enough to develop fast and lean 
 * XML data pipelining processors.
 * 
 * XPATH feeds would suite well state-full applications with asynchronous I/O, 
 * alas if XP can support an incremental parser it does not provide the 
 * implementation offered by its C successor, Expat. 
 * 
 * So, until someone comes up with JNI bindings for Expat, this will stay a
 * synchronous XPATH feed processor .-( 
 * 
 */
public class XPATH {
    protected static final Pattern TOKEN = Pattern.compile(
        "/([^/\\[]+)(?:\\[(.+?)\\])?"
        );
    protected static class Tokenizer implements Iterator<String> {
        String path;
        private Matcher regexp;
        private int end = 0;
        private int length;
        public Tokenizer (String path) {
            this.path = path;
            length = path.length();
            regexp = TOKEN.matcher(path);
        }
        public final boolean hasNext() {
            return end < length;
        }
        public final String next() {
            if (!regexp.find()) {
                throw new Error("Invalid path: " + path);
            }
            end = regexp.end();
            return regexp.group();
        }
        public final void remove() {}
    }
    /**
     * Split a path into tokens, returns a string iterator.
     * 
     * @param path to split
     * @return returns an <code>Iterator</code> of <code>String</code>.
     */
    public static final Iterator<String> split (String path) {
        return new Tokenizer(path);
    }
    protected static final Pattern QUALIFIER = Pattern.compile(
        "(/.+?)\\[(.+?)\\]$"
        );
    protected static final Pattern CONJUNCTION = Pattern.compile("\\s+and\\s+");
    protected static final Pattern EQUALS = Pattern.compile(
        "^(.*?)(?:\\s*=\\s*(.*))?$"
        );
    public static final HashMap<String,String> conjunction (String expressions) {
    	HashMap<String,String> qualifiers = new HashMap();
    	for (String expression: CONJUNCTION.split(expressions)) {
    		Matcher match = EQUALS.matcher(expression);
    		if (match.matches()) {
    			qualifiers.put(match.group(1), match.group(2));
    		} else {
    			throw new RuntimeException(
					"XPATH expression '" + expression + "' not supported"
					);
    		}
    	}
    	return qualifiers;
    }
    protected static final void outline (HashMap outline, String path) {
        int L = path.length();
        Matcher m = TOKEN.matcher(path);
        String key;
        Object nested;
        while (true) {
            if (!m.find()) {
                throw new Error("invalid XPATH: " + path);
            }
            key = m.group();
            if (m.end() < L) {
                nested = outline.get(key);
                if (nested == null) {
                    nested = new HashMap();
                    outline.put(key, nested);
                }
                outline = (HashMap) nested;
            } else {
                if (!outline.containsKey(key)) {
                    outline.put(key, path);
                }
                break;
            }
        }
    }
    /**
     * Outline an iterator of XPATH strings into nested <code>HashMap</code>.
     * 
     * @param paths to outline
     * @return an outline
     */
    public static final HashMap outline (Iterator<String> paths) {
        HashMap outline = new HashMap();
        while (paths.hasNext()) {
            outline(outline, paths.next());
        }
        return outline;
    }
    protected static final void outline (
        String path, HashMap map, HashMap outline
        ) throws Error {
        int L = path.length();
        Object value = map.get(path);
        Matcher m = TOKEN.matcher(path);
        String key;
        Object nested;
        while (true) {
            if (!m.find()) {
                throw new Error("Invalid path: " + path);
            }
            key = m.group();
            if (m.end() < L) {
                nested = outline.get(key);
                if (nested == null) {
                    nested = new HashMap();
                    outline.put(key, nested);
                }
                outline = (HashMap) nested;
            } else {
                if (!outline.containsKey(key)) {
                    outline.put(key, value);
                }
                break;
            }
        }
    }
    /**
     * Outlines a <code>HashMap</code> along the structure implied by its
     * XPATH keys into a new <code>HashMap</code>. 
     * 
     * @param map to outline
     * @return an outlined map
     */
    public static final HashMap outline (HashMap map) {
        HashMap outline = new HashMap();
        Iterator<String> keys = map.keySet().iterator();
        while (keys.hasNext()) {
            outline(keys.next(), map, outline);
        }
        return outline; 
    }
    /**
     * Update a <code>HashMap</code> with the values collected from an
     * outline, with flattened XPATH as keys (i.e.: perform the inverse 
     * transformation of <code>outline</code>).
     * 
     * @param base path of the result's keys
     * @param outline to flatten
     * @param map to update
     */
    public static final void collect (
        String base, HashMap outline, HashMap map
        ) {
        Iterator<String> keys = outline.keySet().iterator();
        String key, path;
        Object value;
        while (keys.hasNext()) {
            key = keys.next();
            value = outline.get(key);
            path = base + key;
            if (value instanceof HashMap) {
                collect (path, (HashMap) value, map);
            } else {
                map.put(path, value);
            }
        }
    }
    /**
     * Collect an outline into a flat map.
     * 
     * @param outline to collect
     * @return a flat map
     */
    public static final 
    HashMap<String,Object> collect(HashMap outline) {
        HashMap<String,Object> map = new HashMap();
        collect("", outline, map);
        return map;
    }
    /**
     * The <code>Feed</code> interface implemented by feeds handlers.
     */
    public static interface Feed {
    	/**
    	 * Called once a matching element is opened with an instance of
    	 * the current <code>Feeds</code> state.
    	 * 
    	 * @param feeds
    	 */
        public void start(Feeds feeds);
        /**
    	 * Called once a matching element is closed with an instance of
    	 * the current <code>Feeds</code> state.
    	 * 
         * @param feeds
         */
        public void end(Feeds feeds);
    }
    protected static abstract class _Abstract {
        protected String path;
        protected StringWriter cdata = null;
        protected boolean attributes = false;
        public Feed handle = null;
        public abstract void handleStart (Feeds feeds);
        public abstract void handleEnd (Feeds feeds);
    }
    protected static class _Pass extends _Abstract {
        public _Pass (String path) {
            this.path = path;
        }
        @Override
        public final void handleStart (Feeds feeds) {}
        @Override
        public final void handleEnd (Feeds feeds) {}
    }
    protected static class _Branch extends _Abstract {
        protected String[] _paths;
        protected int[] _indexes;
        protected int _text = -1;
        public final void index (String path, ArrayList<String> values, Feeds feeds) {
            String[] paths = new String[values.size()];
            values.toArray(paths);
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
        protected HashMap<String,HashMap<String,_Branch>> _paths = new HashMap();
        protected int[] _qualifiers;
        protected int _text = -1;
        public final void index (
            String path, HashMap<String,_Branch> branches, Feeds feeds
            ) {
        }
        public final void qualify (_Branch branch, Feeds feeds) {
            _Expression qualified;
            HashMap<String,String> qualifiers;
            // TODO: parse the XPATH expression into a map of strings
        	qualifiers = new HashMap();
        }
        public final void bind (Feeds feeds) {
            int j = 0;
            HashMap<String,String> qualifiers;
            _Branch branch;
            _Expression qualified = null;
            _qualifieds = new _Expression[_paths.keySet().size()];
            HashSet<String> values = new HashSet(); 
            for (String expression: _paths.keySet()) {
                // TODO: parse the XPATH expression into a map of strings
            	qualifiers = new HashMap();
                HashMap<String,_Branch> branches = _paths.get(expression);
                // qualified = new _Expression(qualifiers, branch, feeds);
                _qualifieds[j++] = qualified;
                values.addAll(qualifiers.keySet());
            }
            _qualifiers = new int[_paths.size()];
            int i = 0;
            for (String qualifier: values) {
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
    protected static final class FeedFun implements Feed {
    	private Fun _start;
    	private Fun _end;
    	public FeedFun (Fun start, Fun end) {
    		_start = start;
    		_end = end;
    	}
    	public final void start (Feeds feeds) {
    		try {
    			_start.apply(feeds);
    		} catch (Throwable t) {
    			throw new RuntimeException(t);
    		}
    	}
    	public final void end (Feeds feeds) {
    		try {
        		_end.apply(feeds);
    		} catch (Throwable t) {
    			throw new RuntimeException(t);
    		}
    	}
    }
    /**
     * Wraps two <code>Fun</code> in a <code>Feed</code> implementation, a 
     * convenience for ECMAScript applications of <code>XPATH.Feeds</code>.
     * 
     * @param start function
     * @param end function
     * @return a <code>Feed</code> implementation.
     */
    public static final Feed feed (Fun start, Fun end) {
    	return new FeedFun(start, end);
    }
    /**
     * ...
     */
    public static final class Feeds {
        protected String[] data;
        protected HashMap<String,_Abstract> branches = new HashMap();
        protected HashMap<String,Integer> values = new HashMap();
    	private FeedParser _parser;
    	/**
    	 * Return the current path.
    	 * 
    	 * @return an XPATH
    	 */
        public final String path () {
        	return _parser.paths[_parser.depth];
        }
        /**
         * Return the current data set.
         * 
         * @return
         */
        public final String[] data () {
        	return data;
        }
        /**
         * Resolve the indexes of an array of paths in the data set. 
         * 
         * @param paths to resolve
         * @return indexes in the data set
         */
        public final int[] indexes (String[] paths) {
        	int[] indexes = new int[paths.length];
            for (int i=0; i<paths.length; i++) {
            	values.get(paths[i]);
            }
            return indexes;
        }
        /**
         * Resolve the index of a path in the data set.
         * 
         * @param path to resolve
         * @return an index in the data set 
         */
        public final Integer index (String path) {
            return values.get(path);
        }
        /**
         * Get a value by path in the data set or null if the path is not indexed.
         * 
         * @param path to query in the data set
         * @return the current value in the data set or null
         */
        public final String get (String path) {
            if (values.containsKey(path)) {
                return data[values.get(path)];
            } 
            return null;
        }
        /**
         * Set a value by path in the data set, if that path resolves to an index.
         * 
         * @param path to resolve in the data set
         * @param value to eventually set in the data set
         */
        public final void set (String path, String value) {
            if (values.containsKey(path)) {
                data[values.get(path)] = value;
            }
        }
        /**
         * Parse XML from an input stream.
         * 
         * @param is
         * @param path
         * @param baseURL
         * @throws IOException
         * @throws XML.Error
         */
        public final void parse (InputStream is, String path, URL baseURL) 
        throws IOException, XML.Error {
            _parser = new FeedParser(this);
            try {
                DocumentParser.parse(new OpenEntity(
                    is, path, baseURL
                    ), new EntityManagerImpl(), _parser, Locale.US);
            } catch (ApplicationException e) {
                throw new XML.Error(e);
            } finally {
            	_parser = null;
            }
        }
        /**
         * Parse XML from a <code>File</code>.
         * 
         * @param file
         * @throws IOException
         * @throws XML.Error
         */
        public final void parse (File file) throws IOException, XML.Error {
            parse(new FileInputStream(file), file.getAbsolutePath(), file.toURL());
        }
    }
    protected static final void compileBranch (
		String path, HashMap<String,Object> outline, Feeds feeds 
		) {
    	_Branch branch = new _Branch();
    	ArrayList<String> attributes = new ArrayList();
    	Object object;
    	for (String key: outline.keySet()) {
    		object = outline.get(key);
        	Matcher match = QUALIFIER.matcher(key);
        	if (match.matches()) {
        		String unqualified = match.group(1);
        		String expression = match.group(2);
        		if (object instanceof HashMap) {  // ./element[...]/...
        			compileBranch(path + key, (HashMap) object, feeds);
        		} else if (key.equals("")) { // ./element[...]
        			;
        		} else { // ./@attribute[...] ! unsupported
        			throw new RuntimeException(
    					"attributes cannot be qualified: " + path + key  
    					);
        		}
        	} else if (object instanceof HashMap) { // ./element/...
    			compileBranch(path + key, (HashMap) object, feeds);
    		} else { // ./element or ./@attribute
    			attributes.add(key);
    		}
    	}
    	branch.index(path, attributes, feeds);
    	feeds.branches.put(path, branch);
    }
    /**
     * Compiles <code>Feeds</code> from a simply qualified mapping of 
     * <code>Feed</code> handlers and value paths.
     * 
     * @param handlers 
     * @param values 
     * @return a <code>Feeds</code> instance
     */
    public static final Feeds compile (
        HashMap<String,Feed> handlers, HashSet<String> values
        ) {
    	Feeds feeds = new Feeds();
        // size the data set array and compile the indexes.
        String[] qualified = new String[values.size()];
        values.toArray(qualified);
        String[] qualifiers = new String[]{};
        feeds.data = new String[qualified.length + qualifiers.length];
        int i;
        for (i=0; i<qualified.length; i++) {
            feeds.values.put(qualified[i], i);
        }
        for (int j=0; j<qualifiers.length; j++) {
            feeds.values.put(qualifiers[j], i++);
        }
        //
        HashMap<String,Object> outlinedValues = outline(values.iterator());
        //
        compileBranch("", outlinedValues, feeds);
        for (String path: feeds.branches.keySet()) {
        	if (handlers.containsKey(path)) {
        		feeds.branches.get(path).handle = handlers.get(path);
        	}
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
                        path + "/@" + event.getAttributeName(i), 
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
   
   The compilation of a map of XPATH to handlers and values produces a
   map of branches.
   
   ...
   
   XPATH qualifier expressions are limited to a simple conjunction of presence
   or equality tests. This is just enough to handle most XML data interchange
   generated by an SQL database. The need for elaborated XPATH expressions
   often indicates that an XML feed parser is neither required nor desirable
   because the document processed is marked up natural text instead of XML data.
   In such use cases the application seldom demands what a this implemetation
   has to offer: minimal memory consumption to handle an XML stream by chunks. 
   

*/
