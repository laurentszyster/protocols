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

import java.util.Set;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Iterator;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Calendar;
import java.math.BigDecimal;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.text.StringCharacterIterator;

import org.simple.Objects;

/**
 * Compile simple <a href="http://laurentszyster.be/jsonr/index.html">JSON 
 * Regular</a> patterns to evaluate and validate a JSON string against an 
 * extensible type model of JSON types, numeric ranges, regular string, 
 * formated dates, collections, relations, regular dictionaries and
 * relevant name spaces.
 * 
 * @h3 Extension Patterns
 * 
 * @p Some application demand specialized data types, most notably date
 * and time types. This implementation provides only one, the most common
 * JSON extension type:
 * 
 * @p <dl><di>
 *  <dt><code>"yyyy-MM-ddTHH:mm:ss"</code></dt>
 *  <dd>a valid date and type value formated alike, as the de-facto standard
 *  JavaScript 1.7 serialization of a date and time instance.</dd>
 * </di></dl>
 * 
 * @p As a decent implementation of JSONR, this one is extensible and provides
 * a Java interface and enough singleton to do so easely.
 */
public final class JSONR {
    /**
     * A simple JSONR exception raised for any type or value error found 
     * by the regular interpreter.
     * 
     * @h3 Synopsis
     * 
     * @p This class is a shallow copy of JSON.Error to distinguish between
     * a syntax and a regular error, allowing the interpreter to recover
     * valid JSON from an invalid JSONR (i.e.: to do error handling).
     * 
     * @pre String model = "[[true, \"[a-z]+\", null]]";
     * String string = "[[false, \"test\", 1.0][true, \"ERROR\", {}]]";
     * try {
     *    Object json = (new JSONR.Parser(model)).eval(string)
     *} catch (JSONR.Error e) {
     *    System.out.println(e.toString())
     *}
     */
    public static class Error extends JSON.Error {
        /**
         * Instantiate a JSONR error with an error message.
         * 
         * @param message the error message
         */
        public Error(String message) {
        	super(message);
    	}
        /**
         * ...
         */
        public String toString() {
            StringBuilder sb = new StringBuilder();
            sb.append("JSONR error ");
            toJSON(sb, null);
            return sb.toString(); 
        }
    }
    // TODO: rename to Pattern and make an abstract class instead of an 
    //       interface to implement match(String json) once ?
    /**
     * An interface to extend JSONR with application-specific types.
     * 
     * @h3 Synopsis
     * 
     * @p Custom type classes must implement the <code>value</code>,
     * <code>eval</code> and <code>copy</code> methods:
     * 
     * @pre import org.less4j.JSONR;
     *import java.text.SimpleDateFormat;
     *
     *public static class PatternDateTime implements JSONR.Pattern {
     *    private static final SimpleDateFormat format = 
     *        new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
     *    private static final String DATETIME_VALUE_ERROR = 
     *        "DateTime value error";
     *    public Object value (Object instance) throws JSONR.Error {
     *        return eval((String) JSONR.STRING.value(instance));
     *    }
     *    public Object eval (String string) throws JSONR.Error {
     *        try {
     *            string.replace('T', ' ');
     *            Calendar dt = Calendar.getInstance();
     *            dt.setTime(format.parse(string));
     *            return dt;
     *        } catch (Exception e) {
     *            throw new JSONR.Error(DATETIME_VALUE_ERROR);
     *        }
     *    }
     *    public static final JSONR.Pattern singleton = new PatternDateTime();
     *    public Pattern copy() {return singleton;}
     *}
     * 
     * @p can be mapped to this name 
     * 
     * @pre "yyyy-MM-ddTHH:mm:ss"
     * 
     * @p to cast a JSON string like
     * 
     * @pre "2006-07-04T12:08:56"
     * 
     * @p into the appropriate <code>java.util.Date</code> instance.
     */
    public static abstract class Pattern {
        /**
         * This public <code>singleton</code> is <code>null</code> by
         * default and needs only to be assigned an instance of the
         * type class if you expect it to be reused in other types.
         */
        public final static Pattern singleton = null;
        /**
         * ...
         * 
         * @param instance to validate as a regular type and value
         * @return a regular <code>Object</code>, or
         * @throws Error if the type or value is irregular
         */
        public abstract Object value(Object instance) throws Error ;
        /**
         * Evaluate a JSON string <em>and</em> validate it as regular
         * 
         * @param string to evaluate as a regular type and value
         * @return a regular <code>Object</code>, or
         * @throws JSON.Error if the string is irregular
         */
        public abstract Object eval(String string) throws JSON.Error;
        /**
         * Make a "deep" copy of the <code>Pattern</code>, something that
         * can safely be passed to a distinct thread.
         * 
         * @p Note that is is only required by applications that expect to
         * alter their JSONR patterns after compilation, something quite
         * unusual. Applications that don't (the overwhelming majority)
         * can consider a <code>JSONR.Pattern</code> as thread-safe.
         * 
         * @return an unsynchronized copy as a <code>Pattern</code> 
         */
        public abstract Pattern copy();
        public abstract String name();
        public abstract Object json();
        public final Parser match () {
    		return new Parser(this);
        }
        public final Parser match (int containers, int iterations) {
    		return new Parser(this, containers, iterations);
        }
    }
    protected static final class PatternUndefined extends Pattern {
        public static final PatternUndefined singleton = new PatternUndefined();
        public Object value (Object instance) {
            return instance;
            }
        public Object eval (String string) {
            if (string.equals(JSON._null)) {
                return null;
            } else {
                return string;
            }
        }
        public Pattern copy() {return singleton;}
        private static final String _name = "undefined";
        public String name() {return _name;} 
        public Object json() {return null;}
    }
    protected static final class PatternBoolean extends Pattern {
        protected static final String BOOLEAN_VALUE_ERROR = 
            "Boolean value error";
        public static final PatternBoolean singleton = new PatternBoolean();
        public final Object value (Object instance) 
        throws Error {
            if (instance instanceof Boolean) {
                return instance;
            } else if (instance instanceof String) {
                return new Boolean(((String)instance).equals(JSON._true));
            } else {
                throw new Error(JSON.BOOLEAN_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSON.Error {
            if (string.equals(JSON._true)) {
                return Boolean.TRUE;
            } else if (string.equals(JSON._false)) {
                return Boolean.FALSE;
            } else {
                throw new Error(BOOLEAN_VALUE_ERROR);
            }
        }
        public final Pattern copy() {return singleton;}
        private static final String _name = "boolean";
        public String name() {return _name;} 
        public Object json() {return Boolean.FALSE;}
    }
    protected static final class PatternInteger extends Pattern {
        protected static final String BIGINTEGER_VALUE_ERROR = 
            "Integer value error";
        public static final PatternInteger singleton = new PatternInteger();
        public final Object value (Object instance) 
        throws Error {
            if (instance instanceof Integer) {
                return instance;
            } else if (instance instanceof String) {
                return new Integer((String) instance);
            } else {
                throw new Error(JSON.INTEGER_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSONR.Error {
            if (string != null) {
                return new Integer(string);
            } else {
                throw new Error(BIGINTEGER_VALUE_ERROR);
            }
        }
        public final Pattern copy() {return singleton;}
        private static final String _name = "integer";
        public String name() {return _name;} 
        private static final Integer _json = new Integer(0);
        public Object json() {return _json;}
    }
    protected static final class PatternDouble extends Pattern {
        protected static final String DOUBLE_VALUE_ERROR = 
            "Double value error";
        public static final PatternDouble singleton = new PatternDouble();
        public final Object value (Object instance) 
        throws Error {
            if (instance instanceof Double) {
                return instance;
            } else if (instance instanceof Number) {
                return new Double(((Number) instance).doubleValue());
            } else if (instance instanceof String) {
                return new Double((String) instance);
            } else {
                throw new Error(JSON.DOUBLE_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSON.Error {
            if (string != null) {
                return new Double(string);
            } else {
                throw new Error(DOUBLE_VALUE_ERROR);
            }
        }
        public final Pattern copy() {return singleton;}
        private static final String _name = "double";
        public String name() {return _name;} 
        private static final Double _json = new Double(0);
        public Object json() {return _json;}
    }
    protected static final class PatternDecimal extends Pattern {
        protected static final String DOUBLE_VALUE_ERROR = 
            "BigDecimal value error";
        public static final Pattern singleton = new PatternDecimal();
        public final Object value (Object instance) 
        throws Error {
            BigDecimal b;
            if (instance instanceof BigDecimal) {
                b = (BigDecimal) instance;
            } else if (instance instanceof Number) {
                b = new BigDecimal(((Number) instance).doubleValue());
            } else if (instance instanceof String) {
                b = new BigDecimal((String) instance);
            } else {
                throw new Error(JSON.DOUBLE_TYPE_ERROR);
            }
            return b;
        }
        public final Object eval (String string) 
        throws JSON.Error {
            if (string != null) {
                return (new BigDecimal(string));
            } else {
                throw new Error(DOUBLE_VALUE_ERROR);
            }
        }
        public final Pattern copy() {return singleton;}
        private static final String _name = "decimal";
        public String name() {return _name;} 
        private static final BigDecimal _json = new BigDecimal("0");
        public Object json() {return _json;}
    }
    protected static final class PatternString extends Pattern {
        protected static final String STRING_VALUE_ERROR = 
            "String value error";
        public static final PatternString singleton = new PatternString();
        public final Object value (Object instance) 
        throws Error {
            if (instance instanceof String) {
                return instance;
            } else {
                throw new Error(JSON.STRING_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSON.Error {
            if (string == null || string.length() == 0) { 
                throw new Error(STRING_VALUE_ERROR);
            } else {
                return string;
            }
        }
        public final Pattern copy() {return singleton;}
        private static final String _name = "string";
        public String name() {return _name;} 
        private static final String _json = "";
        public Object json() {return _json;}
    }
    protected static final class PatternRegular extends Pattern {
        protected static final String IRREGULAR_STRING = 
            "irregular String";
        protected java.util.regex.Pattern pattern = null;
        protected PatternRegular (java.util.regex.Pattern pattern) {
            this.pattern = pattern;
        } 
        public PatternRegular (String expression) {
            pattern = java.util.regex.Pattern.compile(expression);
        } 
        protected final Object test (String string) throws Error {
            if (pattern.matcher(string).matches()) {
                return string;
            } else {
                throw new Error(IRREGULAR_STRING);
            }
        }
        public final Object value (Object instance) 
        throws Error {
            if (instance instanceof String) {
                return this.test((String) instance);
            } else {
                throw new Error(JSON.STRING_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSON.Error {
            if (string != null) {
                return this.test(string);
            } else {
                return null;
            }
        }
        public Pattern copy() {return new PatternRegular(pattern);}
        private static final String _name = "pcre";
        public String name() {return _name;} 
        public Object json() {return pattern.pattern();}
    }
    // TODO: distinguish with PatternRecord?
    protected static final class PatternArray extends Pattern {
        public Pattern[] types = null;
        public PatternArray (Pattern[] types) {this.types = types;}
        public final Object value (Object instance) 
        throws Error {
            if (instance == null || instance instanceof ArrayList) {
                return instance;
            } else {
                throw new Error(JSON.ARRAY_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return (new Parser(this)).eval(string);
        }
        protected final Iterator iterator() {
            return Objects.iter((Object[])types);
            }
        public static final Pattern singleton = new PatternArray(new Pattern[]{});
        public final Pattern copy() {
            if (this == singleton) { 
                return singleton;
            } else {
                return new PatternArray(types);
            }
        }
        private static final String _name = "array";
        public String name() {return _name;} 
        public Object json() {
            return JSON.list((Object[])types);
            }
    }
    protected static final class PatternDictionary extends Pattern {
        protected static final String IRREGULAR_DICTIONARY = 
            "irregular Dictionary";
        public static final Pattern singleton = new PatternDictionary(new Pattern[]{
            new PatternRegular(".+"), PatternUndefined.singleton 
            });
        public Pattern[] types;
        public PatternDictionary (Pattern[] types) {
            this.types = types;
            }
        public final Object value (Object instance) 
        throws Error {
            if (instance == null) {
                return null;
            } else if (instance instanceof HashMap) {
                HashMap map = (HashMap) instance;
                if (map.keySet().iterator().hasNext()) {
                    return map;
                } else {
                    throw new Error(IRREGULAR_DICTIONARY);
                }
            } else {
                throw new Error(JSON.OBJECT_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return (new Parser (this)).eval(string);
        }
        public final Pattern copy() {
            if (this == singleton) { 
            	return singleton;
            }
            return new PatternDictionary(new Pattern[]{types[0], types[1]});
        }
        private static final String _name = "dictionary";
        public String name() {return _name;} 
        public Object json() {
            return JSON.dict((Object[])types);
            }
    }
    protected static final class PatternNamespace extends Pattern {
        protected static final String IRREGULAR_OBJECT = 
            "irregular Namespace";
        public static final Pattern singleton = new PatternNamespace(
            new JSON.Object()
            );
        public Set names;
        public Set mandatory;
        public HashMap namespace;
        public PatternNamespace (HashMap ns) {
            namespace = ns;
            names = ns.keySet();
            mandatory = new HashSet();
            Iterator i = names.iterator();
            while (i.hasNext()) {
                String name = (String) i.next();
                Object value = namespace.get(name); 
                if (!(
                    value instanceof PatternUndefined ||
                    value instanceof PatternArray ||
                    value instanceof PatternNamespace ||
                    value instanceof PatternDictionary
                    ))
                    mandatory.add(name);
                }
            }
        public final Object value (Object instance) 
        throws Error {
            if (instance == null) {
                return null;
            } else if (instance instanceof HashMap) {
                HashMap map = (HashMap) instance;
                if (map.keySet().containsAll(mandatory)) {
                    return map;
                } else {
                    throw new Error(IRREGULAR_OBJECT);
                }
            } else {
                throw new Error(JSON.OBJECT_TYPE_ERROR);
            }
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return (new Parser (this)).eval(string);
        }
        public final Pattern copy() {
            if (this == singleton) { 
            	return singleton;
            }
            String name;
            JSON.Object o = new JSON.Object();
            Iterator iter = namespace.keySet().iterator();
            while (iter.hasNext()) {
                name = (String) iter.next();
                o.put(name, ((Pattern) namespace.get(name)).copy());
            }
            return new PatternNamespace(o);
        }
        private static final String _name = "namespace";
        public String name() {return _name;} 
        public Object json() {
            JSON.Object _json = new JSON.Object();
            _json.putAll(namespace);
            return _json;
        }
    }
    protected static final Pattern BOOLEAN = PatternBoolean.singleton;
    protected static final Pattern INTEGER = PatternInteger.singleton;
    protected static final Pattern DOUBLE = PatternDouble.singleton;
    protected static final Pattern DECIMAL = PatternDecimal.singleton;
    protected static final Pattern STRING = PatternString.singleton;
    /* 
     * the built-in extension types: just JSON's DateTime, ymmv ...
     */
    protected static final class PatternDateTime extends Pattern {
        public static final String name = "DateTime"; 
        public static final Pattern singleton = new PatternDateTime();
        protected static final SimpleDateFormat format = 
            new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        protected static final String DATETIME_VALUE_ERROR = 
            "DateTime value error";
        public final Object value (Object instance) throws Error {
            return eval((String) STRING.value(instance));
        }
        public final Object eval (String string) throws Error {
            try {
                string.replace('T', ' ');
                Calendar dt = Calendar.getInstance();
                dt.setTime(format.parse(string));
                return dt;
            } catch (ParseException e) {
                throw new Error(DATETIME_VALUE_ERROR);
            }
        }
        public final Pattern copy() {return singleton;}        
        private static final String _name = "datetime";
        public String name() {return _name;} 
        public Object json() {return format.toPattern();}
    }
    /**
     * Cast java.util.Calendar objects from JSON DateTime strings.
     */
    public static final Pattern DATETIME = PatternDateTime.singleton;
    /**
     * The built-in extension types.
     * 
     * @p Map extension types by name, by default only the obvious date and
     * time type:
     * 
     * @pre "yyyy-MM-ddTHH:mm:ss"
     * 
     */
    public static HashMap EXTENSIONS = new HashMap();
    static {
        EXTENSIONS.put("yyyy-MM-ddTHH:mm:ss", DATETIME);
    }
    /*
     *  the built-in regular numeric types
     */
    protected static final class PatternIntegerAbsolute extends Pattern {
        private static final String POSITIVE_INTEGER_OVERFLOW = 
            "positive integer overflow";
        private static final String NEGATIVE_INTEGER = 
            "negative integer";
        Integer limit;
        public PatternIntegerAbsolute (Integer gt) {this.limit = gt;}
        protected final Object test (Integer i) throws Error {
            if (i.intValue() < 0) {
                throw new Error(NEGATIVE_INTEGER);
            } else if (i.compareTo(limit) <= 0) {
                return i;
            } else {
                throw new Error(POSITIVE_INTEGER_OVERFLOW);
            }
        } 
        public final Object value (Object instance) 
        throws Error {
            return test((Integer) INTEGER.value(instance));
        }
        public final Object eval (String string) throws JSON.Error {
            return test((Integer) INTEGER.eval(string));
        }
        public final Pattern copy() {return new PatternIntegerAbsolute(limit);}
        private static final String _name = "integerAbsolute";
        public String name() {return _name;} 
        public Object json() {return limit;}
    }
    protected static final class PatternIntegerRelative extends Pattern {
        private static final String INTEGER_OVERFLOW = 
            "integer overflow";
        int limit;
        public PatternIntegerRelative (Integer gt) {
            this.limit = Math.abs(gt.intValue());
        }
        protected final Object test (Integer i) 
        throws Error {
            if (Math.abs(i.intValue()) < limit) {
                return i;
            } else {
                throw new Error(INTEGER_OVERFLOW);
            }
        } 
        public final Object value (Object instance) 
        throws Error {
            return test((Integer) INTEGER.value(instance));
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return test((Integer) INTEGER.eval(string));
        }
        public final Pattern copy() {
            return new PatternIntegerRelative(new Integer(limit));
        }
        private static final String _name = "integerRelative";
        public String name() {return _name;} 
        public Object json() {return new Integer(limit);}
    }
    private static final Double _double_zero = new Double(0.0);
    protected static final class PatternDoubleAbsolute extends Pattern {
        private static final String POSITIVE_DOUBLE_OVERFLOW = 
            "positive double overflow";
        private static final String NEGATIVE_DOUBLE = 
            "negative double";
        Double limit;
        public PatternDoubleAbsolute (Double gt) {this.limit = gt;}
        protected final Object test (Double d) 
        throws Error {
            if (d.compareTo(_double_zero) < 0) {
                throw new Error(NEGATIVE_DOUBLE);
            } else if (d.compareTo(limit) <= 0) {
                return d;
            } else {
                throw new Error(POSITIVE_DOUBLE_OVERFLOW);
            }
        } 
        public final Object value (Object instance) 
        throws Error {
            return test((Double) DOUBLE.value(instance));
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return test((Double) DOUBLE.eval(string));
        }
        public final Pattern copy() {return new PatternDoubleAbsolute(limit);}
        private static final String _name = "doubleAbsolute";
        public String name() {return _name;} 
        public Object json() {return limit;}
    }
    protected static final class PatternDoubleRelative extends Pattern {
        private static final String DOUBLE_OVERFLOW = 
            "double overflow";
        double limit;
        public PatternDoubleRelative (double v) {
            this.limit = Math.abs(v);
            }
        protected final Object test (Double d) throws Error {
            if (Math.abs(d.doubleValue()) <= limit) {
                return d;
            } else {
                throw new Error(DOUBLE_OVERFLOW);
            }
        } 
        public final Object value (Object instance) 
        throws Error {
            return test((Double) DOUBLE.value(instance));
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return test((Double) DOUBLE.eval(string));
        }
        public final Pattern copy() {return new PatternDoubleRelative(limit);}
        private static final String _name = "doubleRelative";
        public String name() {return _name;} 
        public Object json() {return new Double(limit);}
    }
    private static final BigDecimal _decimal_zero = BigDecimal.valueOf(0);
    protected static final class PatternDecimalAbsolute extends Pattern {
        private static final String POSITIVE_DECIMAL_OVERFLOW = 
            "positive decimal overflow";
        private static final String NEGATIVE_DECIMAL = 
            "negative decimal";
        BigDecimal limit;
        int scale;
        public PatternDecimalAbsolute (BigDecimal lt) {
            limit = lt;
            scale = limit.scale(); 
        } 
        protected final Object test (BigDecimal b) 
        throws Error {
            b.setScale(scale);
            if (b.compareTo(_decimal_zero) < 0) {
                throw new Error(NEGATIVE_DECIMAL);
            } else if (b.compareTo(limit) < 0) {
                return b;
            } else {
                throw new Error(POSITIVE_DECIMAL_OVERFLOW);
            }
        }
        public final Object value (Object instance) 
        throws Error {
            return test((BigDecimal) DECIMAL.value(instance));
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return test((BigDecimal) DECIMAL.eval(string));
        }
        public final Pattern copy() {return new PatternDecimalAbsolute(limit);}
        private static final String _name = "decimalAbsolute";
        public String name() {return _name;} 
        public Object json() {return limit;}
    }
    protected static final class PatternDecimalRelative extends Pattern {
        private static final String DECIMAL_OVERFLOW = 
            "decimal overflow";
        BigDecimal limit;
        int scale;
        public PatternDecimalRelative (BigDecimal gt) {
            limit = gt;
            scale = limit.scale(); 
        } 
        protected final Object test (BigDecimal b) 
        throws Error {
            b.setScale(scale);
            if (b.abs().compareTo(limit) > 0) {
                return b;
            } else {
                throw new Error(DECIMAL_OVERFLOW);
            }
        }
        public final Object value (Object instance) 
        throws Error {
            return test((BigDecimal) DECIMAL.value(instance));
        }
        public final Object eval (String string) 
        throws JSON.Error {
            return test((BigDecimal) DECIMAL.eval(string));
        }
        public Pattern copy() {return new PatternDecimalRelative(limit);}
        private static final String _name = "decimalAbsolute";
        public String name() {return _name;} 
        public Object json() {return limit;}
    }
    protected static final String IRREGULAR_ARRAY = "irregular array";
    protected static final String PARTIAL_ARRAY = "partial array";
    protected static final String ARRAY_OVERFLOW = "array overflow";
    protected static final String NAME_ERROR = "name error";
    /**
     * ...
     */
    public static final class Parser extends JSON.Parser {
        /**
         * ...
         */
        public Pattern type = null;
        /**
         * ...
         * 
         * @param type
         */
        public Parser (Pattern type) {
        	super(); 
        	this.type = type;
    	}
        /**
         * ...
         * 
         * @param type
         * @param containers
         * @param iterations
         */
        public Parser (Pattern type, int containers, int iterations) {
            super(containers, iterations); 
            this.type = type;
        }
        /**
         * ...
         */
        public final Object eval(String json) 
        throws JSON.Error {
            buf = new StringBuilder();
            it = new StringCharacterIterator(json);
            try {
                c = it.first();
                return value(type);
            } finally {
                buf = null;
                it = null;
            }
        }
        /**
         * ...
         */
        public final JSON.Error update(Map o, String json) {
            buf = new StringBuilder();
            it = new StringCharacterIterator(json);
            try {
                c = it.first();
                while (Character.isWhitespace(c)) c = it.next();
                if (c == '{') {
                    if (type instanceof PatternNamespace) {
                        c = it.next();
                        namespace(o, ((PatternNamespace) type).namespace);
                        return null;
                    } else if (type instanceof PatternDictionary) {
                        c = it.next();
                        dictionary(o, ((PatternDictionary) type).types);
                        return null;
                    } else {
                        return new Error(JSON.OBJECT_TYPE_ERROR);
                    }
                } else {
                    return error(JSON.OBJECT_TYPE_ERROR);
                }
            } catch (JSON.Error e){
                return e;
            } finally {
                buf = null;
                it = null;
            }
        }
        /**
         * ...
         */
        public final JSON.Error extend(List a, String json) {
            if (!(type instanceof PatternArray))
                return new Error(JSON.ARRAY_TYPE_ERROR);
            
            buf = new StringBuilder();
            it = new StringCharacterIterator(json);
            try {
                c = it.first();
                while (Character.isWhitespace(c)) c = it.next();
                if (c == '[') {
                    c = it.next();
                    array(a, ((PatternArray) type).iterator());
                    return null;
                } else {
                    return error(JSON.ARRAY_TYPE_ERROR);
                }
            } catch (JSON.Error e){
                return e;
            } finally {
                buf = null;
                it = null;
            }
        }
        protected final Object value(Pattern type) 
        throws JSON.Error {
            while (Character.isWhitespace(c)) c = it.next();
            switch(c){
            case '{': {
                if (type instanceof PatternNamespace) {
                    PatternNamespace t = (PatternNamespace) type;
                    c = it.next();
                    return t.value(namespace(new JSON.Object(), t.namespace));
                } else if (type instanceof PatternDictionary) {
                    PatternDictionary t = (PatternDictionary) type;
                    c = it.next();
                    return t.value(dictionary(new JSON.Object(), t.types));
                } else if (type == PatternUndefined.singleton) {
                    c = it.next();
                    return object(new JSON.Object());
                } else {
                    throw error(PatternNamespace.IRREGULAR_OBJECT);
                }
            }
            case '[': {
                if (type instanceof PatternArray) { 
                    c = it.next(); 
                    Iterator types = ((PatternArray) type).iterator();
                    if (types.hasNext()) {
                        return array(new JSON.Array(), types);
                    } else {
                        return array(new JSON.Array());
                    }
                } else if (type == PatternUndefined.singleton) {
                    c = it.next();
                    return array(new JSON.Array());
                } else { 
                    throw error(IRREGULAR_ARRAY);
                }
            }
            case '"': {c = it.next(); return type.value(string());}
            case '0': case '1': case '2': case '3': case '4':  
            case '5': case '6': case '7': case '8': case '9': 
            case '-': {
                return type.value(number());
            }
            case 't': {
                if (next('r') && next('u') && next('e')) {
                    c = it.next(); 
                    return type.value(Boolean.TRUE);
                } else {
                    throw error(TRUE_EXPECTED);
                }
            }
            case 'f': {
                if (next('a') && next('l') && next('s') && next('e')) {
                    c = it.next(); 
                    return type.value(Boolean.FALSE);
                } else {
                    throw error(FALSE_EXPECTED);
                }
            }
            case 'n': {
                if (next('u') && next('l') && next('l')) {
                    c = it.next(); 
                    return type.value(null);
                } else {
                    throw error(NULL_EXPECTED);
                }
            }
            case ',': {c = it.next(); return COMMA;} 
            case ':': {c = it.next(); return COLON;}
            case ']': {c = it.next(); return ARRAY;} 
            case '}': {c = it.next(); return JSON.Parser.OBJECT;}
            case JSON._done:
                throw error(UNEXPECTED_END);
            default: 
                throw error(UNEXPECTED_CHARACTER);
            }
        }
        protected final Object value(Pattern type, String name) 
        throws JSON.Error {
            try {
                return value(type);
            } catch (Error e) {
                e.jsonIndex = it.getIndex();
                e.jsonPath.add(0, name);
                throw e;
            } catch (JSON.Error e) {
                e.jsonPath.add(0, name);
                throw e;
            }
        }
        protected final Object value(Pattern type, int index) 
        throws JSON.Error {
            try {
                return value(type);
            } catch (Error e) {
                e.jsonIndex = it.getIndex();
                e.jsonPath.add(0, new Integer(index));
                throw e;
            } catch (JSON.Error e) {
                e.jsonPath.add(0, new Integer(index));
                throw e;
            }
        }
        protected final Object dictionary(Map o, Pattern[] types) 
        throws JSON.Error {
            if (--containers < 0) { 
                throw error(CONTAINERS_OVERFLOW);
            }
            Object val;
            Object token = value(types[0]);
            while (token != OBJECT) {
                if (!(token instanceof String)) {
                    throw error(STRING_EXPECTED);
                }
                if (--iterations < 0) { 
                    throw error(ITERATIONS_OVERFLOW);
                }
                if (value() == COLON) {
                    val = value(types[1]);
                    if (val==COLON || val==COMMA || val==OBJECT || val==ARRAY) {
                        throw error(VALUE_EXPECTED);
                    }
                    o.put(token, val);
                    token = value(types[0]);
                    if (token == COMMA) {
                        token = value();
                    }
                } else {
                    throw error(COLON_EXPECTED);
                }
            }
            return o;
        }
        protected final Object namespace(Map o, HashMap namespace) 
        throws JSON.Error {
            if (--containers < 0) { 
                throw error(CONTAINERS_OVERFLOW);
            }
            Pattern type;
            String name; 
            Object val;
            Object token = value();
            while (token != OBJECT) {
                if (!(token instanceof String)) {
                    throw error(STRING_EXPECTED);
                }
                if (--iterations < 0) { 
                    throw error(ITERATIONS_OVERFLOW);
                }
                name = (String) token;
                type = (Pattern) namespace.get(name);
                if (value() == COLON) {
                    if (type == null) {
                        throw new Error(NAME_ERROR);
                    } else {
                        val = value(type, name);
                    }
                    if (val==COLON || val==COMMA || val==OBJECT || val==ARRAY) {
                        throw error(VALUE_EXPECTED);
                    }
                    o.put(name, val);
                    token = value();
                    if (token == COMMA)
                        token = value();
                } else {
                    throw error(COLON_EXPECTED);
                }
            }
            return o;
        }
        protected final Object array(List a, Iterator types) 
        throws JSON.Error {
            if (--containers < 0) { 
                throw error(CONTAINERS_OVERFLOW);
            }
            int i = 0;
            Pattern type = (Pattern) types.next();
            Object token = value(type, i++);
            if (types.hasNext()) {
                while (token != ARRAY) {
                    if (token==COLON || token==COMMA || token==OBJECT) {
                        throw error(VALUE_EXPECTED);
                    }
                    if (--iterations < 0) { 
                        throw error(ITERATIONS_OVERFLOW);
                    }
                    a.add(token);
                    token = value(); 
                    if (token == COMMA) {
                        if (types.hasNext()) {
                            token = value((Pattern) types.next(), i++);
                        } else {
                            throw new Error(ARRAY_OVERFLOW);
                        }
                    }
                }
                if (types.hasNext()) {
                    throw error(PARTIAL_ARRAY);
                }
            } else {
                while (token != ARRAY) {
                    if (token==COLON || token==COMMA || token==OBJECT) {
                        throw error(VALUE_EXPECTED);
                    }
                    if (--iterations < 0) { 
                        throw error(ITERATIONS_OVERFLOW);
                    }
                    a.add(token);
                    token = value(); 
                    if (token == COMMA) {
                        token = value(type, i++);
                    }
                }
            }
            return a;
        }
    }
    public static final Pattern compile(Object regular, Map extensions) {
        Pattern type;
        if (regular == null) {
            type = PatternUndefined.singleton;
        } else if (regular instanceof Boolean) {
            type = BOOLEAN;
        } else if (regular instanceof String) {
            String s = (String) regular;
            if (extensions != null && extensions.containsKey(s)) {
                type = (Pattern) extensions.get(s);
            } else if (s.length() > 0) {
                type = new PatternRegular(s);
            } else {
                type = STRING;
            }
        } else if (regular instanceof Integer) {
            Integer i = (Integer) regular;
            int cmpr = i.intValue(); 
            if (cmpr == 0) {
                type = INTEGER;
            } else if (cmpr > 0) {
                type = new PatternIntegerAbsolute(i);
            } else {
                type = new PatternIntegerRelative(i);
            }
        } else if (regular instanceof Double) {
            Double d = (Double) regular;
            int cmpr = d.compareTo(_double_zero); 
            if (cmpr == 0) {
                type = DOUBLE;
            } else if (cmpr > 0) {
                type = new PatternDoubleAbsolute(d);
            } else {
                type = new PatternDoubleRelative(d.doubleValue());
            }
        } else if (regular instanceof BigDecimal) {
            BigDecimal b = (BigDecimal) regular;
            int cmpr = b.compareTo(_decimal_zero); 
            if (cmpr == 0) {
                type = new PatternDecimal();
            } else if (cmpr > 0) {
                type = new PatternDecimalAbsolute(b);
            } else {
                type = new PatternDecimalRelative(b);
            }
        } else if (regular instanceof ArrayList) {
            ArrayList array = (ArrayList) regular;
            int l = array.size();
            if (l > 0) {
                Pattern[] types = new Pattern[l];
                for (int i=0; i<l; i++) { 
                    types[i] = compile(array.get(i), extensions);
                }
                type = new PatternArray(types);
            } else { 
                type = PatternArray.singleton;
            }
        } else if (regular instanceof HashMap) {
            HashMap object = (HashMap) regular;
            Iterator iter = object.keySet().iterator();
            if (!iter.hasNext()) {
                type = PatternNamespace.singleton;
            } else {
                String name;
                int i = 0;
                HashMap namespace = new HashMap();
                do {
                    name = (String) iter.next();
                    namespace.put(name, compile(
                        object.get(name), extensions
                        )); 
                    i++;
                } while (iter.hasNext());
                if (i==1) {
                    type = new PatternDictionary(new Pattern[]{
                        compile(name, extensions),
                        compile(object.get(name), extensions)
                        });
                } else {
                    type = new PatternNamespace(namespace);
                }
            } 
        } else {
            type = null;
        }
        return type;
    }
    /**
     * ...
     * 
     * @param regular
     * @param extensions
     * @return
     */
    public static final Pattern compile (Object regular) {
        return compile(regular, EXTENSIONS);
    }
    /**
     * Recursively validates an object against a <code>JSONR.Pattern</code>
     * or throw a <code>JSONR.Error</code>.
     * 
     * @pre try {
     *  JSONR.validate(value, type);
     *} catch (JSONR.Error) {
     *  ...
     *}
     * 
     * @param instance
     * @param type
     * @return
     * @throws Error
     */
    public static final Object validate (Object instance, Pattern type) 
    throws Error {
        if (type instanceof PatternArray) {
            if (type.value(instance) == null) { // null
                return null; 
            } else { // array
                List array = (List) instance;
                Iterator values = array.iterator();
                Iterator types = ((PatternArray) type).iterator();
                Pattern t = (Pattern) types.next();
                int i = 0;
                if (types.hasNext()) { // relation
                    do {
                        array.set(i++, validate(values.next(), t));
                        t = (Pattern) types.next();
                    } while (types.hasNext());
                } else { // collection
                    do {
                        array.set(i++, validate(values.next(), t));
                    } while (values.hasNext());
                }
                return array;
            }
        } else if (type instanceof PatternNamespace) { // namespace
            if (type.value(instance) == null) { // null
                return null;
            } else { // object with all mandatory properties
                Map namespace = (Map) instance;
                PatternNamespace types = (PatternNamespace) type;
                Iterator names = namespace.keySet().iterator();
                String name;
                while (names.hasNext()) { // validate all present properties 
                    name = (String) names.next();
                    namespace.put(name, validate(
                        namespace.get(name), (Pattern) types.namespace.get(name)
                        ));
                }
                return namespace;
            }
        } else if (type instanceof PatternDictionary) { // dictionary
            if (type.value(instance) == null) { // null
                return null;
            } else { // 
                Map dictionary = (Map) instance;
                Pattern[] types = ((PatternDictionary) type).types;
                Iterator keys = dictionary.keySet().iterator();
                String key;
                while (keys.hasNext()) { // validate all keys and values 
                    key = (String) types[0].value(keys.next());
                    dictionary.put(key, validate(
                        dictionary.get(key), types[1]
                        ));
                }
                return dictionary;
            }
        } else {
            return type.value(instance);
        }
    }
}