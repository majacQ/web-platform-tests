ReflectionTests = {};

ReflectionTests.start = new Date().getTime();

/**
 * Resolve the given URL to an absolute URL, relative to the current document's
 * address.  There's no API that I know of that exposes this directly, so we
 * actually just create an <a> element, set its href, and stitch together the
 * various properties.  Seems to work.  We don't try to reimplement the
 * algorithm here, because we're not concerned with its correctness -- we're
 * only testing HTML reflection, not Web Addresses.
 *
 * Return "" if the URL couldn't be resolved, since this is really for
 * reflected URL attributes, and those are supposed to return "" if the URL
 * couldn't be resolved.
 *
 * It seems like IE9 doesn't implement URL decomposition attributes correctly
 * for <a>, which causes all these tests to fail.  Ideally I'd do this in some
 * other way, but the failure does stem from an incorrect implementation of
 * HTML, so I'll leave it alone for now.
 *
 * TODO: This relies on reflection to test reflection, so it could mask bugs.
 * Either get a JS implementation of the "resolve a URL" algorithm, or just
 * specify expected values manually here.  It shouldn't be too hard to write
 * special cases for all the values we test.
 */
ReflectionTests.resolveUrl = function(url) {
	var el = document.createElement("a");
	el.href = String(url);
	var ret = el.protocol + "//" + el.host + el.pathname + el.search + el.hash;
	if (ret == "//") {
		return "";
	} else {
		return ret;
	}
}

/**
 * Given some input, convert to a multi-URL value for IDL get per the spec.
 */
ReflectionTests.urlsExpected = function(urls) {
	var expected = "";
	// TODO: Test other whitespace?
	urls = urls + "";
	var split = urls.split(" ");
	for (var j = 0; j < split.length; j++) {
		if (split[j] == "") {
			continue;
		}
		var append = ReflectionTests.resolveUrl(split[j]);
		if (append == "") {
			continue;
		}
		if (expected == "") {
			expected = append;
		} else {
			expected += " " + append;
		}
	}
	return expected;
}

/**
 * The "rules for parsing non-negative integers" from the HTML spec.  They're
 * mostly used for reflection, so here seems like as good a place to test them
 * as any.  Returns false on error.
 */
ReflectionTests.parseNonneg = function(input) {
  var value = this.parseInt(input);
  if (value === false || value < 0) {
    return false;
  }
  return value;
}

/**
 * The "rules for parsing integers" from the HTML spec.  Returns false on
 * error.
 */
ReflectionTests.parseInt = function(input) {
	var position = 0;
	var sign = 1;
	// Skip whitespace
	while (input.length > position && /^[ \t\n\f\r]$/.test(input[position])) {
		position++;
	}
	if (position >= input.length) {
		return false;
	}
	if (input[position] == "-") {
		sign = -1;
		position++;
	} else if (input[position] == "+") {
		position++;
	}
	if (position >= input.length) {
		return false;
	}
	if (!/^[0-9]$/.test(input[position])) {
		return false;
	}
	var value = 0;
	while (input.length > position && /^[0-9]$/.test(input[position])) {
		value *= 10;
		// Don't use parseInt even for single-digit strings . . .
		value += input.charCodeAt(position) - "0".charCodeAt(0);
		position++;
	}
	if (value === 0) {
		return 0;
	}
	return sign * value;
}

// Used in initializing typeMap
var binaryString = "\x00\x01\x02\x03\x04\x05\x06\x07 "
	+ "\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f "
	+ "\x10\x11\x12\x13\x14\x15\x16\x17 "
	+ "\x18\x19\x1a\x1b\x1c\x1d\x1e\x1f ";
var maxInt = 2147483647;
var minInt = -2147483648;
var maxUnsigned = 4294967295;

/**
 * Array containing the tests and other information for each type of reflected
 * attribute.  Meaning of keys:
 *
 *   "jsType": What typeof idlObj[idlName] is supposed to be.
 *   "defaultVal": The default value to be returned if the attribute is not
 *       present and no default is specifically set for this attribute.
 *   "domTests": What values to test with setAttribute().
 *   "domExpected": What values to expect with IDL get after setAttribute().
 *       Defaults to the same as domTests.
 *   "idlTests": What values to test with IDL set.  Defaults to domTests.
 *   "idlDomExpected": What to expect from getAttribute() after IDL set.
 *       Defaults to idlTests.
 *   "idlIdlExpected": What to expect from IDL get after IDL set.  Defaults to
 *       idlDomExpected.
 *
 * Note that all tests/expected values are only baselines, and can be expanded
 * with additional tests hardcoded into the function for particular types if
 * necessary (e.g., enum).  null means "default" as a DOM expected value, and
 * "throw an INDEX_SIZE_ERR exception" as an IDL expected value.  (This is a
 * kind of stupid and fragile convention, but it's simple and works for now.)
 * Expected DOM values are cast to strings by adding "".
 *
 * TODO: Test strings that aren't valid UTF-16.  Desired behavior is not clear
 * here at the time of writing, see
 * http://www.w3.org/Bugs/Public/show_bug.cgi?id=12100
 *
 * TODO: Test deleting an IDL attribute, and maybe doing other fun stuff to it.
 *
 * TODO: Test IDL sets of integer types to out-of-range or other weird values.
 * WebIDL says to wrap, but I'm not sure offhand if that's what we want.
 *
 * TODO: Check the parsing of leading whitespace of all sorts for numeric
 * types.  The spec is currently wrong, so I've commented all those tests out:
 * http://www.w3.org/Bugs/Public/show_bug.cgi?id=12296
 * http://www.w3.org/Bugs/Public/show_bug.cgi?id=12220
 * Will fix and uncomment once the bugs are resolved.
 *
 * TODO: tokenlist, settable tokenlist, limited 
 */
ReflectionTests.typeMap = {
	/**
	 * "If a reflecting IDL attribute is a DOMString but doesn't fall into any
	 * of the above categories, then the getting and setting must be done in a
	 * transparent, case-preserving manner."
	 *
	 * The data object passed to reflects() can contain an optional key
	 * treatNullAsEmptyString, whose value is ignored.  If it does contain the
	 * key, null will be cast to "" instead of "null", per WebIDL
	 * [TreatNullAs=EmptyString].
	 */
	"string": {
		"jsType": "string",
		"defaultVal": "",
		"domTests": ["", " " + binaryString + " foo ", undefined, 7, 1.5, true,
			false, {"test": 6}, NaN, +Infinity, -Infinity, "\0", null],
	},
	/**
	 * "If a reflecting IDL attribute is a DOMString attribute whose content
	 * attribute is defined to contain a URL, then on getting, the IDL
	 * attribute must resolve the value of the content attribute relative to
	 * the element and return the resulting absolute URL if that was
	 * successful, or the empty string otherwise; and on setting, must set the
	 * content attribute to the specified literal value. If the content
	 * attribute is absent, the IDL attribute must return the default value, if
	 * the content attribute has one, or else the empty string."
	 */
	"url": {
		"jsType": "string",
		"defaultVal": "",
		"domTests": ["", " foo ", "http://site.example/",
			"//site.example/path???@#l", binaryString, undefined, 7, 1.5, true,
			false, {"test": 6}, NaN, +Infinity, -Infinity, "\0", null],
		"domExpected": ReflectionTests.resolveUrl,
		"idlIdlExpected": ReflectionTests.resolveUrl,
	},
	/**
	 * "If a reflecting IDL attribute is a DOMString attribute whose content
	 * attribute is defined to contain one or more URLs, then on getting, the
	 * IDL attribute must split the content attribute on spaces and return the
	 * concatenation of resolving each token URL to an absolute URL relative to
	 * the element, with a single U+0020 SPACE character between each URL,
	 * ignoring any tokens that did not resolve successfully. If the content
	 * attribute is absent, the IDL attribute must return the default value, if
	 * the content attribute has one, or else the empty string. On setting, the
	 * IDL attribute must set the content attribute to the specified literal
	 * value."
	 *
	 * Seems to only be used for ping.
	 */
	"urls": {
		"jsType": "string",
		"defaultVal": "",
		"domTests": ["", " foo   ", "http://site.example/ foo  bar   baz",
			"//site.example/path???@#l", binaryString, undefined, 7, 1.5, true,
			false, {"test": 6}, NaN, +Infinity, -Infinity, "\0", null],
		"domExpected": ReflectionTests.urlsExpected,
		"idlIdlExpected": ReflectionTests.urlsExpected,
	},
	/**
	 * "If a reflecting IDL attribute is a DOMString whose content attribute is
	 * an enumerated attribute, and the IDL attribute is limited to only known
	 * values, then, on getting, the IDL attribute must return the conforming
	 * value associated with the state the attribute is in (in its canonical
	 * case), or the empty string if the attribute is in a state that has no
	 * associated keyword value; and on setting, if the new value is an ASCII
	 * case-insensitive match for one of the keywords given for that attribute,
	 * then the content attribute must be set to the conforming value
	 * associated with the state that the attribute would be in if set to the
	 * given new value, otherwise, if the new value is the empty string, then
	 * the content attribute must be removed, otherwise, the content attribute
	 * must be set to the given new value."
	 *
	 * "Some attributes are defined as taking one of a finite set of keywords.
	 * Such attributes are called enumerated attributes. The keywords are each
	 * defined to map to a particular state (several keywords might map to the
	 * same state, in which case some of the keywords are synonyms of each
	 * other; additionally, some of the keywords can be said to be
	 * non-conforming, and are only in the specification for historical
	 * reasons). In addition, two default states can be given. The first is the
	 * invalid value default, the second is the missing value default.
	 *
	 * . . .
	 *
	 * When the attribute is specified, if its value is an ASCII
	 * case-insensitive match for one of the given keywords then that keyword's
	 * state is the state that the attribute represents. If the attribute value
	 * matches none of the given keywords, but the attribute has an invalid
	 * value default, then the attribute represents that state. Otherwise, if
	 * the attribute value matches none of the keywords but there is a missing
	 * value default state defined, then that is the state represented by the
	 * attribute.  Otherwise, there is no default, and invalid values must be
	 * ignored.
	 *
	 * When the attribute is not specified, if there is a missing value default
	 * state defined, then that is the state represented by the (missing)
	 * attribute. Otherwise, the absence of the attribute means that there is
	 * no state represented."
	 *
	 * This is only used for enums that are limited to known values, not other
	 * enums (those are treated as generic strings by the spec).  The data
	 * object passed to reflects() can contain these keys:
	 *
	 *   "defaultVal": missing value default (defaults to "")
	 *   "invalidVal": invalid value default (defaults to defaultVal)
	 *   "keywords": array of keywords as given by the spec (required)
	 *   "noncanon": dictionary mapping non-canonical values to their
	 *     canonical equivalents (defaults to {})
	 *
	 * Tests are mostly hardcoded into reflects(), since they depend on the
	 * keywords.  All expected values are computed in reflects() using a helper
	 * function.
	 */
	"enum": {
		"jsType": "string",
		"defaultVal": "",
		"domTests": ["", " " + binaryString + " foo ", undefined, 7, 1.5, true,
			false, {"test": 6}, NaN, +Infinity, -Infinity, "\0", null],
	},
	/**
	 * "If a reflecting IDL attribute is a boolean attribute, then on getting
	 * the IDL attribute must return true if the content attribute is set, and
	 * false if it is absent. On setting, the content attribute must be removed
	 * if the IDL attribute is set to false, and must be set to the empty
	 * string if the IDL attribute is set to true. (This corresponds to the
	 * rules for boolean content attributes.)"
	 */
	"boolean": {
		"jsType": "boolean",
		"defaultVal": false,
		"domTests": ["", " foo ", undefined, null, 7, 1.5, true, false,
			{"test": 6}, NaN, +Infinity, -Infinity, "\0"],
		"domExpected": function(val) {
			return true;
		},
	},
	/**
	 * "If a reflecting IDL attribute is a signed integer type (long) then, on
	 * getting, the content attribute must be parsed according to the rules for
	 * parsing signed integers, and if that is successful, and the value is in
	 * the range of the IDL attribute's type, the resulting value must be
	 * returned. If, on the other hand, it fails or returns an out of range
	 * value, or if the attribute is absent, then the default value must be
	 * returned instead, or 0 if there is no default value. On setting, the
	 * given value must be converted to the shortest possible string
	 * representing the number as a valid integer and then that string must be
	 * used as the new content attribute value."
	 */
	"long": {
		"jsType": "number",
		"defaultVal": 0,
		"domTests": [-36, -1, 0, 1, maxInt, minInt, maxInt + 1, minInt - 1,
			maxUnsigned, maxUnsigned + 1, "", "-1", "-0", "0", "1",
			" " + binaryString + " foo ",
			// Test various different whitespace.  The spec currently says only
			// 20, 9, A, C, and D are whitespace.  JavaScript includes many
			// more, including all Zs characters in Unicode 3.0.0.  All the
			// following should parse as 0 if the character is recognized as
			// whitespace, 7 otherwise.  But the spec is wrong (see TODO
			// above), so these are commented out for now.
			//"\u00097", "\u000B7", "\u000C7", "\u00207", "\u00A07", "\uFEFF7",
			//"\u000A7", "\u000D7", "\u20287", "\u20297", "\u16807", "\u180E7",
			//"\u20007", "\u20017", "\u20027", "\u20037", "\u20047", "\u20057",
			//"\u20067", "\u20077", "\u20087", "\u20097", "\u200A7", "\u202F7",
			//"\u30007",
			undefined, 1.5, true, false, {"test": 6}, NaN, +Infinity,
			-Infinity, "\0"],
		"domExpected": function(val) {
			var parsed = ReflectionTests.parseInt(val + "");
			if (parsed === false || parsed > maxInt || parsed < minInt) {
				return null;
			}
			return parsed;
		},
		"idlTests":       [-36, -1, 0, 1, 2147483647, -2147483648],
		"idlDomExpected": [-36, -1, 0, 1, 2147483647, -2147483648],
	},
	/**
	 * "If a reflecting IDL attribute is a signed integer type (long) that is
	 * limited to only non-negative numbers then, on getting, the content
	 * attribute must be parsed according to the rules for parsing non-negative
	 * integers, and if that is successful, and the value is in the range of
	 * the IDL attribute's type, the resulting value must be returned. If, on
	 * the other hand, it fails or returns an out of range value, or if the
	 * attribute is absent, the default value must be returned instead, or −1
	 * if there is no default value. On setting, if the value is negative, the
	 * user agent must fire an INDEX_SIZE_ERR exception. Otherwise, the given
	 * value must be converted to the shortest possible string representing the
	 * number as a valid non-negative integer and then that string must be used
	 * as the new content attribute value."
	 */
	"limited long": {
		"jsType": "number",
		"defaultVal": -1,
		"domTests": [minInt - 1, minInt, -36, -1, -0, 0, 1, maxInt, maxInt + 1,
			maxUnsigned, maxUnsigned + 1, "", "-1", "-0", "0", "1",
			" " + binaryString + " foo ",
			//"\u00097", "\u000B7", "\u000C7", "\u00207", "\u00A07", "\uFEFF7",
			//"\u000A7", "\u000D7", "\u20287", "\u20297", "\u16807", "\u180E7",
			//"\u20007", "\u20017", "\u20027", "\u20037", "\u20047", "\u20057",
			//"\u20067", "\u20077", "\u20087", "\u20097", "\u200A7", "\u202F7",
			//"\u30007",
			undefined, 1.5, true, false, {"test": 6}, NaN, +Infinity,
			-Infinity, "\0"],
		"domExpected": function(val) {
			var parsed = ReflectionTests.parseNonneg(val + "");
			if (parsed === false || parsed > maxInt || parsed < minInt) {
				return null;
			}
			return parsed;
		},
		"idlTests":       [minInt, -36,  -1,   0, 1, maxInt],
		"idlDomExpected": [null,   null, null, 0, 1, maxInt],
	},
	/**
	 * "If a reflecting IDL attribute is an unsigned integer type (unsigned
	 * long) then, on getting, the content attribute must be parsed according
	 * to the rules for parsing non-negative integers, and if that is
	 * successful, and the value is in the range 0 to 2147483647 inclusive, the
	 * resulting value must be returned. If, on the other hand, it fails or
	 * returns an out of range value, or if the attribute is absent, the
	 * default value must be returned instead, or 0 if there is no default
	 * value. On setting, the given value must be converted to the shortest
	 * possible string representing the number as a valid non-negative integer
	 * and then that string must be used as the new content attribute value."
	 */
	"unsigned long": {
		"jsType": "number",
		"defaultVal": 0,
		"domTests": [minInt - 1, minInt, -36,  -1,   0, 1, 257, maxInt,
			maxInt + 1, maxUnsigned, maxUnsigned + 1, "", "-1", "-0", "0", "1",
			//"\u00097", "\u000B7", "\u000C7", "\u00207", "\u00A07", "\uFEFF7",
			//"\u000A7", "\u000D7", "\u20287", "\u20297", "\u16807", "\u180E7",
			//"\u20007", "\u20017", "\u20027", "\u20037", "\u20047", "\u20057",
			//"\u20067", "\u20077", "\u20087", "\u20097", "\u200A7", "\u202F7",
			//"\u30007",
			" " + binaryString + " foo ", undefined, 1.5, true, false,
			{"test": 6}, NaN, +Infinity, -Infinity, "\0"],
		"domExpected": function(val) {
			var parsed = ReflectionTests.parseNonneg(val + "");
			// Note maxInt, not maxUnsigned.
			if (parsed === false || parsed < 0 || parsed > maxInt) {
				return null;
			}
			return parsed;
		},
		"idlTests": [0, 1, 257, 2147483647, "-0"],
		"idlIdlExpected": [0, 1, 257, 2147483647, 0],
	},
	/**
	 * "If a reflecting IDL attribute is an unsigned integer type (unsigned
	 * long) that is limited to only non-negative numbers greater than zero,
	 * then the behavior is similar to the previous case, but zero is not
	 * allowed. On getting, the content attribute must first be parsed
	 * according to the rules for parsing non-negative integers, and if that is
	 * successful, and the value is in the range 1 to 2147483647 inclusive, the
	 * resulting value must be returned. If, on the other hand, it fails or
	 * returns an out of range value, or if the attribute is absent, the
	 * default value must be returned instead, or 1 if there is no default
	 * value. On setting, if the value is zero, the user agent must fire an
	 * INDEX_SIZE_ERR exception. Otherwise, the given value must be converted
	 * to the shortest possible string representing the number as a valid
	 * non-negative integer and then that string must be used as the new
	 * content attribute value."
	 */
	"limited unsigned long": {
		"jsType": "number",
		"defaultVal": 1,
		"domTests": [minInt - 1, minInt, -36,  -1,   0,    1, maxInt,
			maxInt + 1, maxUnsigned, maxUnsigned + 1, "", "-1", "-0", "0", "1",
			//"\u00097", "\u000B7", "\u000C7", "\u00207", "\u00A07", "\uFEFF7",
			//"\u000A7", "\u000D7", "\u20287", "\u20297", "\u16807", "\u180E7",
			//"\u20007", "\u20017", "\u20027", "\u20037", "\u20047", "\u20057",
			//"\u20067", "\u20077", "\u20087", "\u20097", "\u200A7", "\u202F7",
			//"\u30007",
			" " + binaryString + " foo ", undefined, 1.5, true, false,
			{"test": 6}, NaN, +Infinity, -Infinity, "\0"],
		"domExpected": function(val) {
			var parsed = ReflectionTests.parseNonneg(val + "");
			// Note maxInt, not maxUnsigned.
			if (parsed === false || parsed < 1 || parsed > maxInt) {
				return null;
			}
			return parsed;
		},
		"idlTests":       [0,    1, 2147483647],
		"idlDomExpected": [null, 1, 2147483647],
	},
	/**
	 * "If a reflecting IDL attribute is a floating point number type (double),
	 * then, on getting, the content attribute must be parsed according to the
	 * rules for parsing floating point number values, and if that is
	 * successful, the resulting value must be returned. If, on the other hand,
	 * it fails, or if the attribute is absent, the default value must be
	 * returned instead, or 0.0 if there is no default value. On setting, the
	 * given value must be converted to the best representation of the number
	 * as a floating point number and then that string must be used as the new
	 * content attribute value."
	 *
	 * TODO: Check this:
	 *
	 * "Except where otherwise specified, if an IDL attribute that is a
	 * floating point number type (double) is assigned an Infinity or
	 * Not-a-Number (NaN) value, a NOT_SUPPORTED_ERR exception must be raised."
	 *
	 * TODO: Implement the actual algorithm so we can run lots more tests.  For
	 * now we're stuck with manually setting up expected values.  Of course,
	 * a lot of care has to be taken in checking equality for floats . . .
	 * maybe we should have some tolerance for comparing them.  I'm not even
	 * sure whether setting the content attribute to 0 should return 0.0 or
	 * -0.0 (the former, I hope).
	 */
	"double": {
		"jsType": "number",
		"defaultVal": 0.0,
		"domTests": [minInt - 1, minInt, -36, -1, 0, 1, maxInt,
			maxInt + 1, maxUnsigned, maxUnsigned + 1, "",
			//"\u00097", "\u000B7", "\u000C7", "\u00207", "\u00A07", "\uFEFF7",
			//"\u000A7", "\u000D7", "\u20287", "\u20297", "\u16807", "\u180E7",
			//"\u20007", "\u20017", "\u20027", "\u20037", "\u20047", "\u20057",
			//"\u20067", "\u20077", "\u20087", "\u20097", "\u200A7", "\u202F7",
			//"\u30007",
			" " + binaryString + " foo ", undefined, 1.5, true, false,
			{"test": 6}, NaN, +Infinity, -Infinity, "\0"],
		"domExpected": [minInt - 1, minInt, -36, -1, 0, 1, maxInt,
			maxInt + 1, maxUnsigned, maxUnsigned + 1, null,
			// Leading whitespace tests
			//7, null, 7, 7, null, null,
			//7, 7, null, null, null, null,
			//null, null, null, null, null, null,
			//null, null, null, null, null, null,
			//null,
			// End leading whitespace tests
			null, null, 1.5, null, null,
			null, null, null, null, null],
		// I checked that ES ToString is well-defined for all of these (I
		// think).  Yes, String(-0) == "0".
		"idlTests":       [ -10000000000,   -1,  -0,   0,   1,   10000000000],
		"idlDomExpected": ["-10000000000", "-1", "0", "0", "1", "10000000000"],
		"idlIdlExpected": [ -10000000000,   -1,  -0,   0,   1,   10000000000],
	},
};

for (var type in ReflectionTests.typeMap) {
	var props = ReflectionTests.typeMap[type];
	var cast = window[props.jsType[0].toUpperCase() + props.jsType.slice(1)];
	if (props.domExpected === undefined) {
		props.domExpected = props.domTests.map(cast);
	} else if (typeof props.domExpected == "function") {
		props.domExpected = props.domTests.map(props.domExpected);
	}
	if (props.idlTests === undefined) {
		props.idlTests = props.domTests;
	}
	if (props.idlDomExpected === undefined) {
		props.idlDomExpected = props.idlTests.map(cast);
	} else if (typeof props.idlDomExpected == "function") {
		props.idlDomExpected = props.idlTests.map(props.idlDomExpected);
	}
	if (props.idlIdlExpected === undefined) {
		props.idlIdlExpected = props.idlDomExpected;
	} else if (typeof props.idlIdlExpected == "function") {
		props.idlIdlExpected = props.idlTests.map(props.idlIdlExpected);
	}
}

/**
 * Tests that the JavaScript attribute named idlName on the object idlObj
 * reflects the DOM attribute named domName on domObj.  The data argument is an
 * object that must contain at least one key, "type", which contains the
 * expected type of the IDL attribute ("string", "enum", etc.).  The "comment"
 * key will add a parenthesized comment in the type info if there's a test
 * failure, to indicate that there's something special about the element you're
 * testing (like it has an attribute set to some value).  Other keys in the
 * data object are type-specific, e.g., "defaultVal" for numeric types.  If the
 * data object is a string, it's converted to {"type": data}.  If idlObj is a
 * string, we set idlObj = domObj = document.createElement(idlObj).
 */
ReflectionTests.reflects = function(data, idlName, idlObj, domName, domObj) {
	// Do some setup first so that getTypeDescription() works in testWrapper()
	if (typeof data == "string") {
		data = {type: data};
	}
	if (domName === undefined) {
		domName = idlName;
	}
	if (typeof idlObj == "string") {
		idlObj = document.createElement(idlObj);
	}
	if (domObj === undefined) {
		domObj = idlObj;
	}

	// Note: probably a hack?  This kind of assumes that the variables here
	// won't change over the course of the tests, which is wrong, but it's
	// probably safe enough.  Just don't read stuff that will change.
	ReflectionHarness.currentTestInfo = {data: data, idlName: idlName, idlObj: idlObj, domName: domName, domObj: domObj};

	ReflectionHarness.testWrapper(function() {
		ReflectionTests.doReflects(data, idlName, idlObj, domName, domObj);
	});
}

/**
 * Actual implementation of the above.
 */
ReflectionTests.doReflects = function(data, idlName, idlObj, domName, domObj) {
	// If we don't recognize the type, testing is impossible.
	if (this.typeMap[data.type] === undefined) {
		if (unimplemented.indexOf(data.type) == -1) {
			unimplemented.push(data.type);
		}
		return;
	}

	var typeInfo = this.typeMap[data.type];

	// Test that typeof idlObj[idlName] is correct.  If not, further tests are
	// probably pointless, so bail out.
	if (!ReflectionHarness.test(typeof idlObj[idlName], typeInfo.jsType, "typeof IDL attribute")) {
		return;
	}

	// Test default
	var defaultVal = data.defaultVal;
	if (defaultVal === undefined) {
		defaultVal = typeInfo.defaultVal;
	}
	if (defaultVal !== null) {
		ReflectionHarness.test(idlObj[idlName], defaultVal, "IDL get with DOM attribute unset");
	}

	var domTests = typeInfo.domTests.slice(0);
	var domExpected = typeInfo.domExpected.map(function(val) { return val === null ? defaultVal : val; });
	var idlTests = typeInfo.idlTests.slice(0);
	var idlDomExpected = typeInfo.idlDomExpected.slice(0);
	var idlIdlExpected = typeInfo.idlIdlExpected.slice(0);
	switch (data.type) {
		// Extra tests and other special-casing
		case "boolean":
		domTests.push(domName);
		domExpected.push(true);
		break;

		case "enum":
		// Whee, enum is complicated.
		if (typeof data.invalidVal == "undefined") {
			data.invalidVal = defaultVal;
		}
		if (typeof data.nonCanon == "undefined") {
			data.nonCanon = {};
		}
		for (var i = 0; i < data.keywords.length; i++) {
			domTests.push(data.keywords[i], "x" + data.keywords[i], data.keywords[i] + "\0");
			idlTests.push(data.keywords[i], "x" + data.keywords[i], data.keywords[i] + "\0");

			if (data.keywords[i].length > 1) {
				domTests.push(data.keywords[i].slice(1));
				idlTests.push(data.keywords[i].slice(1));
			}

			if (data.keywords[i] != data.keywords[i].toLowerCase()) {
				domTests.push(data.keywords[i].toLowerCase());
				idlTests.push(data.keywords[i].toLowerCase());
			}
			if (data.keywords[i] != data.keywords[i].toUpperCase()) {
				domTests.push(data.keywords[i].toUpperCase());
				idlTests.push(data.keywords[i].toUpperCase());
			}
		}

		// Per spec, the expected DOM values are the same as the value we set
		// it to.
		idlDomExpected = idlTests.slice(0);

		// Now we have the fun of calculating what the expected IDL values are.
		domExpected = [];
		idlIdlExpected = [];
		for (var i = 0; i < domTests.length; i++) {
			domExpected.push(this.enumExpected(data.keywords, data.nonCanon, data.invalidVal, domTests[i]));
		}
		for (var i = 0; i < idlTests.length; i++) {
			idlIdlExpected.push(this.enumExpected(data.keywords, data.nonCanon, data.invalidVal, idlTests[i]));
		}
		break;

		case "string":
		if ("treatNullAsEmptyString" in data) {
			for (var i = 0; i < idlTests.length; i++) {
				if (idlTests[i] === null) {
					idlDomExpected[i] = idlIdlExpected[i] = "";
				}
			}
		}
		break;
	}
	if (domObj.tagName.toLowerCase() == "canvas" && (domName == "width" || domName == "height")) {
		// Opera tries to allocate a canvas with the given width and height, so
		// it OOMs when given excessive sizes.  This is permissible under the
		// hardware-limitations clause, so cut out those checks.  TODO: Must be
		// a way to make this more succinct.
		domTests = domTests.filter(function(element, index, array) { return domExpected[index] < 1000; });
		domExpected = domExpected.filter(function(element, index, array) { return element < 1000; });
		idlTests = idlTests.filter(function(element, index, array) { return idlIdlExpected[index] < 1000; });
		idlDomExpected = idlDomExpected.filter(function(element, index, array) { return idlIdlExpected[index] < 1000; });
		idlIdlExpected = idlIdlExpected.filter(function(element, index, array) { return idlIdlExpected[index] < 1000; });
	}

	for (var i = 0; i < domTests.length; i++) {
		if (domExpected[i] === null) {
			// If you follow all the complicated logic here, you'll find that
			// this will only happen if there's no expected value at all (like
			// for tabIndex, where the default is too complicated).  So skip
			// the test.
			continue;
		}
		try {
			domObj.setAttribute(domName, domTests[i]);
			// setAttribute() followed by getAttribute() should always return
			// the same thing.  TODO: Except that null should be cast to "" not
			// "null", but that's not specced, so let's just not test it.
			if (domTests[i] !== null) {
				ReflectionHarness.test(domObj.getAttribute(domName), domTests[i] + "", "setAttribute() to " + ReflectionHarness.stringRep(domTests[i]) + " followed by getAttribute()");
			}
			ReflectionHarness.test(idlObj[idlName], domExpected[i], "setAttribute() to " + ReflectionHarness.stringRep(domTests[i]) + " followed by IDL get");
			if (ReflectionHarness.catchUnexpectedExceptions) {
				ReflectionHarness.success();
			}
		} catch (err) {
			if (ReflectionHarness.catchUnexpectedExceptions) {
				ReflectionHarness.failure("Exception thrown during tests with setAttribute() to " + ReflectionHarness.stringRep(domTests[i]));
			} else {
				throw err;
			}
		}
	}

	for (var i = 0; i < idlTests.length; i++) {
		if (idlDomExpected[i] === null) {
			ReflectionHarness.testException("INDEX_SIZE_ERR", function() {
				idlObj[idlName] = idlTests[i];
			}, "IDL set to " + ReflectionHarness.stringRep(idlTests[i]) + " must throw INDEX_SIZE_ERR");
		} else {
			ReflectionHarness.run(function() {
				idlObj[idlName] = idlTests[i];
				if (data.type == "boolean") {
					// Special case yay
					ReflectionHarness.test(domObj.hasAttribute(domName), Boolean(idlTests[i]), "IDL set to " + ReflectionHarness.stringRep(idlTests[i]) + " followed by hasAttribute()");
				} else if (idlDomExpected[i] !== null) {
					ReflectionHarness.test(domObj.getAttribute(domName), idlDomExpected[i] + "", "IDL set to " + ReflectionHarness.stringRep(idlTests[i]) + " followed by getAttribute()");
				}
				if (idlIdlExpected[i] !== null) {
					ReflectionHarness.test(idlObj[idlName], idlIdlExpected[i], "IDL set to " + ReflectionHarness.stringRep(idlTests[i]) + " followed by IDL get");
				}
				if (ReflectionHarness.catchUnexpectedExceptions) {
					ReflectionHarness.success();
				}
			}, "IDL set to " + ReflectionHarness.stringRep(idlTests[i]) + " should not throw");
		}
	}
}

/**
 * If we have an enumerated attribute limited to the array of values in
 * keywords, with nonCanon being a map of non-canonical values to their
 * canonical equivalents, and invalidVal being the invalid value default (or ""
 * for none), then what would we expect from an IDL get if the content
 * attribute is equal to contentVal?
 */
ReflectionTests.enumExpected = function(keywords, nonCanon, invalidVal, contentVal) {
	var ret = invalidVal;
	for (var i = 0; i < keywords.length; i++) {
		if (String(contentVal).toLowerCase() == keywords[i].toLowerCase()) {
			ret = keywords[i];
			break;
		}
	}
	if (typeof nonCanon[ret] != "undefined") {
		return nonCanon[ret];
	}
	return ret;
}

/**
 * Now we have the data structures that tell us which elements have which
 * attributes.
 *
 * The elements object (which must have been defined in earlier files) is a map
 * from element name to an object whose keys are IDL attribute names and whose
 * values are types.  A type is of the same format as
 * ReflectionTests.reflects() accepts, except that there's an extra optional
 * domAttrName key that gets passed as the fourth argument to reflects() if
 * it's provided.  (TODO: drop the fourth and fifth reflects() arguments and
 * make it take them from the dictionary instead?)
 */

// Now we actually run all the tests.
var unimplemented = [];
for (var element in elements) {
	ReflectionTests.reflects("string", "title", element);
	ReflectionTests.reflects("string", "lang", element);
	ReflectionTests.reflects({type: "enum", keywords: ["ltr", "rtl", "auto"]}, "dir", element);
	ReflectionTests.reflects("string", "className", element, "class");
	ReflectionTests.reflects("tokenlist", "classList", element, "class");
	ReflectionTests.reflects("boolean", "hidden", element);
	ReflectionTests.reflects("string", "accessKey", element);
	// Don't try to test the defaultVal -- it should be either 0 or -1, but the
	// rules are complicated, and a lot of them are SHOULDs.
	ReflectionTests.reflects({type: "long", defaultVal: null}, "tabIndex", element);
	// TODO: classList, contextMenu, itemProp, itemRef, dropzone (require
	// tokenlist support)

	for (var idlAttrName in elements[element]) {
		var type = elements[element][idlAttrName];
		ReflectionTests.reflects(type, idlAttrName, element,
			typeof type == "object" && "domAttrName" in type ? type.domAttrName : idlAttrName);
	}
}

for (var i = 0; i < extraTests.length; i++) {
	extraTests[i]();
}

var time = document.getElementById("time");
if (time) {
	time.innerHTML = (new Date().getTime() - ReflectionTests.start)/1000;
}

if (unimplemented.length) {
	var p = document.createElement("p");
	p.textContent = "(Note: missing tests for types " + unimplemented.join(", ") + ".)";
	document.body.appendChild(p);
}
