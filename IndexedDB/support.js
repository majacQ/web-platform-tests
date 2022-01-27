  <<<<<<< submissions/TestTWF/ChristopheCHARLES-IndexedDB
﻿if (!window.indexedDB)
{
    if (window.msIndexedDB)
    {
        window.indexedDB = window.msIndexedDB;
    }
    else if (window.mozIndexedDB)
    {
        window.indexedDB = window.mozIndexedDB;
    }
    else if (window.webkitIndexedDB)
    {
        window.indexedDB        = webkitIndexedDB;
        IDBCursor               = webkitIDBCursor;
        IDBDatabaseException    = webkitIDBDatabaseException;
        IDBIndex                = webkitIDBIndex;
        IDBObjectStore          = webkitIDBObjectStore;
        IDBRequest              = webkitIDBRequest;
        IDBKeyRange             = webkitIDBKeyRange;
        IDBTransaction          = webkitIDBTransaction;
    }
}
  =======
var databaseName = "database";
var databaseVersion = 1;
  >>>>>>> document-dir-empty-sting

/* Delete created databases
 *
 * Go through each finished test, see if it has an associated database. Close
 * that and delete the database. */
add_completion_callback(function(tests)
{
    for (var i in tests)
    {
        if(tests[i].db)
        {
            tests[i].db.close();
            window.indexedDB.deleteDatabase(tests[i].db.name);
        }
    }
});

  <<<<<<< submissions/TestTWF/ChristopheCHARLES-IndexedDB
function createdb(test, dbname, version)
{
    var rq_open,
      fake_open = {},
      dbname = (dbname ? dbname : "testdb-" + new Date().getTime() + Math.random() );
  =======
function fail(test, desc) {
    return test.step_func(function(e) {
        if (e && e.message && e.target.error)
            assert_unreached(desc + " (" + e.target.error.name + ": " + e.message + ")");
        else if (e && e.message)
            assert_unreached(desc + " (" + e.message + ")");
        else if (e && e.target.readyState === 'done' && e.target.error)
            assert_unreached(desc + " (" + e.target.error.name + ")");
        else
            assert_unreached(desc);
    });
}

function createdb(test, dbname, version)
{
    var rq_open = createdb_for_multiple_tests(dbname, version);
    return rq_open.setTest(test);
}

function createdb_for_multiple_tests(dbname, version) {
    var rq_open,
        fake_open = {},
        test = null,
        dbname = (dbname ? dbname : "testdb-" + new Date().getTime() + Math.random() );
  >>>>>>> document-dir-empty-sting

    if (version)
        rq_open = window.indexedDB.open(dbname, version);
    else
        rq_open = window.indexedDB.open(dbname);

  <<<<<<< submissions/TestTWF/ChristopheCHARLES-IndexedDB
    function auto_fail(evt) {
  =======
    function auto_fail(evt, current_test) {
  >>>>>>> document-dir-empty-sting
        /* Fail handlers, if we haven't set on/whatever/, don't
         * expect to get event whatever. */
        rq_open.manually_handled = {}

  <<<<<<< submissions/TestTWF/ChristopheCHARLES-IndexedDB
        rq_open.addEventListener(evt,
            test.step_func(function(e) {
                if (!rq_open.manually_handled[evt])
                    assert_unreached("unexpected open." + evt + " event")

                if (e.target.result + "" == "[object IDBDatabase]" && !this.db)
                {
  =======
        rq_open.addEventListener(evt, function(e) {
            if (current_test !== test) {
                return;
            }

            test.step(function() {
                if (!rq_open.manually_handled[evt]) {
                    assert_unreached("unexpected open." + evt + " event");
                }

                if (e.target.result + "" == "[object IDBDatabase]" && !this.db) {
  >>>>>>> document-dir-empty-sting
                    this.db = e.target.result;

                    this.db.onerror = fail(test, "unexpected db.error");
                    this.db.onabort = fail(test, "unexpected db.abort");
                    this.db.onversionchange = fail(test, "unexpected db.versionchange");
                }
            })
  <<<<<<< submissions/TestTWF/ChristopheCHARLES-IndexedDB
        )
        rq_open.__defineSetter__("on" + evt, function(h) {
            rq_open.manually_handled[evt] = true
            if (!h)
                rq_open.addEventListener(evt, function() {})
            else
                rq_open.addEventListener(evt, test.step_func(h))
        })
    }

    auto_fail("upgradeneeded")
    auto_fail("success")
    auto_fail("blocked")
    auto_fail("error")

    return rq_open
}

function fail(test, desc) {
    return test.step_func(function(e) {
        console.log(desc, e);

        if (e && e.message && e.target.error)
            assert_unreached(desc + " (" + e.target.error.name + ": " + e.message + ")");
        else if (e && e.message)
            assert_unreached(desc + " (" + e.message + ")");
        else if (e && e.target.error)
            assert_unreached(desc + " (" + e.target.error.name + ")");
        else
            assert_unreached(desc);
    });
  =======
        })
        rq_open.__defineSetter__("on" + evt, function(h) {
            rq_open.manually_handled[evt] = true;
            if (!h)
                rq_open.addEventListener(evt, function() {});
            else
                rq_open.addEventListener(evt, test.step_func(h));
        })
    }

    // add a .setTest method to the DB object
    Object.defineProperty(rq_open, 'setTest', {
        enumerable: false,
        value: function(t) {
            test = t;

            auto_fail("upgradeneeded", test);
            auto_fail("success", test);
            auto_fail("blocked", test);
            auto_fail("error", test);

            return this;
        }
    });

    return rq_open;
}

function assert_key_equals(actual, expected, description) {
    assert_equals(indexedDB.cmp(actual, expected), 0, description);
}

function indexeddb_test(upgrade_func, open_func, description) {
    async_test(function(t) {
        var dbname = document.location + '-' + t.name;
        var del = indexedDB.deleteDatabase(dbname);
        del.onerror = t.unreached_func('deleteDatabase should succeed');
        var open = indexedDB.open(dbname, 1);
        open.onerror = t.unreached_func('open should succeed');
        open.onupgradeneeded = t.step_func(function() {
            var db = open.result;
            var tx = open.transaction;
            upgrade_func(t, db, tx);
        });
        open.onsuccess = t.step_func(function() {
            var db = open.result;
            if (open_func)
                open_func(t, db);
        });
    }, description);
  >>>>>>> document-dir-empty-sting
}
