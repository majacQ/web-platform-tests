/*
Distributed under both the W3C Test Suite License [1] and the W3C
3-clause BSD License [2]. To contribute to a W3C Test Suite, see the
policies and contribution forms [3].

[1] http://www.w3.org/Consortium/Legal/2008/04-testsuite-license
[2] http://www.w3.org/Consortium/Legal/2008/03-bsd-license
[3] http://www.w3.org/2004/10/27-testcases
*/

var A_05_05_02 = {
    name:'A_05_05_02',
    assert:'Event Dispatch: ' +
		'The MouseEvent relatedTarget attribute must return the adjusted related target',
    highlight:'The MouseEvent relatedTarget attribute must return the adjusted related target'
};


var A_05_05_02_T01 = async_test('A_05_05_02_T01', PROPS(A_05_05_02, {
    author:'Sergey G. Grekhov <sgrekhov@unipro.ru>',
    reviewer:''
}));

A_05_05_02_T01.step(unit(function (ctx) {	
	
    var d = newRenderedHTMLDocument(ctx);
    
    var invoked = false;
    
    roots = createTestMediaPlayer(d);
    
    //expected result of what relative target should be see
    //see at http://www.w3.org/TR/shadow-dom/#event-retargeting-example
    
    //For #volume-shadow-root adjusted related target #volume-shadow-root
    roots.volumeShadowRoot.addEventListener('mouseover', 
    		A_05_05_02_T01.step_func(function(event) {
	    	invoked = true;
	    	assert_true(event.relatedTarget === roots.volumeShadowRoot, 
	    			'Wrong relatedTarget');
	    }), false);
    
    
    
    
    var evt = document.createEvent("MouseEvents");
    evt.initMouseEvent("mouseover", true, false, window,
      0, 10, 10, 10, 10, false, false, false, false, 0, roots.volumeShadowRoot);
    
    roots.volumeShadowRoot.querySelector('#volume-slider-thumb').dispatchEvent(evt);
    assert_true(invoked, 'Event listener was not invoked');
    A_05_05_02_T01.done();
}));

//TODO (sgrekhov) Add tests for other nodes from http://www.w3.org/TR/shadow-dom/#event-retargeting-example
