package org.simple;

/**
 * A debugging convenience to print information and stack traces to STDERR
 * only when assertions are on.
 * 
 * <pre>assert Debug.log(my_object_Z.toString());
 *try {
 *    my_object_Z.do_something();
 *} catch (Exception error) {
 *    // for the developers ... to reproduce the same error case
 *    assert Debug.trace(error); 
 *    // for the users ... to know what happened in their case
 *    Debug.log(error.message());
 *}
 *assert Debug.log(my_object_Z.toString());</pre>
 * 
 * <h3>Note</h3>
 * 
 * <p>The purpose of this convenience is to allow an inexpensive debug
 * output to STDERR that is turned off with assertion, leaving users with
 * <em>their</em> errors, not the developers' traces.</p>
 * 
 * <p>The functions that produce debugging information must safely be executed
 * in an assertion.</p>
 * 
 * <p>Where less is more ...</p> 
 *  
 */
public class Debug {
	/**
	 * ...
	 * 
	 * @param value
	 * @return
	 */
	public static final boolean log (String message) {
		System.err.println(message);
		return true;
	}
	public static final boolean trace (Throwable throwed) {
		throwed.printStackTrace(System.err);
		return true;
	}
}
