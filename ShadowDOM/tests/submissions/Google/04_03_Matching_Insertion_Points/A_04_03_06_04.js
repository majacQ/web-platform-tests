/*
Distributed under both the W3C Test Suite License [1] and the W3C
3-clause BSD License [2]. To contribute to a W3C Test Suite, see the
policies and contribution forms [3].

[1] http://www.w3.org/Consortium/Legal/2008/04-testsuite-license
[2] http://www.w3.org/Consortium/Legal/2008/03-bsd-license
[3] http://www.w3.org/2004/10/27-testcases
*/

var A_04_03_06_04 = {
    name:'A_04_03_06_04',
    assert:'Matching Insertion Points: ' +
		'A valid selector fragment may contain a :enabled pseudo-class selector',
	highlight: '[[A valid selector fragment may contain:]][\\s\\S]*[[the following pseudo-class selector\\(s\\):]][\\s\\S]*[[:enabled]]',
    link:'http://www.w3.org/TR/shadow-dom/#matching-insertion-points'
};

var A_04_03_06_04_T01 = async_test('A_04_03_06_04_T01', PROPS(A_04_03_06_04, {
    author:'Sergey G. Grekhov <sgrekhov@unipro.ru>',
    reviewer:''
}));


A_04_03_06_04_T01.step(function () {
    var iframe = document.createElement('iframe');
    iframe.src = 'resources/bobs_page.html';
    document.body.appendChild(iframe);

    iframe.onload = A_04_03_06_04_T01.step_func(function () {
        try {

            var d = iframe.contentDocument;
            var div = d.querySelector('#inputs-wrapper');
            var s = createSR(div);
            
            //make shadow subtree
            var subdiv1 = document.createElement('div');
            subdiv1.innerHTML = '<content select=":enabled"></content>';
            s.appendChild(subdiv1);

            //inp2 should be visible, inp1 not
            assert_true(d.querySelector('#inp2').offsetTop > 0,
                'Element should match :enabled pseudo-class selector');
            assert_equals(d.querySelector('#inp1').offsetTop, 0,
                'Element shouldn\'t match :enabled pseudo-class selector');

        } finally {
            iframe.parentNode.removeChild(iframe);
        }
        A_04_03_06_04_T01.done();
    });
});
