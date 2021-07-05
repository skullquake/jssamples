# Parsing

`../lib/parsing/parsing.js` contains general purpose parsing utility. The examples in this folder use `./js/a.js` to test the library. Test can be run using `Make`. For browser testing, serve and hit `./index.html`. `requirejs` is used to load in the relevant modules, which include `parsing`, `domino` (for non-brwoser environments) and `jquery`. Non-browser environments like `goja`, `duktape`, `quickjs`, and `mujs` emulates a document using `domino`.
