DUK=/usr/bin/duk
QJS=/usr/bin/qjs
MUJS=/usr/bin/mujs
GOJA=/usr/bin/goja
SRC=./src/a.js
run:quickjs duktape goja mujs
quickjs:
	@echo --------------------------------------------------------------------------------
	@echo quickjs:
	@echo --------------------------------------------------------------------------------
	@$(QJS) --std -I ../lib/requirejs/require.js -I ../lib/require.conf.js $(SRC)
duktape:
	@echo --------------------------------------------------------------------------------
	@echo duktape:
	@echo --------------------------------------------------------------------------------
	@$(DUK) ../lib/requirejs//require.js ../lib/require.conf.js $(SRC)
mujs:
	@echo --------------------------------------------------------------------------------
	@echo mujs:
	@echo --------------------------------------------------------------------------------
	@$(MUJS) ../lib/requirejs/require.js ../lib/require.conf.js $(SRC)
goja:
	@echo --------------------------------------------------------------------------------
	@echo goja:
	@echo --------------------------------------------------------------------------------
	@$(GOJA) ../lib/requirejs/require.js ../lib/require.conf.js $(SRC)
