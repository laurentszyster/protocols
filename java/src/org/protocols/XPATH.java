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
public final class XPATH {
    protected static final Pattern TOKEN = Pattern.compile(
        "/([^/\\[]+)(?:\\[(.+?)\\])?"
        );
    protected static final class Tokenizer implements Iterator<String> {
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
    protected static final Pattern QUALIFIED = Pattern.compile(
        "(/[^/\\[]+)\\[(.+?)\\]$"
        );
    protected static final Pattern CONJUNCTION = Pattern.compile("\\s+and\\s+");
    protected static final Pattern EQUALS = Pattern.compile(
        "^(/[^/\\[\\s=]+)(?:\\s*=\\s*\"(.*)\")?$"
        );
    protected static final HashMap<String,String> conjunction (String expressions) {
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
                if (!(nested instanceof HashMap)) {
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
                if (outline.containsKey(key)) {
                	if (outline.get(key) instanceof HashMap) {
                		throw new RuntimeException(
            				path + " conflics with " + key
            				);
                	} else {
                		throw new RuntimeException(
            				"duplicate value mapped to " + path
            				);
                	}
                } else {
                    outline.put(key, value);
                }
                break;
            }
        }
    }
    /**
     * Outlines a <code>HashMap</code> along the structure implied by its
     * XPATH keys into a new <code>HashMap</code>, throws a runtime exception
     * when an path leads to an not-empty element in the outline and a value
     * in the map. 
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
    protected static final class Branch {
    	public String path;
    	public StringWriter cdata = null;
        public boolean hasAttributes = false;
        public Feed handle = null;
        public int[] related = null;
        public int textIndex = -1;
        public String[] expressions = null;
        public HashMap<String,Qualifier> qualifiers = new HashMap();
        public Qualifier[] qualifieds = null;
        Branch (String path) {
        	this.path = path;
        }
        final void qualify (Feeds feeds) {
        	expressions = new String[qualifiers.size()];
        	qualifieds = new Qualifier[qualifiers.size()];
            int i = 0;
        	for (String expression: qualifiers.keySet()) {
        		expressions[i] = expression;
                qualifieds[i] = qualifiers.get(expression);
                qualifieds[i].index(path, feeds);
                i++;
            }
        }
        final Qualifier qualifier (String expression) {
        	for (int i=0; i<expressions.length; i++) {
        		if (expression.equals(expressions[i])) {
        			return qualifieds[i];
        		}
        	}
        	return null;
        }
        final void index (ArrayList<String> attributes, Feeds feeds) {
        	if (attributes.size() == 0) {
        		return;
        	}
            for (String attribute: attributes) {
                if (attribute.equals("")) {
                    textIndex = feeds.values.get(path + attribute);
                }
            }
            hasAttributes = (attributes.size() > 1 || (
        		attributes.size() == 1 && textIndex == -1
        		));
        }
        final void relate (HashSet<Integer> related) {
    		this.related = new int[related.size()];
    		Iterator<Integer> indexes = related.iterator();
    		int i = 0;
    		while (indexes.hasNext()) {
    			this.related[i++] = indexes.next();
    		}
        }
        final void handleStart (Feeds feeds) {
            if (textIndex > -1) {
                cdata = new StringWriter();
            }
            String[] data = feeds.data;
            if (related != null) {
	            for (int i=0, L=related.length; i<L; i++) {
	                data[related[i]] = null;
	            }
            }
        }
        final void handleEnd (Feeds feeds) {
        	if (qualifieds != null) {
                for (int i=0; i<qualifieds.length; i++) {
                    qualifieds[i].apply(feeds);
                }
        	}
            if (handle != null) {
                handle.end(feeds);
            }
        }
    }
    protected static final class Qualifier {
        public int length;
        public String[] paths;
        public String[] values;
        public int[] indexes;
        public HashMap<String,String> conjunction = null;
        public HashMap<String,Branch> branches = new HashMap();
        public HashMap<String,String> qualify = new HashMap();
        public int[][] qualifieds = null;
        public Qualifier (HashMap<String,String> conjunction) {
        	this.conjunction = conjunction;
        }
        public final void index (String path, Feeds feeds) {
            length = conjunction.size();
            paths = new String[length];
            conjunction.keySet().toArray(paths);
            Arrays.sort(paths);
            values = new String[length];
            indexes = new int[length];
            for (int i=0; i<length; i++) {
                values[i] = conjunction.get(paths[i]);
                indexes[i] = feeds.values.get(path + paths[i]);
            }
            qualifieds = new int[2][qualify.size()];
            int i = 0;
            for (String unqualified: qualify.keySet()) {
            	qualifieds[0][i] = feeds.index(unqualified);
            	qualifieds[1][i] = feeds.index(qualify.get(unqualified));
            	i++;
            }
        }
        public final String toString() {
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            sb.append(paths[0]);
            if (!(values[0] == null || values[0].equals(""))) {
                sb.append("=\"");
                sb.append(values[0]);
                sb.append("\"");
            }
            for (int i=1; i<length; i++) {
                sb.append(" and ");
                sb.append(paths[i]);
                if (!(values[i] == null || values[i].equals(""))) {
                    sb.append("=\"");
                    sb.append(values[i]);
                    sb.append("\"");
                }
            }
            sb.append("]");
            return sb.toString();
        }
        public final boolean eval (String[] data) {
            String value;
            for (int i=0; i<length; i++) {
                value = data[indexes[i]];
                if (value == null || !value.equals(values[i])) {
                    return false;
                }
            }
            return true;
        }
        public final void apply (Feeds feeds) {
        	String[] data = feeds.data;
            if (eval(data)) {
            	if (qualifieds != null) {
            		for (int i=0, L=qualifieds[0].length; i<L; i++) {
                		data[qualifieds[1][i]] = data[qualifieds[0][i]];
                	}
            	}
            	for (String key: branches.keySet()) {
            		branches.get(key).handleEnd(feeds);
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
     * 
     * <pre>Feeds feeds = XPATH.compile();</pre>
     */
    public static final class Feeds {
        protected String[] data;
        public HashMap<String,Branch> branches = new HashMap();
        protected HashMap<String,Integer> values = new HashMap();
    	protected HashMap<String,String> namespaces = null;
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
        public final HashMap<String,Integer> indexes () {
        	return values;
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
         * Returns the current data set values keyed by XPATHs (for test and
         * prototyping purpose only, XPATH feeds applications should access the
         * data array instead!).
         * 
         * @return a map of values keyed by XPATHs
         */
        public final HashMap<String,String> values () {
        	HashMap<String,String> map = new HashMap();
        	for (String path: values.keySet()) {
        		map.put(path, data[values.get(path)]);
        	}
        	return map;
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
            _parser = new FeedParser(this, namespaces);
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
        // outline all qualified entity and value paths
    	HashSet<String> xpaths = new HashSet();
    	xpaths.addAll(handlers.keySet());
    	xpaths.addAll(values);
    	xpaths.remove("");
        HashMap<String,Object> outlined = outline(xpaths.iterator());
        /*
        System.err.println(JSON.pprint(outlined));
        */
        // compile qualifier branches and update the value set
        compileQualifiers("", outlined, values, feeds);
        /*
        String[] sortedValueXpaths = new String[values.size()];
        values.toArray(sortedValueXpaths);
        Arrays.sort(sortedValueXpaths);
        System.err.println(JSON.pprint(sortedValueXpaths));
        System.err.println(
            "values.size() == " + sortedValueXpaths.length
            );
        */
        // size the data set array and compile its indexes.
        String[] paths = new String[values.size()];
        values.toArray(paths);
        feeds.data = new String[paths.length];
        int i;
        for (i=0; i<paths.length; i++) {
            feeds.values.put(paths[i], i);
        }
        // bind the qualifiers expressions to the data set 
        for (String path: feeds.branches.keySet()) {
        	feeds.branches.get(path).qualify(feeds);
        }

        // compile branches, recursing from the trunk
        xpaths.addAll(values);
        compileBranch("", outline(xpaths.iterator()), feeds);
        // assign handlers to branches, index relation to clear.
        for (String path: feeds.branches.keySet()) {
        	if (handlers.containsKey(path)) {
        		feeds.branches.get(path).handle = handlers.get(path);
        	}
        }
        relate("", outlined, feeds);
        /*
        String[] sortedBranchXpaths = new String[feeds.branches.size()];
        feeds.branches.keySet().toArray(sortedBranchXpaths);
        Arrays.sort(sortedBranchXpaths);
        System.err.println(
            "feeds.branches.size() == " + sortedBranchXpaths.length
            );
        System.err.println(JSON.pprint(sortedBranchXpaths));
        for (String key: sortedBranchXpaths) {
        	System.err.println(key);
        	System.err.println(JSON.pprint(
    			JSON.reflect(feeds.branches.get(key))
    			));
        }
        */
        return feeds;
    }
    protected static final void compileQualifiers (
		String path, 
		HashMap<String,Object> outline, 
		HashSet<String> values,
		Feeds feeds 
		) {
    	Object object;
    	HashMap<String,Object> nested;
    	for (String key: outline.keySet()) {
    		object = outline.get(key);
        	Matcher match = QUALIFIED.matcher(key);
        	if (match.matches()) {
        		String unqualified = path + match.group(1);
        		Branch qualified = feeds.branches.get(unqualified);
        		if (qualified == null) {
        			qualified = new Branch(unqualified);
        	    	feeds.branches.put(unqualified, qualified);
        		}
        		String expression = match.group(2);
        		Qualifier qualifier = new Qualifier(conjunction(expression));
        		values.addAll(qualifier.conjunction.keySet());
        		qualified.qualifiers.put(expression, qualifier);
        		for (
    				String relative: qualifier.conjunction.keySet()
        			) {
        			values.add(unqualified + relative);
        		}
                values.add(unqualified);
        		if (object instanceof HashMap) {  // ./element[...]/...
                    nested = (HashMap) object;
        			compileQualifiers(unqualified, nested, values, feeds);
        			compileQualifieds(
    					path + key, 
    					unqualified, 
    					nested, 
    					values,
    					qualifier.qualify
    					);
        		} else { // ./element[...]
                    qualifier.qualify.put(unqualified, path + key);
        		}
        	} else if (object instanceof HashMap) {  // ./element[...]/...
    			compileQualifiers(path + key, (HashMap) object, values, feeds);
        	}
    	}
    	return;
    }
    protected static final void compileQualifieds (
		String qualified, 
		String unqualified, 
		HashMap<String,Object> outline, 
		HashSet<String> values,
		HashMap<String,String> qualify
		) {
    	Object object;
    	for (String key: outline.keySet()) {
    		object = outline.get(key);
    		if (object instanceof HashMap) {
    			compileQualifieds(
					qualified + key,
					unqualified + key,
					(HashMap) object, 
					values,
					qualify
					);
    		} else {
    			values.add(unqualified + key);
    			qualify.put(unqualified + key, qualified + key);
    		}
    	}
    }
    protected static final Branch compileBranch (
		String path, HashMap<String,Object> outline, Feeds feeds 
		) {
    	Branch branch = feeds.branches.get(path); 
		if (branch == null) {
			branch = new Branch(path);
	    	feeds.branches.put(path, branch);
		} else { // there may be a qualifier branch allready!
			;
		}
    	ArrayList<String> attributes = new ArrayList();
    	Object object;
    	HashMap<String,Object> nested;
    	for (String key: outline.keySet()) {
    		object = outline.get(key);
        	Matcher match = QUALIFIED.matcher(key);
        	if (match.matches()) {
        		String unqualified = path + match.group(1);
        		Branch qualified = feeds.branches.get(unqualified);
        		Qualifier qualifier = qualified.qualifier(match.group(2));
        		if (object instanceof HashMap) {  // ./element[...]/...
                    nested = (HashMap) object;
                    if (feeds.values.containsKey(path + key)) {
                        nested.put("", path + key);
                    }
        			qualifier.branches.put(
    					key, compileBranch(path + key, nested, feeds)
						);
        		} else { // ./element[...]
        		    nested = new HashMap();
        		    nested.put("", path + key);
        			qualifier.branches.put(
    					key, compileBranch(path + key, nested, feeds)
    					);
        		} 
        	} else if (object instanceof HashMap) { // ./element/...
        	    nested = (HashMap) object;
        	    if (feeds.values.containsKey(path + key)) {
        	        nested.put("", path + key);
        	    }
    			compileBranch(path + key, nested, feeds);
    		} else if (key.startsWith("/@")) { // ./@attribute
    			attributes.add(key);
    		} else if (!key.equals("")) { // ./element or 
    		    nested = new HashMap();
    		    nested.put("", path + key);
                compileBranch(path + key, nested, feeds);
    		} else {
    		    attributes.add("");
    		}
    	}
    	branch.index(attributes, feeds);
    	return branch;
    }
    protected static final HashSet<Integer> relate (
		String path, 
		HashMap<String,Object> outline, 
		Feeds feeds
		) {
    	HashSet<Integer> related = new HashSet();
    	Object object;
    	for (String key: outline.keySet()) {
    		object = outline.get(key);
    		if (object instanceof HashMap) {
    			related.addAll(relate(path + key, (HashMap) object, feeds));
    		} else {
    			related.add(feeds.index(path + key));
    		}
    	}
    	Branch branch = feeds.branches.get(path);
    	if (branch.handle != null) {
    		branch.relate(related);
    	}
    	return related;
    }
	protected static final String[] xmlns (
		StartElementEvent event, 
		HashMap<String,String> ns,
		HashMap<String,String> prefixes
		) {
	    String name;
	    String namespace;
	    String[] attributeNames = null;
	    int L = event.getAttributeCount();
	    int A = 0;
	    if (L > 0) {
	        attributeNames = new String[L]; 
	        for (int i=0; i<L; i++) {
	            name = event.getAttributeName(i);
	            if (name.equals("xmlns")) {
		            namespace = event.getAttributeValue(i);
		            if (ns.containsKey(namespace)) {
		            	namespace = ns.get(namespace) + ":";
		            } else {
		            	namespace = namespace + " ";
		            	ns.put(namespace, "");
		            }
	                prefixes.put("", namespace);
	            } else if (name.startsWith("xmlns:")) {
		            namespace = event.getAttributeValue(i);
		            if (ns.containsKey(namespace)) {
		            	namespace = ns.get(namespace) + ":";
		            } else {
		            	namespace = namespace + " ";
		            	ns.put(namespace, "");
		            }
	                prefixes.put(name.substring(6), namespace);
	            } else {
	                attributeNames[i] = name; 
	                A++;
	            }
	        }
	    }
	    return (A > 0) ? attributeNames: null;
	}
    protected static final class FeedParser extends ApplicationImpl {
        protected HashMap<String,String> ns = null;
        protected HashMap<String,String> prefixes = new HashMap();
        protected Feeds feeds;
        protected int depth = -1;
        protected Branch[] stack = new Branch[1024];
        protected String[] paths = new String[1024];
        public FeedParser (Feeds feeds, HashMap<String,String> namespaces) {
            this.feeds = feeds;
            ns = namespaces;
            };
        public final void startElement(StartElementEvent event) {
        	String name = (ns == null) ?
    			XML.fqn(event.getName(), prefixes):
				event.getName();
            String path;
            if (depth < 0) {
                path = "";
            } else if (depth < 1024){
                path = paths[depth] + "/" + name;
            } else {
                throw new RuntimeException("XML BranchParser stack overflow");
            }
            Branch branch = feeds.branches.get(path);
            depth++;
            if (branch == null) {
                branch = new Branch(path);
                feeds.branches.put(path, branch);
            }
            stack[depth] = branch;
            branch.path = paths[depth] = path;
            branch.handleStart(feeds);
            if (ns != null) {
            	String[] attributeNames = xmlns (event, ns, prefixes);
                if (branch.hasAttributes && attributeNames != null) {
                    for (int i=0; i < attributeNames.length; i++) { 
                        if (attributeNames[i] != null) {
                            feeds.set(
                                path + "/@" + XML.fqn(attributeNames[i], prefixes), 
                                event.getAttributeValue(i)
                                );
                        }
                    }
                }
            } else {
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
        	Branch branch = stack[depth];
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
   
   Feed handlers start and end methods are called with that indexed array of 
   strings wrapped into a convenient Feeds instance, as the XML stream is parsed 
   and the data set is filled.
   
   This implementation combines:
   
    1. the convenience of a denormalized data set accessible by a simple
       subset of XPATH that is good-enough for most XML data interchanges;
       
    2. with the constant RAM and CPU footprint of an event-driven parser. 
   
   The API fits a common use case of XML data: long stream of data produced by
   a query from a relational database, a large set of nested relations with 
   qualifiers encoded in XML elements structured in a way that makes full 
   denormalization possible as soon as the document's head is processed.
   
   If you have to process an insanely large and deep XML stream that encapsulates
   an data produced by a COBOL application or exchanged in an EDI network, then 
   XPATH feeds will do.
   
   And in this brave Java world it may be the only one to do it practically. 
   
   XPATH qualifier expressions are limited to a simple conjunction of presence
   or equality tests. This is just enough to handle most XML data interchange
   generated by an SQL database. The need for elaborated XPATH expressions
   often indicates that an XML feed parser is neither required nor desirable
   because the document processed is marked up natural text instead of XML data.
   
   In such use cases the application seldom demands what a this implemetation
   has to offer: minimal memory consumption to handle an XML stream by chunks. 

*/
