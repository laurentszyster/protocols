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

import java.io.File;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.ImporterTopLevel;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import org.simple.Fun;
import org.simple.SIO;

/**
 * A minimal embedding of Rhino's interpreter to run single-threaded scripts 
 * and a convenience to wrap JavaScript functions in Java <code>Fun</code> 
 * instance.
 * 
 * Synopsis
 * 
 * <pre>java -cp protocols.jar org.protocols.ECMASCript scripts/test.js</pre>
 * 
 * <pre>importClass(java.lang.System);
 *importClass(Packages.org.protocols.ECMASCript);
 *
 *function test (name) {
 *    System.err.println("hello " + name + "!")
 *}
 *var java_fun = ECMAScript.fun(test);
 *java_fun.apply("world");</pre>
 * 
 * Use Case
 * 
 * Any time you want to script something written in Java: when prototyping a
 * Java API; when writing tests scripts for a Java implementation; when adding 
 * user-defined functions and procedures to a Java application. 
 * 
 * From start to finish in any Java application.
 * 
 * 
 */
public class ECMAScript {
    protected static final Object[] _NO_ARGS = new Object[]{};
    protected static Context context;
    protected static final Function _function (
        ScriptableObject scope, String name
        ) {
        Object function = scope.get(name, scope);
        if (!(
            function == null || function == Scriptable.NOT_FOUND
            ) && function instanceof Function) {
            return (Function) function;
        } else {
            return null;
        }
    }
    protected static final class FunScript implements Fun {
        private Function _scope = null;
        public FunScript(Function scope) {
            _scope = scope;
        }
        public final Object apply(Object input) throws Throwable {
            return (Object) Context.jsToJava(
                _scope.call(context, _scope, _scope, new Object[]{input}),
                Object.class
                );
        }
    }
    /**
     * Wrap a JavaScript function in a <code>Fun</code> and return that instance
     * or throw a <code>RuntimeException</code> if the JavaScript object given
     * is not a function.
     * 
     * Synopsis
     * 
	 * <pre>importClass(java.lang.System);
	 *importClass(Packages.org.protocols.ECMASCript);
	 *
	 *function test (name) {
	 *    System.err.println("hello " + name + "!")
	 *}
	 *var java_fun = ECMAScript.fun(test);
	 *java_fun.apply("world");</pre>
     * 
     * @param function to wrap
     * @return a <code>Fun</code> instance
     * @throws RuntimeException if the JavaScript object is not a function 
     */
    public static final Fun fun (Object function) {
        if (!(
            function == null || function == Scriptable.NOT_FOUND
            ) && function instanceof Function) {
            return new FunScript((Function) function);
        } else {
            throw new RuntimeException("not a function");
        }
    }
    /**
     * Try to evaluate a script file named in the first argument, then execute 
     * the <code>main</code> function in its context.
     * 
     * @param arguments
     * @throws Throwable
     */
    public static final void main (String[] arguments) throws Throwable {
        ContextFactory cf = new ContextFactory();
    	context = cf.enter(); // support Rhino 1.6 and 1.7
        ScriptableObject scope = new ImporterTopLevel(context, false);
        Scriptable self = (Scriptable) Context.javaToJS(ECMAScript.class, scope);
        try {
            if (arguments.length > 0) {
                String path = (new File(arguments[0])).getAbsolutePath();
                context.evaluateString(scope, SIO.read(path), path, 1, null);
            } else {
            	context.evaluateString(scope, SIO.read(System.in), "STDIN", 1, null);
            }
            Function main = _function(scope, "main");
            if (main != null) {
                main.call(context, scope, self, arguments);
            }
        } finally {
            Context.exit();
            context = null;
        }
    }
}
