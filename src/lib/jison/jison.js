define([], function () {
    (function e(t, n, r) {
        function s(o, u) {
            if (!n[o]) {
                if (!t[o]) {
                    var a = typeof require == "function" && require;
                    if (!u && a) return a(o, !0);
                    if (i) return i(o, !0);
                    throw new Error("Cannot find module '" + o + "'");
                }
                var f = (n[o] = { exports: {} });
                t[o][0].call(
                    f.exports,
                    function (e) {
                        var n = t[o][1][e];
                        return s(n ? n : e);
                    },
                    f,
                    f.exports,
                    e,
                    t,
                    n,
                    r
                );
            }
            return n[o].exports;
        }
        var i = typeof require == "function" && require;
        for (var o = 0; o < r.length; o++) s(r[o]);
        return s;
    })(
        {
            1: [
                function (require, module, exports) {
                    Jison = require("./lib/jison.js");
                    bnf = require("ebnf-parser");
                },
                { "./lib/jison.js": 2, "ebnf-parser": 9 },
            ],
            2: [
                function (require, module, exports) {
                    var process = require("__browserify_process");
                    var typal = require("./util/typal").typal;
                    var Set = require("./util/set").Set;
                    var Lexer = require("jison-lex");
                    var ebnfParser = require("ebnf-parser");
                    var JSONSelect = require("JSONSelect");
                    var esprima = require("esprima");
                    var escodegen = require("escodegen");
                    var version = require("../package.json").version;
                    var Jison = (exports.Jison = exports);
                    Jison.version = version;
                    if (typeof console !== "undefined" && console.log) {
                        Jison.print = console.log;
                    } else if (typeof puts !== "undefined") {
                        Jison.print = function print() {
                            puts([].join.call(arguments, " "));
                        };
                    } else if (typeof print !== "undefined") {
                        Jison.print = print;
                    } else {
                        Jison.print = function print() {};
                    }
                    Jison.Parser = (function () {
                        function each(obj, func) {
                            if (obj.forEach) {
                                obj.forEach(func);
                            } else {
                                var p;
                                for (p in obj) {
                                    if (obj.hasOwnProperty(p)) {
                                        func.call(obj, obj[p], p, obj);
                                    }
                                }
                            }
                        }
                        var Nonterminal = typal.construct({
                            constructor: function Nonterminal(symbol) {
                                this.symbol = symbol;
                                this.productions = new Set();
                                this.first = [];
                                this.follows = [];
                                this.nullable = false;
                            },
                            toString: function Nonterminal_toString() {
                                var str = this.symbol + "\n";
                                str += this.nullable ? "nullable" : "not nullable";
                                str += "\nFirsts: " + this.first.join(", ");
                                str += "\nFollows: " + this.first.join(", ");
                                str += "\nProductions:\n  " + this.productions.join("\n  ");
                                return str;
                            },
                        });
                        var Production = typal.construct({
                            constructor: function Production(symbol, handle, id) {
                                this.symbol = symbol;
                                this.handle = handle;
                                this.nullable = false;
                                this.id = id;
                                this.first = [];
                                this.precedence = 0;
                            },
                            toString: function Production_toString() {
                                return this.symbol + " -> " + this.handle.join(" ");
                            },
                        });
                        var generator = typal.beget();
                        generator.constructor = function Jison_Generator(grammar, opt) {
                            if (typeof grammar === "string") {
                                grammar = ebnfParser.parse(grammar);
                            }
                            var options = typal.mix.call({}, grammar.options, opt);
                            this.terms = {};
                            this.operators = {};
                            this.productions = [];
                            this.conflicts = 0;
                            this.resolutions = [];
                            this.options = options;
                            this.parseParams = grammar.parseParams;
                            this.yy = {};
                            if (grammar.actionInclude) {
                                if (typeof grammar.actionInclude === "function") {
                                    grammar.actionInclude = String(grammar.actionInclude)
                                        .replace(/^\s*function \(\) \{/, "")
                                        .replace(/\}\s*$/, "");
                                }
                                this.actionInclude = grammar.actionInclude;
                            }
                            this.moduleInclude = grammar.moduleInclude || "";
                            this.DEBUG = options.debug || false;
                            if (this.DEBUG) this.mix(generatorDebug);
                            this.processGrammar(grammar);
                            if (grammar.lex) {
                                this.lexer = new Lexer(grammar.lex, null, this.terminals_);
                            }
                        };
                        generator.processGrammar = function processGrammarDef(grammar) {
                            var bnf = grammar.bnf,
                                tokens = grammar.tokens,
                                nonterminals = (this.nonterminals = {}),
                                productions = this.productions,
                                self = this;
                            if (!grammar.bnf && grammar.ebnf) {
                                bnf = grammar.bnf = ebnfParser.transform(grammar.ebnf);
                            }
                            if (tokens) {
                                if (typeof tokens === "string") {
                                    tokens = tokens.trim().split(" ");
                                } else {
                                    tokens = tokens.slice(0);
                                }
                            }
                            var symbols = (this.symbols = []);
                            var operators = (this.operators = processOperators(grammar.operators));
                            this.buildProductions(bnf, productions, nonterminals, symbols, operators);
                            if (tokens && this.terminals.length !== tokens.length) {
                                self.trace("Warning: declared tokens differ from tokens found in rules.");
                                self.trace(this.terminals);
                                self.trace(tokens);
                            }
                            this.augmentGrammar(grammar);
                        };
                        generator.augmentGrammar = function augmentGrammar(grammar) {
                            if (this.productions.length === 0) {
                                throw new Error("Grammar error: must have at least one rule.");
                            }
                            this.startSymbol = grammar.start || grammar.startSymbol || this.productions[0].symbol;
                            if (!this.nonterminals[this.startSymbol]) {
                                throw new Error("Grammar error: startSymbol must be a non-terminal found in your grammar.");
                            }
                            this.EOF = "$end";
                            var acceptProduction = new Production("$accept", [this.startSymbol, "$end"], 0);
                            this.productions.unshift(acceptProduction);
                            this.symbols.unshift("$accept", this.EOF);
                            this.symbols_.$accept = 0;
                            this.symbols_[this.EOF] = 1;
                            this.terminals.unshift(this.EOF);
                            this.nonterminals.$accept = new Nonterminal("$accept");
                            this.nonterminals.$accept.productions.push(acceptProduction);
                            this.nonterminals[this.startSymbol].follows.push(this.EOF);
                        };
                        function processOperators(ops) {
                            if (!ops) return {};
                            var operators = {};
                            for (var i = 0, k, prec; (prec = ops[i]); i++) {
                                for (k = 1; k < prec.length; k++) {
                                    operators[prec[k]] = { precedence: i + 1, assoc: prec[0] };
                                }
                            }
                            return operators;
                        }
                        generator.buildProductions = function buildProductions(bnf, productions, nonterminals, symbols, operators) {
                            var actions = ["/* this == yyval */", this.actionInclude || "", "var $0 = $$.length - 1;", "switch (yystate) {"];
                            var prods, symbol;
                            var productions_ = [0];
                            var symbolId = 1;
                            var symbols_ = {};
                            var her = false;
                            function addSymbol(s) {
                                if (s && !symbols_[s]) {
                                    symbols_[s] = ++symbolId;
                                    symbols.push(s);
                                }
                            }
                            addSymbol("error");
                            for (symbol in bnf) {
                                if (!bnf.hasOwnProperty(symbol)) continue;
                                addSymbol(symbol);
                                nonterminals[symbol] = new Nonterminal(symbol);
                                if (typeof bnf[symbol] === "string") {
                                    prods = bnf[symbol].split(/\s*\|\s*/g);
                                } else {
                                    prods = bnf[symbol].slice(0);
                                }
                                prods.forEach(buildProduction);
                            }
                            var sym,
                                terms = [],
                                terms_ = {};
                            each(symbols_, function (id, sym) {
                                if (!nonterminals[sym]) {
                                    terms.push(sym);
                                    terms_[id] = sym;
                                }
                            });
                            this.hasErrorRecovery = her;
                            this.terminals = terms;
                            this.terminals_ = terms_;
                            this.symbols_ = symbols_;
                            this.productions_ = productions_;
                            actions.push("}");
                            actions = actions
                                .join("\n")
                                .replace(/YYABORT/g, "return false")
                                .replace(/YYACCEPT/g, "return true");
                            var parameters = "yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */";
                            if (this.parseParams) parameters += ", " + this.parseParams.join(", ");
                            try {
                                this.performAction = Function(parameters, actions);
                            } catch (e) {
                                this.performAction = "function anonymous(" + parameters + ") {\n" + actions + "\n}";
                            }
                            function buildProduction(handle) {
                                var r, rhs, i;
                                if (handle.constructor === Array) {
                                    rhs = typeof handle[0] === "string" ? handle[0].trim().split(" ") : handle[0].slice(0);
                                    for (i = 0; i < rhs.length; i++) {
                                        if (rhs[i] === "error") her = true;
                                        if (!symbols_[rhs[i]]) {
                                            addSymbol(rhs[i]);
                                        }
                                    }
                                    if (typeof handle[1] === "string" || handle.length == 3) {
                                        var action = "case " + (productions.length + 1) + ":" + handle[1] + "\nbreak;";
                                        if (action.match(/[$@][a-zA-Z][a-zA-Z0-9_]*/)) {
                                            var count = {},
                                                names = {};
                                            for (i = 0; i < rhs.length; i++) {
                                                var rhs_i = rhs[i].match(/\[[a-zA-Z][a-zA-Z0-9_-]*\]/);
                                                if (rhs_i) {
                                                    rhs_i = rhs_i[0].substr(1, rhs_i[0].length - 2);
                                                    rhs[i] = rhs[i].substr(0, rhs[i].indexOf("["));
                                                } else {
                                                    rhs_i = rhs[i];
                                                }
                                                if (names[rhs_i]) {
                                                    names[rhs_i + ++count[rhs_i]] = i + 1;
                                                } else {
                                                    names[rhs_i] = i + 1;
                                                    names[rhs_i + "1"] = i + 1;
                                                    count[rhs_i] = 1;
                                                }
                                            }
                                            action = action
                                                .replace(/\$([a-zA-Z][a-zA-Z0-9_]*)/g, function (str, pl) {
                                                    return names[pl] ? "$" + names[pl] : str;
                                                })
                                                .replace(/@([a-zA-Z][a-zA-Z0-9_]*)/g, function (str, pl) {
                                                    return names[pl] ? "@" + names[pl] : str;
                                                });
                                        }
                                        action = action
                                            .replace(/([^'"])\$\$|^\$\$/g, "$1this.$")
                                            .replace(/@[0$]/g, "this._$")
                                            .replace(/\$(-?\d+)/g, function (_, n) {
                                                return "$$[$0" + (parseInt(n, 10) - rhs.length || "") + "]";
                                            })
                                            .replace(/@(-?\d+)/g, function (_, n) {
                                                return "_$[$0" + (n - rhs.length || "") + "]";
                                            });
                                        actions.push(action);
                                        rhs = rhs.map(function (e, i) {
                                            return e.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, "");
                                        });
                                        r = new Production(symbol, rhs, productions.length + 1);
                                        if (handle[2] && operators[handle[2].prec]) {
                                            r.precedence = operators[handle[2].prec].precedence;
                                        }
                                    } else {
                                        rhs = rhs.map(function (e, i) {
                                            return e.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, "");
                                        });
                                        r = new Production(symbol, rhs, productions.length + 1);
                                        if (operators[handle[1].prec]) {
                                            r.precedence = operators[handle[1].prec].precedence;
                                        }
                                    }
                                } else {
                                    handle = handle.replace(/\[[a-zA-Z_][a-zA-Z0-9_-]*\]/g, "");
                                    rhs = handle.trim().split(" ");
                                    for (i = 0; i < rhs.length; i++) {
                                        if (rhs[i] === "error") her = true;
                                        if (!symbols_[rhs[i]]) {
                                            addSymbol(rhs[i]);
                                        }
                                    }
                                    r = new Production(symbol, rhs, productions.length + 1);
                                }
                                if (r.precedence === 0) {
                                    for (i = r.handle.length - 1; i >= 0; i--) {
                                        if (!(r.handle[i] in nonterminals) && r.handle[i] in operators) {
                                            r.precedence = operators[r.handle[i]].precedence;
                                        }
                                    }
                                }
                                productions.push(r);
                                productions_.push([symbols_[r.symbol], r.handle[0] === "" ? 0 : r.handle.length]);
                                nonterminals[symbol].productions.push(r);
                            }
                        };
                        generator.createParser = function createParser() {
                            throw new Error("Calling abstract method.");
                        };
                        generator.trace = function trace() {};
                        generator.warn = function warn() {
                            var args = Array.prototype.slice.call(arguments, 0);
                            Jison.print.call(null, args.join(""));
                        };
                        generator.error = function error(msg) {
                            throw new Error(msg);
                        };
                        var generatorDebug = {
                            trace: function trace() {
                                Jison.print.apply(null, arguments);
                            },
                            beforeprocessGrammar: function () {
                                this.trace("Processing grammar.");
                            },
                            afteraugmentGrammar: function () {
                                var trace = this.trace;
                                each(this.symbols, function (sym, i) {
                                    trace(sym + "(" + i + ")");
                                });
                            },
                        };
                        var lookaheadMixin = {};
                        lookaheadMixin.computeLookaheads = function computeLookaheads() {
                            if (this.DEBUG) this.mix(lookaheadDebug);
                            this.computeLookaheads = function () {};
                            this.nullableSets();
                            this.firstSets();
                            this.followSets();
                        };
                        lookaheadMixin.followSets = function followSets() {
                            var productions = this.productions,
                                nonterminals = this.nonterminals,
                                self = this,
                                cont = true;
                            while (cont) {
                                cont = false;
                                productions.forEach(function Follow_prod_forEach(production, k) {
                                    var q;
                                    var ctx = !!self.go_;
                                    var set = [],
                                        oldcount;
                                    for (var i = 0, t; (t = production.handle[i]); ++i) {
                                        if (!nonterminals[t]) continue;
                                        if (ctx) q = self.go_(production.symbol, production.handle.slice(0, i));
                                        var bool = !ctx || q === parseInt(self.nterms_[t], 10);
                                        if (i === production.handle.length + 1 && bool) {
                                            set = nonterminals[production.symbol].follows;
                                        } else {
                                            var part = production.handle.slice(i + 1);
                                            set = self.first(part);
                                            if (self.nullable(part) && bool) {
                                                set.push.apply(set, nonterminals[production.symbol].follows);
                                            }
                                        }
                                        oldcount = nonterminals[t].follows.length;
                                        Set.union(nonterminals[t].follows, set);
                                        if (oldcount !== nonterminals[t].follows.length) {
                                            cont = true;
                                        }
                                    }
                                });
                            }
                        };
                        lookaheadMixin.first = function first(symbol) {
                            if (symbol === "") {
                                return [];
                            } else if (symbol instanceof Array) {
                                var firsts = [];
                                for (var i = 0, t; (t = symbol[i]); ++i) {
                                    if (!this.nonterminals[t]) {
                                        if (firsts.indexOf(t) === -1) firsts.push(t);
                                    } else {
                                        Set.union(firsts, this.nonterminals[t].first);
                                    }
                                    if (!this.nullable(t)) break;
                                }
                                return firsts;
                            } else if (!this.nonterminals[symbol]) {
                                return [symbol];
                            } else {
                                return this.nonterminals[symbol].first;
                            }
                        };
                        lookaheadMixin.firstSets = function firstSets() {
                            var productions = this.productions,
                                nonterminals = this.nonterminals,
                                self = this,
                                cont = true,
                                symbol,
                                firsts;
                            while (cont) {
                                cont = false;
                                productions.forEach(function FirstSets_forEach(production, k) {
                                    var firsts = self.first(production.handle);
                                    if (firsts.length !== production.first.length) {
                                        production.first = firsts;
                                        cont = true;
                                    }
                                });
                                for (symbol in nonterminals) {
                                    firsts = [];
                                    nonterminals[symbol].productions.forEach(function (production) {
                                        Set.union(firsts, production.first);
                                    });
                                    if (firsts.length !== nonterminals[symbol].first.length) {
                                        nonterminals[symbol].first = firsts;
                                        cont = true;
                                    }
                                }
                            }
                        };
                        lookaheadMixin.nullableSets = function nullableSets() {
                            var firsts = (this.firsts = {}),
                                nonterminals = this.nonterminals,
                                self = this,
                                cont = true;
                            while (cont) {
                                cont = false;
                                this.productions.forEach(function (production, k) {
                                    if (!production.nullable) {
                                        for (var i = 0, n = 0, t; (t = production.handle[i]); ++i) {
                                            if (self.nullable(t)) n++;
                                        }
                                        if (n === i) {
                                            production.nullable = cont = true;
                                        }
                                    }
                                });
                                for (var symbol in nonterminals) {
                                    if (!this.nullable(symbol)) {
                                        for (var i = 0, production; (production = nonterminals[symbol].productions.item(i)); i++) {
                                            if (production.nullable) nonterminals[symbol].nullable = cont = true;
                                        }
                                    }
                                }
                            }
                        };
                        lookaheadMixin.nullable = function nullable(symbol) {
                            if (symbol === "") {
                                return true;
                            } else if (symbol instanceof Array) {
                                for (var i = 0, t; (t = symbol[i]); ++i) {
                                    if (!this.nullable(t)) return false;
                                }
                                return true;
                            } else if (!this.nonterminals[symbol]) {
                                return false;
                            } else {
                                return this.nonterminals[symbol].nullable;
                            }
                        };
                        var lookaheadDebug = {
                            beforenullableSets: function () {
                                this.trace("Computing Nullable sets.");
                            },
                            beforefirstSets: function () {
                                this.trace("Computing First sets.");
                            },
                            beforefollowSets: function () {
                                this.trace("Computing Follow sets.");
                            },
                            afterfollowSets: function () {
                                var trace = this.trace;
                                each(this.nonterminals, function (nt, t) {
                                    trace(nt, "\n");
                                });
                            },
                        };
                        var lrGeneratorMixin = {};
                        lrGeneratorMixin.buildTable = function buildTable() {
                            if (this.DEBUG) this.mix(lrGeneratorDebug);
                            this.states = this.canonicalCollection();
                            this.table = this.parseTable(this.states);
                            this.defaultActions = findDefaults(this.table);
                        };
                        lrGeneratorMixin.Item = typal.construct({
                            constructor: function Item(production, dot, f, predecessor) {
                                this.production = production;
                                this.dotPosition = dot || 0;
                                this.follows = f || [];
                                this.predecessor = predecessor;
                                this.id = parseInt(production.id + "a" + this.dotPosition, 36);
                                this.markedSymbol = this.production.handle[this.dotPosition];
                            },
                            remainingHandle: function () {
                                return this.production.handle.slice(this.dotPosition + 1);
                            },
                            eq: function (e) {
                                return e.id === this.id;
                            },
                            handleToString: function () {
                                var handle = this.production.handle.slice(0);
                                handle[this.dotPosition] = "." + (handle[this.dotPosition] || "");
                                return handle.join(" ");
                            },
                            toString: function () {
                                var temp = this.production.handle.slice(0);
                                temp[this.dotPosition] = "." + (temp[this.dotPosition] || "");
                                return this.production.symbol + " -> " + temp.join(" ") + (this.follows.length === 0 ? "" : " #lookaheads= " + this.follows.join(" "));
                            },
                        });
                        lrGeneratorMixin.ItemSet = Set.prototype.construct({
                            afterconstructor: function () {
                                this.reductions = [];
                                this.goes = {};
                                this.edges = {};
                                this.shifts = false;
                                this.inadequate = false;
                                this.hash_ = {};
                                for (var i = this._items.length - 1; i >= 0; i--) {
                                    this.hash_[this._items[i].id] = true;
                                }
                            },
                            concat: function concat(set) {
                                var a = set._items || set;
                                for (var i = a.length - 1; i >= 0; i--) {
                                    this.hash_[a[i].id] = true;
                                }
                                this._items.push.apply(this._items, a);
                                return this;
                            },
                            push: function (item) {
                                this.hash_[item.id] = true;
                                return this._items.push(item);
                            },
                            contains: function (item) {
                                return this.hash_[item.id];
                            },
                            valueOf: function toValue() {
                                var v = this._items
                                    .map(function (a) {
                                        return a.id;
                                    })
                                    .sort()
                                    .join("|");
                                this.valueOf = function toValue_inner() {
                                    return v;
                                };
                                return v;
                            },
                        });
                        lrGeneratorMixin.closureOperation = function closureOperation(itemSet) {
                            var closureSet = new this.ItemSet();
                            var self = this;
                            var set = itemSet,
                                itemQueue,
                                syms = {};
                            do {
                                itemQueue = new Set();
                                closureSet.concat(set);
                                set.forEach(function CO_set_forEach(item) {
                                    var symbol = item.markedSymbol;
                                    if (symbol && self.nonterminals[symbol]) {
                                        if (!syms[symbol]) {
                                            self.nonterminals[symbol].productions.forEach(function CO_nt_forEach(production) {
                                                var newItem = new self.Item(production, 0);
                                                if (!closureSet.contains(newItem)) itemQueue.push(newItem);
                                            });
                                            syms[symbol] = true;
                                        }
                                    } else if (!symbol) {
                                        closureSet.reductions.push(item);
                                        closureSet.inadequate = closureSet.reductions.length > 1 || closureSet.shifts;
                                    } else {
                                        closureSet.shifts = true;
                                        closureSet.inadequate = closureSet.reductions.length > 0;
                                    }
                                });
                                set = itemQueue;
                            } while (!itemQueue.isEmpty());
                            return closureSet;
                        };
                        lrGeneratorMixin.gotoOperation = function gotoOperation(itemSet, symbol) {
                            var gotoSet = new this.ItemSet(),
                                self = this;
                            itemSet.forEach(function goto_forEach(item, n) {
                                if (item.markedSymbol === symbol) {
                                    gotoSet.push(new self.Item(item.production, item.dotPosition + 1, item.follows, n));
                                }
                            });
                            return gotoSet.isEmpty() ? gotoSet : this.closureOperation(gotoSet);
                        };
                        lrGeneratorMixin.canonicalCollection = function canonicalCollection() {
                            var item1 = new this.Item(this.productions[0], 0, [this.EOF]);
                            var firstState = this.closureOperation(new this.ItemSet(item1)),
                                states = new Set(firstState),
                                marked = 0,
                                self = this,
                                itemSet;
                            states.has = {};
                            states.has[firstState] = 0;
                            while (marked !== states.size()) {
                                itemSet = states.item(marked);
                                marked++;
                                itemSet.forEach(function CC_itemSet_forEach(item) {
                                    if (item.markedSymbol && item.markedSymbol !== self.EOF) self.canonicalCollectionInsert(item.markedSymbol, itemSet, states, marked - 1);
                                });
                            }
                            return states;
                        };
                        lrGeneratorMixin.canonicalCollectionInsert = function canonicalCollectionInsert(symbol, itemSet, states, stateNum) {
                            var g = this.gotoOperation(itemSet, symbol);
                            if (!g.predecessors) g.predecessors = {};
                            if (!g.isEmpty()) {
                                var gv = g.valueOf(),
                                    i = states.has[gv];
                                if (i === -1 || typeof i === "undefined") {
                                    states.has[gv] = states.size();
                                    itemSet.edges[symbol] = states.size();
                                    states.push(g);
                                    g.predecessors[symbol] = [stateNum];
                                } else {
                                    itemSet.edges[symbol] = i;
                                    states.item(i).predecessors[symbol].push(stateNum);
                                }
                            }
                        };
                        var NONASSOC = 0;
                        lrGeneratorMixin.parseTable = function parseTable(itemSets) {
                            var states = [],
                                nonterminals = this.nonterminals,
                                operators = this.operators,
                                conflictedStates = {},
                                self = this,
                                s = 1,
                                r = 2,
                                a = 3;
                            itemSets.forEach(function (itemSet, k) {
                                var state = (states[k] = {});
                                var action, stackSymbol;
                                for (stackSymbol in itemSet.edges) {
                                    itemSet.forEach(function (item, j) {
                                        if (item.markedSymbol == stackSymbol) {
                                            var gotoState = itemSet.edges[stackSymbol];
                                            if (nonterminals[stackSymbol]) {
                                                state[self.symbols_[stackSymbol]] = gotoState;
                                            } else {
                                                state[self.symbols_[stackSymbol]] = [s, gotoState];
                                            }
                                        }
                                    });
                                }
                                itemSet.forEach(function (item, j) {
                                    if (item.markedSymbol == self.EOF) {
                                        state[self.symbols_[self.EOF]] = [a];
                                    }
                                });
                                var allterms = self.lookAheads ? false : self.terminals;
                                itemSet.reductions.forEach(function (item, j) {
                                    var terminals = allterms || self.lookAheads(itemSet, item);
                                    terminals.forEach(function (stackSymbol) {
                                        action = state[self.symbols_[stackSymbol]];
                                        var op = operators[stackSymbol];
                                        if (action || (action && action.length)) {
                                            var sol = resolveConflict(item.production, op, [r, item.production.id], action[0] instanceof Array ? action[0] : action);
                                            self.resolutions.push([k, stackSymbol, sol]);
                                            if (sol.bydefault) {
                                                self.conflicts++;
                                                if (!self.DEBUG) {
                                                    self.warn("Conflict in grammar: multiple actions possible when lookahead token is ", stackSymbol, " in state ", k, "\n- ", printAction(sol.r, self), "\n- ", printAction(sol.s, self));
                                                    conflictedStates[k] = true;
                                                }
                                                if (self.options.noDefaultResolve) {
                                                    if (!(action[0] instanceof Array)) action = [action];
                                                    action.push(sol.r);
                                                }
                                            } else {
                                                action = sol.action;
                                            }
                                        } else {
                                            action = [r, item.production.id];
                                        }
                                        if (action && action.length) {
                                            state[self.symbols_[stackSymbol]] = action;
                                        } else if (action === NONASSOC) {
                                            state[self.symbols_[stackSymbol]] = undefined;
                                        }
                                    });
                                });
                            });
                            if (!self.DEBUG && self.conflicts > 0) {
                                self.warn("\nStates with conflicts:");
                                each(conflictedStates, function (val, state) {
                                    self.warn("State " + state);
                                    self.warn("  ", itemSets.item(state).join("\n  "));
                                });
                            }
                            return states;
                        };
                        function findDefaults(states) {
                            var defaults = {};
                            states.forEach(function (state, k) {
                                var i = 0;
                                for (var act in state) {
                                    if ({}.hasOwnProperty.call(state, act)) i++;
                                }
                                if (i === 1 && state[act][0] === 2) {
                                    defaults[k] = state[act];
                                }
                            });
                            return defaults;
                        }
                        function resolveConflict(production, op, reduce, shift) {
                            var sln = { production: production, operator: op, r: reduce, s: shift },
                                s = 1,
                                r = 2,
                                a = 3;
                            if (shift[0] === r) {
                                sln.msg = "Resolve R/R conflict (use first production declared in grammar.)";
                                sln.action = shift[1] < reduce[1] ? shift : reduce;
                                if (shift[1] !== reduce[1]) sln.bydefault = true;
                                return sln;
                            }
                            if (production.precedence === 0 || !op) {
                                sln.msg = "Resolve S/R conflict (shift by default.)";
                                sln.bydefault = true;
                                sln.action = shift;
                            } else if (production.precedence < op.precedence) {
                                sln.msg = "Resolve S/R conflict (shift for higher precedent operator.)";
                                sln.action = shift;
                            } else if (production.precedence === op.precedence) {
                                if (op.assoc === "right") {
                                    sln.msg = "Resolve S/R conflict (shift for right associative operator.)";
                                    sln.action = shift;
                                } else if (op.assoc === "left") {
                                    sln.msg = "Resolve S/R conflict (reduce for left associative operator.)";
                                    sln.action = reduce;
                                } else if (op.assoc === "nonassoc") {
                                    sln.msg = "Resolve S/R conflict (no action for non-associative operator.)";
                                    sln.action = NONASSOC;
                                }
                            } else {
                                sln.msg = "Resolve conflict (reduce for higher precedent production.)";
                                sln.action = reduce;
                            }
                            return sln;
                        }
                        lrGeneratorMixin.generate = function parser_generate(opt) {
                            opt = typal.mix.call({}, this.options, opt);
                            var code = "";
                            if (!opt.moduleName || !opt.moduleName.match(/^[A-Za-z_$][A-Za-z0-9_$]*$/)) {
                                opt.moduleName = "parser";
                            }
                            switch (opt.moduleType) {
                                case "js":
                                    code = this.generateModule(opt);
                                    break;
                                case "amd":
                                    code = this.generateAMDModule(opt);
                                    break;
                                default:
                                    code = this.generateCommonJSModule(opt);
                                    break;
                            }
                            return code;
                        };
                        lrGeneratorMixin.generateAMDModule = function generateAMDModule(opt) {
                            opt = typal.mix.call({}, this.options, opt);
                            var out =
                                "\n\ndefine([], function(){" +
                                "\nvar parser = " +
                                this.generateModule_(opt) +
                                "\n" +
                                this.moduleInclude +
                                (this.lexer && this.lexer.generateModule ? "\n" + this.lexer.generateModule() + "\nparser.lexer = lexer;" : "") +
                                "\nreturn parser;" +
                                "\n});";
                            return out;
                        };
                        lrGeneratorMixin.generateCommonJSModule = function generateCommonJSModule(opt) {
                            opt = typal.mix.call({}, this.options, opt);
                            var moduleName = opt.moduleName || "parser";
                            var out =
                                this.generateModule(opt) +
                                "\n\n\nif (typeof require !== 'undefined' && typeof exports !== 'undefined') {" +
                                "\nexports.parser = " +
                                moduleName +
                                ";" +
                                "\nexports.Parser = " +
                                moduleName +
                                ".Parser;" +
                                "\nexports.parse = function () { return " +
                                moduleName +
                                ".parse.apply(" +
                                moduleName +
                                ", arguments); };" +
                                "\nexports.main = " +
                                String(opt.moduleMain || commonjsMain) +
                                ";" +
                                "\nif (typeof module !== 'undefined' && require.main === module) {\n" +
                                "  exports.main(process.argv.slice(1));\n}" +
                                "\n}";
                            return out;
                        };
                        lrGeneratorMixin.generateModule = function generateModule(opt) {
                            opt = typal.mix.call({}, this.options, opt);
                            var moduleName = opt.moduleName || "parser";
                            var out =
                                "/* parser generated by jison " +
                                version +
                                " */\n" +
                                "/*\n" +
                                "  Returns a Parser object of the following structure:\n" +
                                "\n" +
                                "  Parser: {\n" +
                                "    yy: {}\n" +
                                "  }\n" +
                                "\n" +
                                "  Parser.prototype: {\n" +
                                "    yy: {},\n" +
                                "    trace: function(),\n" +
                                "    symbols_: {associative list: name ==> number},\n" +
                                "    terminals_: {associative list: number ==> name},\n" +
                                "    productions_: [...],\n" +
                                "    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),\n" +
                                "    table: [...],\n" +
                                "    defaultActions: {...},\n" +
                                "    parseError: function(str, hash),\n" +
                                "    parse: function(input),\n" +
                                "\n" +
                                "    lexer: {\n" +
                                "        EOF: 1,\n" +
                                "        parseError: function(str, hash),\n" +
                                "        setInput: function(input),\n" +
                                "        input: function(),\n" +
                                "        unput: function(str),\n" +
                                "        more: function(),\n" +
                                "        less: function(n),\n" +
                                "        pastInput: function(),\n" +
                                "        upcomingInput: function(),\n" +
                                "        showPosition: function(),\n" +
                                "        test_match: function(regex_match_array, rule_index),\n" +
                                "        next: function(),\n" +
                                "        lex: function(),\n" +
                                "        begin: function(condition),\n" +
                                "        popState: function(),\n" +
                                "        _currentRules: function(),\n" +
                                "        topState: function(),\n" +
                                "        pushState: function(condition),\n" +
                                "\n" +
                                "        options: {\n" +
                                "            ranges: boolean           (optional: true ==> token location info will include a .range[] member)\n" +
                                "            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)\n" +
                                "            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)\n" +
                                "        },\n" +
                                "\n" +
                                "        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),\n" +
                                "        rules: [...],\n" +
                                "        conditions: {associative list: name ==> set},\n" +
                                "    }\n" +
                                "  }\n" +
                                "\n" +
                                "\n" +
                                "  token location info (@$, _$, etc.): {\n" +
                                "    first_line: n,\n" +
                                "    last_line: n,\n" +
                                "    first_column: n,\n" +
                                "    last_column: n,\n" +
                                "    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)\n" +
                                "  }\n" +
                                "\n" +
                                "\n" +
                                "  the parseError function receives a 'hash' object with these members for lexer and parser errors: {\n" +
                                "    text:        (matched text)\n" +
                                "    token:       (the produced terminal token, if any)\n" +
                                "    line:        (yylineno)\n" +
                                "  }\n" +
                                "  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {\n" +
                                "    loc:         (yylloc)\n" +
                                "    expected:    (string describing the set of expected tokens)\n" +
                                "    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)\n" +
                                "  }\n" +
                                "*/\n";
                            out += (moduleName.match(/\./) ? moduleName : "var " + moduleName) + " = (function(){";
                            out += "\nvar parser = " + this.generateModule_();
                            out += "\n" + this.moduleInclude;
                            if (this.lexer && this.lexer.generateModule) {
                                out += this.lexer.generateModule();
                                out += "\nparser.lexer = lexer;";
                            }
                            out += "\nfunction Parser () {\n  this.yy = {};\n}\n" + "Parser.prototype = parser;" + "parser.Parser = Parser;" + "\nreturn new Parser;\n})();";
                            return out;
                        };
                        function removeErrorRecovery(fn) {
                            var parseFn = String(fn);
                            try {
                                var ast = esprima.parse(parseFn);
                                var labeled = JSONSelect.match(':has(:root > .label > .name:val("_handle_error"))', ast);
                                var reduced_code = labeled[0].body.consequent.body[3].consequent.body;
                                reduced_code[0] = labeled[0].body.consequent.body[1];
                                reduced_code[4].expression.arguments[1].properties.pop();
                                labeled[0].body.consequent.body = reduced_code;
                                return escodegen
                                    .generate(ast)
                                    .replace(/_handle_error:\s?/, "")
                                    .replace(/\\\\n/g, "\\n");
                            } catch (e) {
                                return parseFn;
                            }
                        }
                        lrGeneratorMixin.generateModule_ = function generateModule_() {
                            var parseFn = (this.hasErrorRecovery ? String : removeErrorRecovery)(parser.parse);
                            var out = "{";
                            out += [
                                "trace: " + String(this.trace || parser.trace),
                                "yy: {}",
                                "symbols_: " + JSON.stringify(this.symbols_),
                                "terminals_: " + JSON.stringify(this.terminals_).replace(/"([0-9]+)":/g, "$1:"),
                                "productions_: " + JSON.stringify(this.productions_),
                                "performAction: " + String(this.performAction),
                                "table: " + JSON.stringify(this.table).replace(/"([0-9]+)":/g, "$1:"),
                                "defaultActions: " + JSON.stringify(this.defaultActions).replace(/"([0-9]+)":/g, "$1:"),
                                "parseError: " + String(this.parseError || (this.hasErrorRecovery ? traceParseError : parser.parseError)),
                                "parse: " + parseFn,
                            ].join(",\n");
                            out += "};";
                            return out;
                        };
                        function commonjsMain(args) {
                            if (!args[1]) {
                                console.log("Usage: " + args[0] + " FILE");
                                process.exit(1);
                            }
                            var source = require("fs").readFileSync(require("path").normalize(args[1]), "utf8");
                            return exports.parser.parse(source);
                        }
                        function printAction(a, gen) {
                            var s = a[0] == 1 ? "shift token (then go to state " + a[1] + ")" : a[0] == 2 ? "reduce by rule: " + gen.productions[a[1]] : "accept";
                            return s;
                        }
                        var lrGeneratorDebug = {
                            beforeparseTable: function () {
                                this.trace("Building parse table.");
                            },
                            afterparseTable: function () {
                                var self = this;
                                if (this.conflicts > 0) {
                                    this.resolutions.forEach(function (r, i) {
                                        if (r[2].bydefault) {
                                            self.warn("Conflict at state: ", r[0], ", token: ", r[1], "\n  ", printAction(r[2].r, self), "\n  ", printAction(r[2].s, self));
                                        }
                                    });
                                    this.trace("\n" + this.conflicts + " Conflict(s) found in grammar.");
                                }
                                this.trace("Done.");
                            },
                            aftercanonicalCollection: function (states) {
                                var trace = this.trace;
                                trace("\nItem sets\n------");
                                states.forEach(function (state, i) {
                                    trace("\nitem set", i, "\n" + state.join("\n"), "\ntransitions -> ", JSON.stringify(state.edges));
                                });
                            },
                        };
                        var parser = typal.beget();
                        lrGeneratorMixin.createParser = function createParser() {
                            var p = parser.beget();
                            p.yy = {};
                            p.init(this);
                            if (this.hasErrorRecovery) {
                                p.parseError = traceParseError;
                                p.recover = true;
                            }
                            p.productions = this.productions;
                            var self = this;
                            function bind(method) {
                                return function () {
                                    self.lexer = p.lexer;
                                    return self[method].apply(self, arguments);
                                };
                            }
                            p.lexer = this.lexer;
                            p.generate = bind("generate");
                            p.generateAMDModule = bind("generateAMDModule");
                            p.generateModule = bind("generateModule");
                            p.generateCommonJSModule = bind("generateCommonJSModule");
                            p.Parser = function () {
                                return self.createParser();
                            };
                            return p;
                        };
                        parser.trace = generator.trace;
                        parser.warn = generator.warn;
                        parser.error = generator.error;
                        function traceParseError(err, hash) {
                            this.trace(err);
                        }
                        function parseError(str, hash) {
                            if (hash.recoverable) {
                                this.trace(str);
                            } else {
                                throw new Error(str);
                            }
                        }
                        parser.parseError = lrGeneratorMixin.parseError = parseError;
                        parser.parse = function parse(input) {
                            var self = this,
                                stack = [0],
                                vstack = [null],
                                lstack = [],
                                table = this.table,
                                yytext = "",
                                yylineno = 0,
                                yyleng = 0,
                                recovering = 0,
                                TERROR = 2,
                                EOF = 1;
                            var args = lstack.slice.call(arguments, 1);
                            this.lexer.setInput(input);
                            this.lexer.yy = this.yy;
                            this.yy.lexer = this.lexer;
                            this.yy.parser = this;
                            if (typeof this.lexer.yylloc == "undefined") {
                                this.lexer.yylloc = {};
                            }
                            var yyloc = this.lexer.yylloc;
                            lstack.push(yyloc);
                            var ranges = this.lexer.options && this.lexer.options.ranges;
                            if (typeof this.yy.parseError === "function") {
                                this.parseError = this.yy.parseError;
                            } else {
                                this.parseError = Object.getPrototypeOf(this).parseError;
                            }
                            function popStack(n) {
                                stack.length = stack.length - 2 * n;
                                vstack.length = vstack.length - n;
                                lstack.length = lstack.length - n;
                            }
                            function lex() {
                                var token;
                                token = self.lexer.lex() || EOF;
                                if (typeof token !== "number") {
                                    token = self.symbols_[token] || token;
                                }
                                return token;
                            }
                            var symbol,
                                preErrorSymbol,
                                state,
                                action,
                                a,
                                r,
                                yyval = {},
                                p,
                                len,
                                newState,
                                expected;
                            while (true) {
                                state = stack[stack.length - 1];
                                if (this.defaultActions[state]) {
                                    action = this.defaultActions[state];
                                } else {
                                    if (symbol === null || typeof symbol == "undefined") {
                                        symbol = lex();
                                    }
                                    action = table[state] && table[state][symbol];
                                }
                                _handle_error: if (typeof action === "undefined" || !action.length || !action[0]) {
                                    var error_rule_depth;
                                    var errStr = "";
                                    function locateNearestErrorRecoveryRule(state) {
                                        var stack_probe = stack.length - 1;
                                        var depth = 0;
                                        for (;;) {
                                            if (TERROR.toString() in table[state]) {
                                                return depth;
                                            }
                                            if (state === 0 || stack_probe < 2) {
                                                return false;
                                            }
                                            stack_probe -= 2;
                                            state = stack[stack_probe];
                                            ++depth;
                                        }
                                    }
                                    if (!recovering) {
                                        error_rule_depth = locateNearestErrorRecoveryRule(state);
                                        expected = [];
                                        for (p in table[state]) {
                                            if (this.terminals_[p] && p > TERROR) {
                                                expected.push("'" + this.terminals_[p] + "'");
                                            }
                                        }
                                        if (this.lexer.showPosition) {
                                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                                        } else {
                                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                                        }
                                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected, recoverable: error_rule_depth !== false });
                                    } else if (preErrorSymbol !== EOF) {
                                        error_rule_depth = locateNearestErrorRecoveryRule(state);
                                    }
                                    if (recovering == 3) {
                                        if (symbol === EOF || preErrorSymbol === EOF) {
                                            throw new Error(errStr || "Parsing halted while starting to recover from another error.");
                                        }
                                        yyleng = this.lexer.yyleng;
                                        yytext = this.lexer.yytext;
                                        yylineno = this.lexer.yylineno;
                                        yyloc = this.lexer.yylloc;
                                        symbol = lex();
                                    }
                                    if (error_rule_depth === false) {
                                        throw new Error(errStr || "Parsing halted. No suitable error recovery rule available.");
                                    }
                                    popStack(error_rule_depth);
                                    preErrorSymbol = symbol == TERROR ? null : symbol;
                                    symbol = TERROR;
                                    state = stack[stack.length - 1];
                                    action = table[state] && table[state][TERROR];
                                    recovering = 3;
                                }
                                if (action[0] instanceof Array && action.length > 1) {
                                    throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                                }
                                switch (action[0]) {
                                    case 1:
                                        stack.push(symbol);
                                        vstack.push(this.lexer.yytext);
                                        lstack.push(this.lexer.yylloc);
                                        stack.push(action[1]);
                                        symbol = null;
                                        if (!preErrorSymbol) {
                                            yyleng = this.lexer.yyleng;
                                            yytext = this.lexer.yytext;
                                            yylineno = this.lexer.yylineno;
                                            yyloc = this.lexer.yylloc;
                                            if (recovering > 0) {
                                                recovering--;
                                            }
                                        } else {
                                            symbol = preErrorSymbol;
                                            preErrorSymbol = null;
                                        }
                                        break;
                                    case 2:
                                        len = this.productions_[action[1]][1];
                                        yyval.$ = vstack[vstack.length - len];
                                        yyval._$ = {
                                            first_line: lstack[lstack.length - (len || 1)].first_line,
                                            last_line: lstack[lstack.length - 1].last_line,
                                            first_column: lstack[lstack.length - (len || 1)].first_column,
                                            last_column: lstack[lstack.length - 1].last_column,
                                        };
                                        if (ranges) {
                                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                                        }
                                        r = this.performAction.apply(yyval, [yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack].concat(args));
                                        if (typeof r !== "undefined") {
                                            return r;
                                        }
                                        if (len) {
                                            stack = stack.slice(0, -1 * len * 2);
                                            vstack = vstack.slice(0, -1 * len);
                                            lstack = lstack.slice(0, -1 * len);
                                        }
                                        stack.push(this.productions_[action[1]][0]);
                                        vstack.push(yyval.$);
                                        lstack.push(yyval._$);
                                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                                        stack.push(newState);
                                        break;
                                    case 3:
                                        return true;
                                }
                            }
                            return true;
                        };
                        parser.init = function parser_init(dict) {
                            this.table = dict.table;
                            this.defaultActions = dict.defaultActions;
                            this.performAction = dict.performAction;
                            this.productions_ = dict.productions_;
                            this.symbols_ = dict.symbols_;
                            this.terminals_ = dict.terminals_;
                        };
                        var lr0 = generator.beget(lookaheadMixin, lrGeneratorMixin, {
                            type: "LR(0)",
                            afterconstructor: function lr0_afterconstructor() {
                                this.buildTable();
                            },
                        });
                        var LR0Generator = (exports.LR0Generator = lr0.construct());
                        var lalr = generator.beget(lookaheadMixin, lrGeneratorMixin, {
                            type: "LALR(1)",
                            afterconstructor: function (grammar, options) {
                                if (this.DEBUG) this.mix(lrGeneratorDebug, lalrGeneratorDebug);
                                options = options || {};
                                this.states = this.canonicalCollection();
                                this.terms_ = {};
                                var newg = (this.newg = typal.beget(lookaheadMixin, {
                                    oldg: this,
                                    trace: this.trace,
                                    nterms_: {},
                                    DEBUG: false,
                                    go_: function (r, B) {
                                        r = r.split(":")[0];
                                        B = B.map(function (b) {
                                            return b.slice(b.indexOf(":") + 1);
                                        });
                                        return this.oldg.go(r, B);
                                    },
                                }));
                                newg.nonterminals = {};
                                newg.productions = [];
                                this.inadequateStates = [];
                                this.onDemandLookahead = options.onDemandLookahead || false;
                                this.buildNewGrammar();
                                newg.computeLookaheads();
                                this.unionLookaheads();
                                this.table = this.parseTable(this.states);
                                this.defaultActions = findDefaults(this.table);
                            },
                            lookAheads: function LALR_lookaheads(state, item) {
                                return !!this.onDemandLookahead && !state.inadequate ? this.terminals : item.follows;
                            },
                            go: function LALR_go(p, w) {
                                var q = parseInt(p, 10);
                                for (var i = 0; i < w.length; i++) {
                                    q = this.states.item(q).edges[w[i]] || q;
                                }
                                return q;
                            },
                            goPath: function LALR_goPath(p, w) {
                                var q = parseInt(p, 10),
                                    t,
                                    path = [];
                                for (var i = 0; i < w.length; i++) {
                                    t = w[i] ? q + ":" + w[i] : "";
                                    if (t) this.newg.nterms_[t] = q;
                                    path.push(t);
                                    q = this.states.item(q).edges[w[i]] || q;
                                    this.terms_[t] = w[i];
                                }
                                return { path: path, endState: q };
                            },
                            buildNewGrammar: function LALR_buildNewGrammar() {
                                var self = this,
                                    newg = this.newg;
                                this.states.forEach(function (state, i) {
                                    state.forEach(function (item) {
                                        if (item.dotPosition === 0) {
                                            var symbol = i + ":" + item.production.symbol;
                                            self.terms_[symbol] = item.production.symbol;
                                            newg.nterms_[symbol] = i;
                                            if (!newg.nonterminals[symbol]) newg.nonterminals[symbol] = new Nonterminal(symbol);
                                            var pathInfo = self.goPath(i, item.production.handle);
                                            var p = new Production(symbol, pathInfo.path, newg.productions.length);
                                            newg.productions.push(p);
                                            newg.nonterminals[symbol].productions.push(p);
                                            var handle = item.production.handle.join(" ");
                                            var goes = self.states.item(pathInfo.endState).goes;
                                            if (!goes[handle]) goes[handle] = [];
                                            goes[handle].push(symbol);
                                        }
                                    });
                                    if (state.inadequate) self.inadequateStates.push(i);
                                });
                            },
                            unionLookaheads: function LALR_unionLookaheads() {
                                var self = this,
                                    newg = this.newg,
                                    states = !!this.onDemandLookahead ? this.inadequateStates : this.states;
                                states.forEach(function union_states_forEach(i) {
                                    var state = typeof i === "number" ? self.states.item(i) : i,
                                        follows = [];
                                    if (state.reductions.length)
                                        state.reductions.forEach(function union_reduction_forEach(item) {
                                            var follows = {};
                                            for (var k = 0; k < item.follows.length; k++) {
                                                follows[item.follows[k]] = true;
                                            }
                                            state.goes[item.production.handle.join(" ")].forEach(function reduction_goes_forEach(symbol) {
                                                newg.nonterminals[symbol].follows.forEach(function goes_follows_forEach(symbol) {
                                                    var terminal = self.terms_[symbol];
                                                    if (!follows[terminal]) {
                                                        follows[terminal] = true;
                                                        item.follows.push(terminal);
                                                    }
                                                });
                                            });
                                        });
                                });
                            },
                        });
                        var LALRGenerator = (exports.LALRGenerator = lalr.construct());
                        var lalrGeneratorDebug = {
                            trace: function trace() {
                                Jison.print.apply(null, arguments);
                            },
                            beforebuildNewGrammar: function () {
                                this.trace(this.states.size() + " states.");
                                this.trace("Building lookahead grammar.");
                            },
                            beforeunionLookaheads: function () {
                                this.trace("Computing lookaheads.");
                            },
                        };
                        var lrLookaheadGenerator = generator.beget(lookaheadMixin, lrGeneratorMixin, {
                            afterconstructor: function lr_aftercontructor() {
                                this.computeLookaheads();
                                this.buildTable();
                            },
                        });
                        var SLRGenerator = (exports.SLRGenerator = lrLookaheadGenerator.construct({
                            type: "SLR(1)",
                            lookAheads: function SLR_lookAhead(state, item) {
                                return this.nonterminals[item.production.symbol].follows;
                            },
                        }));
                        var lr1 = lrLookaheadGenerator.beget({
                            type: "Canonical LR(1)",
                            lookAheads: function LR_lookAheads(state, item) {
                                return item.follows;
                            },
                            Item: lrGeneratorMixin.Item.prototype.construct({
                                afterconstructor: function () {
                                    this.id = this.production.id + "a" + this.dotPosition + "a" + this.follows.sort().join(",");
                                },
                                eq: function (e) {
                                    return e.id === this.id;
                                },
                            }),
                            closureOperation: function LR_ClosureOperation(itemSet) {
                                var closureSet = new this.ItemSet();
                                var self = this;
                                var set = itemSet,
                                    itemQueue,
                                    syms = {};
                                do {
                                    itemQueue = new Set();
                                    closureSet.concat(set);
                                    set.forEach(function (item) {
                                        var symbol = item.markedSymbol;
                                        var b, r;
                                        if (symbol && self.nonterminals[symbol]) {
                                            r = item.remainingHandle();
                                            b = self.first(item.remainingHandle());
                                            if (b.length === 0 || item.production.nullable || self.nullable(r)) {
                                                b = b.concat(item.follows);
                                            }
                                            self.nonterminals[symbol].productions.forEach(function (production) {
                                                var newItem = new self.Item(production, 0, b);
                                                if (!closureSet.contains(newItem) && !itemQueue.contains(newItem)) {
                                                    itemQueue.push(newItem);
                                                }
                                            });
                                        } else if (!symbol) {
                                            closureSet.reductions.push(item);
                                        }
                                    });
                                    set = itemQueue;
                                } while (!itemQueue.isEmpty());
                                return closureSet;
                            },
                        });
                        var LR1Generator = (exports.LR1Generator = lr1.construct());
                        var ll = generator.beget(lookaheadMixin, {
                            type: "LL(1)",
                            afterconstructor: function ll_aftercontructor() {
                                this.computeLookaheads();
                                this.table = this.parseTable(this.productions);
                            },
                            parseTable: function llParseTable(productions) {
                                var table = {},
                                    self = this;
                                productions.forEach(function (production, i) {
                                    var row = table[production.symbol] || {};
                                    var tokens = production.first;
                                    if (self.nullable(production.handle)) {
                                        Set.union(tokens, self.nonterminals[production.symbol].follows);
                                    }
                                    tokens.forEach(function (token) {
                                        if (row[token]) {
                                            row[token].push(i);
                                            self.conflicts++;
                                        } else {
                                            row[token] = [i];
                                        }
                                    });
                                    table[production.symbol] = row;
                                });
                                return table;
                            },
                        });
                        var LLGenerator = (exports.LLGenerator = ll.construct());
                        Jison.Generator = function Jison_Generator(g, options) {
                            var opt = typal.mix.call({}, g.options, options);
                            switch (opt.type) {
                                case "lr0":
                                    return new LR0Generator(g, opt);
                                case "slr":
                                    return new SLRGenerator(g, opt);
                                case "lr":
                                    return new LR1Generator(g, opt);
                                case "ll":
                                    return new LLGenerator(g, opt);
                                default:
                                    return new LALRGenerator(g, opt);
                            }
                        };
                        return function Parser(g, options) {
                            var gen = Jison.Generator(g, options);
                            return gen.createParser();
                        };
                    })();
                },
                { "../package.json": 30, "./util/set": 3, "./util/typal": 4, JSONSelect: 5, __browserify_process: 8, "ebnf-parser": 9, escodegen: 13, esprima: 26, fs: 6, "jison-lex": 28, path: 7 },
            ],
            3: [
                function (require, module, exports) {
                    var typal = require("./typal").typal;
                    var setMixin = {
                        constructor: function Set_constructor(set, raw) {
                            this._items = [];
                            if (set && set.constructor === Array) this._items = raw ? set : set.slice(0);
                            else if (arguments.length) this._items = [].slice.call(arguments, 0);
                        },
                        concat: function concat(setB) {
                            this._items.push.apply(this._items, setB._items || setB);
                            return this;
                        },
                        eq: function eq(set) {
                            return this._items.length === set._items.length && this.subset(set);
                        },
                        indexOf: function indexOf(item) {
                            if (item && item.eq) {
                                for (var k = 0; k < this._items.length; k++) if (item.eq(this._items[k])) return k;
                                return -1;
                            }
                            return this._items.indexOf(item);
                        },
                        union: function union(set) {
                            return new Set(this._items).concat(this.complement(set));
                        },
                        intersection: function intersection(set) {
                            return this.filter(function (elm) {
                                return set.contains(elm);
                            });
                        },
                        complement: function complement(set) {
                            var that = this;
                            return set.filter(function sub_complement(elm) {
                                return !that.contains(elm);
                            });
                        },
                        subset: function subset(set) {
                            var cont = true;
                            for (var i = 0; i < this._items.length && cont; i++) {
                                cont = cont && set.contains(this._items[i]);
                            }
                            return cont;
                        },
                        superset: function superset(set) {
                            return set.subset(this);
                        },
                        joinSet: function joinSet(set) {
                            return this.concat(this.complement(set));
                        },
                        contains: function contains(item) {
                            return this.indexOf(item) !== -1;
                        },
                        item: function item(v, val) {
                            return this._items[v];
                        },
                        i: function i(v, val) {
                            return this._items[v];
                        },
                        first: function first() {
                            return this._items[0];
                        },
                        last: function last() {
                            return this._items[this._items.length - 1];
                        },
                        size: function size() {
                            return this._items.length;
                        },
                        isEmpty: function isEmpty() {
                            return this._items.length === 0;
                        },
                        copy: function copy() {
                            return new Set(this._items);
                        },
                        toString: function toString() {
                            return this._items.toString();
                        },
                    };
                    "push shift unshift forEach some every join sort".split(" ").forEach(function (e, i) {
                        setMixin[e] = function () {
                            return Array.prototype[e].apply(this._items, arguments);
                        };
                        setMixin[e].name = e;
                    });
                    "filter slice map".split(" ").forEach(function (e, i) {
                        setMixin[e] = function () {
                            return new Set(Array.prototype[e].apply(this._items, arguments), true);
                        };
                        setMixin[e].name = e;
                    });
                    var Set = typal.construct(setMixin).mix({
                        union: function (a, b) {
                            var ar = {};
                            for (var k = a.length - 1; k >= 0; --k) {
                                ar[a[k]] = true;
                            }
                            for (var i = b.length - 1; i >= 0; --i) {
                                if (!ar[b[i]]) {
                                    a.push(b[i]);
                                }
                            }
                            return a;
                        },
                    });
                    if (typeof exports !== "undefined") exports.Set = Set;
                },
                { "./typal": 4 },
            ],
            4: [
                function (require, module, exports) {
                    var typal = (function () {
                        var create =
                            Object.create ||
                            function (o) {
                                function F() {}
                                F.prototype = o;
                                return new F();
                            };
                        var position = /^(before|after)/;
                        function layerMethod(k, fun) {
                            var pos = k.match(position)[0],
                                key = k.replace(position, ""),
                                prop = this[key];
                            if (pos === "after") {
                                this[key] = function () {
                                    var ret = prop.apply(this, arguments);
                                    var args = [].slice.call(arguments);
                                    args.splice(0, 0, ret);
                                    fun.apply(this, args);
                                    return ret;
                                };
                            } else if (pos === "before") {
                                this[key] = function () {
                                    fun.apply(this, arguments);
                                    var ret = prop.apply(this, arguments);
                                    return ret;
                                };
                            }
                        }
                        function typal_mix() {
                            var self = this;
                            for (var i = 0, o, k; i < arguments.length; i++) {
                                o = arguments[i];
                                if (!o) continue;
                                if (Object.prototype.hasOwnProperty.call(o, "constructor")) this.constructor = o.constructor;
                                if (Object.prototype.hasOwnProperty.call(o, "toString")) this.toString = o.toString;
                                for (k in o) {
                                    if (Object.prototype.hasOwnProperty.call(o, k)) {
                                        if (k.match(position) && typeof this[k.replace(position, "")] === "function") layerMethod.call(this, k, o[k]);
                                        else this[k] = o[k];
                                    }
                                }
                            }
                            return this;
                        }
                        return {
                            mix: typal_mix,
                            beget: function typal_beget() {
                                return arguments.length ? typal_mix.apply(create(this), arguments) : create(this);
                            },
                            construct: function typal_construct() {
                                var o = typal_mix.apply(create(this), arguments);
                                var constructor = o.constructor;
                                var Klass = (o.constructor = function () {
                                    return constructor.apply(this, arguments);
                                });
                                Klass.prototype = o;
                                Klass.mix = typal_mix;
                                return Klass;
                            },
                            constructor: function typal_constructor() {
                                return this;
                            },
                        };
                    })();
                    if (typeof exports !== "undefined") exports.typal = typal;
                },
                {},
            ],
            5: [
                function (require, module, exports) {
                    (function (exports) {
                        var toString = Object.prototype.toString;
                        function jsonParse(str) {
                            try {
                                if (JSON && JSON.parse) {
                                    return JSON.parse(str);
                                }
                                return new Function("return " + str)();
                            } catch (e) {
                                te("ijs", e.message);
                            }
                        }
                        var errorCodes = {
                            bop: "binary operator expected",
                            ee: "expression expected",
                            epex: "closing paren expected ')'",
                            ijs: "invalid json string",
                            mcp: "missing closing paren",
                            mepf: "malformed expression in pseudo-function",
                            mexp: "multiple expressions not allowed",
                            mpc: "multiple pseudo classes (:xxx) not allowed",
                            nmi: "multiple ids not allowed",
                            pex: "opening paren expected '('",
                            se: "selector expected",
                            sex: "string expected",
                            sra: "string required after '.'",
                            uc: "unrecognized char",
                            ucp: "unexpected closing paren",
                            ujs: "unclosed json string",
                            upc: "unrecognized pseudo class",
                        };
                        function te(ec, context) {
                            throw new Error(errorCodes[ec] + (context && " in '" + context + "'"));
                        }
                        var toks = { psc: 1, psf: 2, typ: 3, str: 4, ide: 5 };
                        var pat = new RegExp(
                            "^(?:" +
                                "([\\r\\n\\t\\ ]+)|" +
                                "([~*,>\\)\\(])|" +
                                "(string|boolean|null|array|object|number)|" +
                                "(:(?:root|first-child|last-child|only-child))|" +
                                "(:(?:nth-child|nth-last-child|has|expr|val|contains))|" +
                                "(:\\w+)|" +
                                '(?:(\\.)?(\\"(?:[^\\\\\\"]|\\\\[^\\"])*\\"))|' +
                                '(\\")|' +
                                "\\.((?:[_a-zA-Z]|[^\\0-\\0177]|\\\\[^\\r\\n\\f0-9a-fA-F])(?:[_a-zA-Z0-9\\-]|[^\\u0000-\\u0177]|(?:\\\\[^\\r\\n\\f0-9a-fA-F]))*)" +
                                ")"
                        );
                        var nthPat = /^\s*\(\s*(?:([+\-]?)([0-9]*)n\s*(?:([+\-])\s*([0-9]))?|(odd|even)|([+\-]?[0-9]+))\s*\)/;
                        function lex(str, off) {
                            if (!off) off = 0;
                            var m = pat.exec(str.substr(off));
                            if (!m) return undefined;
                            off += m[0].length;
                            var a;
                            if (m[1]) a = [off, " "];
                            else if (m[2]) a = [off, m[0]];
                            else if (m[3]) a = [off, toks.typ, m[0]];
                            else if (m[4]) a = [off, toks.psc, m[0]];
                            else if (m[5]) a = [off, toks.psf, m[0]];
                            else if (m[6]) te("upc", str);
                            else if (m[8]) a = [off, m[7] ? toks.ide : toks.str, jsonParse(m[8])];
                            else if (m[9]) te("ujs", str);
                            else if (m[10]) a = [off, toks.ide, m[10].replace(/\\([^\r\n\f0-9a-fA-F])/g, "$1")];
                            return a;
                        }
                        var exprPat = new RegExp("^\\s*(?:" + "(true|false|null)|" + "(-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)|" + '("(?:[^\\]|\\[^"])*")|' + "(x)|" + "(&&|\\|\\||[\\$\\^<>!\\*]=|[=+\\-*/%<>])|" + "([\\(\\)])" + ")");
                        function is(o, t) {
                            return typeof o === t;
                        }
                        var operators = {
                            "*": [
                                9,
                                function (lhs, rhs) {
                                    return lhs * rhs;
                                },
                            ],
                            "/": [
                                9,
                                function (lhs, rhs) {
                                    return lhs / rhs;
                                },
                            ],
                            "%": [
                                9,
                                function (lhs, rhs) {
                                    return lhs % rhs;
                                },
                            ],
                            "+": [
                                7,
                                function (lhs, rhs) {
                                    return lhs + rhs;
                                },
                            ],
                            "-": [
                                7,
                                function (lhs, rhs) {
                                    return lhs - rhs;
                                },
                            ],
                            "<=": [
                                5,
                                function (lhs, rhs) {
                                    return is(lhs, "number") && is(rhs, "number") && lhs <= rhs;
                                },
                            ],
                            ">=": [
                                5,
                                function (lhs, rhs) {
                                    return is(lhs, "number") && is(rhs, "number") && lhs >= rhs;
                                },
                            ],
                            "$=": [
                                5,
                                function (lhs, rhs) {
                                    return is(lhs, "string") && is(rhs, "string") && lhs.lastIndexOf(rhs) === lhs.length - rhs.length;
                                },
                            ],
                            "^=": [
                                5,
                                function (lhs, rhs) {
                                    return is(lhs, "string") && is(rhs, "string") && lhs.indexOf(rhs) === 0;
                                },
                            ],
                            "*=": [
                                5,
                                function (lhs, rhs) {
                                    return is(lhs, "string") && is(rhs, "string") && lhs.indexOf(rhs) !== -1;
                                },
                            ],
                            ">": [
                                5,
                                function (lhs, rhs) {
                                    return is(lhs, "number") && is(rhs, "number") && lhs > rhs;
                                },
                            ],
                            "<": [
                                5,
                                function (lhs, rhs) {
                                    return is(lhs, "number") && is(rhs, "number") && lhs < rhs;
                                },
                            ],
                            "=": [
                                3,
                                function (lhs, rhs) {
                                    return lhs === rhs;
                                },
                            ],
                            "!=": [
                                3,
                                function (lhs, rhs) {
                                    return lhs !== rhs;
                                },
                            ],
                            "&&": [
                                2,
                                function (lhs, rhs) {
                                    return lhs && rhs;
                                },
                            ],
                            "||": [
                                1,
                                function (lhs, rhs) {
                                    return lhs || rhs;
                                },
                            ],
                        };
                        function exprLex(str, off) {
                            var v,
                                m = exprPat.exec(str.substr(off));
                            if (m) {
                                off += m[0].length;
                                v = m[1] || m[2] || m[3] || m[5] || m[6];
                                if (m[1] || m[2] || m[3]) return [off, 0, jsonParse(v)];
                                else if (m[4]) return [off, 0, undefined];
                                return [off, v];
                            }
                        }
                        function exprParse2(str, off) {
                            if (!off) off = 0;
                            var l = exprLex(str, off),
                                lhs;
                            if (l && l[1] === "(") {
                                lhs = exprParse2(str, l[0]);
                                var p = exprLex(str, lhs[0]);
                                if (!p || p[1] !== ")") te("epex", str);
                                off = p[0];
                                lhs = ["(", lhs[1]];
                            } else if (!l || (l[1] && l[1] != "x")) {
                                te("ee", str + " - " + (l[1] && l[1]));
                            } else {
                                lhs = l[1] === "x" ? undefined : l[2];
                                off = l[0];
                            }
                            var op = exprLex(str, off);
                            if (!op || op[1] == ")") return [off, lhs];
                            else if (op[1] == "x" || !op[1]) {
                                te("bop", str + " - " + (op[1] && op[1]));
                            }
                            var rhs = exprParse2(str, op[0]);
                            off = rhs[0];
                            rhs = rhs[1];
                            var v;
                            if (typeof rhs !== "object" || rhs[0] === "(" || operators[op[1]][0] < operators[rhs[1]][0]) {
                                v = [lhs, op[1], rhs];
                            } else {
                                v = rhs;
                                while (typeof rhs[0] === "object" && rhs[0][0] != "(" && operators[op[1]][0] >= operators[rhs[0][1]][0]) {
                                    rhs = rhs[0];
                                }
                                rhs[0] = [lhs, op[1], rhs[0]];
                            }
                            return [off, v];
                        }
                        function exprParse(str, off) {
                            function deparen(v) {
                                if (typeof v !== "object" || v === null) return v;
                                else if (v[0] === "(") return deparen(v[1]);
                                else return [deparen(v[0]), v[1], deparen(v[2])];
                            }
                            var e = exprParse2(str, off ? off : 0);
                            return [e[0], deparen(e[1])];
                        }
                        function exprEval(expr, x) {
                            if (expr === undefined) return x;
                            else if (expr === null || typeof expr !== "object") {
                                return expr;
                            }
                            var lhs = exprEval(expr[0], x),
                                rhs = exprEval(expr[2], x);
                            return operators[expr[1]][1](lhs, rhs);
                        }
                        function parse(str, off, nested, hints) {
                            if (!nested) hints = {};
                            var a = [],
                                am,
                                readParen;
                            if (!off) off = 0;
                            while (true) {
                                var s = parse_selector(str, off, hints);
                                a.push(s[1]);
                                s = lex(str, (off = s[0]));
                                if (s && s[1] === " ") s = lex(str, (off = s[0]));
                                if (!s) break;
                                if (s[1] === ">" || s[1] === "~") {
                                    if (s[1] === "~") hints.usesSiblingOp = true;
                                    a.push(s[1]);
                                    off = s[0];
                                } else if (s[1] === ",") {
                                    if (am === undefined) am = [",", a];
                                    else am.push(a);
                                    a = [];
                                    off = s[0];
                                } else if (s[1] === ")") {
                                    if (!nested) te("ucp", s[1]);
                                    readParen = 1;
                                    off = s[0];
                                    break;
                                }
                            }
                            if (nested && !readParen) te("mcp", str);
                            if (am) am.push(a);
                            var rv;
                            if (!nested && hints.usesSiblingOp) {
                                rv = normalize(am ? am : a);
                            } else {
                                rv = am ? am : a;
                            }
                            return [off, rv];
                        }
                        function normalizeOne(sel) {
                            var sels = [],
                                s;
                            for (var i = 0; i < sel.length; i++) {
                                if (sel[i] === "~") {
                                    if (i < 2 || sel[i - 2] != ">") {
                                        s = sel.slice(0, i - 1);
                                        s = s.concat([{ has: [[{ pc: ":root" }, ">", sel[i - 1]]] }, ">"]);
                                        s = s.concat(sel.slice(i + 1));
                                        sels.push(s);
                                    }
                                    if (i > 1) {
                                        var at = sel[i - 2] === ">" ? i - 3 : i - 2;
                                        s = sel.slice(0, at);
                                        var z = {};
                                        for (var k in sel[at]) if (sel[at].hasOwnProperty(k)) z[k] = sel[at][k];
                                        if (!z.has) z.has = [];
                                        z.has.push([{ pc: ":root" }, ">", sel[i - 1]]);
                                        s = s.concat(z, ">", sel.slice(i + 1));
                                        sels.push(s);
                                    }
                                    break;
                                }
                            }
                            if (i == sel.length) return sel;
                            return sels.length > 1 ? [","].concat(sels) : sels[0];
                        }
                        function normalize(sels) {
                            if (sels[0] === ",") {
                                var r = [","];
                                for (var i = i; i < sels.length; i++) {
                                    var s = normalizeOne(s[i]);
                                    r = r.concat(s[0] === "," ? s.slice(1) : s);
                                }
                                return r;
                            } else {
                                return normalizeOne(sels);
                            }
                        }
                        function parse_selector(str, off, hints) {
                            var soff = off;
                            var s = {};
                            var l = lex(str, off);
                            if (l && l[1] === " ") {
                                soff = off = l[0];
                                l = lex(str, off);
                            }
                            if (l && l[1] === toks.typ) {
                                s.type = l[2];
                                l = lex(str, (off = l[0]));
                            } else if (l && l[1] === "*") {
                                l = lex(str, (off = l[0]));
                            }
                            while (true) {
                                if (l === undefined) {
                                    break;
                                } else if (l[1] === toks.ide) {
                                    if (s.id) te("nmi", l[1]);
                                    s.id = l[2];
                                } else if (l[1] === toks.psc) {
                                    if (s.pc || s.pf) te("mpc", l[1]);
                                    if (l[2] === ":first-child") {
                                        s.pf = ":nth-child";
                                        s.a = 0;
                                        s.b = 1;
                                    } else if (l[2] === ":last-child") {
                                        s.pf = ":nth-last-child";
                                        s.a = 0;
                                        s.b = 1;
                                    } else {
                                        s.pc = l[2];
                                    }
                                } else if (l[1] === toks.psf) {
                                    if (l[2] === ":val" || l[2] === ":contains") {
                                        s.expr = [undefined, l[2] === ":val" ? "=" : "*=", undefined];
                                        l = lex(str, (off = l[0]));
                                        if (l && l[1] === " ") l = lex(str, (off = l[0]));
                                        if (!l || l[1] !== "(") te("pex", str);
                                        l = lex(str, (off = l[0]));
                                        if (l && l[1] === " ") l = lex(str, (off = l[0]));
                                        if (!l || l[1] !== toks.str) te("sex", str);
                                        s.expr[2] = l[2];
                                        l = lex(str, (off = l[0]));
                                        if (l && l[1] === " ") l = lex(str, (off = l[0]));
                                        if (!l || l[1] !== ")") te("epex", str);
                                    } else if (l[2] === ":has") {
                                        l = lex(str, (off = l[0]));
                                        if (l && l[1] === " ") l = lex(str, (off = l[0]));
                                        if (!l || l[1] !== "(") te("pex", str);
                                        var h = parse(str, l[0], true);
                                        l[0] = h[0];
                                        if (!s.has) s.has = [];
                                        s.has.push(h[1]);
                                    } else if (l[2] === ":expr") {
                                        if (s.expr) te("mexp", str);
                                        var e = exprParse(str, l[0]);
                                        l[0] = e[0];
                                        s.expr = e[1];
                                    } else {
                                        if (s.pc || s.pf) te("mpc", str);
                                        s.pf = l[2];
                                        var m = nthPat.exec(str.substr(l[0]));
                                        if (!m) te("mepf", str);
                                        if (m[5]) {
                                            s.a = 2;
                                            s.b = m[5] === "odd" ? 1 : 0;
                                        } else if (m[6]) {
                                            s.a = 0;
                                            s.b = parseInt(m[6], 10);
                                        } else {
                                            s.a = parseInt((m[1] ? m[1] : "+") + (m[2] ? m[2] : "1"), 10);
                                            s.b = m[3] ? parseInt(m[3] + m[4], 10) : 0;
                                        }
                                        l[0] += m[0].length;
                                    }
                                } else {
                                    break;
                                }
                                l = lex(str, (off = l[0]));
                            }
                            if (soff === off) te("se", str);
                            return [off, s];
                        }
                        function isArray(o) {
                            return Array.isArray ? Array.isArray(o) : toString.call(o) === "[object Array]";
                        }
                        function mytypeof(o) {
                            if (o === null) return "null";
                            var to = typeof o;
                            if (to === "object" && isArray(o)) to = "array";
                            return to;
                        }
                        function mn(node, sel, id, num, tot) {
                            var sels = [];
                            var cs = sel[0] === ">" ? sel[1] : sel[0];
                            var m = true,
                                mod;
                            if (cs.type) m = m && cs.type === mytypeof(node);
                            if (cs.id) m = m && cs.id === id;
                            if (m && cs.pf) {
                                if (cs.pf === ":nth-last-child") num = tot - num;
                                else num++;
                                if (cs.a === 0) {
                                    m = cs.b === num;
                                } else {
                                    mod = (num - cs.b) % cs.a;
                                    m = !mod && num * cs.a + cs.b >= 0;
                                }
                            }
                            if (m && cs.has) {
                                var bail = function () {
                                    throw 42;
                                };
                                for (var i = 0; i < cs.has.length; i++) {
                                    try {
                                        forEach(cs.has[i], node, bail);
                                    } catch (e) {
                                        if (e === 42) continue;
                                    }
                                    m = false;
                                    break;
                                }
                            }
                            if (m && cs.expr) {
                                m = exprEval(cs.expr, node);
                            }
                            if (sel[0] !== ">" && sel[0].pc !== ":root") sels.push(sel);
                            if (m) {
                                if (sel[0] === ">") {
                                    if (sel.length > 2) {
                                        m = false;
                                        sels.push(sel.slice(2));
                                    }
                                } else if (sel.length > 1) {
                                    m = false;
                                    sels.push(sel.slice(1));
                                }
                            }
                            return [m, sels];
                        }
                        function forEach(sel, obj, fun, id, num, tot) {
                            var a = sel[0] === "," ? sel.slice(1) : [sel],
                                a0 = [],
                                call = false,
                                i = 0,
                                j = 0,
                                k,
                                x;
                            for (i = 0; i < a.length; i++) {
                                x = mn(obj, a[i], id, num, tot);
                                if (x[0]) {
                                    call = true;
                                }
                                for (j = 0; j < x[1].length; j++) {
                                    a0.push(x[1][j]);
                                }
                            }
                            if (a0.length && typeof obj === "object") {
                                if (a0.length >= 1) {
                                    a0.unshift(",");
                                }
                                if (isArray(obj)) {
                                    for (i = 0; i < obj.length; i++) {
                                        forEach(a0, obj[i], fun, undefined, i, obj.length);
                                    }
                                } else {
                                    for (k in obj) {
                                        if (obj.hasOwnProperty(k)) {
                                            forEach(a0, obj[k], fun, k);
                                        }
                                    }
                                }
                            }
                            if (call && fun) {
                                fun(obj);
                            }
                        }
                        function match(sel, obj) {
                            var a = [];
                            forEach(sel, obj, function (x) {
                                a.push(x);
                            });
                            return a;
                        }
                        function format(sel, arr) {
                            sel = sel.replace(/\?/g, function () {
                                if (arr.length === 0) throw "too few parameters given";
                                var p = arr.shift();
                                return typeof p === "string" ? JSON.stringify(p) : p;
                            });
                            if (arr.length) throw "too many parameters supplied";
                            return sel;
                        }
                        function compile(sel, arr) {
                            if (arr) sel = format(sel, arr);
                            return {
                                sel: parse(sel)[1],
                                match: function (obj) {
                                    return match(this.sel, obj);
                                },
                                forEach: function (obj, fun) {
                                    return forEach(this.sel, obj, fun);
                                },
                            };
                        }
                        exports._lex = lex;
                        exports._parse = parse;
                        exports.match = function (sel, arr, obj) {
                            if (!obj) {
                                obj = arr;
                                arr = undefined;
                            }
                            return compile(sel, arr).match(obj);
                        };
                        exports.forEach = function (sel, arr, obj, fun) {
                            if (!fun) {
                                fun = obj;
                                obj = arr;
                                arr = undefined;
                            }
                            return compile(sel, arr).forEach(obj, fun);
                        };
                        exports.compile = compile;
                    })(typeof exports === "undefined" ? (window.JSONSelect = {}) : exports);
                },
                {},
            ],
            6: [function (require, module, exports) {}, {}],
            7: [
                function (require, module, exports) {
                    var process = require("__browserify_process");
                    function filter(xs, fn) {
                        var res = [];
                        for (var i = 0; i < xs.length; i++) {
                            if (fn(xs[i], i, xs)) res.push(xs[i]);
                        }
                        return res;
                    }
                    function normalizeArray(parts, allowAboveRoot) {
                        var up = 0;
                        for (var i = parts.length; i >= 0; i--) {
                            var last = parts[i];
                            if (last == ".") {
                                parts.splice(i, 1);
                            } else if (last === "..") {
                                parts.splice(i, 1);
                                up++;
                            } else if (up) {
                                parts.splice(i, 1);
                                up--;
                            }
                        }
                        if (allowAboveRoot) {
                            for (; up--; up) {
                                parts.unshift("..");
                            }
                        }
                        return parts;
                    }
                    var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;
                    exports.resolve = function () {
                        var resolvedPath = "",
                            resolvedAbsolute = false;
                        for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
                            var path = i >= 0 ? arguments[i] : process.cwd();
                            if (typeof path !== "string" || !path) {
                                continue;
                            }
                            resolvedPath = path + "/" + resolvedPath;
                            resolvedAbsolute = path.charAt(0) === "/";
                        }
                        resolvedPath = normalizeArray(
                            filter(resolvedPath.split("/"), function (p) {
                                return !!p;
                            }),
                            !resolvedAbsolute
                        ).join("/");
                        return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
                    };
                    exports.normalize = function (path) {
                        var isAbsolute = path.charAt(0) === "/",
                            trailingSlash = path.slice(-1) === "/";
                        path = normalizeArray(
                            filter(path.split("/"), function (p) {
                                return !!p;
                            }),
                            !isAbsolute
                        ).join("/");
                        if (!path && !isAbsolute) {
                            path = ".";
                        }
                        if (path && trailingSlash) {
                            path += "/";
                        }
                        return (isAbsolute ? "/" : "") + path;
                    };
                    exports.join = function () {
                        var paths = Array.prototype.slice.call(arguments, 0);
                        return exports.normalize(
                            filter(paths, function (p, index) {
                                return p && typeof p === "string";
                            }).join("/")
                        );
                    };
                    exports.dirname = function (path) {
                        var dir = splitPathRe.exec(path)[1] || "";
                        var isWindows = false;
                        if (!dir) {
                            return ".";
                        } else if (dir.length === 1 || (isWindows && dir.length <= 3 && dir.charAt(1) === ":")) {
                            return dir;
                        } else {
                            return dir.substring(0, dir.length - 1);
                        }
                    };
                    exports.basename = function (path, ext) {
                        var f = splitPathRe.exec(path)[2] || "";
                        if (ext && f.substr(-1 * ext.length) === ext) {
                            f = f.substr(0, f.length - ext.length);
                        }
                        return f;
                    };
                    exports.extname = function (path) {
                        return splitPathRe.exec(path)[3] || "";
                    };
                    exports.relative = function (from, to) {
                        from = exports.resolve(from).substr(1);
                        to = exports.resolve(to).substr(1);
                        function trim(arr) {
                            var start = 0;
                            for (; start < arr.length; start++) {
                                if (arr[start] !== "") break;
                            }
                            var end = arr.length - 1;
                            for (; end >= 0; end--) {
                                if (arr[end] !== "") break;
                            }
                            if (start > end) return [];
                            return arr.slice(start, end - start + 1);
                        }
                        var fromParts = trim(from.split("/"));
                        var toParts = trim(to.split("/"));
                        var length = Math.min(fromParts.length, toParts.length);
                        var samePartsLength = length;
                        for (var i = 0; i < length; i++) {
                            if (fromParts[i] !== toParts[i]) {
                                samePartsLength = i;
                                break;
                            }
                        }
                        var outputParts = [];
                        for (var i = samePartsLength; i < fromParts.length; i++) {
                            outputParts.push("..");
                        }
                        outputParts = outputParts.concat(toParts.slice(samePartsLength));
                        return outputParts.join("/");
                    };
                    exports.sep = "/";
                },
                { __browserify_process: 8 },
            ],
            8: [
                function (require, module, exports) {
                    var process = (module.exports = {});
                    process.nextTick = (function () {
                        var canSetImmediate;                                                    // skullquake
                        if(typeof(GOJA)!='undefined')                                           // . <- modified tests
                            canSetImmediate=false;                                              // .
                        else                                                                    // .
                            canSetImmediate=typeof window!=="undefined"&&window.setImmediate;   // .
                        var canPost;                                                            // skullquake
                        if(typeof(GOJA)!='undefined')                                           // . <- modified tests
                            canPost=false;                                                      // .
                        else                                                                    // .
                            canPost = typeof window !== "undefined" && window.postMessage && window.addEventListener;
                        if (canSetImmediate) {
                            return function (f) {
                                return window.setImmediate(f);
                            };
                        }
                        if (canPost) {
                            var queue = [];
                            window.addEventListener(
                                "message",
                                function (ev) {
                                    if (ev.source === window && ev.data === "process-tick") {
                                        ev.stopPropagation();
                                        if (queue.length > 0) {
                                            var fn = queue.shift();
                                            fn();
                                        }
                                    }
                                },
                                true
                            );
                            return function nextTick(fn) {
                                queue.push(fn);
                                window.postMessage("process-tick", "*");
                            };
                        }
                        return function nextTick(fn) {
                            setTimeout(fn, 0);
                        };
                    })();
                    process.title = "browser";
                    process.browser = true;
                    process.env = {};
                    process.argv = [];
                    process.binding = function (name) {
                        throw new Error("process.binding is not supported");
                    };
                    process.cwd = function () {
                        return "/";
                    };
                    process.chdir = function (dir) {
                        throw new Error("process.chdir is not supported");
                    };
                },
                {},
            ],
            9: [
                function (require, module, exports) {
                    var bnf = require("./parser").parser,
                        ebnf = require("./ebnf-transform"),
                        jisonlex = require("lex-parser");
                    exports.parse = function parse(grammar) {
                        return bnf.parse(grammar);
                    };
                    exports.transform = ebnf.transform;
                    bnf.yy.addDeclaration = function (grammar, decl) {
                        if (decl.start) {
                            grammar.start = decl.start;
                        } else if (decl.lex) {
                            grammar.lex = parseLex(decl.lex);
                        } else if (decl.operator) {
                            if (!grammar.operators) {
                                grammar.operators = [];
                            }
                            grammar.operators.push(decl.operator);
                        } else if (decl.parseParam) {
                            if (!grammar.parseParams) {
                                grammar.parseParams = [];
                            }
                            grammar.parseParams = grammar.parseParams.concat(decl.parseParam);
                        } else if (decl.include) {
                            if (!grammar.moduleInclude) grammar.moduleInclude = "";
                            grammar.moduleInclude += decl.include;
                        }
                    };
                    var parseLex = function (text) {
                        return jisonlex.parse(text.replace(/(?:^%lex)|(?:\/lex$)/g, ""));
                    };
                },
                { "./ebnf-transform": 10, "./parser": 11, "lex-parser": 29 },
            ],
            10: [
                function (require, module, exports) {
                    var EBNF = (function () {
                        var parser = require("./transform-parser.js");
                        var transformExpression = function (e, opts, emit) {
                            var type = e[0],
                                value = e[1],
                                name = false;
                            if (type === "xalias") {
                                type = e[1];
                                value = e[2];
                                name = e[3];
                                if (type) {
                                    e = e.slice(1, 2);
                                } else {
                                    e = value;
                                    type = e[0];
                                    value = e[1];
                                }
                            }
                            if (type === "symbol") {
                                var n;
                                if (e[1][0] === "\\") n = e[1][1];
                                else if (e[1][0] === "'") n = e[1].substring(1, e[1].length - 1);
                                else n = e[1];
                                emit(n + (name ? "[" + name + "]" : ""));
                            } else if (type === "+") {
                                if (!name) {
                                    name = opts.production + "_repetition_plus" + opts.repid++;
                                }
                                emit(name);
                                opts = optsForProduction(name, opts.grammar);
                                var list = transformExpressionList([value], opts);
                                opts.grammar[name] = [
                                    [list, "$$ = [$1];"],
                                    [name + " " + list, "$1.push($2);"],
                                ];
                            } else if (type === "*") {
                                if (!name) {
                                    name = opts.production + "_repetition" + opts.repid++;
                                }
                                emit(name);
                                opts = optsForProduction(name, opts.grammar);
                                opts.grammar[name] = [
                                    ["", "$$ = [];"],
                                    [name + " " + transformExpressionList([value], opts), "$1.push($2);"],
                                ];
                            } else if (type === "?") {
                                if (!name) {
                                    name = opts.production + "_option" + opts.optid++;
                                }
                                emit(name);
                                opts = optsForProduction(name, opts.grammar);
                                opts.grammar[name] = ["", transformExpressionList([value], opts)];
                            } else if (type === "()") {
                                if (value.length == 1) {
                                    emit(transformExpressionList(value[0], opts));
                                } else {
                                    if (!name) {
                                        name = opts.production + "_group" + opts.groupid++;
                                    }
                                    emit(name);
                                    opts = optsForProduction(name, opts.grammar);
                                    opts.grammar[name] = value.map(function (handle) {
                                        return transformExpressionList(handle, opts);
                                    });
                                }
                            }
                        };
                        var transformExpressionList = function (list, opts) {
                            return list
                                .reduce(function (tot, e) {
                                    transformExpression(e, opts, function (i) {
                                        tot.push(i);
                                    });
                                    return tot;
                                }, [])
                                .join(" ");
                        };
                        var optsForProduction = function (id, grammar) {
                            return { production: id, repid: 0, groupid: 0, optid: 0, grammar: grammar };
                        };
                        var transformProduction = function (id, production, grammar) {
                            var transform_opts = optsForProduction(id, grammar);
                            return production.map(function (handle) {
                                var action = null,
                                    opts = null;
                                if (typeof handle !== "string") (action = handle[1]), (opts = handle[2]), (handle = handle[0]);
                                var expressions = parser.parse(handle);
                                handle = transformExpressionList(expressions, transform_opts);
                                var ret = [handle];
                                if (action) ret.push(action);
                                if (opts) ret.push(opts);
                                if (ret.length == 1) return ret[0];
                                else return ret;
                            });
                        };
                        var transformGrammar = function (grammar) {
                            Object.keys(grammar).forEach(function (id) {
                                grammar[id] = transformProduction(id, grammar[id], grammar);
                            });
                        };
                        return {
                            transform: function (ebnf) {
                                transformGrammar(ebnf);
                                return ebnf;
                            },
                        };
                    })();
                    exports.transform = EBNF.transform;
                },
                { "./transform-parser.js": 12 },
            ],
            11: [
                function (require, module, exports) {
                    var process = require("__browserify_process");
                    var bnf = (function () {
                        var parser = {
                            trace: function trace() {},
                            yy: {},
                            symbols_: {
                                error: 2,
                                spec: 3,
                                declaration_list: 4,
                                "%%": 5,
                                grammar: 6,
                                optional_end_block: 7,
                                EOF: 8,
                                CODE: 9,
                                declaration: 10,
                                START: 11,
                                id: 12,
                                LEX_BLOCK: 13,
                                operator: 14,
                                ACTION: 15,
                                parse_param: 16,
                                PARSE_PARAM: 17,
                                token_list: 18,
                                associativity: 19,
                                LEFT: 20,
                                RIGHT: 21,
                                NONASSOC: 22,
                                symbol: 23,
                                production_list: 24,
                                production: 25,
                                ":": 26,
                                handle_list: 27,
                                ";": 28,
                                "|": 29,
                                handle_action: 30,
                                handle: 31,
                                prec: 32,
                                action: 33,
                                expression_suffix: 34,
                                handle_sublist: 35,
                                expression: 36,
                                suffix: 37,
                                ALIAS: 38,
                                ID: 39,
                                STRING: 40,
                                "(": 41,
                                ")": 42,
                                "*": 43,
                                "?": 44,
                                "+": 45,
                                PREC: 46,
                                "{": 47,
                                action_body: 48,
                                "}": 49,
                                ARROW_ACTION: 50,
                                action_comments_body: 51,
                                ACTION_BODY: 52,
                                $accept: 0,
                                $end: 1,
                            },
                            terminals_: {
                                2: "error",
                                5: "%%",
                                8: "EOF",
                                9: "CODE",
                                11: "START",
                                13: "LEX_BLOCK",
                                15: "ACTION",
                                17: "PARSE_PARAM",
                                20: "LEFT",
                                21: "RIGHT",
                                22: "NONASSOC",
                                26: ":",
                                28: ";",
                                29: "|",
                                38: "ALIAS",
                                39: "ID",
                                40: "STRING",
                                41: "(",
                                42: ")",
                                43: "*",
                                44: "?",
                                45: "+",
                                46: "PREC",
                                47: "{",
                                49: "}",
                                50: "ARROW_ACTION",
                                52: "ACTION_BODY",
                            },
                            productions_: [
                                0,
                                [3, 5],
                                [3, 6],
                                [7, 0],
                                [7, 1],
                                [4, 2],
                                [4, 0],
                                [10, 2],
                                [10, 1],
                                [10, 1],
                                [10, 1],
                                [10, 1],
                                [16, 2],
                                [14, 2],
                                [19, 1],
                                [19, 1],
                                [19, 1],
                                [18, 2],
                                [18, 1],
                                [6, 1],
                                [24, 2],
                                [24, 1],
                                [25, 4],
                                [27, 3],
                                [27, 1],
                                [30, 3],
                                [31, 2],
                                [31, 0],
                                [35, 3],
                                [35, 1],
                                [34, 3],
                                [34, 2],
                                [36, 1],
                                [36, 1],
                                [36, 3],
                                [37, 0],
                                [37, 1],
                                [37, 1],
                                [37, 1],
                                [32, 2],
                                [32, 0],
                                [23, 1],
                                [23, 1],
                                [12, 1],
                                [33, 3],
                                [33, 1],
                                [33, 1],
                                [33, 0],
                                [48, 0],
                                [48, 1],
                                [48, 5],
                                [48, 4],
                                [51, 1],
                                [51, 2],
                            ],
                            performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
                                var $0 = $$.length - 1;
                                switch (yystate) {
                                    case 1:
                                        this.$ = $$[$0 - 4];
                                        return extend(this.$, $$[$0 - 2]);
                                        break;
                                    case 2:
                                        this.$ = $$[$0 - 5];
                                        yy.addDeclaration(this.$, { include: $$[$0 - 1] });
                                        return extend(this.$, $$[$0 - 3]);
                                        break;
                                    case 5:
                                        this.$ = $$[$0 - 1];
                                        yy.addDeclaration(this.$, $$[$0]);
                                        break;
                                    case 6:
                                        this.$ = {};
                                        break;
                                    case 7:
                                        this.$ = { start: $$[$0] };
                                        break;
                                    case 8:
                                        this.$ = { lex: $$[$0] };
                                        break;
                                    case 9:
                                        this.$ = { operator: $$[$0] };
                                        break;
                                    case 10:
                                        this.$ = { include: $$[$0] };
                                        break;
                                    case 11:
                                        this.$ = { parseParam: $$[$0] };
                                        break;
                                    case 12:
                                        this.$ = $$[$0];
                                        break;
                                    case 13:
                                        this.$ = [$$[$0 - 1]];
                                        this.$.push.apply(this.$, $$[$0]);
                                        break;
                                    case 14:
                                        this.$ = "left";
                                        break;
                                    case 15:
                                        this.$ = "right";
                                        break;
                                    case 16:
                                        this.$ = "nonassoc";
                                        break;
                                    case 17:
                                        this.$ = $$[$0 - 1];
                                        this.$.push($$[$0]);
                                        break;
                                    case 18:
                                        this.$ = [$$[$0]];
                                        break;
                                    case 19:
                                        this.$ = $$[$0];
                                        break;
                                    case 20:
                                        this.$ = $$[$0 - 1];
                                        if ($$[$0][0] in this.$) this.$[$$[$0][0]] = this.$[$$[$0][0]].concat($$[$0][1]);
                                        else this.$[$$[$0][0]] = $$[$0][1];
                                        break;
                                    case 21:
                                        this.$ = {};
                                        this.$[$$[$0][0]] = $$[$0][1];
                                        break;
                                    case 22:
                                        this.$ = [$$[$0 - 3], $$[$0 - 1]];
                                        break;
                                    case 23:
                                        this.$ = $$[$0 - 2];
                                        this.$.push($$[$0]);
                                        break;
                                    case 24:
                                        this.$ = [$$[$0]];
                                        break;
                                    case 25:
                                        this.$ = [$$[$0 - 2].length ? $$[$0 - 2].join(" ") : ""];
                                        if ($$[$0]) this.$.push($$[$0]);
                                        if ($$[$0 - 1]) this.$.push($$[$0 - 1]);
                                        if (this.$.length === 1) this.$ = this.$[0];
                                        break;
                                    case 26:
                                        this.$ = $$[$0 - 1];
                                        this.$.push($$[$0]);
                                        break;
                                    case 27:
                                        this.$ = [];
                                        break;
                                    case 28:
                                        this.$ = $$[$0 - 2];
                                        this.$.push($$[$0].join(" "));
                                        break;
                                    case 29:
                                        this.$ = [$$[$0].join(" ")];
                                        break;
                                    case 30:
                                        this.$ = $$[$0 - 2] + $$[$0 - 1] + "[" + $$[$0] + "]";
                                        break;
                                    case 31:
                                        this.$ = $$[$0 - 1] + $$[$0];
                                        break;
                                    case 32:
                                        this.$ = $$[$0];
                                        break;
                                    case 33:
                                        this.$ = ebnf ? "'" + $$[$0] + "'" : $$[$0];
                                        break;
                                    case 34:
                                        this.$ = "(" + $$[$0 - 1].join(" | ") + ")";
                                        break;
                                    case 35:
                                        this.$ = "";
                                        break;
                                    case 39:
                                        this.$ = { prec: $$[$0] };
                                        break;
                                    case 40:
                                        this.$ = null;
                                        break;
                                    case 41:
                                        this.$ = $$[$0];
                                        break;
                                    case 42:
                                        this.$ = yytext;
                                        break;
                                    case 43:
                                        this.$ = yytext;
                                        break;
                                    case 44:
                                        this.$ = $$[$0 - 1];
                                        break;
                                    case 45:
                                        this.$ = $$[$0];
                                        break;
                                    case 46:
                                        this.$ = "$$ =" + $$[$0] + ";";
                                        break;
                                    case 47:
                                        this.$ = "";
                                        break;
                                    case 48:
                                        this.$ = "";
                                        break;
                                    case 49:
                                        this.$ = $$[$0];
                                        break;
                                    case 50:
                                        this.$ = $$[$0 - 4] + $$[$0 - 3] + $$[$0 - 2] + $$[$0 - 1] + $$[$0];
                                        break;
                                    case 51:
                                        this.$ = $$[$0 - 3] + $$[$0 - 2] + $$[$0 - 1] + $$[$0];
                                        break;
                                    case 52:
                                        this.$ = yytext;
                                        break;
                                    case 53:
                                        this.$ = $$[$0 - 1] + $$[$0];
                                        break;
                                }
                            },
                            table: [
                                { 3: 1, 4: 2, 5: [2, 6], 11: [2, 6], 13: [2, 6], 15: [2, 6], 17: [2, 6], 20: [2, 6], 21: [2, 6], 22: [2, 6] },
                                { 1: [3] },
                                { 5: [1, 3], 10: 4, 11: [1, 5], 13: [1, 6], 14: 7, 15: [1, 8], 16: 9, 17: [1, 11], 19: 10, 20: [1, 12], 21: [1, 13], 22: [1, 14] },
                                { 6: 15, 12: 18, 24: 16, 25: 17, 39: [1, 19] },
                                { 5: [2, 5], 11: [2, 5], 13: [2, 5], 15: [2, 5], 17: [2, 5], 20: [2, 5], 21: [2, 5], 22: [2, 5] },
                                { 12: 20, 39: [1, 19] },
                                { 5: [2, 8], 11: [2, 8], 13: [2, 8], 15: [2, 8], 17: [2, 8], 20: [2, 8], 21: [2, 8], 22: [2, 8] },
                                { 5: [2, 9], 11: [2, 9], 13: [2, 9], 15: [2, 9], 17: [2, 9], 20: [2, 9], 21: [2, 9], 22: [2, 9] },
                                { 5: [2, 10], 11: [2, 10], 13: [2, 10], 15: [2, 10], 17: [2, 10], 20: [2, 10], 21: [2, 10], 22: [2, 10] },
                                { 5: [2, 11], 11: [2, 11], 13: [2, 11], 15: [2, 11], 17: [2, 11], 20: [2, 11], 21: [2, 11], 22: [2, 11] },
                                { 12: 23, 18: 21, 23: 22, 39: [1, 19], 40: [1, 24] },
                                { 12: 23, 18: 25, 23: 22, 39: [1, 19], 40: [1, 24] },
                                { 39: [2, 14], 40: [2, 14] },
                                { 39: [2, 15], 40: [2, 15] },
                                { 39: [2, 16], 40: [2, 16] },
                                { 5: [1, 27], 7: 26, 8: [2, 3] },
                                { 5: [2, 19], 8: [2, 19], 12: 18, 25: 28, 39: [1, 19] },
                                { 5: [2, 21], 8: [2, 21], 39: [2, 21] },
                                { 26: [1, 29] },
                                { 5: [2, 43], 11: [2, 43], 13: [2, 43], 15: [2, 43], 17: [2, 43], 20: [2, 43], 21: [2, 43], 22: [2, 43], 26: [2, 43], 28: [2, 43], 29: [2, 43], 39: [2, 43], 40: [2, 43], 47: [2, 43], 50: [2, 43] },
                                { 5: [2, 7], 11: [2, 7], 13: [2, 7], 15: [2, 7], 17: [2, 7], 20: [2, 7], 21: [2, 7], 22: [2, 7] },
                                { 5: [2, 13], 11: [2, 13], 12: 23, 13: [2, 13], 15: [2, 13], 17: [2, 13], 20: [2, 13], 21: [2, 13], 22: [2, 13], 23: 30, 39: [1, 19], 40: [1, 24] },
                                { 5: [2, 18], 11: [2, 18], 13: [2, 18], 15: [2, 18], 17: [2, 18], 20: [2, 18], 21: [2, 18], 22: [2, 18], 39: [2, 18], 40: [2, 18] },
                                { 5: [2, 41], 11: [2, 41], 13: [2, 41], 15: [2, 41], 17: [2, 41], 20: [2, 41], 21: [2, 41], 22: [2, 41], 28: [2, 41], 29: [2, 41], 39: [2, 41], 40: [2, 41], 47: [2, 41], 50: [2, 41] },
                                { 5: [2, 42], 11: [2, 42], 13: [2, 42], 15: [2, 42], 17: [2, 42], 20: [2, 42], 21: [2, 42], 22: [2, 42], 28: [2, 42], 29: [2, 42], 39: [2, 42], 40: [2, 42], 47: [2, 42], 50: [2, 42] },
                                { 5: [2, 12], 11: [2, 12], 12: 23, 13: [2, 12], 15: [2, 12], 17: [2, 12], 20: [2, 12], 21: [2, 12], 22: [2, 12], 23: 30, 39: [1, 19], 40: [1, 24] },
                                { 8: [1, 31] },
                                { 8: [2, 4], 9: [1, 32] },
                                { 5: [2, 20], 8: [2, 20], 39: [2, 20] },
                                { 15: [2, 27], 27: 33, 28: [2, 27], 29: [2, 27], 30: 34, 31: 35, 39: [2, 27], 40: [2, 27], 41: [2, 27], 46: [2, 27], 47: [2, 27], 50: [2, 27] },
                                { 5: [2, 17], 11: [2, 17], 13: [2, 17], 15: [2, 17], 17: [2, 17], 20: [2, 17], 21: [2, 17], 22: [2, 17], 39: [2, 17], 40: [2, 17] },
                                { 1: [2, 1] },
                                { 8: [1, 36] },
                                { 28: [1, 37], 29: [1, 38] },
                                { 28: [2, 24], 29: [2, 24] },
                                { 15: [2, 40], 28: [2, 40], 29: [2, 40], 32: 39, 34: 40, 36: 42, 39: [1, 43], 40: [1, 44], 41: [1, 45], 46: [1, 41], 47: [2, 40], 50: [2, 40] },
                                { 1: [2, 2] },
                                { 5: [2, 22], 8: [2, 22], 39: [2, 22] },
                                { 15: [2, 27], 28: [2, 27], 29: [2, 27], 30: 46, 31: 35, 39: [2, 27], 40: [2, 27], 41: [2, 27], 46: [2, 27], 47: [2, 27], 50: [2, 27] },
                                { 15: [1, 49], 28: [2, 47], 29: [2, 47], 33: 47, 47: [1, 48], 50: [1, 50] },
                                { 15: [2, 26], 28: [2, 26], 29: [2, 26], 39: [2, 26], 40: [2, 26], 41: [2, 26], 42: [2, 26], 46: [2, 26], 47: [2, 26], 50: [2, 26] },
                                { 12: 23, 23: 51, 39: [1, 19], 40: [1, 24] },
                                { 15: [2, 35], 28: [2, 35], 29: [2, 35], 37: 52, 38: [2, 35], 39: [2, 35], 40: [2, 35], 41: [2, 35], 42: [2, 35], 43: [1, 53], 44: [1, 54], 45: [1, 55], 46: [2, 35], 47: [2, 35], 50: [2, 35] },
                                { 15: [2, 32], 28: [2, 32], 29: [2, 32], 38: [2, 32], 39: [2, 32], 40: [2, 32], 41: [2, 32], 42: [2, 32], 43: [2, 32], 44: [2, 32], 45: [2, 32], 46: [2, 32], 47: [2, 32], 50: [2, 32] },
                                { 15: [2, 33], 28: [2, 33], 29: [2, 33], 38: [2, 33], 39: [2, 33], 40: [2, 33], 41: [2, 33], 42: [2, 33], 43: [2, 33], 44: [2, 33], 45: [2, 33], 46: [2, 33], 47: [2, 33], 50: [2, 33] },
                                { 29: [2, 27], 31: 57, 35: 56, 39: [2, 27], 40: [2, 27], 41: [2, 27], 42: [2, 27] },
                                { 28: [2, 23], 29: [2, 23] },
                                { 28: [2, 25], 29: [2, 25] },
                                { 47: [2, 48], 48: 58, 49: [2, 48], 51: 59, 52: [1, 60] },
                                { 28: [2, 45], 29: [2, 45] },
                                { 28: [2, 46], 29: [2, 46] },
                                { 15: [2, 39], 28: [2, 39], 29: [2, 39], 47: [2, 39], 50: [2, 39] },
                                { 15: [2, 31], 28: [2, 31], 29: [2, 31], 38: [1, 61], 39: [2, 31], 40: [2, 31], 41: [2, 31], 42: [2, 31], 46: [2, 31], 47: [2, 31], 50: [2, 31] },
                                { 15: [2, 36], 28: [2, 36], 29: [2, 36], 38: [2, 36], 39: [2, 36], 40: [2, 36], 41: [2, 36], 42: [2, 36], 46: [2, 36], 47: [2, 36], 50: [2, 36] },
                                { 15: [2, 37], 28: [2, 37], 29: [2, 37], 38: [2, 37], 39: [2, 37], 40: [2, 37], 41: [2, 37], 42: [2, 37], 46: [2, 37], 47: [2, 37], 50: [2, 37] },
                                { 15: [2, 38], 28: [2, 38], 29: [2, 38], 38: [2, 38], 39: [2, 38], 40: [2, 38], 41: [2, 38], 42: [2, 38], 46: [2, 38], 47: [2, 38], 50: [2, 38] },
                                { 29: [1, 63], 42: [1, 62] },
                                { 29: [2, 29], 34: 40, 36: 42, 39: [1, 43], 40: [1, 44], 41: [1, 45], 42: [2, 29] },
                                { 47: [1, 65], 49: [1, 64] },
                                { 47: [2, 49], 49: [2, 49], 52: [1, 66] },
                                { 47: [2, 52], 49: [2, 52], 52: [2, 52] },
                                { 15: [2, 30], 28: [2, 30], 29: [2, 30], 39: [2, 30], 40: [2, 30], 41: [2, 30], 42: [2, 30], 46: [2, 30], 47: [2, 30], 50: [2, 30] },
                                { 15: [2, 34], 28: [2, 34], 29: [2, 34], 38: [2, 34], 39: [2, 34], 40: [2, 34], 41: [2, 34], 42: [2, 34], 43: [2, 34], 44: [2, 34], 45: [2, 34], 46: [2, 34], 47: [2, 34], 50: [2, 34] },
                                { 29: [2, 27], 31: 67, 39: [2, 27], 40: [2, 27], 41: [2, 27], 42: [2, 27] },
                                { 28: [2, 44], 29: [2, 44] },
                                { 47: [2, 48], 48: 68, 49: [2, 48], 51: 59, 52: [1, 60] },
                                { 47: [2, 53], 49: [2, 53], 52: [2, 53] },
                                { 29: [2, 28], 34: 40, 36: 42, 39: [1, 43], 40: [1, 44], 41: [1, 45], 42: [2, 28] },
                                { 47: [1, 65], 49: [1, 69] },
                                { 47: [2, 51], 49: [2, 51], 51: 70, 52: [1, 60] },
                                { 47: [2, 50], 49: [2, 50], 52: [1, 66] },
                            ],
                            defaultActions: { 31: [2, 1], 36: [2, 2] },
                            parseError: function parseError(str, hash) {
                                if (hash.recoverable) {
                                    this.trace(str);
                                } else {
                                    throw new Error(str);
                                }
                            },
                            parse: function parse(input) {
                                var self = this,
                                    stack = [0],
                                    vstack = [null],
                                    lstack = [],
                                    table = this.table,
                                    yytext = "",
                                    yylineno = 0,
                                    yyleng = 0,
                                    recovering = 0,
                                    TERROR = 2,
                                    EOF = 1;
                                var args = lstack.slice.call(arguments, 1);
                                this.lexer.setInput(input);
                                this.lexer.yy = this.yy;
                                this.yy.lexer = this.lexer;
                                this.yy.parser = this;
                                if (typeof this.lexer.yylloc == "undefined") {
                                    this.lexer.yylloc = {};
                                }
                                var yyloc = this.lexer.yylloc;
                                lstack.push(yyloc);
                                var ranges = this.lexer.options && this.lexer.options.ranges;
                                if (typeof this.yy.parseError === "function") {
                                    this.parseError = this.yy.parseError;
                                } else {
                                    this.parseError = Object.getPrototypeOf(this).parseError;
                                }
                                function popStack(n) {
                                    stack.length = stack.length - 2 * n;
                                    vstack.length = vstack.length - n;
                                    lstack.length = lstack.length - n;
                                }
                                function lex() {
                                    var token;
                                    token = self.lexer.lex() || EOF;
                                    if (typeof token !== "number") {
                                        token = self.symbols_[token] || token;
                                    }
                                    return token;
                                }
                                var symbol,
                                    preErrorSymbol,
                                    state,
                                    action,
                                    a,
                                    r,
                                    yyval = {},
                                    p,
                                    len,
                                    newState,
                                    expected;
                                while (true) {
                                    state = stack[stack.length - 1];
                                    if (this.defaultActions[state]) {
                                        action = this.defaultActions[state];
                                    } else {
                                        if (symbol === null || typeof symbol == "undefined") {
                                            symbol = lex();
                                        }
                                        action = table[state] && table[state][symbol];
                                    }
                                    if (typeof action === "undefined" || !action.length || !action[0]) {
                                        var errStr = "";
                                        expected = [];
                                        for (p in table[state]) {
                                            if (this.terminals_[p] && p > TERROR) {
                                                expected.push("'" + this.terminals_[p] + "'");
                                            }
                                        }
                                        if (this.lexer.showPosition) {
                                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                                        } else {
                                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                                        }
                                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                                    }
                                    if (action[0] instanceof Array && action.length > 1) {
                                        throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                                    }
                                    switch (action[0]) {
                                        case 1:
                                            stack.push(symbol);
                                            vstack.push(this.lexer.yytext);
                                            lstack.push(this.lexer.yylloc);
                                            stack.push(action[1]);
                                            symbol = null;
                                            if (!preErrorSymbol) {
                                                yyleng = this.lexer.yyleng;
                                                yytext = this.lexer.yytext;
                                                yylineno = this.lexer.yylineno;
                                                yyloc = this.lexer.yylloc;
                                                if (recovering > 0) {
                                                    recovering--;
                                                }
                                            } else {
                                                symbol = preErrorSymbol;
                                                preErrorSymbol = null;
                                            }
                                            break;
                                        case 2:
                                            len = this.productions_[action[1]][1];
                                            yyval.$ = vstack[vstack.length - len];
                                            yyval._$ = {
                                                first_line: lstack[lstack.length - (len || 1)].first_line,
                                                last_line: lstack[lstack.length - 1].last_line,
                                                first_column: lstack[lstack.length - (len || 1)].first_column,
                                                last_column: lstack[lstack.length - 1].last_column,
                                            };
                                            if (ranges) {
                                                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                                            }
                                            r = this.performAction.apply(yyval, [yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack].concat(args));
                                            if (typeof r !== "undefined") {
                                                return r;
                                            }
                                            if (len) {
                                                stack = stack.slice(0, -1 * len * 2);
                                                vstack = vstack.slice(0, -1 * len);
                                                lstack = lstack.slice(0, -1 * len);
                                            }
                                            stack.push(this.productions_[action[1]][0]);
                                            vstack.push(yyval.$);
                                            lstack.push(yyval._$);
                                            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                                            stack.push(newState);
                                            break;
                                        case 3:
                                            return true;
                                    }
                                }
                                return true;
                            },
                        };
                        var transform = require("./ebnf-transform").transform;
                        var ebnf = false;
                        function extend(json, grammar) {
                            json.bnf = ebnf ? transform(grammar) : grammar;
                            return json;
                        }
                        var lexer = (function () {
                            var lexer = {
                                EOF: 1,
                                parseError: function parseError(str, hash) {
                                    if (this.yy.parser) {
                                        this.yy.parser.parseError(str, hash);
                                    } else {
                                        throw new Error(str);
                                    }
                                },
                                setInput: function (input) {
                                    this._input = input;
                                    this._more = this._backtrack = this.done = false;
                                    this.yylineno = this.yyleng = 0;
                                    this.yytext = this.matched = this.match = "";
                                    this.conditionStack = ["INITIAL"];
                                    this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                                    if (this.options.ranges) {
                                        this.yylloc.range = [0, 0];
                                    }
                                    this.offset = 0;
                                    return this;
                                },
                                input: function () {
                                    var ch = this._input[0];
                                    this.yytext += ch;
                                    this.yyleng++;
                                    this.offset++;
                                    this.match += ch;
                                    this.matched += ch;
                                    var lines = ch.match(/(?:\r\n?|\n).*/g);
                                    if (lines) {
                                        this.yylineno++;
                                        this.yylloc.last_line++;
                                    } else {
                                        this.yylloc.last_column++;
                                    }
                                    if (this.options.ranges) {
                                        this.yylloc.range[1]++;
                                    }
                                    this._input = this._input.slice(1);
                                    return ch;
                                },
                                unput: function (ch) {
                                    var len = ch.length;
                                    var lines = ch.split(/(?:\r\n?|\n)/g);
                                    this._input = ch + this._input;
                                    this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                                    this.offset -= len;
                                    var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                                    this.match = this.match.substr(0, this.match.length - 1);
                                    this.matched = this.matched.substr(0, this.matched.length - 1);
                                    if (lines.length - 1) {
                                        this.yylineno -= lines.length - 1;
                                    }
                                    var r = this.yylloc.range;
                                    this.yylloc = {
                                        first_line: this.yylloc.first_line,
                                        last_line: this.yylineno + 1,
                                        first_column: this.yylloc.first_column,
                                        last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len,
                                    };
                                    if (this.options.ranges) {
                                        this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                                    }
                                    this.yyleng = this.yytext.length;
                                    return this;
                                },
                                more: function () {
                                    this._more = true;
                                    return this;
                                },
                                reject: function () {
                                    if (this.options.backtrack_lexer) {
                                        this._backtrack = true;
                                    } else {
                                        return this.parseError(
                                            "Lexical error on line " +
                                                (this.yylineno + 1) +
                                                ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" +
                                                this.showPosition(),
                                            { text: "", token: null, line: this.yylineno }
                                        );
                                    }
                                    return this;
                                },
                                less: function (n) {
                                    this.unput(this.match.slice(n));
                                },
                                pastInput: function () {
                                    var past = this.matched.substr(0, this.matched.length - this.match.length);
                                    return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
                                },
                                upcomingInput: function () {
                                    var next = this.match;
                                    if (next.length < 20) {
                                        next += this._input.substr(0, 20 - next.length);
                                    }
                                    return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
                                },
                                showPosition: function () {
                                    var pre = this.pastInput();
                                    var c = new Array(pre.length + 1).join("-");
                                    return pre + this.upcomingInput() + "\n" + c + "^";
                                },
                                test_match: function (match, indexed_rule) {
                                    var token, lines, backup;
                                    if (this.options.backtrack_lexer) {
                                        backup = {
                                            yylineno: this.yylineno,
                                            yylloc: { first_line: this.yylloc.first_line, last_line: this.last_line, first_column: this.yylloc.first_column, last_column: this.yylloc.last_column },
                                            yytext: this.yytext,
                                            match: this.match,
                                            matches: this.matches,
                                            matched: this.matched,
                                            yyleng: this.yyleng,
                                            offset: this.offset,
                                            _more: this._more,
                                            _input: this._input,
                                            yy: this.yy,
                                            conditionStack: this.conditionStack.slice(0),
                                            done: this.done,
                                        };
                                        if (this.options.ranges) {
                                            backup.yylloc.range = this.yylloc.range.slice(0);
                                        }
                                    }
                                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                                    if (lines) {
                                        this.yylineno += lines.length;
                                    }
                                    this.yylloc = {
                                        first_line: this.yylloc.last_line,
                                        last_line: this.yylineno + 1,
                                        first_column: this.yylloc.last_column,
                                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length,
                                    };
                                    this.yytext += match[0];
                                    this.match += match[0];
                                    this.matches = match;
                                    this.yyleng = this.yytext.length;
                                    if (this.options.ranges) {
                                        this.yylloc.range = [this.offset, (this.offset += this.yyleng)];
                                    }
                                    this._more = false;
                                    this._backtrack = false;
                                    this._input = this._input.slice(match[0].length);
                                    this.matched += match[0];
                                    token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
                                    if (this.done && this._input) {
                                        this.done = false;
                                    }
                                    if (token) {
                                        return token;
                                    } else if (this._backtrack) {
                                        for (var k in backup) {
                                            this[k] = backup[k];
                                        }
                                        return false;
                                    }
                                    return false;
                                },
                                next: function () {
                                    if (this.done) {
                                        return this.EOF;
                                    }
                                    if (!this._input) {
                                        this.done = true;
                                    }
                                    var token, match, tempMatch, index;
                                    if (!this._more) {
                                        this.yytext = "";
                                        this.match = "";
                                    }
                                    var rules = this._currentRules();
                                    for (var i = 0; i < rules.length; i++) {
                                        tempMatch = this._input.match(this.rules[rules[i]]);
                                        if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                                            match = tempMatch;
                                            index = i;
                                            if (this.options.backtrack_lexer) {
                                                token = this.test_match(tempMatch, rules[i]);
                                                if (token !== false) {
                                                    return token;
                                                } else if (this._backtrack) {
                                                    match = false;
                                                    continue;
                                                } else {
                                                    return false;
                                                }
                                            } else if (!this.options.flex) {
                                                break;
                                            }
                                        }
                                    }
                                    if (match) {
                                        token = this.test_match(match, rules[index]);
                                        if (token !== false) {
                                            return token;
                                        }
                                        return false;
                                    }
                                    if (this._input === "") {
                                        return this.EOF;
                                    } else {
                                        return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
                                    }
                                },
                                lex: function lex() {
                                    var r = this.next();
                                    if (r) {
                                        return r;
                                    } else {
                                        return this.lex();
                                    }
                                },
                                begin: function begin(condition) {
                                    this.conditionStack.push(condition);
                                },
                                popState: function popState() {
                                    var n = this.conditionStack.length - 1;
                                    if (n > 0) {
                                        return this.conditionStack.pop();
                                    } else {
                                        return this.conditionStack[0];
                                    }
                                },
                                _currentRules: function _currentRules() {
                                    if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
                                        return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
                                    } else {
                                        return this.conditions["INITIAL"].rules;
                                    }
                                },
                                topState: function topState(n) {
                                    n = this.conditionStack.length - 1 - Math.abs(n || 0);
                                    if (n >= 0) {
                                        return this.conditionStack[n];
                                    } else {
                                        return "INITIAL";
                                    }
                                },
                                pushState: function pushState(condition) {
                                    this.begin(condition);
                                },
                                stateStackSize: function stateStackSize() {
                                    return this.conditionStack.length;
                                },
                                options: {},
                                performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
                                    var YYSTATE = YY_START;
                                    switch ($avoiding_name_collisions) {
                                        case 0:
                                            this.pushState("code");
                                            return 5;
                                            break;
                                        case 1:
                                            return 41;
                                            break;
                                        case 2:
                                            return 42;
                                            break;
                                        case 3:
                                            return 43;
                                            break;
                                        case 4:
                                            return 44;
                                            break;
                                        case 5:
                                            return 45;
                                            break;
                                        case 6:
                                            break;
                                        case 7:
                                            break;
                                        case 8:
                                            break;
                                        case 9:
                                            yy_.yytext = yy_.yytext.substr(1, yy_.yyleng - 2);
                                            return 38;
                                            break;
                                        case 10:
                                            return 39;
                                            break;
                                        case 11:
                                            yy_.yytext = yy_.yytext.substr(1, yy_.yyleng - 2);
                                            return 40;
                                            break;
                                        case 12:
                                            yy_.yytext = yy_.yytext.substr(1, yy_.yyleng - 2);
                                            return 40;
                                            break;
                                        case 13:
                                            return 26;
                                            break;
                                        case 14:
                                            return 28;
                                            break;
                                        case 15:
                                            return 29;
                                            break;
                                        case 16:
                                            this.pushState(ebnf ? "ebnf" : "bnf");
                                            return 5;
                                            break;
                                        case 17:
                                            if (!yy.options) yy.options = {};
                                            ebnf = yy.options.ebnf = true;
                                            break;
                                        case 18:
                                            return 46;
                                            break;
                                        case 19:
                                            return 11;
                                            break;
                                        case 20:
                                            return 20;
                                            break;
                                        case 21:
                                            return 21;
                                            break;
                                        case 22:
                                            return 22;
                                            break;
                                        case 23:
                                            return 17;
                                            break;
                                        case 24:
                                            return 13;
                                            break;
                                        case 25:
                                            break;
                                        case 26:
                                            break;
                                        case 27:
                                            yy_.yytext = yy_.yytext.substr(2, yy_.yyleng - 4);
                                            return 15;
                                            break;
                                        case 28:
                                            yy_.yytext = yy_.yytext.substr(2, yy_.yytext.length - 4);
                                            return 15;
                                            break;
                                        case 29:
                                            yy.depth = 0;
                                            this.pushState("action");
                                            return 47;
                                            break;
                                        case 30:
                                            yy_.yytext = yy_.yytext.substr(2, yy_.yyleng - 2);
                                            return 50;
                                            break;
                                        case 31:
                                            break;
                                        case 32:
                                            return 8;
                                            break;
                                        case 33:
                                            return 52;
                                            break;
                                        case 34:
                                            return 52;
                                            break;
                                        case 35:
                                            return 52;
                                            break;
                                        case 36:
                                            return 52;
                                            break;
                                        case 37:
                                            return 52;
                                            break;
                                        case 38:
                                            return 52;
                                            break;
                                        case 39:
                                            return 52;
                                            break;
                                        case 40:
                                            yy.depth++;
                                            return 47;
                                            break;
                                        case 41:
                                            if (yy.depth == 0) this.begin(ebnf ? "ebnf" : "bnf");
                                            else yy.depth--;
                                            return 49;
                                            break;
                                        case 42:
                                            return 9;
                                            break;
                                    }
                                },
                                rules: [
                                    /^(?:%%)/,
                                    /^(?:\()/,
                                    /^(?:\))/,
                                    /^(?:\*)/,
                                    /^(?:\?)/,
                                    /^(?:\+)/,
                                    /^(?:\s+)/,
                                    /^(?:\/\/.*)/,
                                    /^(?:\/\*(.|\n|\r)*?\*\/)/,
                                    /^(?:\[([a-zA-Z][a-zA-Z0-9_-]*)\])/,
                                    /^(?:([a-zA-Z][a-zA-Z0-9_-]*))/,
                                    /^(?:"[^"]+")/,
                                    /^(?:'[^']+')/,
                                    /^(?::)/,
                                    /^(?:;)/,
                                    /^(?:\|)/,
                                    /^(?:%%)/,
                                    /^(?:%ebnf\b)/,
                                    /^(?:%prec\b)/,
                                    /^(?:%start\b)/,
                                    /^(?:%left\b)/,
                                    /^(?:%right\b)/,
                                    /^(?:%nonassoc\b)/,
                                    /^(?:%parse-param\b)/,
                                    /^(?:%lex[\w\W]*?\/lex\b)/,
                                    /^(?:%[a-zA-Z]+[^\r\n]*)/,
                                    /^(?:<[a-zA-Z]*>)/,
                                    /^(?:\{\{[\w\W]*?\}\})/,
                                    /^(?:%\{(.|\r|\n)*?%\})/,
                                    /^(?:\{)/,
                                    /^(?:->.*)/,
                                    /^(?:.)/,
                                    /^(?:$)/,
                                    /^(?:\/\*(.|\n|\r)*?\*\/)/,
                                    /^(?:\/\/.*)/,
                                    /^(?:\/[^ /]*?['"{}'][^ ]*?\/)/,
                                    /^(?:"(\\\\|\\"|[^"])*")/,
                                    /^(?:'(\\\\|\\'|[^'])*')/,
                                    /^(?:[/"'][^{}/"']+)/,
                                    /^(?:[^{}/"']+)/,
                                    /^(?:\{)/,
                                    /^(?:\})/,
                                    /^(?:(.|\n|\r)+)/,
                                ],
                                conditions: {
                                    bnf: { rules: [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], inclusive: true },
                                    ebnf: { rules: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], inclusive: true },
                                    action: { rules: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41], inclusive: false },
                                    code: { rules: [32, 42], inclusive: false },
                                    INITIAL: { rules: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32], inclusive: true },
                                },
                            };
                            return lexer;
                        })();
                        parser.lexer = lexer;
                        function Parser() {
                            this.yy = {};
                        }
                        Parser.prototype = parser;
                        parser.Parser = Parser;
                        return new Parser();
                    })();
                    if (typeof require !== "undefined" && typeof exports !== "undefined") {
                        exports.parser = bnf;
                        exports.Parser = bnf.Parser;
                        exports.parse = function () {
                            return bnf.parse.apply(bnf, arguments);
                        };
                        exports.main = function commonjsMain(args) {
                            if (!args[1]) {
                                console.log("Usage: " + args[0] + " FILE");
                                process.exit(1);
                            }
                            var source = require("fs").readFileSync(require("path").normalize(args[1]), "utf8");
                            return exports.parser.parse(source);
                        };
                        if (typeof module !== "undefined" && require.main === module) {
                            exports.main(process.argv.slice(1));
                        }
                    }
                },
                { "./ebnf-transform": 10, __browserify_process: 8, fs: 6, path: 7 },
            ],
            12: [
                function (require, module, exports) {
                    var process = require("__browserify_process");
                    var ebnf = (function () {
                        var parser = {
                            trace: function trace() {},
                            yy: {},
                            symbols_: {
                                error: 2,
                                production: 3,
                                handle: 4,
                                EOF: 5,
                                handle_list: 6,
                                "|": 7,
                                expression_suffix: 8,
                                expression: 9,
                                suffix: 10,
                                ALIAS: 11,
                                symbol: 12,
                                "(": 13,
                                ")": 14,
                                "*": 15,
                                "?": 16,
                                "+": 17,
                                $accept: 0,
                                $end: 1,
                            },
                            terminals_: { 2: "error", 5: "EOF", 7: "|", 11: "ALIAS", 12: "symbol", 13: "(", 14: ")", 15: "*", 16: "?", 17: "+" },
                            productions_: [0, [3, 2], [6, 1], [6, 3], [4, 0], [4, 2], [8, 3], [8, 2], [9, 1], [9, 3], [10, 0], [10, 1], [10, 1], [10, 1]],
                            performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
                                var $0 = $$.length - 1;
                                switch (yystate) {
                                    case 1:
                                        return $$[$0 - 1];
                                        break;
                                    case 2:
                                        this.$ = [$$[$0]];
                                        break;
                                    case 3:
                                        $$[$0 - 2].push($$[$0]);
                                        break;
                                    case 4:
                                        this.$ = [];
                                        break;
                                    case 5:
                                        $$[$0 - 1].push($$[$0]);
                                        break;
                                    case 6:
                                        this.$ = ["xalias", $$[$0 - 1], $$[$0 - 2], $$[$0]];
                                        break;
                                    case 7:
                                        if ($$[$0]) this.$ = [$$[$0], $$[$0 - 1]];
                                        else this.$ = $$[$0 - 1];
                                        break;
                                    case 8:
                                        this.$ = ["symbol", $$[$0]];
                                        break;
                                    case 9:
                                        this.$ = ["()", $$[$0 - 1]];
                                        break;
                                }
                            },
                            table: [
                                { 3: 1, 4: 2, 5: [2, 4], 12: [2, 4], 13: [2, 4] },
                                { 1: [3] },
                                { 5: [1, 3], 8: 4, 9: 5, 12: [1, 6], 13: [1, 7] },
                                { 1: [2, 1] },
                                { 5: [2, 5], 7: [2, 5], 12: [2, 5], 13: [2, 5], 14: [2, 5] },
                                { 5: [2, 10], 7: [2, 10], 10: 8, 11: [2, 10], 12: [2, 10], 13: [2, 10], 14: [2, 10], 15: [1, 9], 16: [1, 10], 17: [1, 11] },
                                { 5: [2, 8], 7: [2, 8], 11: [2, 8], 12: [2, 8], 13: [2, 8], 14: [2, 8], 15: [2, 8], 16: [2, 8], 17: [2, 8] },
                                { 4: 13, 6: 12, 7: [2, 4], 12: [2, 4], 13: [2, 4], 14: [2, 4] },
                                { 5: [2, 7], 7: [2, 7], 11: [1, 14], 12: [2, 7], 13: [2, 7], 14: [2, 7] },
                                { 5: [2, 11], 7: [2, 11], 11: [2, 11], 12: [2, 11], 13: [2, 11], 14: [2, 11] },
                                { 5: [2, 12], 7: [2, 12], 11: [2, 12], 12: [2, 12], 13: [2, 12], 14: [2, 12] },
                                { 5: [2, 13], 7: [2, 13], 11: [2, 13], 12: [2, 13], 13: [2, 13], 14: [2, 13] },
                                { 7: [1, 16], 14: [1, 15] },
                                { 7: [2, 2], 8: 4, 9: 5, 12: [1, 6], 13: [1, 7], 14: [2, 2] },
                                { 5: [2, 6], 7: [2, 6], 12: [2, 6], 13: [2, 6], 14: [2, 6] },
                                { 5: [2, 9], 7: [2, 9], 11: [2, 9], 12: [2, 9], 13: [2, 9], 14: [2, 9], 15: [2, 9], 16: [2, 9], 17: [2, 9] },
                                { 4: 17, 7: [2, 4], 12: [2, 4], 13: [2, 4], 14: [2, 4] },
                                { 7: [2, 3], 8: 4, 9: 5, 12: [1, 6], 13: [1, 7], 14: [2, 3] },
                            ],
                            defaultActions: { 3: [2, 1] },
                            parseError: function parseError(str, hash) {
                                if (hash.recoverable) {
                                    this.trace(str);
                                } else {
                                    throw new Error(str);
                                }
                            },
                            parse: function parse(input) {
                                var self = this,
                                    stack = [0],
                                    vstack = [null],
                                    lstack = [],
                                    table = this.table,
                                    yytext = "",
                                    yylineno = 0,
                                    yyleng = 0,
                                    recovering = 0,
                                    TERROR = 2,
                                    EOF = 1;
                                var args = lstack.slice.call(arguments, 1);
                                this.lexer.setInput(input);
                                this.lexer.yy = this.yy;
                                this.yy.lexer = this.lexer;
                                this.yy.parser = this;
                                if (typeof this.lexer.yylloc == "undefined") {
                                    this.lexer.yylloc = {};
                                }
                                var yyloc = this.lexer.yylloc;
                                lstack.push(yyloc);
                                var ranges = this.lexer.options && this.lexer.options.ranges;
                                if (typeof this.yy.parseError === "function") {
                                    this.parseError = this.yy.parseError;
                                } else {
                                    this.parseError = Object.getPrototypeOf(this).parseError;
                                }
                                function popStack(n) {
                                    stack.length = stack.length - 2 * n;
                                    vstack.length = vstack.length - n;
                                    lstack.length = lstack.length - n;
                                }
                                function lex() {
                                    var token;
                                    token = self.lexer.lex() || EOF;
                                    if (typeof token !== "number") {
                                        token = self.symbols_[token] || token;
                                    }
                                    return token;
                                }
                                var symbol,
                                    preErrorSymbol,
                                    state,
                                    action,
                                    a,
                                    r,
                                    yyval = {},
                                    p,
                                    len,
                                    newState,
                                    expected;
                                while (true) {
                                    state = stack[stack.length - 1];
                                    if (this.defaultActions[state]) {
                                        action = this.defaultActions[state];
                                    } else {
                                        if (symbol === null || typeof symbol == "undefined") {
                                            symbol = lex();
                                        }
                                        action = table[state] && table[state][symbol];
                                    }
                                    if (typeof action === "undefined" || !action.length || !action[0]) {
                                        var errStr = "";
                                        expected = [];
                                        for (p in table[state]) {
                                            if (this.terminals_[p] && p > TERROR) {
                                                expected.push("'" + this.terminals_[p] + "'");
                                            }
                                        }
                                        if (this.lexer.showPosition) {
                                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                                        } else {
                                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                                        }
                                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                                    }
                                    if (action[0] instanceof Array && action.length > 1) {
                                        throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                                    }
                                    switch (action[0]) {
                                        case 1:
                                            stack.push(symbol);
                                            vstack.push(this.lexer.yytext);
                                            lstack.push(this.lexer.yylloc);
                                            stack.push(action[1]);
                                            symbol = null;
                                            if (!preErrorSymbol) {
                                                yyleng = this.lexer.yyleng;
                                                yytext = this.lexer.yytext;
                                                yylineno = this.lexer.yylineno;
                                                yyloc = this.lexer.yylloc;
                                                if (recovering > 0) {
                                                    recovering--;
                                                }
                                            } else {
                                                symbol = preErrorSymbol;
                                                preErrorSymbol = null;
                                            }
                                            break;
                                        case 2:
                                            len = this.productions_[action[1]][1];
                                            yyval.$ = vstack[vstack.length - len];
                                            yyval._$ = {
                                                first_line: lstack[lstack.length - (len || 1)].first_line,
                                                last_line: lstack[lstack.length - 1].last_line,
                                                first_column: lstack[lstack.length - (len || 1)].first_column,
                                                last_column: lstack[lstack.length - 1].last_column,
                                            };
                                            if (ranges) {
                                                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                                            }
                                            r = this.performAction.apply(yyval, [yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack].concat(args));
                                            if (typeof r !== "undefined") {
                                                return r;
                                            }
                                            if (len) {
                                                stack = stack.slice(0, -1 * len * 2);
                                                vstack = vstack.slice(0, -1 * len);
                                                lstack = lstack.slice(0, -1 * len);
                                            }
                                            stack.push(this.productions_[action[1]][0]);
                                            vstack.push(yyval.$);
                                            lstack.push(yyval._$);
                                            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                                            stack.push(newState);
                                            break;
                                        case 3:
                                            return true;
                                    }
                                }
                                return true;
                            },
                        };
                        var lexer = (function () {
                            var lexer = {
                                EOF: 1,
                                parseError: function parseError(str, hash) {
                                    if (this.yy.parser) {
                                        this.yy.parser.parseError(str, hash);
                                    } else {
                                        throw new Error(str);
                                    }
                                },
                                setInput: function (input) {
                                    this._input = input;
                                    this._more = this._backtrack = this.done = false;
                                    this.yylineno = this.yyleng = 0;
                                    this.yytext = this.matched = this.match = "";
                                    this.conditionStack = ["INITIAL"];
                                    this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                                    if (this.options.ranges) {
                                        this.yylloc.range = [0, 0];
                                    }
                                    this.offset = 0;
                                    return this;
                                },
                                input: function () {
                                    var ch = this._input[0];
                                    this.yytext += ch;
                                    this.yyleng++;
                                    this.offset++;
                                    this.match += ch;
                                    this.matched += ch;
                                    var lines = ch.match(/(?:\r\n?|\n).*/g);
                                    if (lines) {
                                        this.yylineno++;
                                        this.yylloc.last_line++;
                                    } else {
                                        this.yylloc.last_column++;
                                    }
                                    if (this.options.ranges) {
                                        this.yylloc.range[1]++;
                                    }
                                    this._input = this._input.slice(1);
                                    return ch;
                                },
                                unput: function (ch) {
                                    var len = ch.length;
                                    var lines = ch.split(/(?:\r\n?|\n)/g);
                                    this._input = ch + this._input;
                                    this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                                    this.offset -= len;
                                    var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                                    this.match = this.match.substr(0, this.match.length - 1);
                                    this.matched = this.matched.substr(0, this.matched.length - 1);
                                    if (lines.length - 1) {
                                        this.yylineno -= lines.length - 1;
                                    }
                                    var r = this.yylloc.range;
                                    this.yylloc = {
                                        first_line: this.yylloc.first_line,
                                        last_line: this.yylineno + 1,
                                        first_column: this.yylloc.first_column,
                                        last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len,
                                    };
                                    if (this.options.ranges) {
                                        this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                                    }
                                    this.yyleng = this.yytext.length;
                                    return this;
                                },
                                more: function () {
                                    this._more = true;
                                    return this;
                                },
                                reject: function () {
                                    if (this.options.backtrack_lexer) {
                                        this._backtrack = true;
                                    } else {
                                        return this.parseError(
                                            "Lexical error on line " +
                                                (this.yylineno + 1) +
                                                ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" +
                                                this.showPosition(),
                                            { text: "", token: null, line: this.yylineno }
                                        );
                                    }
                                    return this;
                                },
                                less: function (n) {
                                    this.unput(this.match.slice(n));
                                },
                                pastInput: function () {
                                    var past = this.matched.substr(0, this.matched.length - this.match.length);
                                    return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
                                },
                                upcomingInput: function () {
                                    var next = this.match;
                                    if (next.length < 20) {
                                        next += this._input.substr(0, 20 - next.length);
                                    }
                                    return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
                                },
                                showPosition: function () {
                                    var pre = this.pastInput();
                                    var c = new Array(pre.length + 1).join("-");
                                    return pre + this.upcomingInput() + "\n" + c + "^";
                                },
                                test_match: function (match, indexed_rule) {
                                    var token, lines, backup;
                                    if (this.options.backtrack_lexer) {
                                        backup = {
                                            yylineno: this.yylineno,
                                            yylloc: { first_line: this.yylloc.first_line, last_line: this.last_line, first_column: this.yylloc.first_column, last_column: this.yylloc.last_column },
                                            yytext: this.yytext,
                                            match: this.match,
                                            matches: this.matches,
                                            matched: this.matched,
                                            yyleng: this.yyleng,
                                            offset: this.offset,
                                            _more: this._more,
                                            _input: this._input,
                                            yy: this.yy,
                                            conditionStack: this.conditionStack.slice(0),
                                            done: this.done,
                                        };
                                        if (this.options.ranges) {
                                            backup.yylloc.range = this.yylloc.range.slice(0);
                                        }
                                    }
                                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                                    if (lines) {
                                        this.yylineno += lines.length;
                                    }
                                    this.yylloc = {
                                        first_line: this.yylloc.last_line,
                                        last_line: this.yylineno + 1,
                                        first_column: this.yylloc.last_column,
                                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length,
                                    };
                                    this.yytext += match[0];
                                    this.match += match[0];
                                    this.matches = match;
                                    this.yyleng = this.yytext.length;
                                    if (this.options.ranges) {
                                        this.yylloc.range = [this.offset, (this.offset += this.yyleng)];
                                    }
                                    this._more = false;
                                    this._backtrack = false;
                                    this._input = this._input.slice(match[0].length);
                                    this.matched += match[0];
                                    token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
                                    if (this.done && this._input) {
                                        this.done = false;
                                    }
                                    if (token) {
                                        return token;
                                    } else if (this._backtrack) {
                                        for (var k in backup) {
                                            this[k] = backup[k];
                                        }
                                        return false;
                                    }
                                    return false;
                                },
                                next: function () {
                                    if (this.done) {
                                        return this.EOF;
                                    }
                                    if (!this._input) {
                                        this.done = true;
                                    }
                                    var token, match, tempMatch, index;
                                    if (!this._more) {
                                        this.yytext = "";
                                        this.match = "";
                                    }
                                    var rules = this._currentRules();
                                    for (var i = 0; i < rules.length; i++) {
                                        tempMatch = this._input.match(this.rules[rules[i]]);
                                        if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                                            match = tempMatch;
                                            index = i;
                                            if (this.options.backtrack_lexer) {
                                                token = this.test_match(tempMatch, rules[i]);
                                                if (token !== false) {
                                                    return token;
                                                } else if (this._backtrack) {
                                                    match = false;
                                                    continue;
                                                } else {
                                                    return false;
                                                }
                                            } else if (!this.options.flex) {
                                                break;
                                            }
                                        }
                                    }
                                    if (match) {
                                        token = this.test_match(match, rules[index]);
                                        if (token !== false) {
                                            return token;
                                        }
                                        return false;
                                    }
                                    if (this._input === "") {
                                        return this.EOF;
                                    } else {
                                        return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
                                    }
                                },
                                lex: function lex() {
                                    var r = this.next();
                                    if (r) {
                                        return r;
                                    } else {
                                        return this.lex();
                                    }
                                },
                                begin: function begin(condition) {
                                    this.conditionStack.push(condition);
                                },
                                popState: function popState() {
                                    var n = this.conditionStack.length - 1;
                                    if (n > 0) {
                                        return this.conditionStack.pop();
                                    } else {
                                        return this.conditionStack[0];
                                    }
                                },
                                _currentRules: function _currentRules() {
                                    if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
                                        return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
                                    } else {
                                        return this.conditions["INITIAL"].rules;
                                    }
                                },
                                topState: function topState(n) {
                                    n = this.conditionStack.length - 1 - Math.abs(n || 0);
                                    if (n >= 0) {
                                        return this.conditionStack[n];
                                    } else {
                                        return "INITIAL";
                                    }
                                },
                                pushState: function pushState(condition) {
                                    this.begin(condition);
                                },
                                stateStackSize: function stateStackSize() {
                                    return this.conditionStack.length;
                                },
                                options: {},
                                performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
                                    var YYSTATE = YY_START;
                                    switch ($avoiding_name_collisions) {
                                        case 0:
                                            break;
                                        case 1:
                                            return 12;
                                            break;
                                        case 2:
                                            yy_.yytext = yy_.yytext.substr(1, yy_.yyleng - 2);
                                            return 11;
                                            break;
                                        case 3:
                                            return 12;
                                            break;
                                        case 4:
                                            return 12;
                                            break;
                                        case 5:
                                            return "bar";
                                            break;
                                        case 6:
                                            return 13;
                                            break;
                                        case 7:
                                            return 14;
                                            break;
                                        case 8:
                                            return 15;
                                            break;
                                        case 9:
                                            return 16;
                                            break;
                                        case 10:
                                            return 7;
                                            break;
                                        case 11:
                                            return 17;
                                            break;
                                        case 12:
                                            return 5;
                                            break;
                                    }
                                },
                                rules: [/^(?:\s+)/, /^(?:([a-zA-Z][a-zA-Z0-9_-]*))/, /^(?:\[([a-zA-Z][a-zA-Z0-9_-]*)\])/, /^(?:'[^']*')/, /^(?:\.)/, /^(?:bar\b)/, /^(?:\()/, /^(?:\))/, /^(?:\*)/, /^(?:\?)/, /^(?:\|)/, /^(?:\+)/, /^(?:$)/],
                                conditions: { INITIAL: { rules: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], inclusive: true } },
                            };
                            return lexer;
                        })();
                        parser.lexer = lexer;
                        function Parser() {
                            this.yy = {};
                        }
                        Parser.prototype = parser;
                        parser.Parser = Parser;
                        return new Parser();
                    })();
                    if (typeof require !== "undefined" && typeof exports !== "undefined") {
                        exports.parser = ebnf;
                        exports.Parser = ebnf.Parser;
                        exports.parse = function () {
                            return ebnf.parse.apply(ebnf, arguments);
                        };
                        exports.main = function commonjsMain(args) {
                            if (!args[1]) {
                                console.log("Usage: " + args[0] + " FILE");
                                process.exit(1);
                            }
                            var source = require("fs").readFileSync(require("path").normalize(args[1]), "utf8");
                            return exports.parser.parse(source);
                        };
                        if (typeof module !== "undefined" && require.main === module) {
                            exports.main(process.argv.slice(1));
                        }
                    }
                },
                { __browserify_process: 8, fs: 6, path: 7 },
            ],
            13: [
                function (require, module, exports) {
                    var global;                        // skullquake
                    if(typeof(GOJA)!="undefined")      // . <- modified tests
                        global = this;                 // . 
                    else                               // .
                        global = self;                 // . <- original
                    (function () {
                        "use strict";
                        var Syntax,
                            Precedence,
                            BinaryPrecedence,
                            Regex,
                            VisitorKeys,
                            VisitorOption,
                            SourceNode,
                            isArray,
                            base,
                            indent,
                            json,
                            renumber,
                            hexadecimal,
                            quotes,
                            escapeless,
                            newline,
                            space,
                            parentheses,
                            semicolons,
                            safeConcatenation,
                            directive,
                            extra,
                            parse,
                            sourceMap,
                            traverse;
                        traverse = require("estraverse").traverse;
                        Syntax = {
                            AssignmentExpression: "AssignmentExpression",
                            ArrayExpression: "ArrayExpression",
                            ArrayPattern: "ArrayPattern",
                            BlockStatement: "BlockStatement",
                            BinaryExpression: "BinaryExpression",
                            BreakStatement: "BreakStatement",
                            CallExpression: "CallExpression",
                            CatchClause: "CatchClause",
                            ComprehensionBlock: "ComprehensionBlock",
                            ComprehensionExpression: "ComprehensionExpression",
                            ConditionalExpression: "ConditionalExpression",
                            ContinueStatement: "ContinueStatement",
                            DirectiveStatement: "DirectiveStatement",
                            DoWhileStatement: "DoWhileStatement",
                            DebuggerStatement: "DebuggerStatement",
                            EmptyStatement: "EmptyStatement",
                            ExpressionStatement: "ExpressionStatement",
                            ForStatement: "ForStatement",
                            ForInStatement: "ForInStatement",
                            FunctionDeclaration: "FunctionDeclaration",
                            FunctionExpression: "FunctionExpression",
                            Identifier: "Identifier",
                            IfStatement: "IfStatement",
                            Literal: "Literal",
                            LabeledStatement: "LabeledStatement",
                            LogicalExpression: "LogicalExpression",
                            MemberExpression: "MemberExpression",
                            NewExpression: "NewExpression",
                            ObjectExpression: "ObjectExpression",
                            ObjectPattern: "ObjectPattern",
                            Program: "Program",
                            Property: "Property",
                            ReturnStatement: "ReturnStatement",
                            SequenceExpression: "SequenceExpression",
                            SwitchStatement: "SwitchStatement",
                            SwitchCase: "SwitchCase",
                            ThisExpression: "ThisExpression",
                            ThrowStatement: "ThrowStatement",
                            TryStatement: "TryStatement",
                            UnaryExpression: "UnaryExpression",
                            UpdateExpression: "UpdateExpression",
                            VariableDeclaration: "VariableDeclaration",
                            VariableDeclarator: "VariableDeclarator",
                            WhileStatement: "WhileStatement",
                            WithStatement: "WithStatement",
                            YieldExpression: "YieldExpression",
                        };
                        Precedence = {
                            Sequence: 0,
                            Assignment: 1,
                            Conditional: 2,
                            LogicalOR: 3,
                            LogicalAND: 4,
                            BitwiseOR: 5,
                            BitwiseXOR: 6,
                            BitwiseAND: 7,
                            Equality: 8,
                            Relational: 9,
                            BitwiseSHIFT: 10,
                            Additive: 11,
                            Multiplicative: 12,
                            Unary: 13,
                            Postfix: 14,
                            Call: 15,
                            New: 16,
                            Member: 17,
                            Primary: 18,
                        };
                        BinaryPrecedence = {
                            "||": Precedence.LogicalOR,
                            "&&": Precedence.LogicalAND,
                            "|": Precedence.BitwiseOR,
                            "^": Precedence.BitwiseXOR,
                            "&": Precedence.BitwiseAND,
                            "==": Precedence.Equality,
                            "!=": Precedence.Equality,
                            "===": Precedence.Equality,
                            "!==": Precedence.Equality,
                            is: Precedence.Equality,
                            isnt: Precedence.Equality,
                            "<": Precedence.Relational,
                            ">": Precedence.Relational,
                            "<=": Precedence.Relational,
                            ">=": Precedence.Relational,
                            in: Precedence.Relational,
                            instanceof: Precedence.Relational,
                            "<<": Precedence.BitwiseSHIFT,
                            ">>": Precedence.BitwiseSHIFT,
                            ">>>": Precedence.BitwiseSHIFT,
                            "+": Precedence.Additive,
                            "-": Precedence.Additive,
                            "*": Precedence.Multiplicative,
                            "%": Precedence.Multiplicative,
                            "/": Precedence.Multiplicative,
                        };
                        Regex = {
                            NonAsciiIdentifierPart: new RegExp(
                                "[????????-????-????-????-????-????????-????????-??????-??????-????-????-????-????-????-??????-????-????????????????-????-????-????-????-????-????-????-??????-????-????-???????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-?????????-??????-????????????-???????????????-??????-??????-??????-????????????-??????-???????????????????????????-????????????-?????????-?????????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-?????????-??????-??????-??????-????????????-??????-????????????-??????-????????????-??????????????????-??????-???????????????-??????-??????-???????????????????????????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????????????????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-???????????????-??????-??????????????????-??????-??????-??????-??????-??????-?????????-??????-??????-????????????-??????-??????-?????????-?????????-?????????-????????????-??????-??????-???????????????????????????-??????-??????-??????????????????-??????-??????-?????????-??????-??????-???????????????-???????????????-??????-??????-??????-??????-?????????-??????-??????-????????????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-???????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-???????????????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-???????????????????????????-??????-?????????-????????????-?????????-???????????????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-????????????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????????????????-??????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-???]"
                            ),
                        };
                        function getDefaultOptions() {
                            return {
                                indent: null,
                                base: null,
                                parse: null,
                                comment: false,
                                format: {
                                    indent: { style: "    ", base: 0, adjustMultilineComment: false },
                                    json: false,
                                    renumber: false,
                                    hexadecimal: false,
                                    quotes: "single",
                                    escapeless: false,
                                    compact: false,
                                    parentheses: true,
                                    semicolons: true,
                                    safeConcatenation: false,
                                },
                                moz: { starlessGenerator: false, parenthesizedComprehensionBlock: false },
                                sourceMap: null,
                                sourceMapRoot: null,
                                sourceMapWithCode: false,
                                directive: false,
                                verbatim: null,
                            };
                        }
                        function stringToArray(str) {
                            var length = str.length,
                                result = [],
                                i;
                            for (i = 0; i < length; i += 1) {
                                result[i] = str.charAt(i);
                            }
                            return result;
                        }
                        function stringRepeat(str, num) {
                            var result = "";
                            for (num |= 0; num > 0; num >>>= 1, str += str) {
                                if (num & 1) {
                                    result += str;
                                }
                            }
                            return result;
                        }
                        isArray = Array.isArray;
                        if (!isArray) {
                            isArray = function isArray(array) {
                                return Object.prototype.toString.call(array) === "[object Array]";
                            };
                        }
                        function SourceNodeMock(line, column, filename, chunk) {
                            var result = [];
                            function flatten(input) {
                                var i, iz;
                                if (isArray(input)) {
                                    for (i = 0, iz = input.length; i < iz; ++i) {
                                        flatten(input[i]);
                                    }
                                } else if (input instanceof SourceNodeMock) {
                                    result.push(input);
                                } else if (typeof input === "string" && input) {
                                    result.push(input);
                                }
                            }
                            flatten(chunk);
                            this.children = result;
                        }
                        SourceNodeMock.prototype.toString = function toString() {
                            var res = "",
                                i,
                                iz,
                                node;
                            for (i = 0, iz = this.children.length; i < iz; ++i) {
                                node = this.children[i];
                                if (node instanceof SourceNodeMock) {
                                    res += node.toString();
                                } else {
                                    res += node;
                                }
                            }
                            return res;
                        };
                        SourceNodeMock.prototype.replaceRight = function replaceRight(pattern, replacement) {
                            var last = this.children[this.children.length - 1];
                            if (last instanceof SourceNodeMock) {
                                last.replaceRight(pattern, replacement);
                            } else if (typeof last === "string") {
                                this.children[this.children.length - 1] = last.replace(pattern, replacement);
                            } else {
                                this.children.push("".replace(pattern, replacement));
                            }
                            return this;
                        };
                        SourceNodeMock.prototype.join = function join(sep) {
                            var i, iz, result;
                            result = [];
                            iz = this.children.length;
                            if (iz > 0) {
                                for (i = 0, iz -= 1; i < iz; ++i) {
                                    result.push(this.children[i], sep);
                                }
                                result.push(this.children[iz]);
                                this.children = result;
                            }
                            return this;
                        };
                        function hasLineTerminator(str) {
                            return /[\r\n]/g.test(str);
                        }
                        function endsWithLineTerminator(str) {
                            var ch = str.charAt(str.length - 1);
                            return ch === "\r" || ch === "\n";
                        }
                        function shallowCopy(obj) {
                            var ret = {},
                                key;
                            for (key in obj) {
                                if (obj.hasOwnProperty(key)) {
                                    ret[key] = obj[key];
                                }
                            }
                            return ret;
                        }
                        function deepCopy(obj) {
                            var ret = {},
                                key,
                                val;
                            for (key in obj) {
                                if (obj.hasOwnProperty(key)) {
                                    val = obj[key];
                                    if (typeof val === "object" && val !== null) {
                                        ret[key] = deepCopy(val);
                                    } else {
                                        ret[key] = val;
                                    }
                                }
                            }
                            return ret;
                        }
                        function updateDeeply(target, override) {
                            var key, val;
                            function isHashObject(target) {
                                return typeof target === "object" && target instanceof Object && !(target instanceof RegExp);
                            }
                            for (key in override) {
                                if (override.hasOwnProperty(key)) {
                                    val = override[key];
                                    if (isHashObject(val)) {
                                        if (isHashObject(target[key])) {
                                            updateDeeply(target[key], val);
                                        } else {
                                            target[key] = updateDeeply({}, val);
                                        }
                                    } else {
                                        target[key] = val;
                                    }
                                }
                            }
                            return target;
                        }
                        function generateNumber(value) {
                            var result, point, temp, exponent, pos;
                            if (value !== value) {
                                throw new Error("Numeric literal whose value is NaN");
                            }
                            if (value < 0 || (value === 0 && 1 / value < 0)) {
                                throw new Error("Numeric literal whose value is negative");
                            }
                            if (value === 1 / 0) {
                                return json ? "null" : renumber ? "1e400" : "1e+400";
                            }
                            result = "" + value;
                            if (!renumber || result.length < 3) {
                                return result;
                            }
                            point = result.indexOf(".");
                            if (!json && result.charAt(0) === "0" && point === 1) {
                                point = 0;
                                result = result.slice(1);
                            }
                            temp = result;
                            result = result.replace("e+", "e");
                            exponent = 0;
                            if ((pos = temp.indexOf("e")) > 0) {
                                exponent = +temp.slice(pos + 1);
                                temp = temp.slice(0, pos);
                            }
                            if (point >= 0) {
                                exponent -= temp.length - point - 1;
                                temp = +(temp.slice(0, point) + temp.slice(point + 1)) + "";
                            }
                            pos = 0;
                            while (temp.charAt(temp.length + pos - 1) === "0") {
                                pos -= 1;
                            }
                            if (pos !== 0) {
                                exponent -= pos;
                                temp = temp.slice(0, pos);
                            }
                            if (exponent !== 0) {
                                temp += "e" + exponent;
                            }
                            if ((temp.length < result.length || (hexadecimal && value > 1e12 && Math.floor(value) === value && (temp = "0x" + value.toString(16)).length < result.length)) && +temp === value) {
                                result = temp;
                            }
                            return result;
                        }
                        function escapeRegExpCharacter(ch, previousIsBackslash) {
                            if ((ch & ~1) === 8232) {
                                return (previousIsBackslash ? "u" : "\\u") + (ch === 8232 ? "2028" : "2029");
                            } else if (ch === 10 || ch === 13) {
                                return (previousIsBackslash ? "" : "\\") + (ch === 10 ? "n" : "r");
                            }
                            return String.fromCharCode(ch);
                        }
                        function generateRegExp(reg) {
                            var match, result, flags, i, iz, ch, characterInBrack, previousIsBackslash;
                            result = reg.toString();
                            if (reg.source) {
                                match = result.match(/\/([^/]*)$/);
                                if (!match) {
                                    return result;
                                }
                                flags = match[1];
                                result = "";
                                characterInBrack = false;
                                previousIsBackslash = false;
                                for (i = 0, iz = reg.source.length; i < iz; ++i) {
                                    ch = reg.source.charCodeAt(i);
                                    if (!previousIsBackslash) {
                                        if (characterInBrack) {
                                            if (ch === 93) {
                                                characterInBrack = false;
                                            }
                                        } else {
                                            if (ch === 47) {
                                                result += "\\";
                                            } else if (ch === 91) {
                                                characterInBrack = true;
                                            }
                                        }
                                        result += escapeRegExpCharacter(ch, previousIsBackslash);
                                        previousIsBackslash = ch === 92;
                                    } else {
                                        result += escapeRegExpCharacter(ch, previousIsBackslash);
                                        previousIsBackslash = false;
                                    }
                                }
                                return "/" + result + "/" + flags;
                            }
                            return result;
                        }
                        function escapeAllowedCharacter(ch, next) {
                            var code = ch.charCodeAt(0),
                                hex = code.toString(16),
                                result = "\\";
                            switch (ch) {
                                case "\b":
                                    result += "b";
                                    break;
                                case "\f":
                                    result += "f";
                                    break;
                                case "	":
                                    result += "t";
                                    break;
                                default:
                                    if (json || code > 255) {
                                        result += "u" + "0000".slice(hex.length) + hex;
                                    } else if (ch === "\0" && "0123456789".indexOf(next) < 0) {
                                        result += "0";
                                    } else if (ch === "") {
                                        result += "x0B";
                                    } else {
                                        result += "x" + "00".slice(hex.length) + hex;
                                    }
                                    break;
                            }
                            return result;
                        }
                        function escapeDisallowedCharacter(ch) {
                            var result = "\\";
                            switch (ch) {
                                case "\\":
                                    result += "\\";
                                    break;
                                case "\n":
                                    result += "n";
                                    break;
                                case "\r":
                                    result += "r";
                                    break;
                                case "\u2028":
                                    result += "u2028";
                                    break;
                                case "\u2029":
                                    result += "u2029";
                                    break;
                                default:
                                    throw new Error("Incorrectly classified character");
                            }
                            return result;
                        }
                        function escapeDirective(str) {
                            var i, iz, ch, single, buf, quote;
                            buf = str;
                            if (typeof buf[0] === "undefined") {
                                buf = stringToArray(buf);
                            }
                            quote = quotes === "double" ? '"' : "'";
                            for (i = 0, iz = buf.length; i < iz; i += 1) {
                                ch = buf[i];
                                if (ch === "'") {
                                    quote = '"';
                                    break;
                                } else if (ch === '"') {
                                    quote = "'";
                                    break;
                                } else if (ch === "\\") {
                                    i += 1;
                                }
                            }
                            return quote + str + quote;
                        }
                        function escapeString(str) {
                            var result = "",
                                i,
                                len,
                                ch,
                                next,
                                singleQuotes = 0,
                                doubleQuotes = 0,
                                single;
                            if (typeof str[0] === "undefined") {
                                str = stringToArray(str);
                            }
                            for (i = 0, len = str.length; i < len; i += 1) {
                                ch = str[i];
                                if (ch === "'") {
                                    singleQuotes += 1;
                                } else if (ch === '"') {
                                    doubleQuotes += 1;
                                } else if (ch === "/" && json) {
                                    result += "\\";
                                } else if ("\\\n\r\u2028\u2029".indexOf(ch) >= 0) {
                                    result += escapeDisallowedCharacter(ch);
                                    continue;
                                } else if ((json && ch < " ") || !(json || escapeless || (ch >= " " && ch <= "~"))) {
                                    result += escapeAllowedCharacter(ch, str[i + 1]);
                                    continue;
                                }
                                result += ch;
                            }
                            single = !(quotes === "double" || (quotes === "auto" && doubleQuotes < singleQuotes));
                            str = result;
                            result = single ? "'" : '"';
                            if (typeof str[0] === "undefined") {
                                str = stringToArray(str);
                            }
                            for (i = 0, len = str.length; i < len; i += 1) {
                                ch = str[i];
                                if ((ch === "'" && single) || (ch === '"' && !single)) {
                                    result += "\\";
                                }
                                result += ch;
                            }
                            return result + (single ? "'" : '"');
                        }
                        function isWhiteSpace(ch) {
                            return "	\f  ".indexOf(ch) >= 0 || (ch.charCodeAt(0) >= 5760 && "????????????????????????????????????????????????".indexOf(ch) >= 0);
                        }
                        function isLineTerminator(ch) {
                            return "\n\r\u2028\u2029".indexOf(ch) >= 0;
                        }
                        function isIdentifierPart(ch) {
                            return ch === "$" || ch === "_" || ch === "\\" || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || (ch.charCodeAt(0) >= 128 && Regex.NonAsciiIdentifierPart.test(ch));
                        }
                        function toSourceNode(generated, node) {
                            if (node == null) {
                                if (generated instanceof SourceNode) {
                                    return generated;
                                } else {
                                    node = {};
                                }
                            }
                            if (node.loc == null) {
                                return new SourceNode(null, null, sourceMap, generated);
                            }
                            return new SourceNode(node.loc.start.line, node.loc.start.column, sourceMap === true ? node.loc.source || null : sourceMap, generated);
                        }
                        function join(left, right) {
                            var leftSource = toSourceNode(left).toString(),
                                rightSource = toSourceNode(right).toString(),
                                leftChar = leftSource.charAt(leftSource.length - 1),
                                rightChar = rightSource.charAt(0);
                            if (((leftChar === "+" || leftChar === "-") && leftChar === rightChar) || (isIdentifierPart(leftChar) && isIdentifierPart(rightChar))) {
                                return [left, " ", right];
                            } else if (isWhiteSpace(leftChar) || isLineTerminator(leftChar) || isWhiteSpace(rightChar) || isLineTerminator(rightChar)) {
                                return [left, right];
                            }
                            return [left, space, right];
                        }
                        function addIndent(stmt) {
                            return [base, stmt];
                        }
                        function withIndent(fn) {
                            var previousBase, result;
                            previousBase = base;
                            base += indent;
                            result = fn.call(this, base);
                            base = previousBase;
                            return result;
                        }
                        function calculateSpaces(str) {
                            var i;
                            for (i = str.length - 1; i >= 0; i -= 1) {
                                if (isLineTerminator(str.charAt(i))) {
                                    break;
                                }
                            }
                            return str.length - 1 - i;
                        }
                        function adjustMultilineComment(value, specialBase) {
                            var array, i, len, line, j, ch, spaces, previousBase;
                            array = value.split(/\r\n|[\r\n]/);
                            spaces = Number.MAX_VALUE;
                            for (i = 1, len = array.length; i < len; i += 1) {
                                line = array[i];
                                j = 0;
                                while (j < line.length && isWhiteSpace(line[j])) {
                                    j += 1;
                                }
                                if (spaces > j) {
                                    spaces = j;
                                }
                            }
                            if (typeof specialBase !== "undefined") {
                                previousBase = base;
                                if (array[1][spaces] === "*") {
                                    specialBase += " ";
                                }
                                base = specialBase;
                            } else {
                                if (spaces & 1) {
                                    spaces -= 1;
                                }
                                previousBase = base;
                            }
                            for (i = 1, len = array.length; i < len; i += 1) {
                                array[i] = toSourceNode(addIndent(array[i].slice(spaces))).join("");
                            }
                            base = previousBase;
                            return array.join("\n");
                        }
                        function generateComment(comment, specialBase) {
                            if (comment.type === "Line") {
                                if (endsWithLineTerminator(comment.value)) {
                                    return "//" + comment.value;
                                } else {
                                    return "//" + comment.value + "\n";
                                }
                            }
                            if (extra.format.indent.adjustMultilineComment && /[\n\r]/.test(comment.value)) {
                                return adjustMultilineComment("/*" + comment.value + "*/", specialBase);
                            }
                            return "/*" + comment.value + "*/";
                        }
                        function addCommentsToStatement(stmt, result) {
                            var i, len, comment, save, node, tailingToStatement, specialBase, fragment;
                            if (stmt.leadingComments && stmt.leadingComments.length > 0) {
                                save = result;
                                comment = stmt.leadingComments[0];
                                result = [];
                                if (safeConcatenation && stmt.type === Syntax.Program && stmt.body.length === 0) {
                                    result.push("\n");
                                }
                                result.push(generateComment(comment));
                                if (!endsWithLineTerminator(toSourceNode(result).toString())) {
                                    result.push("\n");
                                }
                                for (i = 1, len = stmt.leadingComments.length; i < len; i += 1) {
                                    comment = stmt.leadingComments[i];
                                    fragment = [generateComment(comment)];
                                    if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                        fragment.push("\n");
                                    }
                                    result.push(addIndent(fragment));
                                }
                                result.push(addIndent(save));
                            }
                            if (stmt.trailingComments) {
                                tailingToStatement = !endsWithLineTerminator(toSourceNode(result).toString());
                                specialBase = stringRepeat(" ", calculateSpaces(toSourceNode([base, result, indent]).toString()));
                                for (i = 0, len = stmt.trailingComments.length; i < len; i += 1) {
                                    comment = stmt.trailingComments[i];
                                    if (tailingToStatement) {
                                        if (i === 0) {
                                            result = [result, indent];
                                        } else {
                                            result = [result, specialBase];
                                        }
                                        result.push(generateComment(comment, specialBase));
                                    } else {
                                        result = [result, addIndent(generateComment(comment))];
                                    }
                                    if (i !== len - 1 && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                        result = [result, "\n"];
                                    }
                                }
                            }
                            return result;
                        }
                        function parenthesize(text, current, should) {
                            if (current < should) {
                                return ["(", text, ")"];
                            }
                            return text;
                        }
                        function maybeBlock(stmt, semicolonOptional, functionBody) {
                            var result, noLeadingComment;
                            noLeadingComment = !extra.comment || !stmt.leadingComments;
                            if (stmt.type === Syntax.BlockStatement && noLeadingComment) {
                                return [space, generateStatement(stmt, { functionBody: functionBody })];
                            }
                            if (stmt.type === Syntax.EmptyStatement && noLeadingComment) {
                                return ";";
                            }
                            withIndent(function () {
                                result = [newline, addIndent(generateStatement(stmt, { semicolonOptional: semicolonOptional, functionBody: functionBody }))];
                            });
                            return result;
                        }
                        function maybeBlockSuffix(stmt, result) {
                            var ends = endsWithLineTerminator(toSourceNode(result).toString());
                            if (stmt.type === Syntax.BlockStatement && (!extra.comment || !stmt.leadingComments) && !ends) {
                                return [result, space];
                            }
                            if (ends) {
                                return [result, base];
                            }
                            return [result, newline, base];
                        }
                        function generateVerbatim(expr, option) {
                            var i, result;
                            result = expr[extra.verbatim].split(/\r\n|\n/);
                            for (i = 1; i < result.length; i++) {
                                result[i] = newline + base + result[i];
                            }
                            result = parenthesize(result, Precedence.Sequence, option.precedence);
                            return toSourceNode(result, expr);
                        }
                        function generateFunctionBody(node) {
                            var result, i, len, expr;
                            result = ["("];
                            for (i = 0, len = node.params.length; i < len; i += 1) {
                                result.push(node.params[i].name);
                                if (i + 1 < len) {
                                    result.push("," + space);
                                }
                            }
                            result.push(")");
                            if (node.expression) {
                                result.push(space);
                                expr = generateExpression(node.body, { precedence: Precedence.Assignment, allowIn: true, allowCall: true });
                                if (expr.toString().charAt(0) === "{") {
                                    expr = ["(", expr, ")"];
                                }
                                result.push(expr);
                            } else {
                                result.push(maybeBlock(node.body, false, true));
                            }
                            return result;
                        }
                        function generateExpression(expr, option) {
                            var result, precedence, type, currentPrecedence, i, len, raw, fragment, multiline, leftChar, leftSource, rightChar, rightSource, allowIn, allowCall, allowUnparenthesizedNew, property, key, value;
                            precedence = option.precedence;
                            allowIn = option.allowIn;
                            allowCall = option.allowCall;
                            type = expr.type || option.type;
                            if (extra.verbatim && expr.hasOwnProperty(extra.verbatim)) {
                                return generateVerbatim(expr, option);
                            }
                            switch (type) {
                                case Syntax.SequenceExpression:
                                    result = [];
                                    allowIn |= Precedence.Sequence < precedence;
                                    for (i = 0, len = expr.expressions.length; i < len; i += 1) {
                                        result.push(generateExpression(expr.expressions[i], { precedence: Precedence.Assignment, allowIn: allowIn, allowCall: true }));
                                        if (i + 1 < len) {
                                            result.push("," + space);
                                        }
                                    }
                                    result = parenthesize(result, Precedence.Sequence, precedence);
                                    break;
                                case Syntax.AssignmentExpression:
                                    allowIn |= Precedence.Assignment < precedence;
                                    result = parenthesize(
                                        [
                                            generateExpression(expr.left, { precedence: Precedence.Call, allowIn: allowIn, allowCall: true }),
                                            space + expr.operator + space,
                                            generateExpression(expr.right, { precedence: Precedence.Assignment, allowIn: allowIn, allowCall: true }),
                                        ],
                                        Precedence.Assignment,
                                        precedence
                                    );
                                    break;
                                case Syntax.ConditionalExpression:
                                    allowIn |= Precedence.Conditional < precedence;
                                    result = parenthesize(
                                        [
                                            generateExpression(expr.test, { precedence: Precedence.LogicalOR, allowIn: allowIn, allowCall: true }),
                                            space + "?" + space,
                                            generateExpression(expr.consequent, { precedence: Precedence.Assignment, allowIn: allowIn, allowCall: true }),
                                            space + ":" + space,
                                            generateExpression(expr.alternate, { precedence: Precedence.Assignment, allowIn: allowIn, allowCall: true }),
                                        ],
                                        Precedence.Conditional,
                                        precedence
                                    );
                                    break;
                                case Syntax.LogicalExpression:
                                case Syntax.BinaryExpression:
                                    currentPrecedence = BinaryPrecedence[expr.operator];
                                    allowIn |= currentPrecedence < precedence;
                                    fragment = generateExpression(expr.left, { precedence: currentPrecedence, allowIn: allowIn, allowCall: true });
                                    leftSource = fragment.toString();
                                    if (leftSource.charAt(leftSource.length - 1) === "/" && isIdentifierPart(expr.operator.charAt(0))) {
                                        result = [fragment, " ", expr.operator];
                                    } else {
                                        result = join(fragment, expr.operator);
                                    }
                                    fragment = generateExpression(expr.right, { precedence: currentPrecedence + 1, allowIn: allowIn, allowCall: true });
                                    if (expr.operator === "/" && fragment.toString().charAt(0) === "/") {
                                        result.push(" ", fragment);
                                    } else {
                                        result = join(result, fragment);
                                    }
                                    if (expr.operator === "in" && !allowIn) {
                                        result = ["(", result, ")"];
                                    } else {
                                        result = parenthesize(result, currentPrecedence, precedence);
                                    }
                                    break;
                                case Syntax.CallExpression:
                                    result = [generateExpression(expr.callee, { precedence: Precedence.Call, allowIn: true, allowCall: true, allowUnparenthesizedNew: false })];
                                    result.push("(");
                                    for (i = 0, len = expr["arguments"].length; i < len; i += 1) {
                                        result.push(generateExpression(expr["arguments"][i], { precedence: Precedence.Assignment, allowIn: true, allowCall: true }));
                                        if (i + 1 < len) {
                                            result.push("," + space);
                                        }
                                    }
                                    result.push(")");
                                    if (!allowCall) {
                                        result = ["(", result, ")"];
                                    } else {
                                        result = parenthesize(result, Precedence.Call, precedence);
                                    }
                                    break;
                                case Syntax.NewExpression:
                                    len = expr["arguments"].length;
                                    allowUnparenthesizedNew = option.allowUnparenthesizedNew === undefined || option.allowUnparenthesizedNew;
                                    result = join("new", generateExpression(expr.callee, { precedence: Precedence.New, allowIn: true, allowCall: false, allowUnparenthesizedNew: allowUnparenthesizedNew && !parentheses && len === 0 }));
                                    if (!allowUnparenthesizedNew || parentheses || len > 0) {
                                        result.push("(");
                                        for (i = 0; i < len; i += 1) {
                                            result.push(generateExpression(expr["arguments"][i], { precedence: Precedence.Assignment, allowIn: true, allowCall: true }));
                                            if (i + 1 < len) {
                                                result.push("," + space);
                                            }
                                        }
                                        result.push(")");
                                    }
                                    result = parenthesize(result, Precedence.New, precedence);
                                    break;
                                case Syntax.MemberExpression:
                                    result = [generateExpression(expr.object, { precedence: Precedence.Call, allowIn: true, allowCall: allowCall, allowUnparenthesizedNew: false })];
                                    if (expr.computed) {
                                        result.push("[", generateExpression(expr.property, { precedence: Precedence.Sequence, allowIn: true, allowCall: allowCall }), "]");
                                    } else {
                                        if (expr.object.type === Syntax.Literal && typeof expr.object.value === "number") {
                                            if (result.indexOf(".") < 0) {
                                                if (!/[eExX]/.test(result) && !(result.length >= 2 && result[0] === "0")) {
                                                    result.push(".");
                                                }
                                            }
                                        }
                                        result.push("." + expr.property.name);
                                    }
                                    result = parenthesize(result, Precedence.Member, precedence);
                                    break;
                                case Syntax.UnaryExpression:
                                    fragment = generateExpression(expr.argument, { precedence: Precedence.Unary, allowIn: true, allowCall: true });
                                    if (space === "") {
                                        result = join(expr.operator, fragment);
                                    } else {
                                        result = [expr.operator];
                                        if (expr.operator.length > 2) {
                                            result = join(result, fragment);
                                        } else {
                                            leftSource = toSourceNode(result).toString();
                                            leftChar = leftSource.charAt(leftSource.length - 1);
                                            rightChar = fragment.toString().charAt(0);
                                            if (((leftChar === "+" || leftChar === "-") && leftChar === rightChar) || (isIdentifierPart(leftChar) && isIdentifierPart(rightChar))) {
                                                result.push(" ", fragment);
                                            } else {
                                                result.push(fragment);
                                            }
                                        }
                                    }
                                    result = parenthesize(result, Precedence.Unary, precedence);
                                    break;
                                case Syntax.YieldExpression:
                                    if (expr.delegate) {
                                        result = "yield*";
                                    } else {
                                        result = "yield";
                                    }
                                    if (expr.argument) {
                                        result = join(result, generateExpression(expr.argument, { precedence: Precedence.Assignment, allowIn: true, allowCall: true }));
                                    }
                                    break;
                                case Syntax.UpdateExpression:
                                    if (expr.prefix) {
                                        result = parenthesize([expr.operator, generateExpression(expr.argument, { precedence: Precedence.Unary, allowIn: true, allowCall: true })], Precedence.Unary, precedence);
                                    } else {
                                        result = parenthesize([generateExpression(expr.argument, { precedence: Precedence.Postfix, allowIn: true, allowCall: true }), expr.operator], Precedence.Postfix, precedence);
                                    }
                                    break;
                                case Syntax.FunctionExpression:
                                    result = "function";
                                    if (expr.id) {
                                        result += " " + expr.id.name;
                                    } else {
                                        result += space;
                                    }
                                    result = [result, generateFunctionBody(expr)];
                                    break;
                                case Syntax.ArrayPattern:
                                case Syntax.ArrayExpression:
                                    if (!expr.elements.length) {
                                        result = "[]";
                                        break;
                                    }
                                    multiline = expr.elements.length > 1;
                                    result = ["[", multiline ? newline : ""];
                                    withIndent(function (indent) {
                                        for (i = 0, len = expr.elements.length; i < len; i += 1) {
                                            if (!expr.elements[i]) {
                                                if (multiline) {
                                                    result.push(indent);
                                                }
                                                if (i + 1 === len) {
                                                    result.push(",");
                                                }
                                            } else {
                                                result.push(multiline ? indent : "", generateExpression(expr.elements[i], { precedence: Precedence.Assignment, allowIn: true, allowCall: true }));
                                            }
                                            if (i + 1 < len) {
                                                result.push("," + (multiline ? newline : space));
                                            }
                                        }
                                    });
                                    if (multiline && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                        result.push(newline);
                                    }
                                    result.push(multiline ? base : "", "]");
                                    break;
                                case Syntax.Property:
                                    if (expr.kind === "get" || expr.kind === "set") {
                                        result = [expr.kind + " ", generateExpression(expr.key, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), generateFunctionBody(expr.value)];
                                    } else {
                                        if (expr.shorthand) {
                                            result = generateExpression(expr.key, { precedence: Precedence.Sequence, allowIn: true, allowCall: true });
                                        } else if (expr.method) {
                                            result = [];
                                            if (expr.value.generator) {
                                                result.push("*");
                                            }
                                            result.push(generateExpression(expr.key, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), generateFunctionBody(expr.value));
                                        } else {
                                            result = [
                                                generateExpression(expr.key, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }),
                                                ":" + space,
                                                generateExpression(expr.value, { precedence: Precedence.Assignment, allowIn: true, allowCall: true }),
                                            ];
                                        }
                                    }
                                    break;
                                case Syntax.ObjectExpression:
                                    if (!expr.properties.length) {
                                        result = "{}";
                                        break;
                                    }
                                    multiline = expr.properties.length > 1;
                                    withIndent(function (indent) {
                                        fragment = generateExpression(expr.properties[0], { precedence: Precedence.Sequence, allowIn: true, allowCall: true, type: Syntax.Property });
                                    });
                                    if (!multiline) {
                                        if (!hasLineTerminator(toSourceNode(fragment).toString())) {
                                            result = ["{", space, fragment, space, "}"];
                                            break;
                                        }
                                    }
                                    withIndent(function (indent) {
                                        result = ["{", newline, indent, fragment];
                                        if (multiline) {
                                            result.push("," + newline);
                                            for (i = 1, len = expr.properties.length; i < len; i += 1) {
                                                result.push(indent, generateExpression(expr.properties[i], { precedence: Precedence.Sequence, allowIn: true, allowCall: true, type: Syntax.Property }));
                                                if (i + 1 < len) {
                                                    result.push("," + newline);
                                                }
                                            }
                                        }
                                    });
                                    if (!endsWithLineTerminator(toSourceNode(result).toString())) {
                                        result.push(newline);
                                    }
                                    result.push(base, "}");
                                    break;
                                case Syntax.ObjectPattern:
                                    if (!expr.properties.length) {
                                        result = "{}";
                                        break;
                                    }
                                    multiline = false;
                                    if (expr.properties.length === 1) {
                                        property = expr.properties[0];
                                        if (property.value.type !== Syntax.Identifier) {
                                            multiline = true;
                                        }
                                    } else {
                                        for (i = 0, len = expr.properties.length; i < len; i += 1) {
                                            property = expr.properties[i];
                                            if (!property.shorthand) {
                                                multiline = true;
                                                break;
                                            }
                                        }
                                    }
                                    result = ["{", multiline ? newline : ""];
                                    withIndent(function (indent) {
                                        for (i = 0, len = expr.properties.length; i < len; i += 1) {
                                            result.push(multiline ? indent : "", generateExpression(expr.properties[i], { precedence: Precedence.Sequence, allowIn: true, allowCall: true }));
                                            if (i + 1 < len) {
                                                result.push("," + (multiline ? newline : space));
                                            }
                                        }
                                    });
                                    if (multiline && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                        result.push(newline);
                                    }
                                    result.push(multiline ? base : "", "}");
                                    break;
                                case Syntax.ThisExpression:
                                    result = "this";
                                    break;
                                case Syntax.Identifier:
                                    result = expr.name;
                                    break;
                                case Syntax.Literal:
                                    if (expr.hasOwnProperty("raw") && parse) {
                                        try {
                                            raw = parse(expr.raw).body[0].expression;
                                            if (raw.type === Syntax.Literal) {
                                                if (raw.value === expr.value) {
                                                    result = expr.raw;
                                                    break;
                                                }
                                            }
                                        } catch (e) {}
                                    }
                                    if (expr.value === null) {
                                        result = "null";
                                        break;
                                    }
                                    if (typeof expr.value === "string") {
                                        result = escapeString(expr.value);
                                        break;
                                    }
                                    if (typeof expr.value === "number") {
                                        result = generateNumber(expr.value);
                                        break;
                                    }
                                    if (typeof expr.value === "boolean") {
                                        result = expr.value ? "true" : "false";
                                        break;
                                    }
                                    result = generateRegExp(expr.value);
                                    break;
                                case Syntax.ComprehensionExpression:
                                    result = ["[", generateExpression(expr.body, { precedence: Precedence.Assignment, allowIn: true, allowCall: true })];
                                    if (expr.blocks) {
                                        for (i = 0, len = expr.blocks.length; i < len; i += 1) {
                                            fragment = generateExpression(expr.blocks[i], { precedence: Precedence.Sequence, allowIn: true, allowCall: true });
                                            result = join(result, fragment);
                                        }
                                    }
                                    if (expr.filter) {
                                        result = join(result, "if" + space);
                                        fragment = generateExpression(expr.filter, { precedence: Precedence.Sequence, allowIn: true, allowCall: true });
                                        if (extra.moz.parenthesizedComprehensionBlock) {
                                            result = join(result, ["(", fragment, ")"]);
                                        } else {
                                            result = join(result, fragment);
                                        }
                                    }
                                    result.push("]");
                                    break;
                                case Syntax.ComprehensionBlock:
                                    if (expr.left.type === Syntax.VariableDeclaration) {
                                        fragment = [expr.left.kind + " ", generateStatement(expr.left.declarations[0], { allowIn: false })];
                                    } else {
                                        fragment = generateExpression(expr.left, { precedence: Precedence.Call, allowIn: true, allowCall: true });
                                    }
                                    fragment = join(fragment, expr.of ? "of" : "in");
                                    fragment = join(fragment, generateExpression(expr.right, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }));
                                    if (extra.moz.parenthesizedComprehensionBlock) {
                                        result = ["for" + space + "(", fragment, ")"];
                                    } else {
                                        result = join("for" + space, fragment);
                                    }
                                    break;
                                default:
                                    throw new Error("Unknown expression type: " + expr.type);
                            }
                            return toSourceNode(result, expr);
                        }
                        function generateStatement(stmt, option) {
                            var i, len, result, node, allowIn, functionBody, directiveContext, fragment, semicolon;
                            allowIn = true;
                            semicolon = ";";
                            functionBody = false;
                            directiveContext = false;
                            if (option) {
                                allowIn = option.allowIn === undefined || option.allowIn;
                                if (!semicolons && option.semicolonOptional === true) {
                                    semicolon = "";
                                }
                                functionBody = option.functionBody;
                                directiveContext = option.directiveContext;
                            }
                            switch (stmt.type) {
                                case Syntax.BlockStatement:
                                    result = ["{", newline];
                                    withIndent(function () {
                                        for (i = 0, len = stmt.body.length; i < len; i += 1) {
                                            fragment = addIndent(generateStatement(stmt.body[i], { semicolonOptional: i === len - 1, directiveContext: functionBody }));
                                            result.push(fragment);
                                            if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                                result.push(newline);
                                            }
                                        }
                                    });
                                    result.push(addIndent("}"));
                                    break;
                                case Syntax.BreakStatement:
                                    if (stmt.label) {
                                        result = "break " + stmt.label.name + semicolon;
                                    } else {
                                        result = "break" + semicolon;
                                    }
                                    break;
                                case Syntax.ContinueStatement:
                                    if (stmt.label) {
                                        result = "continue " + stmt.label.name + semicolon;
                                    } else {
                                        result = "continue" + semicolon;
                                    }
                                    break;
                                case Syntax.DirectiveStatement:
                                    if (stmt.raw) {
                                        result = stmt.raw + semicolon;
                                    } else {
                                        result = escapeDirective(stmt.directive) + semicolon;
                                    }
                                    break;
                                case Syntax.DoWhileStatement:
                                    result = join("do", maybeBlock(stmt.body));
                                    result = maybeBlockSuffix(stmt.body, result);
                                    result = join(result, ["while" + space + "(", generateExpression(stmt.test, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ")" + semicolon]);
                                    break;
                                case Syntax.CatchClause:
                                    withIndent(function () {
                                        result = ["catch" + space + "(", generateExpression(stmt.param, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ")"];
                                    });
                                    result.push(maybeBlock(stmt.body));
                                    break;
                                case Syntax.DebuggerStatement:
                                    result = "debugger" + semicolon;
                                    break;
                                case Syntax.EmptyStatement:
                                    result = ";";
                                    break;
                                case Syntax.ExpressionStatement:
                                    result = [generateExpression(stmt.expression, { precedence: Precedence.Sequence, allowIn: true, allowCall: true })];
                                    if (
                                        result.toString().charAt(0) === "{" ||
                                        (result.toString().slice(0, 8) === "function" && " (".indexOf(result.toString().charAt(8)) >= 0) ||
                                        (directive && directiveContext && stmt.expression.type === Syntax.Literal && typeof stmt.expression.value === "string")
                                    ) {
                                        result = ["(", result, ")" + semicolon];
                                    } else {
                                        result.push(semicolon);
                                    }
                                    break;
                                case Syntax.VariableDeclarator:
                                    if (stmt.init) {
                                        result = [
                                            generateExpression(stmt.id, { precedence: Precedence.Assignment, allowIn: allowIn, allowCall: true }) + space + "=" + space,
                                            generateExpression(stmt.init, { precedence: Precedence.Assignment, allowIn: allowIn, allowCall: true }),
                                        ];
                                    } else {
                                        result = stmt.id.name;
                                    }
                                    break;
                                case Syntax.VariableDeclaration:
                                    result = [stmt.kind];
                                    if (stmt.declarations.length === 1 && stmt.declarations[0].init && stmt.declarations[0].init.type === Syntax.FunctionExpression) {
                                        result.push(" ", generateStatement(stmt.declarations[0], { allowIn: allowIn }));
                                    } else {
                                        withIndent(function () {
                                            node = stmt.declarations[0];
                                            if (extra.comment && node.leadingComments) {
                                                result.push("\n", addIndent(generateStatement(node, { allowIn: allowIn })));
                                            } else {
                                                result.push(" ", generateStatement(node, { allowIn: allowIn }));
                                            }
                                            for (i = 1, len = stmt.declarations.length; i < len; i += 1) {
                                                node = stmt.declarations[i];
                                                if (extra.comment && node.leadingComments) {
                                                    result.push("," + newline, addIndent(generateStatement(node, { allowIn: allowIn })));
                                                } else {
                                                    result.push("," + space, generateStatement(node, { allowIn: allowIn }));
                                                }
                                            }
                                        });
                                    }
                                    result.push(semicolon);
                                    break;
                                case Syntax.ThrowStatement:
                                    result = [join("throw", generateExpression(stmt.argument, { precedence: Precedence.Sequence, allowIn: true, allowCall: true })), semicolon];
                                    break;
                                case Syntax.TryStatement:
                                    result = ["try", maybeBlock(stmt.block)];
                                    result = maybeBlockSuffix(stmt.block, result);
                                    for (i = 0, len = stmt.handlers.length; i < len; i += 1) {
                                        result = join(result, generateStatement(stmt.handlers[i]));
                                        if (stmt.finalizer || i + 1 !== len) {
                                            result = maybeBlockSuffix(stmt.handlers[i].body, result);
                                        }
                                    }
                                    if (stmt.finalizer) {
                                        result = join(result, ["finally", maybeBlock(stmt.finalizer)]);
                                    }
                                    break;
                                case Syntax.SwitchStatement:
                                    withIndent(function () {
                                        result = ["switch" + space + "(", generateExpression(stmt.discriminant, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ")" + space + "{" + newline];
                                    });
                                    if (stmt.cases) {
                                        for (i = 0, len = stmt.cases.length; i < len; i += 1) {
                                            fragment = addIndent(generateStatement(stmt.cases[i], { semicolonOptional: i === len - 1 }));
                                            result.push(fragment);
                                            if (!endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                                result.push(newline);
                                            }
                                        }
                                    }
                                    result.push(addIndent("}"));
                                    break;
                                case Syntax.SwitchCase:
                                    withIndent(function () {
                                        if (stmt.test) {
                                            result = [join("case", generateExpression(stmt.test, { precedence: Precedence.Sequence, allowIn: true, allowCall: true })), ":"];
                                        } else {
                                            result = ["default:"];
                                        }
                                        i = 0;
                                        len = stmt.consequent.length;
                                        if (len && stmt.consequent[0].type === Syntax.BlockStatement) {
                                            fragment = maybeBlock(stmt.consequent[0]);
                                            result.push(fragment);
                                            i = 1;
                                        }
                                        if (i !== len && !endsWithLineTerminator(toSourceNode(result).toString())) {
                                            result.push(newline);
                                        }
                                        for (; i < len; i += 1) {
                                            fragment = addIndent(generateStatement(stmt.consequent[i], { semicolonOptional: i === len - 1 && semicolon === "" }));
                                            result.push(fragment);
                                            if (i + 1 !== len && !endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                                result.push(newline);
                                            }
                                        }
                                    });
                                    break;
                                case Syntax.IfStatement:
                                    withIndent(function () {
                                        result = ["if" + space + "(", generateExpression(stmt.test, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ")"];
                                    });
                                    if (stmt.alternate) {
                                        result.push(maybeBlock(stmt.consequent));
                                        result = maybeBlockSuffix(stmt.consequent, result);
                                        if (stmt.alternate.type === Syntax.IfStatement) {
                                            result = join(result, ["else ", generateStatement(stmt.alternate, { semicolonOptional: semicolon === "" })]);
                                        } else {
                                            result = join(result, join("else", maybeBlock(stmt.alternate, semicolon === "")));
                                        }
                                    } else {
                                        result.push(maybeBlock(stmt.consequent, semicolon === ""));
                                    }
                                    break;
                                case Syntax.ForStatement:
                                    withIndent(function () {
                                        result = ["for" + space + "("];
                                        if (stmt.init) {
                                            if (stmt.init.type === Syntax.VariableDeclaration) {
                                                result.push(generateStatement(stmt.init, { allowIn: false }));
                                            } else {
                                                result.push(generateExpression(stmt.init, { precedence: Precedence.Sequence, allowIn: false, allowCall: true }), ";");
                                            }
                                        } else {
                                            result.push(";");
                                        }
                                        if (stmt.test) {
                                            result.push(space, generateExpression(stmt.test, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ";");
                                        } else {
                                            result.push(";");
                                        }
                                        if (stmt.update) {
                                            result.push(space, generateExpression(stmt.update, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ")");
                                        } else {
                                            result.push(")");
                                        }
                                    });
                                    result.push(maybeBlock(stmt.body, semicolon === ""));
                                    break;
                                case Syntax.ForInStatement:
                                    result = ["for" + space + "("];
                                    withIndent(function () {
                                        if (stmt.left.type === Syntax.VariableDeclaration) {
                                            withIndent(function () {
                                                result.push(stmt.left.kind + " ", generateStatement(stmt.left.declarations[0], { allowIn: false }));
                                            });
                                        } else {
                                            result.push(generateExpression(stmt.left, { precedence: Precedence.Call, allowIn: true, allowCall: true }));
                                        }
                                        result = join(result, "in");
                                        result = [join(result, generateExpression(stmt.right, { precedence: Precedence.Sequence, allowIn: true, allowCall: true })), ")"];
                                    });
                                    result.push(maybeBlock(stmt.body, semicolon === ""));
                                    break;
                                case Syntax.LabeledStatement:
                                    result = [stmt.label.name + ":", maybeBlock(stmt.body, semicolon === "")];
                                    break;
                                case Syntax.Program:
                                    len = stmt.body.length;
                                    result = [safeConcatenation && len > 0 ? "\n" : ""];
                                    for (i = 0; i < len; i += 1) {
                                        fragment = addIndent(generateStatement(stmt.body[i], { semicolonOptional: !safeConcatenation && i === len - 1, directiveContext: true }));
                                        result.push(fragment);
                                        if (i + 1 < len && !endsWithLineTerminator(toSourceNode(fragment).toString())) {
                                            result.push(newline);
                                        }
                                    }
                                    break;
                                case Syntax.FunctionDeclaration:
                                    result = [(stmt.generator && !extra.moz.starlessGenerator ? "function* " : "function ") + stmt.id.name, generateFunctionBody(stmt)];
                                    break;
                                case Syntax.ReturnStatement:
                                    if (stmt.argument) {
                                        result = [join("return", generateExpression(stmt.argument, { precedence: Precedence.Sequence, allowIn: true, allowCall: true })), semicolon];
                                    } else {
                                        result = ["return" + semicolon];
                                    }
                                    break;
                                case Syntax.WhileStatement:
                                    withIndent(function () {
                                        result = ["while" + space + "(", generateExpression(stmt.test, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ")"];
                                    });
                                    result.push(maybeBlock(stmt.body, semicolon === ""));
                                    break;
                                case Syntax.WithStatement:
                                    withIndent(function () {
                                        result = ["with" + space + "(", generateExpression(stmt.object, { precedence: Precedence.Sequence, allowIn: true, allowCall: true }), ")"];
                                    });
                                    result.push(maybeBlock(stmt.body, semicolon === ""));
                                    break;
                                default:
                                    throw new Error("Unknown statement type: " + stmt.type);
                            }
                            if (extra.comment) {
                                result = addCommentsToStatement(stmt, result);
                            }
                            fragment = toSourceNode(result).toString();
                            if (stmt.type === Syntax.Program && !safeConcatenation && newline === "" && fragment.charAt(fragment.length - 1) === "\n") {
                                result = toSourceNode(result).replaceRight(/\s+$/, "");
                            }
                            return toSourceNode(result, stmt);
                        }
                        function generate(node, options) {
                            var defaultOptions = getDefaultOptions(),
                                result,
                                pair;
                            if (options != null) {
                                if (typeof options.indent === "string") {
                                    defaultOptions.format.indent.style = options.indent;
                                }
                                if (typeof options.base === "number") {
                                    defaultOptions.format.indent.base = options.base;
                                }
                                options = updateDeeply(defaultOptions, options);
                                indent = options.format.indent.style;
                                if (typeof options.base === "string") {
                                    base = options.base;
                                } else {
                                    base = stringRepeat(indent, options.format.indent.base);
                                }
                            } else {
                                options = defaultOptions;
                                indent = options.format.indent.style;
                                base = stringRepeat(indent, options.format.indent.base);
                            }
                            json = options.format.json;
                            renumber = options.format.renumber;
                            hexadecimal = json ? false : options.format.hexadecimal;
                            quotes = json ? "double" : options.format.quotes;
                            escapeless = options.format.escapeless;
                            if (options.format.compact) {
                                newline = space = indent = base = "";
                            } else {
                                newline = "\n";
                                space = " ";
                            }
                            parentheses = options.format.parentheses;
                            semicolons = options.format.semicolons;
                            safeConcatenation = options.format.safeConcatenation;
                            directive = options.directive;
                            parse = json ? null : options.parse;
                            sourceMap = options.sourceMap;
                            extra = options;
                            if (sourceMap) {
                                if (!exports.browser) {
                                    SourceNode = require("source-map").SourceNode;
                                } else {
                                    SourceNode = global.sourceMap.SourceNode;
                                }
                            } else {
                                SourceNode = SourceNodeMock;
                            }
                            switch (node.type) {
                                case Syntax.BlockStatement:
                                case Syntax.BreakStatement:
                                case Syntax.CatchClause:
                                case Syntax.ContinueStatement:
                                case Syntax.DirectiveStatement:
                                case Syntax.DoWhileStatement:
                                case Syntax.DebuggerStatement:
                                case Syntax.EmptyStatement:
                                case Syntax.ExpressionStatement:
                                case Syntax.ForStatement:
                                case Syntax.ForInStatement:
                                case Syntax.FunctionDeclaration:
                                case Syntax.IfStatement:
                                case Syntax.LabeledStatement:
                                case Syntax.Program:
                                case Syntax.ReturnStatement:
                                case Syntax.SwitchStatement:
                                case Syntax.SwitchCase:
                                case Syntax.ThrowStatement:
                                case Syntax.TryStatement:
                                case Syntax.VariableDeclaration:
                                case Syntax.VariableDeclarator:
                                case Syntax.WhileStatement:
                                case Syntax.WithStatement:
                                    result = generateStatement(node);
                                    break;
                                case Syntax.AssignmentExpression:
                                case Syntax.ArrayExpression:
                                case Syntax.ArrayPattern:
                                case Syntax.BinaryExpression:
                                case Syntax.CallExpression:
                                case Syntax.ConditionalExpression:
                                case Syntax.FunctionExpression:
                                case Syntax.Identifier:
                                case Syntax.Literal:
                                case Syntax.LogicalExpression:
                                case Syntax.MemberExpression:
                                case Syntax.NewExpression:
                                case Syntax.ObjectExpression:
                                case Syntax.ObjectPattern:
                                case Syntax.Property:
                                case Syntax.SequenceExpression:
                                case Syntax.ThisExpression:
                                case Syntax.UnaryExpression:
                                case Syntax.UpdateExpression:
                                case Syntax.YieldExpression:
                                    result = generateExpression(node, { precedence: Precedence.Sequence, allowIn: true, allowCall: true });
                                    break;
                                default:
                                    throw new Error("Unknown node type: " + node.type);
                            }
                            if (!sourceMap) {
                                return result.toString();
                            }
                            pair = result.toStringWithSourceMap({ file: options.sourceMap, sourceRoot: options.sourceMapRoot });
                            if (options.sourceMapWithCode) {
                                return pair;
                            }
                            return pair.map.toString();
                        }
                        VisitorKeys = {
                            AssignmentExpression: ["left", "right"],
                            ArrayExpression: ["elements"],
                            ArrayPattern: ["elements"],
                            BlockStatement: ["body"],
                            BinaryExpression: ["left", "right"],
                            BreakStatement: ["label"],
                            CallExpression: ["callee", "arguments"],
                            CatchClause: ["param", "body"],
                            ConditionalExpression: ["test", "consequent", "alternate"],
                            ContinueStatement: ["label"],
                            DirectiveStatement: [],
                            DoWhileStatement: ["body", "test"],
                            DebuggerStatement: [],
                            EmptyStatement: [],
                            ExpressionStatement: ["expression"],
                            ForStatement: ["init", "test", "update", "body"],
                            ForInStatement: ["left", "right", "body"],
                            FunctionDeclaration: ["id", "params", "body"],
                            FunctionExpression: ["id", "params", "body"],
                            Identifier: [],
                            IfStatement: ["test", "consequent", "alternate"],
                            Literal: [],
                            LabeledStatement: ["label", "body"],
                            LogicalExpression: ["left", "right"],
                            MemberExpression: ["object", "property"],
                            NewExpression: ["callee", "arguments"],
                            ObjectExpression: ["properties"],
                            ObjectPattern: ["properties"],
                            Program: ["body"],
                            Property: ["key", "value"],
                            ReturnStatement: ["argument"],
                            SequenceExpression: ["expressions"],
                            SwitchStatement: ["discriminant", "cases"],
                            SwitchCase: ["test", "consequent"],
                            ThisExpression: [],
                            ThrowStatement: ["argument"],
                            TryStatement: ["block", "handlers", "finalizer"],
                            UnaryExpression: ["argument"],
                            UpdateExpression: ["argument"],
                            VariableDeclaration: ["declarations"],
                            VariableDeclarator: ["id", "init"],
                            WhileStatement: ["test", "body"],
                            WithStatement: ["object", "body"],
                            YieldExpression: ["argument"],
                        };
                        VisitorOption = { Break: 1, Skip: 2 };
                        function upperBound(array, func) {
                            var diff, len, i, current;
                            len = array.length;
                            i = 0;
                            while (len) {
                                diff = len >>> 1;
                                current = i + diff;
                                if (func(array[current])) {
                                    len = diff;
                                } else {
                                    i = current + 1;
                                    len -= diff + 1;
                                }
                            }
                            return i;
                        }
                        function lowerBound(array, func) {
                            var diff, len, i, current;
                            len = array.length;
                            i = 0;
                            while (len) {
                                diff = len >>> 1;
                                current = i + diff;
                                if (func(array[current])) {
                                    i = current + 1;
                                    len -= diff + 1;
                                } else {
                                    len = diff;
                                }
                            }
                            return i;
                        }
                        function extendCommentRange(comment, tokens) {
                            var target, token;
                            target = upperBound(tokens, function search(token) {
                                return token.range[0] > comment.range[0];
                            });
                            comment.extendedRange = [comment.range[0], comment.range[1]];
                            if (target !== tokens.length) {
                                comment.extendedRange[1] = tokens[target].range[0];
                            }
                            target -= 1;
                            if (target >= 0) {
                                if (target < tokens.length) {
                                    comment.extendedRange[0] = tokens[target].range[1];
                                } else if (token.length) {
                                    comment.extendedRange[1] = tokens[tokens.length - 1].range[0];
                                }
                            }
                            return comment;
                        }
                        function attachComments(tree, providedComments, tokens) {
                            var comments = [],
                                comment,
                                len,
                                i;
                            if (!tree.range) {
                                throw new Error("attachComments needs range information");
                            }
                            if (!tokens.length) {
                                if (providedComments.length) {
                                    for (i = 0, len = providedComments.length; i < len; i += 1) {
                                        comment = deepCopy(providedComments[i]);
                                        comment.extendedRange = [0, tree.range[0]];
                                        comments.push(comment);
                                    }
                                    tree.leadingComments = comments;
                                }
                                return tree;
                            }
                            for (i = 0, len = providedComments.length; i < len; i += 1) {
                                comments.push(extendCommentRange(deepCopy(providedComments[i]), tokens));
                            }
                            traverse(tree, {
                                cursor: 0,
                                enter: function (node) {
                                    var comment;
                                    while (this.cursor < comments.length) {
                                        comment = comments[this.cursor];
                                        if (comment.extendedRange[1] > node.range[0]) {
                                            break;
                                        }
                                        if (comment.extendedRange[1] === node.range[0]) {
                                            if (!node.leadingComments) {
                                                node.leadingComments = [];
                                            }
                                            node.leadingComments.push(comment);
                                            comments.splice(this.cursor, 1);
                                        } else {
                                            this.cursor += 1;
                                        }
                                    }
                                    if (this.cursor === comments.length) {
                                        return VisitorOption.Break;
                                    }
                                    if (comments[this.cursor].extendedRange[0] > node.range[1]) {
                                        return VisitorOption.Skip;
                                    }
                                },
                            });
                            traverse(tree, {
                                cursor: 0,
                                leave: function (node) {
                                    var comment;
                                    while (this.cursor < comments.length) {
                                        comment = comments[this.cursor];
                                        if (node.range[1] < comment.extendedRange[0]) {
                                            break;
                                        }
                                        if (node.range[1] === comment.extendedRange[0]) {
                                            if (!node.trailingComments) {
                                                node.trailingComments = [];
                                            }
                                            node.trailingComments.push(comment);
                                            comments.splice(this.cursor, 1);
                                        } else {
                                            this.cursor += 1;
                                        }
                                    }
                                    if (this.cursor === comments.length) {
                                        return VisitorOption.Break;
                                    }
                                    if (comments[this.cursor].extendedRange[0] > node.range[1]) {
                                        return VisitorOption.Skip;
                                    }
                                },
                            });
                            return tree;
                        }
                        exports.version = require("./package.json").version;
                        exports.generate = generate;
                        exports.attachComments = attachComments;
                        exports.browser = false;
                    })();
                },
                { "./package.json": 25, estraverse: 14, "source-map": 15 },
            ],
            14: [
                function (require, module, exports) {
                    (function (factory) {
                        "use strict";
                        if (typeof define === "function" && define.amd) {
                            define(["exports"], factory);
                        } else if (typeof exports !== "undefined") {
                            factory(exports);
                        } else {
                            factory((window.estraverse = {}));
                        }
                    })(function (exports) {
                        "use strict";
                        var Syntax, isArray, VisitorOption, VisitorKeys, wrappers;
                        Syntax = {
                            AssignmentExpression: "AssignmentExpression",
                            ArrayExpression: "ArrayExpression",
                            BlockStatement: "BlockStatement",
                            BinaryExpression: "BinaryExpression",
                            BreakStatement: "BreakStatement",
                            CallExpression: "CallExpression",
                            CatchClause: "CatchClause",
                            ConditionalExpression: "ConditionalExpression",
                            ContinueStatement: "ContinueStatement",
                            DebuggerStatement: "DebuggerStatement",
                            DirectiveStatement: "DirectiveStatement",
                            DoWhileStatement: "DoWhileStatement",
                            EmptyStatement: "EmptyStatement",
                            ExpressionStatement: "ExpressionStatement",
                            ForStatement: "ForStatement",
                            ForInStatement: "ForInStatement",
                            FunctionDeclaration: "FunctionDeclaration",
                            FunctionExpression: "FunctionExpression",
                            Identifier: "Identifier",
                            IfStatement: "IfStatement",
                            Literal: "Literal",
                            LabeledStatement: "LabeledStatement",
                            LogicalExpression: "LogicalExpression",
                            MemberExpression: "MemberExpression",
                            NewExpression: "NewExpression",
                            ObjectExpression: "ObjectExpression",
                            Program: "Program",
                            Property: "Property",
                            ReturnStatement: "ReturnStatement",
                            SequenceExpression: "SequenceExpression",
                            SwitchStatement: "SwitchStatement",
                            SwitchCase: "SwitchCase",
                            ThisExpression: "ThisExpression",
                            ThrowStatement: "ThrowStatement",
                            TryStatement: "TryStatement",
                            UnaryExpression: "UnaryExpression",
                            UpdateExpression: "UpdateExpression",
                            VariableDeclaration: "VariableDeclaration",
                            VariableDeclarator: "VariableDeclarator",
                            WhileStatement: "WhileStatement",
                            WithStatement: "WithStatement",
                        };
                        isArray = Array.isArray;
                        if (!isArray) {
                            isArray = function isArray(array) {
                                return Object.prototype.toString.call(array) === "[object Array]";
                            };
                        }
                        VisitorKeys = {
                            AssignmentExpression: ["left", "right"],
                            ArrayExpression: ["elements"],
                            BlockStatement: ["body"],
                            BinaryExpression: ["left", "right"],
                            BreakStatement: ["label"],
                            CallExpression: ["callee", "arguments"],
                            CatchClause: ["param", "body"],
                            ConditionalExpression: ["test", "consequent", "alternate"],
                            ContinueStatement: ["label"],
                            DebuggerStatement: [],
                            DirectiveStatement: [],
                            DoWhileStatement: ["body", "test"],
                            EmptyStatement: [],
                            ExpressionStatement: ["expression"],
                            ForStatement: ["init", "test", "update", "body"],
                            ForInStatement: ["left", "right", "body"],
                            FunctionDeclaration: ["id", "params", "body"],
                            FunctionExpression: ["id", "params", "body"],
                            Identifier: [],
                            IfStatement: ["test", "consequent", "alternate"],
                            Literal: [],
                            LabeledStatement: ["label", "body"],
                            LogicalExpression: ["left", "right"],
                            MemberExpression: ["object", "property"],
                            NewExpression: ["callee", "arguments"],
                            ObjectExpression: ["properties"],
                            Program: ["body"],
                            Property: ["key", "value"],
                            ReturnStatement: ["argument"],
                            SequenceExpression: ["expressions"],
                            SwitchStatement: ["discriminant", "cases"],
                            SwitchCase: ["test", "consequent"],
                            ThisExpression: [],
                            ThrowStatement: ["argument"],
                            TryStatement: ["block", "handlers", "finalizer"],
                            UnaryExpression: ["argument"],
                            UpdateExpression: ["argument"],
                            VariableDeclaration: ["declarations"],
                            VariableDeclarator: ["id", "init"],
                            WhileStatement: ["test", "body"],
                            WithStatement: ["object", "body"],
                        };
                        VisitorOption = { Break: 1, Skip: 2 };
                        wrappers = { PropertyWrapper: "Property" };
                        function traverse(top, visitor) {
                            var worklist,
                                leavelist,
                                node,
                                nodeType,
                                ret,
                                current,
                                current2,
                                candidates,
                                candidate,
                                marker = {};
                            worklist = [top];
                            leavelist = [null];
                            while (worklist.length) {
                                node = worklist.pop();
                                nodeType = node.type;
                                if (node === marker) {
                                    node = leavelist.pop();
                                    if (visitor.leave) {
                                        ret = visitor.leave(node, leavelist[leavelist.length - 1]);
                                    } else {
                                        ret = undefined;
                                    }
                                    if (ret === VisitorOption.Break) {
                                        return;
                                    }
                                } else if (node) {
                                    if (wrappers.hasOwnProperty(nodeType)) {
                                        node = node.node;
                                        nodeType = wrappers[nodeType];
                                    }
                                    if (visitor.enter) {
                                        ret = visitor.enter(node, leavelist[leavelist.length - 1]);
                                    } else {
                                        ret = undefined;
                                    }
                                    if (ret === VisitorOption.Break) {
                                        return;
                                    }
                                    worklist.push(marker);
                                    leavelist.push(node);
                                    if (ret !== VisitorOption.Skip) {
                                        candidates = VisitorKeys[nodeType];
                                        current = candidates.length;
                                        while ((current -= 1) >= 0) {
                                            candidate = node[candidates[current]];
                                            if (candidate) {
                                                if (isArray(candidate)) {
                                                    current2 = candidate.length;
                                                    while ((current2 -= 1) >= 0) {
                                                        if (candidate[current2]) {
                                                            if (nodeType === Syntax.ObjectExpression && "properties" === candidates[current] && null == candidates[current].type) {
                                                                worklist.push({ type: "PropertyWrapper", node: candidate[current2] });
                                                            } else {
                                                                worklist.push(candidate[current2]);
                                                            }
                                                        }
                                                    }
                                                } else {
                                                    worklist.push(candidate);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        function replace(top, visitor) {
                            var worklist,
                                leavelist,
                                node,
                                nodeType,
                                target,
                                tuple,
                                ret,
                                current,
                                current2,
                                candidates,
                                candidate,
                                marker = {},
                                result;
                            result = { top: top };
                            tuple = [top, result, "top"];
                            worklist = [tuple];
                            leavelist = [tuple];
                            function notify(v) {
                                ret = v;
                            }
                            while (worklist.length) {
                                tuple = worklist.pop();
                                if (tuple === marker) {
                                    tuple = leavelist.pop();
                                    ret = undefined;
                                    if (visitor.leave) {
                                        node = tuple[0];
                                        target = visitor.leave(tuple[0], leavelist[leavelist.length - 1][0], notify);
                                        if (target !== undefined) {
                                            node = target;
                                        }
                                        tuple[1][tuple[2]] = node;
                                    }
                                    if (ret === VisitorOption.Break) {
                                        return result.top;
                                    }
                                } else if (tuple[0]) {
                                    ret = undefined;
                                    node = tuple[0];
                                    nodeType = node.type;
                                    if (wrappers.hasOwnProperty(nodeType)) {
                                        tuple[0] = node = node.node;
                                        nodeType = wrappers[nodeType];
                                    }
                                    if (visitor.enter) {
                                        target = visitor.enter(tuple[0], leavelist[leavelist.length - 1][0], notify);
                                        if (target !== undefined) {
                                            node = target;
                                        }
                                        tuple[1][tuple[2]] = node;
                                        tuple[0] = node;
                                    }
                                    if (ret === VisitorOption.Break) {
                                        return result.top;
                                    }
                                    if (tuple[0]) {
                                        worklist.push(marker);
                                        leavelist.push(tuple);
                                        if (ret !== VisitorOption.Skip) {
                                            candidates = VisitorKeys[nodeType];
                                            current = candidates.length;
                                            while ((current -= 1) >= 0) {
                                                candidate = node[candidates[current]];
                                                if (candidate) {
                                                    if (isArray(candidate)) {
                                                        current2 = candidate.length;
                                                        while ((current2 -= 1) >= 0) {
                                                            if (candidate[current2]) {
                                                                if (nodeType === Syntax.ObjectExpression && "properties" === candidates[current] && null == candidates[current].type) {
                                                                    worklist.push([{ type: "PropertyWrapper", node: candidate[current2] }, candidate, current2]);
                                                                } else {
                                                                    worklist.push([candidate[current2], candidate, current2]);
                                                                }
                                                            }
                                                        }
                                                    } else {
                                                        worklist.push([candidate, node, candidates[current]]);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            return result.top;
                        }
                        exports.version = "0.0.4";
                        exports.Syntax = Syntax;
                        exports.traverse = traverse;
                        exports.replace = replace;
                        exports.VisitorKeys = VisitorKeys;
                        exports.VisitorOption = VisitorOption;
                    });
                },
                {},
            ],
            15: [
                function (require, module, exports) {
                    exports.SourceMapGenerator = require("./source-map/source-map-generator").SourceMapGenerator;
                    exports.SourceMapConsumer = require("./source-map/source-map-consumer").SourceMapConsumer;
                    exports.SourceNode = require("./source-map/source-node").SourceNode;
                },
                { "./source-map/source-map-consumer": 20, "./source-map/source-map-generator": 21, "./source-map/source-node": 22 },
            ],
            16: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        var util = require("./util");
                        function ArraySet() {
                            this._array = [];
                            this._set = {};
                        }
                        ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
                            var set = new ArraySet();
                            for (var i = 0, len = aArray.length; i < len; i++) {
                                set.add(aArray[i], aAllowDuplicates);
                            }
                            return set;
                        };
                        ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
                            var isDuplicate = this.has(aStr);
                            var idx = this._array.length;
                            if (!isDuplicate || aAllowDuplicates) {
                                this._array.push(aStr);
                            }
                            if (!isDuplicate) {
                                this._set[util.toSetString(aStr)] = idx;
                            }
                        };
                        ArraySet.prototype.has = function ArraySet_has(aStr) {
                            return Object.prototype.hasOwnProperty.call(this._set, util.toSetString(aStr));
                        };
                        ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
                            if (this.has(aStr)) {
                                return this._set[util.toSetString(aStr)];
                            }
                            throw new Error('"' + aStr + '" is not in the set.');
                        };
                        ArraySet.prototype.at = function ArraySet_at(aIdx) {
                            if (aIdx >= 0 && aIdx < this._array.length) {
                                return this._array[aIdx];
                            }
                            throw new Error("No element indexed by " + aIdx);
                        };
                        ArraySet.prototype.toArray = function ArraySet_toArray() {
                            return this._array.slice();
                        };
                        exports.ArraySet = ArraySet;
                    });
                },
                { "./util": 23, amdefine: 24 },
            ],
            17: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        var base64 = require("./base64");
                        var VLQ_BASE_SHIFT = 5;
                        var VLQ_BASE = 1 << VLQ_BASE_SHIFT;
                        var VLQ_BASE_MASK = VLQ_BASE - 1;
                        var VLQ_CONTINUATION_BIT = VLQ_BASE;
                        function toVLQSigned(aValue) {
                            return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
                        }
                        function fromVLQSigned(aValue) {
                            var isNegative = (aValue & 1) === 1;
                            var shifted = aValue >> 1;
                            return isNegative ? -shifted : shifted;
                        }
                        exports.encode = function base64VLQ_encode(aValue) {
                            var encoded = "";
                            var digit;
                            var vlq = toVLQSigned(aValue);
                            do {
                                digit = vlq & VLQ_BASE_MASK;
                                vlq >>>= VLQ_BASE_SHIFT;
                                if (vlq > 0) {
                                    digit |= VLQ_CONTINUATION_BIT;
                                }
                                encoded += base64.encode(digit);
                            } while (vlq > 0);
                            return encoded;
                        };
                        exports.decode = function base64VLQ_decode(aStr) {
                            var i = 0;
                            var strLen = aStr.length;
                            var result = 0;
                            var shift = 0;
                            var continuation, digit;
                            do {
                                if (i >= strLen) {
                                    throw new Error("Expected more digits in base 64 VLQ value.");
                                }
                                digit = base64.decode(aStr.charAt(i++));
                                continuation = !!(digit & VLQ_CONTINUATION_BIT);
                                digit &= VLQ_BASE_MASK;
                                result = result + (digit << shift);
                                shift += VLQ_BASE_SHIFT;
                            } while (continuation);
                            return { value: fromVLQSigned(result), rest: aStr.slice(i) };
                        };
                    });
                },
                { "./base64": 18, amdefine: 24 },
            ],
            18: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        var charToIntMap = {};
                        var intToCharMap = {};
                        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("").forEach(function (ch, index) {
                            charToIntMap[ch] = index;
                            intToCharMap[index] = ch;
                        });
                        exports.encode = function base64_encode(aNumber) {
                            if (aNumber in intToCharMap) {
                                return intToCharMap[aNumber];
                            }
                            throw new TypeError("Must be between 0 and 63: " + aNumber);
                        };
                        exports.decode = function base64_decode(aChar) {
                            if (aChar in charToIntMap) {
                                return charToIntMap[aChar];
                            }
                            throw new TypeError("Not a valid base 64 digit: " + aChar);
                        };
                    });
                },
                { amdefine: 24 },
            ],
            19: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
                            var mid = Math.floor((aHigh - aLow) / 2) + aLow;
                            var cmp = aCompare(aNeedle, aHaystack[mid]);
                            if (cmp === 0) {
                                return aHaystack[mid];
                            } else if (cmp > 0) {
                                if (aHigh - mid > 1) {
                                    return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
                                }
                                return aHaystack[mid];
                            } else {
                                if (mid - aLow > 1) {
                                    return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
                                }
                                return aLow < 0 ? null : aHaystack[aLow];
                            }
                        }
                        exports.search = function search(aNeedle, aHaystack, aCompare) {
                            return aHaystack.length > 0 ? recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare) : null;
                        };
                    });
                },
                { amdefine: 24 },
            ],
            20: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        var util = require("./util");
                        var binarySearch = require("./binary-search");
                        var ArraySet = require("./array-set").ArraySet;
                        var base64VLQ = require("./base64-vlq");
                        function SourceMapConsumer(aSourceMap) {
                            var sourceMap = aSourceMap;
                            if (typeof aSourceMap === "string") {
                                sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ""));
                            }
                            var version = util.getArg(sourceMap, "version");
                            var sources = util.getArg(sourceMap, "sources");
                            var names = util.getArg(sourceMap, "names");
                            var sourceRoot = util.getArg(sourceMap, "sourceRoot", null);
                            var sourcesContent = util.getArg(sourceMap, "sourcesContent", null);
                            var mappings = util.getArg(sourceMap, "mappings");
                            var file = util.getArg(sourceMap, "file", null);
                            if (version !== this._version) {
                                throw new Error("Unsupported version: " + version);
                            }
                            this._names = ArraySet.fromArray(names, true);
                            this._sources = ArraySet.fromArray(sources, true);
                            this.sourceRoot = sourceRoot;
                            this.sourcesContent = sourcesContent;
                            this.file = file;
                            this._generatedMappings = [];
                            this._originalMappings = [];
                            this._parseMappings(mappings, sourceRoot);
                        }
                        SourceMapConsumer.prototype._version = 3;
                        Object.defineProperty(SourceMapConsumer.prototype, "sources", {
                            get: function () {
                                return this._sources.toArray().map(function (s) {
                                    return this.sourceRoot ? util.join(this.sourceRoot, s) : s;
                                }, this);
                            },
                        });
                        SourceMapConsumer.prototype._parseMappings = function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
                            var generatedLine = 1;
                            var previousGeneratedColumn = 0;
                            var previousOriginalLine = 0;
                            var previousOriginalColumn = 0;
                            var previousSource = 0;
                            var previousName = 0;
                            var mappingSeparator = /^[,;]/;
                            var str = aStr;
                            var mapping;
                            var temp;
                            while (str.length > 0) {
                                if (str.charAt(0) === ";") {
                                    generatedLine++;
                                    str = str.slice(1);
                                    previousGeneratedColumn = 0;
                                } else if (str.charAt(0) === ",") {
                                    str = str.slice(1);
                                } else {
                                    mapping = {};
                                    mapping.generatedLine = generatedLine;
                                    temp = base64VLQ.decode(str);
                                    mapping.generatedColumn = previousGeneratedColumn + temp.value;
                                    previousGeneratedColumn = mapping.generatedColumn;
                                    str = temp.rest;
                                    if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
                                        temp = base64VLQ.decode(str);
                                        mapping.source = this._sources.at(previousSource + temp.value);
                                        previousSource += temp.value;
                                        str = temp.rest;
                                        if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                                            throw new Error("Found a source, but no line and column");
                                        }
                                        temp = base64VLQ.decode(str);
                                        mapping.originalLine = previousOriginalLine + temp.value;
                                        previousOriginalLine = mapping.originalLine;
                                        mapping.originalLine += 1;
                                        str = temp.rest;
                                        if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
                                            throw new Error("Found a source and line, but no column");
                                        }
                                        temp = base64VLQ.decode(str);
                                        mapping.originalColumn = previousOriginalColumn + temp.value;
                                        previousOriginalColumn = mapping.originalColumn;
                                        str = temp.rest;
                                        if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
                                            temp = base64VLQ.decode(str);
                                            mapping.name = this._names.at(previousName + temp.value);
                                            previousName += temp.value;
                                            str = temp.rest;
                                        }
                                    }
                                    this._generatedMappings.push(mapping);
                                    if (typeof mapping.originalLine === "number") {
                                        this._originalMappings.push(mapping);
                                    }
                                }
                            }
                            this._originalMappings.sort(this._compareOriginalPositions);
                        };
                        SourceMapConsumer.prototype._compareOriginalPositions = function SourceMapConsumer_compareOriginalPositions(mappingA, mappingB) {
                            if (mappingA.source > mappingB.source) {
                                return 1;
                            } else if (mappingA.source < mappingB.source) {
                                return -1;
                            } else {
                                var cmp = mappingA.originalLine - mappingB.originalLine;
                                return cmp === 0 ? mappingA.originalColumn - mappingB.originalColumn : cmp;
                            }
                        };
                        SourceMapConsumer.prototype._compareGeneratedPositions = function SourceMapConsumer_compareGeneratedPositions(mappingA, mappingB) {
                            var cmp = mappingA.generatedLine - mappingB.generatedLine;
                            return cmp === 0 ? mappingA.generatedColumn - mappingB.generatedColumn : cmp;
                        };
                        SourceMapConsumer.prototype._findMapping = function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName, aColumnName, aComparator) {
                            if (aNeedle[aLineName] <= 0) {
                                throw new TypeError("Line must be greater than or equal to 1, got " + aNeedle[aLineName]);
                            }
                            if (aNeedle[aColumnName] < 0) {
                                throw new TypeError("Column must be greater than or equal to 0, got " + aNeedle[aColumnName]);
                            }
                            return binarySearch.search(aNeedle, aMappings, aComparator);
                        };
                        SourceMapConsumer.prototype.originalPositionFor = function SourceMapConsumer_originalPositionFor(aArgs) {
                            var needle = { generatedLine: util.getArg(aArgs, "line"), generatedColumn: util.getArg(aArgs, "column") };
                            var mapping = this._findMapping(needle, this._generatedMappings, "generatedLine", "generatedColumn", this._compareGeneratedPositions);
                            if (mapping) {
                                var source = util.getArg(mapping, "source", null);
                                if (source && this.sourceRoot) {
                                    source = util.join(this.sourceRoot, source);
                                }
                                return { source: source, line: util.getArg(mapping, "originalLine", null), column: util.getArg(mapping, "originalColumn", null), name: util.getArg(mapping, "name", null) };
                            }
                            return { source: null, line: null, column: null, name: null };
                        };
                        SourceMapConsumer.prototype.sourceContentFor = function SourceMapConsumer_sourceContentFor(aSource) {
                            if (!this.sourcesContent) {
                                return null;
                            }
                            if (this.sourceRoot) {
                                aSource = util.relative(this.sourceRoot, aSource);
                            }
                            if (this._sources.has(aSource)) {
                                return this.sourcesContent[this._sources.indexOf(aSource)];
                            }
                            var url;
                            if (this.sourceRoot && (url = util.urlParse(this.sourceRoot))) {
                                var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
                                if (url.scheme == "file" && this._sources.has(fileUriAbsPath)) {
                                    return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)];
                                }
                                if ((!url.path || url.path == "/") && this._sources.has("/" + aSource)) {
                                    return this.sourcesContent[this._sources.indexOf("/" + aSource)];
                                }
                            }
                            throw new Error('"' + aSource + '" is not in the SourceMap.');
                        };
                        SourceMapConsumer.prototype.generatedPositionFor = function SourceMapConsumer_generatedPositionFor(aArgs) {
                            var needle = { source: util.getArg(aArgs, "source"), originalLine: util.getArg(aArgs, "line"), originalColumn: util.getArg(aArgs, "column") };
                            if (this.sourceRoot) {
                                needle.source = util.relative(this.sourceRoot, needle.source);
                            }
                            var mapping = this._findMapping(needle, this._originalMappings, "originalLine", "originalColumn", this._compareOriginalPositions);
                            if (mapping) {
                                return { line: util.getArg(mapping, "generatedLine", null), column: util.getArg(mapping, "generatedColumn", null) };
                            }
                            return { line: null, column: null };
                        };
                        SourceMapConsumer.GENERATED_ORDER = 1;
                        SourceMapConsumer.ORIGINAL_ORDER = 2;
                        SourceMapConsumer.prototype.eachMapping = function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
                            var context = aContext || null;
                            var order = aOrder || SourceMapConsumer.GENERATED_ORDER;
                            var mappings;
                            switch (order) {
                                case SourceMapConsumer.GENERATED_ORDER:
                                    mappings = this._generatedMappings;
                                    break;
                                case SourceMapConsumer.ORIGINAL_ORDER:
                                    mappings = this._originalMappings;
                                    break;
                                default:
                                    throw new Error("Unknown order of iteration.");
                            }
                            var sourceRoot = this.sourceRoot;
                            mappings
                                .map(function (mapping) {
                                    var source = mapping.source;
                                    if (source && sourceRoot) {
                                        source = util.join(sourceRoot, source);
                                    }
                                    return { source: source, generatedLine: mapping.generatedLine, generatedColumn: mapping.generatedColumn, originalLine: mapping.originalLine, originalColumn: mapping.originalColumn, name: mapping.name };
                                })
                                .forEach(aCallback, context);
                        };
                        exports.SourceMapConsumer = SourceMapConsumer;
                    });
                },
                { "./array-set": 16, "./base64-vlq": 17, "./binary-search": 19, "./util": 23, amdefine: 24 },
            ],
            21: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        var base64VLQ = require("./base64-vlq");
                        var util = require("./util");
                        var ArraySet = require("./array-set").ArraySet;
                        function SourceMapGenerator(aArgs) {
                            this._file = util.getArg(aArgs, "file");
                            this._sourceRoot = util.getArg(aArgs, "sourceRoot", null);
                            this._sources = new ArraySet();
                            this._names = new ArraySet();
                            this._mappings = [];
                            this._sourcesContents = null;
                        }
                        SourceMapGenerator.prototype._version = 3;
                        SourceMapGenerator.fromSourceMap = function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
                            var sourceRoot = aSourceMapConsumer.sourceRoot;
                            var generator = new SourceMapGenerator({ file: aSourceMapConsumer.file, sourceRoot: sourceRoot });
                            aSourceMapConsumer.eachMapping(function (mapping) {
                                var newMapping = { generated: { line: mapping.generatedLine, column: mapping.generatedColumn } };
                                if (mapping.source) {
                                    newMapping.source = mapping.source;
                                    if (sourceRoot) {
                                        newMapping.source = util.relative(sourceRoot, newMapping.source);
                                    }
                                    newMapping.original = { line: mapping.originalLine, column: mapping.originalColumn };
                                    if (mapping.name) {
                                        newMapping.name = mapping.name;
                                    }
                                }
                                generator.addMapping(newMapping);
                            });
                            aSourceMapConsumer.sources.forEach(function (sourceFile) {
                                var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                                if (content) {
                                    generator.setSourceContent(sourceFile, content);
                                }
                            });
                            return generator;
                        };
                        SourceMapGenerator.prototype.addMapping = function SourceMapGenerator_addMapping(aArgs) {
                            var generated = util.getArg(aArgs, "generated");
                            var original = util.getArg(aArgs, "original", null);
                            var source = util.getArg(aArgs, "source", null);
                            var name = util.getArg(aArgs, "name", null);
                            this._validateMapping(generated, original, source, name);
                            if (source && !this._sources.has(source)) {
                                this._sources.add(source);
                            }
                            if (name && !this._names.has(name)) {
                                this._names.add(name);
                            }
                            this._mappings.push({ generated: generated, original: original, source: source, name: name });
                        };
                        SourceMapGenerator.prototype.setSourceContent = function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
                            var source = aSourceFile;
                            if (this._sourceRoot) {
                                source = util.relative(this._sourceRoot, source);
                            }
                            if (aSourceContent !== null) {
                                if (!this._sourcesContents) {
                                    this._sourcesContents = {};
                                }
                                this._sourcesContents[util.toSetString(source)] = aSourceContent;
                            } else {
                                delete this._sourcesContents[util.toSetString(source)];
                                if (Object.keys(this._sourcesContents).length === 0) {
                                    this._sourcesContents = null;
                                }
                            }
                        };
                        SourceMapGenerator.prototype.applySourceMap = function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile) {
                            if (!aSourceFile) {
                                aSourceFile = aSourceMapConsumer.file;
                            }
                            var sourceRoot = this._sourceRoot;
                            if (sourceRoot) {
                                aSourceFile = util.relative(sourceRoot, aSourceFile);
                            }
                            var newSources = new ArraySet();
                            var newNames = new ArraySet();
                            this._mappings.forEach(function (mapping) {
                                if (mapping.source === aSourceFile && mapping.original) {
                                    var original = aSourceMapConsumer.originalPositionFor({ line: mapping.original.line, column: mapping.original.column });
                                    if (original.source !== null) {
                                        if (sourceRoot) {
                                            mapping.source = util.relative(sourceRoot, original.source);
                                        } else {
                                            mapping.source = original.source;
                                        }
                                        mapping.original.line = original.line;
                                        mapping.original.column = original.column;
                                        if (original.name !== null && mapping.name !== null) {
                                            mapping.name = original.name;
                                        }
                                    }
                                }
                                var source = mapping.source;
                                if (source && !newSources.has(source)) {
                                    newSources.add(source);
                                }
                                var name = mapping.name;
                                if (name && !newNames.has(name)) {
                                    newNames.add(name);
                                }
                            }, this);
                            this._sources = newSources;
                            this._names = newNames;
                            aSourceMapConsumer.sources.forEach(function (sourceFile) {
                                var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                                if (content) {
                                    if (sourceRoot) {
                                        sourceFile = util.relative(sourceRoot, sourceFile);
                                    }
                                    this.setSourceContent(sourceFile, content);
                                }
                            }, this);
                        };
                        SourceMapGenerator.prototype._validateMapping = function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource, aName) {
                            if (aGenerated && "line" in aGenerated && "column" in aGenerated && aGenerated.line > 0 && aGenerated.column >= 0 && !aOriginal && !aSource && !aName) {
                                return;
                            } else if (
                                aGenerated &&
                                "line" in aGenerated &&
                                "column" in aGenerated &&
                                aOriginal &&
                                "line" in aOriginal &&
                                "column" in aOriginal &&
                                aGenerated.line > 0 &&
                                aGenerated.column >= 0 &&
                                aOriginal.line > 0 &&
                                aOriginal.column >= 0 &&
                                aSource
                            ) {
                                return;
                            } else {
                                throw new Error("Invalid mapping.");
                            }
                        };
                        function cmpLocation(loc1, loc2) {
                            var cmp = (loc1 && loc1.line) - (loc2 && loc2.line);
                            return cmp ? cmp : (loc1 && loc1.column) - (loc2 && loc2.column);
                        }
                        function strcmp(str1, str2) {
                            str1 = str1 || "";
                            str2 = str2 || "";
                            return (str1 > str2) - (str1 < str2);
                        }
                        function cmpMapping(mappingA, mappingB) {
                            return cmpLocation(mappingA.generated, mappingB.generated) || cmpLocation(mappingA.original, mappingB.original) || strcmp(mappingA.source, mappingB.source) || strcmp(mappingA.name, mappingB.name);
                        }
                        SourceMapGenerator.prototype._serializeMappings = function SourceMapGenerator_serializeMappings() {
                            var previousGeneratedColumn = 0;
                            var previousGeneratedLine = 1;
                            var previousOriginalColumn = 0;
                            var previousOriginalLine = 0;
                            var previousName = 0;
                            var previousSource = 0;
                            var result = "";
                            var mapping;
                            this._mappings.sort(cmpMapping);
                            for (var i = 0, len = this._mappings.length; i < len; i++) {
                                mapping = this._mappings[i];
                                if (mapping.generated.line !== previousGeneratedLine) {
                                    previousGeneratedColumn = 0;
                                    while (mapping.generated.line !== previousGeneratedLine) {
                                        result += ";";
                                        previousGeneratedLine++;
                                    }
                                } else {
                                    if (i > 0) {
                                        if (!cmpMapping(mapping, this._mappings[i - 1])) {
                                            continue;
                                        }
                                        result += ",";
                                    }
                                }
                                result += base64VLQ.encode(mapping.generated.column - previousGeneratedColumn);
                                previousGeneratedColumn = mapping.generated.column;
                                if (mapping.source && mapping.original) {
                                    result += base64VLQ.encode(this._sources.indexOf(mapping.source) - previousSource);
                                    previousSource = this._sources.indexOf(mapping.source);
                                    result += base64VLQ.encode(mapping.original.line - 1 - previousOriginalLine);
                                    previousOriginalLine = mapping.original.line - 1;
                                    result += base64VLQ.encode(mapping.original.column - previousOriginalColumn);
                                    previousOriginalColumn = mapping.original.column;
                                    if (mapping.name) {
                                        result += base64VLQ.encode(this._names.indexOf(mapping.name) - previousName);
                                        previousName = this._names.indexOf(mapping.name);
                                    }
                                }
                            }
                            return result;
                        };
                        SourceMapGenerator.prototype.toJSON = function SourceMapGenerator_toJSON() {
                            var map = { version: this._version, file: this._file, sources: this._sources.toArray(), names: this._names.toArray(), mappings: this._serializeMappings() };
                            if (this._sourceRoot) {
                                map.sourceRoot = this._sourceRoot;
                            }
                            if (this._sourcesContents) {
                                map.sourcesContent = map.sources.map(function (source) {
                                    if (map.sourceRoot) {
                                        source = util.relative(map.sourceRoot, source);
                                    }
                                    return Object.prototype.hasOwnProperty.call(this._sourcesContents, util.toSetString(source)) ? this._sourcesContents[util.toSetString(source)] : null;
                                }, this);
                            }
                            return map;
                        };
                        SourceMapGenerator.prototype.toString = function SourceMapGenerator_toString() {
                            return JSON.stringify(this);
                        };
                        exports.SourceMapGenerator = SourceMapGenerator;
                    });
                },
                { "./array-set": 16, "./base64-vlq": 17, "./util": 23, amdefine: 24 },
            ],
            22: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        var SourceMapGenerator = require("./source-map-generator").SourceMapGenerator;
                        var util = require("./util");
                        function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
                            this.children = [];
                            this.sourceContents = {};
                            this.line = aLine === undefined ? null : aLine;
                            this.column = aColumn === undefined ? null : aColumn;
                            this.source = aSource === undefined ? null : aSource;
                            this.name = aName === undefined ? null : aName;
                            if (aChunks != null) this.add(aChunks);
                        }
                        SourceNode.fromStringWithSourceMap = function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer) {
                            var node = new SourceNode();
                            var remainingLines = aGeneratedCode.split("\n");
                            var lastGeneratedLine = 1,
                                lastGeneratedColumn = 0;
                            var lastMapping = null;
                            aSourceMapConsumer.eachMapping(function (mapping) {
                                if (lastMapping === null) {
                                    while (lastGeneratedLine < mapping.generatedLine) {
                                        node.add(remainingLines.shift() + "\n");
                                        lastGeneratedLine++;
                                    }
                                    if (lastGeneratedColumn < mapping.generatedColumn) {
                                        var nextLine = remainingLines[0];
                                        node.add(nextLine.substr(0, mapping.generatedColumn));
                                        remainingLines[0] = nextLine.substr(mapping.generatedColumn);
                                        lastGeneratedColumn = mapping.generatedColumn;
                                    }
                                } else {
                                    if (lastGeneratedLine < mapping.generatedLine) {
                                        var code = "";
                                        do {
                                            code += remainingLines.shift() + "\n";
                                            lastGeneratedLine++;
                                            lastGeneratedColumn = 0;
                                        } while (lastGeneratedLine < mapping.generatedLine);
                                        if (lastGeneratedColumn < mapping.generatedColumn) {
                                            var nextLine = remainingLines[0];
                                            code += nextLine.substr(0, mapping.generatedColumn);
                                            remainingLines[0] = nextLine.substr(mapping.generatedColumn);
                                            lastGeneratedColumn = mapping.generatedColumn;
                                        }
                                        addMappingWithCode(lastMapping, code);
                                    } else {
                                        var nextLine = remainingLines[0];
                                        var code = nextLine.substr(0, mapping.generatedColumn - lastGeneratedColumn);
                                        remainingLines[0] = nextLine.substr(mapping.generatedColumn - lastGeneratedColumn);
                                        lastGeneratedColumn = mapping.generatedColumn;
                                        addMappingWithCode(lastMapping, code);
                                    }
                                }
                                lastMapping = mapping;
                            }, this);
                            addMappingWithCode(lastMapping, remainingLines.join("\n"));
                            aSourceMapConsumer.sources.forEach(function (sourceFile) {
                                var content = aSourceMapConsumer.sourceContentFor(sourceFile);
                                if (content) {
                                    node.setSourceContent(sourceFile, content);
                                }
                            });
                            return node;
                            function addMappingWithCode(mapping, code) {
                                if (mapping === null || mapping.source === undefined) {
                                    node.add(code);
                                } else {
                                    node.add(new SourceNode(mapping.originalLine, mapping.originalColumn, mapping.source, code, mapping.name));
                                }
                            }
                        };
                        SourceNode.prototype.add = function SourceNode_add(aChunk) {
                            if (Array.isArray(aChunk)) {
                                aChunk.forEach(function (chunk) {
                                    this.add(chunk);
                                }, this);
                            } else if (aChunk instanceof SourceNode || typeof aChunk === "string") {
                                if (aChunk) {
                                    this.children.push(aChunk);
                                }
                            } else {
                                throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
                            }
                            return this;
                        };
                        SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
                            if (Array.isArray(aChunk)) {
                                for (var i = aChunk.length - 1; i >= 0; i--) {
                                    this.prepend(aChunk[i]);
                                }
                            } else if (aChunk instanceof SourceNode || typeof aChunk === "string") {
                                this.children.unshift(aChunk);
                            } else {
                                throw new TypeError("Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk);
                            }
                            return this;
                        };
                        SourceNode.prototype.walk = function SourceNode_walk(aFn) {
                            this.children.forEach(function (chunk) {
                                if (chunk instanceof SourceNode) {
                                    chunk.walk(aFn);
                                } else {
                                    if (chunk !== "") {
                                        aFn(chunk, { source: this.source, line: this.line, column: this.column, name: this.name });
                                    }
                                }
                            }, this);
                        };
                        SourceNode.prototype.join = function SourceNode_join(aSep) {
                            var newChildren;
                            var i;
                            var len = this.children.length;
                            if (len > 0) {
                                newChildren = [];
                                for (i = 0; i < len - 1; i++) {
                                    newChildren.push(this.children[i]);
                                    newChildren.push(aSep);
                                }
                                newChildren.push(this.children[i]);
                                this.children = newChildren;
                            }
                            return this;
                        };
                        SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
                            var lastChild = this.children[this.children.length - 1];
                            if (lastChild instanceof SourceNode) {
                                lastChild.replaceRight(aPattern, aReplacement);
                            } else if (typeof lastChild === "string") {
                                this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
                            } else {
                                this.children.push("".replace(aPattern, aReplacement));
                            }
                            return this;
                        };
                        SourceNode.prototype.setSourceContent = function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
                            this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
                        };
                        SourceNode.prototype.walkSourceContents = function SourceNode_walkSourceContents(aFn) {
                            this.children.forEach(function (chunk) {
                                if (chunk instanceof SourceNode) {
                                    chunk.walkSourceContents(aFn);
                                }
                            }, this);
                            Object.keys(this.sourceContents).forEach(function (sourceFileKey) {
                                aFn(util.fromSetString(sourceFileKey), this.sourceContents[sourceFileKey]);
                            }, this);
                        };
                        SourceNode.prototype.toString = function SourceNode_toString() {
                            var str = "";
                            this.walk(function (chunk) {
                                str += chunk;
                            });
                            return str;
                        };
                        SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
                            var generated = { code: "", line: 1, column: 0 };
                            var map = new SourceMapGenerator(aArgs);
                            var sourceMappingActive = false;
                            var lastOriginalSource = null;
                            var lastOriginalLine = null;
                            var lastOriginalColumn = null;
                            var lastOriginalName = null;
                            this.walk(function (chunk, original) {
                                generated.code += chunk;
                                if (original.source !== null && original.line !== null && original.column !== null) {
                                    if (lastOriginalSource !== original.source || lastOriginalLine !== original.line || lastOriginalColumn !== original.column || lastOriginalName !== original.name) {
                                        map.addMapping({ source: original.source, original: { line: original.line, column: original.column }, generated: { line: generated.line, column: generated.column }, name: original.name });
                                    }
                                    lastOriginalSource = original.source;
                                    lastOriginalLine = original.line;
                                    lastOriginalColumn = original.column;
                                    lastOriginalName = original.name;
                                    sourceMappingActive = true;
                                } else if (sourceMappingActive) {
                                    map.addMapping({ generated: { line: generated.line, column: generated.column } });
                                    lastOriginalSource = null;
                                    sourceMappingActive = false;
                                }
                                chunk.split("").forEach(function (ch) {
                                    if (ch === "\n") {
                                        generated.line++;
                                        generated.column = 0;
                                    } else {
                                        generated.column++;
                                    }
                                });
                            });
                            this.walkSourceContents(function (sourceFile, sourceContent) {
                                map.setSourceContent(sourceFile, sourceContent);
                            });
                            return { code: generated.code, map: map };
                        };
                        exports.SourceNode = SourceNode;
                    });
                },
                { "./source-map-generator": 21, "./util": 23, amdefine: 24 },
            ],
            23: [
                function (require, module, exports) {
                    if (typeof define !== "function") {
                        var define = require("amdefine")(module, require);
                    }
                    define(function (require, exports, module) {
                        function getArg(aArgs, aName, aDefaultValue) {
                            if (aName in aArgs) {
                                return aArgs[aName];
                            } else if (arguments.length === 3) {
                                return aDefaultValue;
                            } else {
                                throw new Error('"' + aName + '" is a required argument.');
                            }
                        }
                        exports.getArg = getArg;
                        var urlRegexp = /([\w+\-.]+):\/\/((\w+:\w+)@)?([\w.]+)?(:(\d+))?(\S+)?/;
                        function urlParse(aUrl) {
                            var match = aUrl.match(urlRegexp);
                            if (!match) {
                                return null;
                            }
                            return { scheme: match[1], auth: match[3], host: match[4], port: match[6], path: match[7] };
                        }
                        exports.urlParse = urlParse;
                        function urlGenerate(aParsedUrl) {
                            var url = aParsedUrl.scheme + "://";
                            if (aParsedUrl.auth) {
                                url += aParsedUrl.auth + "@";
                            }
                            if (aParsedUrl.host) {
                                url += aParsedUrl.host;
                            }
                            if (aParsedUrl.port) {
                                url += ":" + aParsedUrl.port;
                            }
                            if (aParsedUrl.path) {
                                url += aParsedUrl.path;
                            }
                            return url;
                        }
                        exports.urlGenerate = urlGenerate;
                        function join(aRoot, aPath) {
                            var url;
                            if (aPath.match(urlRegexp)) {
                                return aPath;
                            }
                            if (aPath.charAt(0) === "/" && (url = urlParse(aRoot))) {
                                url.path = aPath;
                                return urlGenerate(url);
                            }
                            return aRoot.replace(/\/$/, "") + "/" + aPath;
                        }
                        exports.join = join;
                        function toSetString(aStr) {
                            return "$" + aStr;
                        }
                        exports.toSetString = toSetString;
                        function fromSetString(aStr) {
                            return aStr.substr(1);
                        }
                        exports.fromSetString = fromSetString;
                        function relative(aRoot, aPath) {
                            aRoot = aRoot.replace(/\/$/, "");
                            var url = urlParse(aRoot);
                            if (aPath.charAt(0) == "/" && url && url.path == "/") {
                                return aPath.slice(1);
                            }
                            return aPath.indexOf(aRoot + "/") === 0 ? aPath.substr(aRoot.length + 1) : aPath;
                        }
                        exports.relative = relative;
                    });
                },
                { amdefine: 24 },
            ],
            24: [
                function (require, module, exports) {
                    var process = require("__browserify_process"),
                        __filename = "/node_modules/escodegen/node_modules/source-map/node_modules/amdefine/amdefine.js";
                    ("use strict");
                    function amdefine(module, requireFn) {
                        "use strict";
                        var defineCache = {},
                            loaderCache = {},
                            alreadyCalled = false,
                            path = require("path"),
                            makeRequire,
                            stringRequire;
                        function trimDots(ary) {
                            var i, part;
                            for (i = 0; ary[i]; i += 1) {
                                part = ary[i];
                                if (part === ".") {
                                    ary.splice(i, 1);
                                    i -= 1;
                                } else if (part === "..") {
                                    if (i === 1 && (ary[2] === ".." || ary[0] === "..")) {
                                        break;
                                    } else if (i > 0) {
                                        ary.splice(i - 1, 2);
                                        i -= 2;
                                    }
                                }
                            }
                        }
                        function normalize(name, baseName) {
                            var baseParts;
                            if (name && name.charAt(0) === ".") {
                                if (baseName) {
                                    baseParts = baseName.split("/");
                                    baseParts = baseParts.slice(0, baseParts.length - 1);
                                    baseParts = baseParts.concat(name.split("/"));
                                    trimDots(baseParts);
                                    name = baseParts.join("/");
                                }
                            }
                            return name;
                        }
                        function makeNormalize(relName) {
                            return function (name) {
                                return normalize(name, relName);
                            };
                        }
                        function makeLoad(id) {
                            function load(value) {
                                loaderCache[id] = value;
                            }
                            load.fromText = function (id, text) {
                                throw new Error("amdefine does not implement load.fromText");
                            };
                            return load;
                        }
                        makeRequire = function (systemRequire, exports, module, relId) {
                            function amdRequire(deps, callback) {
                                if (typeof deps === "string") {
                                    return stringRequire(systemRequire, exports, module, deps, relId);
                                } else {
                                    deps = deps.map(function (depName) {
                                        return stringRequire(systemRequire, exports, module, depName, relId);
                                    });
                                    process.nextTick(function () {
                                        callback.apply(null, deps);
                                    });
                                }
                            }
                            amdRequire.toUrl = function (filePath) {
                                if (filePath.indexOf(".") === 0) {
                                    return normalize(filePath, path.dirname(module.filename));
                                } else {
                                    return filePath;
                                }
                            };
                            return amdRequire;
                        };
                        requireFn =
                            requireFn ||
                            function req() {
                                return module.require.apply(module, arguments);
                            };
                        function runFactory(id, deps, factory) {
                            var r, e, m, result;
                            if (id) {
                                e = loaderCache[id] = {};
                                m = { id: id, uri: __filename, exports: e };
                                r = makeRequire(requireFn, e, m, id);
                            } else {
                                if (alreadyCalled) {
                                    throw new Error("amdefine with no module ID cannot be called more than once per file.");
                                }
                                alreadyCalled = true;
                                e = module.exports;
                                m = module;
                                r = makeRequire(requireFn, e, m, module.id);
                            }
                            if (deps) {
                                deps = deps.map(function (depName) {
                                    return r(depName);
                                });
                            }
                            if (typeof factory === "function") {
                                result = factory.apply(m.exports, deps);
                            } else {
                                result = factory;
                            }
                            if (result !== undefined) {
                                m.exports = result;
                                if (id) {
                                    loaderCache[id] = m.exports;
                                }
                            }
                        }
                        stringRequire = function (systemRequire, exports, module, id, relId) {
                            var index = id.indexOf("!"),
                                originalId = id,
                                prefix,
                                plugin;
                            if (index === -1) {
                                id = normalize(id, relId);
                                if (id === "require") {
                                    return makeRequire(systemRequire, exports, module, relId);
                                } else if (id === "exports") {
                                    return exports;
                                } else if (id === "module") {
                                    return module;
                                } else if (loaderCache.hasOwnProperty(id)) {
                                    return loaderCache[id];
                                } else if (defineCache[id]) {
                                    runFactory.apply(null, defineCache[id]);
                                    return loaderCache[id];
                                } else {
                                    if (systemRequire) {
                                        return systemRequire(originalId);
                                    } else {
                                        throw new Error("No module with ID: " + id);
                                    }
                                }
                            } else {
                                prefix = id.substring(0, index);
                                id = id.substring(index + 1, id.length);
                                plugin = stringRequire(systemRequire, exports, module, prefix, relId);
                                if (plugin.normalize) {
                                    id = plugin.normalize(id, makeNormalize(relId));
                                } else {
                                    id = normalize(id, relId);
                                }
                                if (loaderCache[id]) {
                                    return loaderCache[id];
                                } else {
                                    plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});
                                    return loaderCache[id];
                                }
                            }
                        };
                        function define(id, deps, factory) {
                            if (Array.isArray(id)) {
                                factory = deps;
                                deps = id;
                                id = undefined;
                            } else if (typeof id !== "string") {
                                factory = id;
                                id = deps = undefined;
                            }
                            if (deps && !Array.isArray(deps)) {
                                factory = deps;
                                deps = undefined;
                            }
                            if (!deps) {
                                deps = ["require", "exports", "module"];
                            }
                            if (id) {
                                defineCache[id] = [id, deps, factory];
                            } else {
                                runFactory(id, deps, factory);
                            }
                        }
                        define.require = function (id) {
                            if (loaderCache[id]) {
                                return loaderCache[id];
                            }
                            if (defineCache[id]) {
                                runFactory.apply(null, defineCache[id]);
                                return loaderCache[id];
                            }
                        };
                        define.amd = {};
                        return define;
                    }
                    module.exports = amdefine;
                },
                { __browserify_process: 8, path: 7 },
            ],
            25: [
                function (require, module, exports) {
                    module.exports = {
                        name: "escodegen",
                        description: "ECMAScript code generator",
                        homepage: "http://github.com/Constellation/escodegen.html",
                        main: "escodegen.js",
                        bin: { esgenerate: "./bin/esgenerate.js", escodegen: "./bin/escodegen.js" },
                        version: "0.0.21",
                        engines: { node: ">=0.4.0" },
                        maintainers: [{ name: "Yusuke Suzuki", email: "utatane.tea@gmail.com", url: "http://github.com/Constellation" }],
                        repository: { type: "git", url: "http://github.com/Constellation/escodegen.git" },
                        dependencies: { esprima: "~1.0.2", estraverse: "~0.0.4", "source-map": ">= 0.1.2" },
                        optionalDependencies: { "source-map": ">= 0.1.2" },
                        devDependencies: { "esprima-moz": "*", browserify: "*", q: "*", bower: "*", semver: "*" },
                        licenses: [{ type: "BSD", url: "http://github.com/Constellation/escodegen/raw/master/LICENSE.BSD" }],
                        scripts: { test: "node test/run.js", release: "node tools/release.js", build: "(echo '// Generated by browserify'; ./node_modules/.bin/browserify -i source-map tools/entry-point.js) > escodegen.browser.js" },
                        readme:
                            "Escodegen ([escodegen](http://github.com/Constellation/escodegen)) is\n[ECMAScript](http://www.ecma-international.org/publications/standards/Ecma-262.htm)\n(also popularly known as [JavaScript](http://en.wikipedia.org/wiki/JavaScript>JavaScript))\ncode generator from [Parser API](https://developer.mozilla.org/en/SpiderMonkey/Parser_API) AST.\nSee [online generator demo](http://constellation.github.com/escodegen/demo/index.html).\n\n\n### Install\n\nEscodegen can be used in a web browser:\n\n    <script src=\"escodegen.browser.js\"></script>\n\nor in a Node.js application via the package manager:\n\n    npm install escodegen\n\n\n### Usage\n\nA simple example: the program\n\n    escodegen.generate({\n        type: 'BinaryExpression',\n        operator: '+',\n        left: { type: 'Literal', value: 40 },\n        right: { type: 'Literal', value: 2 }\n    });\n\nproduces the string `'40 + 2'`\n\nSee the [API page](https://github.com/Constellation/escodegen/wiki/API) for\noptions. To run the tests, execute `npm test` in the root directory.\n\n\n### License\n\n#### Escodegen\n\nCopyright (C) 2012 [Yusuke Suzuki](http://github.com/Constellation)\n (twitter: [@Constellation](http://twitter.com/Constellation)) and other contributors.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n  * Redistributions of source code must retain the above copyright\n    notice, this list of conditions and the following disclaimer.\n\n  * Redistributions in binary form must reproduce the above copyright\n    notice, this list of conditions and the following disclaimer in the\n    documentation and/or other materials provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\"\nAND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\nIMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE\nARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY\nDIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\nLOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\nON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF\nTHIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\n#### source-map\n\nSourceNodeMocks has a limited interface of mozilla/source-map SourceNode implementations.\n\nCopyright (c) 2009-2011, Mozilla Foundation and contributors\nAll rights reserved.\n\nRedistribution and use in source and binary forms, with or without\nmodification, are permitted provided that the following conditions are met:\n\n* Redistributions of source code must retain the above copyright notice, this\n  list of conditions and the following disclaimer.\n\n* Redistributions in binary form must reproduce the above copyright notice,\n  this list of conditions and the following disclaimer in the documentation\n  and/or other materials provided with the distribution.\n\n* Neither the names of the Mozilla Foundation nor the names of project\n  contributors may be used to endorse or promote products derived from this\n  software without specific prior written permission.\n\nTHIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\" AND\nANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\nWARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\nDISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE\nFOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\nDAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\nCAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\nOR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\nOF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\n\n### Status\n\n[![Build Status](https://secure.travis-ci.org/Constellation/escodegen.png)](http://travis-ci.org/Constellation/escodegen)\n",
                        readmeFilename: "README.md",
                        bugs: { url: "https://github.com/Constellation/escodegen/issues" },
                        _id: "escodegen@0.0.21",
                        dist: { shasum: "e25b980d14722cb933bd676c4983519c35cc68da" },
                        _from: "escodegen@0.0.21",
                        _resolved: "https://registry.npmjs.org/escodegen/-/escodegen-0.0.21.tgz",
                    };
                },
                {},
            ],
            26: [
                function (require, module, exports) {
                    (function (root, factory) {
                        "use strict";
                        if (typeof define === "function" && define.amd) {
                            define(["exports"], factory);
                        } else if (typeof exports !== "undefined") {
                            factory(exports);
                        } else {
                            factory((root.esprima = {}));
                        }
                    })(this, function (exports) {
                        "use strict";
                        var Token, TokenName, Syntax, PropertyKind, Messages, Regex, source, strict, index, lineNumber, lineStart, length, buffer, state, extra;
                        Token = { BooleanLiteral: 1, EOF: 2, Identifier: 3, Keyword: 4, NullLiteral: 5, NumericLiteral: 6, Punctuator: 7, StringLiteral: 8 };
                        TokenName = {};
                        TokenName[Token.BooleanLiteral] = "Boolean";
                        TokenName[Token.EOF] = "<end>";
                        TokenName[Token.Identifier] = "Identifier";
                        TokenName[Token.Keyword] = "Keyword";
                        TokenName[Token.NullLiteral] = "Null";
                        TokenName[Token.NumericLiteral] = "Numeric";
                        TokenName[Token.Punctuator] = "Punctuator";
                        TokenName[Token.StringLiteral] = "String";
                        Syntax = {
                            AssignmentExpression: "AssignmentExpression",
                            ArrayExpression: "ArrayExpression",
                            BlockStatement: "BlockStatement",
                            BinaryExpression: "BinaryExpression",
                            BreakStatement: "BreakStatement",
                            CallExpression: "CallExpression",
                            CatchClause: "CatchClause",
                            ConditionalExpression: "ConditionalExpression",
                            ContinueStatement: "ContinueStatement",
                            DoWhileStatement: "DoWhileStatement",
                            DebuggerStatement: "DebuggerStatement",
                            EmptyStatement: "EmptyStatement",
                            ExpressionStatement: "ExpressionStatement",
                            ForStatement: "ForStatement",
                            ForInStatement: "ForInStatement",
                            FunctionDeclaration: "FunctionDeclaration",
                            FunctionExpression: "FunctionExpression",
                            Identifier: "Identifier",
                            IfStatement: "IfStatement",
                            Literal: "Literal",
                            LabeledStatement: "LabeledStatement",
                            LogicalExpression: "LogicalExpression",
                            MemberExpression: "MemberExpression",
                            NewExpression: "NewExpression",
                            ObjectExpression: "ObjectExpression",
                            Program: "Program",
                            Property: "Property",
                            ReturnStatement: "ReturnStatement",
                            SequenceExpression: "SequenceExpression",
                            SwitchStatement: "SwitchStatement",
                            SwitchCase: "SwitchCase",
                            ThisExpression: "ThisExpression",
                            ThrowStatement: "ThrowStatement",
                            TryStatement: "TryStatement",
                            UnaryExpression: "UnaryExpression",
                            UpdateExpression: "UpdateExpression",
                            VariableDeclaration: "VariableDeclaration",
                            VariableDeclarator: "VariableDeclarator",
                            WhileStatement: "WhileStatement",
                            WithStatement: "WithStatement",
                        };
                        PropertyKind = { Data: 1, Get: 2, Set: 4 };
                        Messages = {
                            UnexpectedToken: "Unexpected token %0",
                            UnexpectedNumber: "Unexpected number",
                            UnexpectedString: "Unexpected string",
                            UnexpectedIdentifier: "Unexpected identifier",
                            UnexpectedReserved: "Unexpected reserved word",
                            UnexpectedEOS: "Unexpected end of input",
                            NewlineAfterThrow: "Illegal newline after throw",
                            InvalidRegExp: "Invalid regular expression",
                            UnterminatedRegExp: "Invalid regular expression: missing /",
                            InvalidLHSInAssignment: "Invalid left-hand side in assignment",
                            InvalidLHSInForIn: "Invalid left-hand side in for-in",
                            MultipleDefaultsInSwitch: "More than one default clause in switch statement",
                            NoCatchOrFinally: "Missing catch or finally after try",
                            UnknownLabel: "Undefined label '%0'",
                            Redeclaration: "%0 '%1' has already been declared",
                            IllegalContinue: "Illegal continue statement",
                            IllegalBreak: "Illegal break statement",
                            IllegalReturn: "Illegal return statement",
                            StrictModeWith: "Strict mode code may not include a with statement",
                            StrictCatchVariable: "Catch variable may not be eval or arguments in strict mode",
                            StrictVarName: "Variable name may not be eval or arguments in strict mode",
                            StrictParamName: "Parameter name eval or arguments is not allowed in strict mode",
                            StrictParamDupe: "Strict mode function may not have duplicate parameter names",
                            StrictFunctionName: "Function name may not be eval or arguments in strict mode",
                            StrictOctalLiteral: "Octal literals are not allowed in strict mode.",
                            StrictDelete: "Delete of an unqualified identifier in strict mode.",
                            StrictDuplicateProperty: "Duplicate data property in object literal not allowed in strict mode",
                            AccessorDataProperty: "Object literal may not have data and accessor property with the same name",
                            AccessorGetSet: "Object literal may not have multiple get/set accessors with the same name",
                            StrictLHSAssignment: "Assignment to eval or arguments is not allowed in strict mode",
                            StrictLHSPostfix: "Postfix increment/decrement may not have eval or arguments operand in strict mode",
                            StrictLHSPrefix: "Prefix increment/decrement may not have eval or arguments operand in strict mode",
                            StrictReservedWord: "Use of future reserved word in strict mode",
                        };
                        Regex = {
                            NonAsciiIdentifierStart: new RegExp(
                                "[????????-????-????-????-????-????????-????????-??????-??????-????-????-????-????-??????-????-????-????-????????-??????????????-????????-????-??????-???????????-???????????????-?????????-??????-????????????-??????-??????-??????-????????????-??????-?????????-??????????????????-????????????-????????????-??????-????????????????????????-?????????-??????-??????-??????-??????-????????????-??????????????????-????????????-??????-????????????-???????????????-????????????-??????-??????-???????????????????????????-??????-?????????-??????-??????-??????-??????-?????????????????????-??????-??????-??????-??????-????????????????????????-??????-??????-??????????????????-??????-??????-??????-?????????-??????-????????????-???????????????????????????-??????-??????-??????????????????-???????????????-?????????-?????????-??????-??????-??????-?????????-??????-???????????????-??????-?????????-????????????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-????????????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-???????????????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-????????????-????????????-?????????-???????????????-??????-??????-??????-?????????-??????-??????-??????-??????-????????????-????????????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-?????????-??????-??????-??????-?????????-???????????????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-?????????????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-???]"
                            ),
                            NonAsciiIdentifierPart: new RegExp(
                                "[????????-????-????-????-????-????????-????????-??????-??????-????-????-????-????-????-??????-????-????????????????-????-????-????-????-????-????-????-??????-????-????-???????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-?????????-??????-????????????-???????????????-??????-??????-??????-????????????-??????-???????????????????????????-????????????-?????????-?????????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-?????????-??????-??????-??????-????????????-??????-????????????-??????-????????????-??????????????????-??????-???????????????-??????-??????-???????????????????????????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????????????????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-???????????????-??????-??????????????????-??????-??????-??????-??????-??????-?????????-??????-??????-????????????-??????-??????-?????????-?????????-?????????-????????????-??????-??????-???????????????????????????-??????-??????-??????????????????-??????-??????-?????????-??????-??????-???????????????-???????????????-??????-??????-??????-??????-?????????-??????-??????-????????????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-???????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-???????????????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-???????????????????????????-??????-?????????-????????????-?????????-???????????????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-????????????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-??????-??????-??????-??????-??????-??????-?????????????????????-??????-??????-??????-??????-??????-??????-????????????-??????-??????-??????-??????-?????????-??????-??????-??????-??????-??????-???]"
                            ),
                        };
                        function assert(condition, message) {
                            if (!condition) {
                                throw new Error("ASSERT: " + message);
                            }
                        }
                        function sliceSource(from, to) {
                            return source.slice(from, to);
                        }
                        if (typeof "esprima"[0] === "undefined") {
                            sliceSource = function sliceArraySource(from, to) {
                                return source.slice(from, to).join("");
                            };
                        }
                        function isDecimalDigit(ch) {
                            return "0123456789".indexOf(ch) >= 0;
                        }
                        function isHexDigit(ch) {
                            return "0123456789abcdefABCDEF".indexOf(ch) >= 0;
                        }
                        function isOctalDigit(ch) {
                            return "01234567".indexOf(ch) >= 0;
                        }
                        function isWhiteSpace(ch) {
                            return ch === " " || ch === "	" || ch === "" || ch === "\f" || ch === " " || (ch.charCodeAt(0) >= 5760 && "????????????????????????????????????????????????".indexOf(ch) >= 0);
                        }
                        function isLineTerminator(ch) {
                            return ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029";
                        }
                        function isIdentifierStart(ch) {
                            return ch === "$" || ch === "_" || ch === "\\" || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch.charCodeAt(0) >= 128 && Regex.NonAsciiIdentifierStart.test(ch));
                        }
                        function isIdentifierPart(ch) {
                            return ch === "$" || ch === "_" || ch === "\\" || (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || (ch.charCodeAt(0) >= 128 && Regex.NonAsciiIdentifierPart.test(ch));
                        }
                        function isFutureReservedWord(id) {
                            switch (id) {
                                case "class":
                                case "enum":
                                case "export":
                                case "extends":
                                case "import":
                                case "super":
                                    return true;
                            }
                            return false;
                        }
                        function isStrictModeReservedWord(id) {
                            switch (id) {
                                case "implements":
                                case "interface":
                                case "package":
                                case "private":
                                case "protected":
                                case "public":
                                case "static":
                                case "yield":
                                case "let":
                                    return true;
                            }
                            return false;
                        }
                        function isRestrictedWord(id) {
                            return id === "eval" || id === "arguments";
                        }
                        function isKeyword(id) {
                            var keyword = false;
                            switch (id.length) {
                                case 2:
                                    keyword = id === "if" || id === "in" || id === "do";
                                    break;
                                case 3:
                                    keyword = id === "var" || id === "for" || id === "new" || id === "try";
                                    break;
                                case 4:
                                    keyword = id === "this" || id === "else" || id === "case" || id === "void" || id === "with";
                                    break;
                                case 5:
                                    keyword = id === "while" || id === "break" || id === "catch" || id === "throw";
                                    break;
                                case 6:
                                    keyword = id === "return" || id === "typeof" || id === "delete" || id === "switch";
                                    break;
                                case 7:
                                    keyword = id === "default" || id === "finally";
                                    break;
                                case 8:
                                    keyword = id === "function" || id === "continue" || id === "debugger";
                                    break;
                                case 10:
                                    keyword = id === "instanceof";
                                    break;
                            }
                            if (keyword) {
                                return true;
                            }
                            switch (id) {
                                case "const":
                                    return true;
                                case "yield":
                                case "let":
                                    return true;
                            }
                            if (strict && isStrictModeReservedWord(id)) {
                                return true;
                            }
                            return isFutureReservedWord(id);
                        }
                        function skipComment() {
                            var ch, blockComment, lineComment;
                            blockComment = false;
                            lineComment = false;
                            while (index < length) {
                                ch = source[index];
                                if (lineComment) {
                                    ch = source[index++];
                                    if (isLineTerminator(ch)) {
                                        lineComment = false;
                                        if (ch === "\r" && source[index] === "\n") {
                                            ++index;
                                        }
                                        ++lineNumber;
                                        lineStart = index;
                                    }
                                } else if (blockComment) {
                                    if (isLineTerminator(ch)) {
                                        if (ch === "\r" && source[index + 1] === "\n") {
                                            ++index;
                                        }
                                        ++lineNumber;
                                        ++index;
                                        lineStart = index;
                                        if (index >= length) {
                                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                        }
                                    } else {
                                        ch = source[index++];
                                        if (index >= length) {
                                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                        }
                                        if (ch === "*") {
                                            ch = source[index];
                                            if (ch === "/") {
                                                ++index;
                                                blockComment = false;
                                            }
                                        }
                                    }
                                } else if (ch === "/") {
                                    ch = source[index + 1];
                                    if (ch === "/") {
                                        index += 2;
                                        lineComment = true;
                                    } else if (ch === "*") {
                                        index += 2;
                                        blockComment = true;
                                        if (index >= length) {
                                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                        }
                                    } else {
                                        break;
                                    }
                                } else if (isWhiteSpace(ch)) {
                                    ++index;
                                } else if (isLineTerminator(ch)) {
                                    ++index;
                                    if (ch === "\r" && source[index] === "\n") {
                                        ++index;
                                    }
                                    ++lineNumber;
                                    lineStart = index;
                                } else {
                                    break;
                                }
                            }
                        }
                        function scanHexEscape(prefix) {
                            var i,
                                len,
                                ch,
                                code = 0;
                            len = prefix === "u" ? 4 : 2;
                            for (i = 0; i < len; ++i) {
                                if (index < length && isHexDigit(source[index])) {
                                    ch = source[index++];
                                    code = code * 16 + "0123456789abcdef".indexOf(ch.toLowerCase());
                                } else {
                                    return "";
                                }
                            }
                            return String.fromCharCode(code);
                        }
                        function scanIdentifier() {
                            var ch, start, id, restore;
                            ch = source[index];
                            if (!isIdentifierStart(ch)) {
                                return;
                            }
                            start = index;
                            if (ch === "\\") {
                                ++index;
                                if (source[index] !== "u") {
                                    return;
                                }
                                ++index;
                                restore = index;
                                ch = scanHexEscape("u");
                                if (ch) {
                                    if (ch === "\\" || !isIdentifierStart(ch)) {
                                        return;
                                    }
                                    id = ch;
                                } else {
                                    index = restore;
                                    id = "u";
                                }
                            } else {
                                id = source[index++];
                            }
                            while (index < length) {
                                ch = source[index];
                                if (!isIdentifierPart(ch)) {
                                    break;
                                }
                                if (ch === "\\") {
                                    ++index;
                                    if (source[index] !== "u") {
                                        return;
                                    }
                                    ++index;
                                    restore = index;
                                    ch = scanHexEscape("u");
                                    if (ch) {
                                        if (ch === "\\" || !isIdentifierPart(ch)) {
                                            return;
                                        }
                                        id += ch;
                                    } else {
                                        index = restore;
                                        id += "u";
                                    }
                                } else {
                                    id += source[index++];
                                }
                            }
                            if (id.length === 1) {
                                return { type: Token.Identifier, value: id, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (isKeyword(id)) {
                                return { type: Token.Keyword, value: id, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (id === "null") {
                                return { type: Token.NullLiteral, value: id, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (id === "true" || id === "false") {
                                return { type: Token.BooleanLiteral, value: id, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            return { type: Token.Identifier, value: id, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                        }
                        function scanPunctuator() {
                            var start = index,
                                ch1 = source[index],
                                ch2,
                                ch3,
                                ch4;
                            if (ch1 === ";" || ch1 === "{" || ch1 === "}") {
                                ++index;
                                return { type: Token.Punctuator, value: ch1, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (ch1 === "," || ch1 === "(" || ch1 === ")") {
                                ++index;
                                return { type: Token.Punctuator, value: ch1, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            ch2 = source[index + 1];
                            if (ch1 === "." && !isDecimalDigit(ch2)) {
                                return { type: Token.Punctuator, value: source[index++], lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            ch3 = source[index + 2];
                            ch4 = source[index + 3];
                            if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
                                if (ch4 === "=") {
                                    index += 4;
                                    return { type: Token.Punctuator, value: ">>>=", lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                                }
                            }
                            if (ch1 === "=" && ch2 === "=" && ch3 === "=") {
                                index += 3;
                                return { type: Token.Punctuator, value: "===", lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (ch1 === "!" && ch2 === "=" && ch3 === "=") {
                                index += 3;
                                return { type: Token.Punctuator, value: "!==", lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
                                index += 3;
                                return { type: Token.Punctuator, value: ">>>", lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (ch1 === "<" && ch2 === "<" && ch3 === "=") {
                                index += 3;
                                return { type: Token.Punctuator, value: "<<=", lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (ch1 === ">" && ch2 === ">" && ch3 === "=") {
                                index += 3;
                                return { type: Token.Punctuator, value: ">>=", lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                            if (ch2 === "=") {
                                if ("<>=!+-*%&|^/".indexOf(ch1) >= 0) {
                                    index += 2;
                                    return { type: Token.Punctuator, value: ch1 + ch2, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                                }
                            }
                            if (ch1 === ch2 && "+-<>&|".indexOf(ch1) >= 0) {
                                if ("+-<>&|".indexOf(ch2) >= 0) {
                                    index += 2;
                                    return { type: Token.Punctuator, value: ch1 + ch2, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                                }
                            }
                            if ("[]<>+-*%&|^!~?:=/".indexOf(ch1) >= 0) {
                                return { type: Token.Punctuator, value: source[index++], lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                            }
                        }
                        function scanNumericLiteral() {
                            var number, start, ch;
                            ch = source[index];
                            assert(isDecimalDigit(ch) || ch === ".", "Numeric literal must start with a decimal digit or a decimal point");
                            start = index;
                            number = "";
                            if (ch !== ".") {
                                number = source[index++];
                                ch = source[index];
                                if (number === "0") {
                                    if (ch === "x" || ch === "X") {
                                        number += source[index++];
                                        while (index < length) {
                                            ch = source[index];
                                            if (!isHexDigit(ch)) {
                                                break;
                                            }
                                            number += source[index++];
                                        }
                                        if (number.length <= 2) {
                                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                        }
                                        if (index < length) {
                                            ch = source[index];
                                            if (isIdentifierStart(ch)) {
                                                throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                            }
                                        }
                                        return { type: Token.NumericLiteral, value: parseInt(number, 16), lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                                    } else if (isOctalDigit(ch)) {
                                        number += source[index++];
                                        while (index < length) {
                                            ch = source[index];
                                            if (!isOctalDigit(ch)) {
                                                break;
                                            }
                                            number += source[index++];
                                        }
                                        if (index < length) {
                                            ch = source[index];
                                            if (isIdentifierStart(ch) || isDecimalDigit(ch)) {
                                                throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                            }
                                        }
                                        return { type: Token.NumericLiteral, value: parseInt(number, 8), octal: true, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                                    }
                                    if (isDecimalDigit(ch)) {
                                        throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                    }
                                }
                                while (index < length) {
                                    ch = source[index];
                                    if (!isDecimalDigit(ch)) {
                                        break;
                                    }
                                    number += source[index++];
                                }
                            }
                            if (ch === ".") {
                                number += source[index++];
                                while (index < length) {
                                    ch = source[index];
                                    if (!isDecimalDigit(ch)) {
                                        break;
                                    }
                                    number += source[index++];
                                }
                            }
                            if (ch === "e" || ch === "E") {
                                number += source[index++];
                                ch = source[index];
                                if (ch === "+" || ch === "-") {
                                    number += source[index++];
                                }
                                ch = source[index];
                                if (isDecimalDigit(ch)) {
                                    number += source[index++];
                                    while (index < length) {
                                        ch = source[index];
                                        if (!isDecimalDigit(ch)) {
                                            break;
                                        }
                                        number += source[index++];
                                    }
                                } else {
                                    ch = "character " + ch;
                                    if (index >= length) {
                                        ch = "<end>";
                                    }
                                    throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                }
                            }
                            if (index < length) {
                                ch = source[index];
                                if (isIdentifierStart(ch)) {
                                    throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                }
                            }
                            return { type: Token.NumericLiteral, value: parseFloat(number), lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                        }
                        function scanStringLiteral() {
                            var str = "",
                                quote,
                                start,
                                ch,
                                code,
                                unescaped,
                                restore,
                                octal = false;
                            quote = source[index];
                            assert(quote === "'" || quote === '"', "String literal must starts with a quote");
                            start = index;
                            ++index;
                            while (index < length) {
                                ch = source[index++];
                                if (ch === quote) {
                                    quote = "";
                                    break;
                                } else if (ch === "\\") {
                                    ch = source[index++];
                                    if (!isLineTerminator(ch)) {
                                        switch (ch) {
                                            case "n":
                                                str += "\n";
                                                break;
                                            case "r":
                                                str += "\r";
                                                break;
                                            case "t":
                                                str += "	";
                                                break;
                                            case "u":
                                            case "x":
                                                restore = index;
                                                unescaped = scanHexEscape(ch);
                                                if (unescaped) {
                                                    str += unescaped;
                                                } else {
                                                    index = restore;
                                                    str += ch;
                                                }
                                                break;
                                            case "b":
                                                str += "\b";
                                                break;
                                            case "f":
                                                str += "\f";
                                                break;
                                            case "v":
                                                str += "";
                                                break;
                                            default:
                                                if (isOctalDigit(ch)) {
                                                    code = "01234567".indexOf(ch);
                                                    if (code !== 0) {
                                                        octal = true;
                                                    }
                                                    if (index < length && isOctalDigit(source[index])) {
                                                        octal = true;
                                                        code = code * 8 + "01234567".indexOf(source[index++]);
                                                        if ("0123".indexOf(ch) >= 0 && index < length && isOctalDigit(source[index])) {
                                                            code = code * 8 + "01234567".indexOf(source[index++]);
                                                        }
                                                    }
                                                    str += String.fromCharCode(code);
                                                } else {
                                                    str += ch;
                                                }
                                                break;
                                        }
                                    } else {
                                        ++lineNumber;
                                        if (ch === "\r" && source[index] === "\n") {
                                            ++index;
                                        }
                                    }
                                } else if (isLineTerminator(ch)) {
                                    break;
                                } else {
                                    str += ch;
                                }
                            }
                            if (quote !== "") {
                                throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                            }
                            return { type: Token.StringLiteral, value: str, octal: octal, lineNumber: lineNumber, lineStart: lineStart, range: [start, index] };
                        }
                        function scanRegExp() {
                            var str,
                                ch,
                                start,
                                pattern,
                                flags,
                                value,
                                classMarker = false,
                                restore,
                                terminated = false;
                            buffer = null;
                            skipComment();
                            start = index;
                            ch = source[index];
                            assert(ch === "/", "Regular expression literal must start with a slash");
                            str = source[index++];
                            while (index < length) {
                                ch = source[index++];
                                str += ch;
                                if (ch === "\\") {
                                    ch = source[index++];
                                    if (isLineTerminator(ch)) {
                                        throwError({}, Messages.UnterminatedRegExp);
                                    }
                                    str += ch;
                                } else if (classMarker) {
                                    if (ch === "]") {
                                        classMarker = false;
                                    }
                                } else {
                                    if (ch === "/") {
                                        terminated = true;
                                        break;
                                    } else if (ch === "[") {
                                        classMarker = true;
                                    } else if (isLineTerminator(ch)) {
                                        throwError({}, Messages.UnterminatedRegExp);
                                    }
                                }
                            }
                            if (!terminated) {
                                throwError({}, Messages.UnterminatedRegExp);
                            }
                            pattern = str.substr(1, str.length - 2);
                            flags = "";
                            while (index < length) {
                                ch = source[index];
                                if (!isIdentifierPart(ch)) {
                                    break;
                                }
                                ++index;
                                if (ch === "\\" && index < length) {
                                    ch = source[index];
                                    if (ch === "u") {
                                        ++index;
                                        restore = index;
                                        ch = scanHexEscape("u");
                                        if (ch) {
                                            flags += ch;
                                            str += "\\u";
                                            for (; restore < index; ++restore) {
                                                str += source[restore];
                                            }
                                        } else {
                                            index = restore;
                                            flags += "u";
                                            str += "\\u";
                                        }
                                    } else {
                                        str += "\\";
                                    }
                                } else {
                                    flags += ch;
                                    str += ch;
                                }
                            }
                            try {
                                value = new RegExp(pattern, flags);
                            } catch (e) {
                                throwError({}, Messages.InvalidRegExp);
                            }
                            return { literal: str, value: value, range: [start, index] };
                        }
                        function isIdentifierName(token) {
                            return token.type === Token.Identifier || token.type === Token.Keyword || token.type === Token.BooleanLiteral || token.type === Token.NullLiteral;
                        }
                        function advance() {
                            var ch, token;
                            skipComment();
                            if (index >= length) {
                                return { type: Token.EOF, lineNumber: lineNumber, lineStart: lineStart, range: [index, index] };
                            }
                            token = scanPunctuator();
                            if (typeof token !== "undefined") {
                                return token;
                            }
                            ch = source[index];
                            if (ch === "'" || ch === '"') {
                                return scanStringLiteral();
                            }
                            if (ch === "." || isDecimalDigit(ch)) {
                                return scanNumericLiteral();
                            }
                            token = scanIdentifier();
                            if (typeof token !== "undefined") {
                                return token;
                            }
                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                        }
                        function lex() {
                            var token;
                            if (buffer) {
                                index = buffer.range[1];
                                lineNumber = buffer.lineNumber;
                                lineStart = buffer.lineStart;
                                token = buffer;
                                buffer = null;
                                return token;
                            }
                            buffer = null;
                            return advance();
                        }
                        function lookahead() {
                            var pos, line, start;
                            if (buffer !== null) {
                                return buffer;
                            }
                            pos = index;
                            line = lineNumber;
                            start = lineStart;
                            buffer = advance();
                            index = pos;
                            lineNumber = line;
                            lineStart = start;
                            return buffer;
                        }
                        function peekLineTerminator() {
                            var pos, line, start, found;
                            pos = index;
                            line = lineNumber;
                            start = lineStart;
                            skipComment();
                            found = lineNumber !== line;
                            index = pos;
                            lineNumber = line;
                            lineStart = start;
                            return found;
                        }
                        function throwError(token, messageFormat) {
                            var error,
                                args = Array.prototype.slice.call(arguments, 2),
                                msg = messageFormat.replace(/%(\d)/g, function (whole, index) {
                                    return args[index] || "";
                                });
                            if (typeof token.lineNumber === "number") {
                                error = new Error("Line " + token.lineNumber + ": " + msg);
                                error.index = token.range[0];
                                error.lineNumber = token.lineNumber;
                                error.column = token.range[0] - lineStart + 1;
                            } else {
                                error = new Error("Line " + lineNumber + ": " + msg);
                                error.index = index;
                                error.lineNumber = lineNumber;
                                error.column = index - lineStart + 1;
                            }
                            throw error;
                        }
                        function throwErrorTolerant() {
                            try {
                                throwError.apply(null, arguments);
                            } catch (e) {
                                if (extra.errors) {
                                    extra.errors.push(e);
                                } else {
                                    throw e;
                                }
                            }
                        }
                        function throwUnexpected(token) {
                            if (token.type === Token.EOF) {
                                throwError(token, Messages.UnexpectedEOS);
                            }
                            if (token.type === Token.NumericLiteral) {
                                throwError(token, Messages.UnexpectedNumber);
                            }
                            if (token.type === Token.StringLiteral) {
                                throwError(token, Messages.UnexpectedString);
                            }
                            if (token.type === Token.Identifier) {
                                throwError(token, Messages.UnexpectedIdentifier);
                            }
                            if (token.type === Token.Keyword) {
                                if (isFutureReservedWord(token.value)) {
                                    throwError(token, Messages.UnexpectedReserved);
                                } else if (strict && isStrictModeReservedWord(token.value)) {
                                    throwErrorTolerant(token, Messages.StrictReservedWord);
                                    return;
                                }
                                throwError(token, Messages.UnexpectedToken, token.value);
                            }
                            throwError(token, Messages.UnexpectedToken, token.value);
                        }
                        function expect(value) {
                            var token = lex();
                            if (token.type !== Token.Punctuator || token.value !== value) {
                                throwUnexpected(token);
                            }
                        }
                        function expectKeyword(keyword) {
                            var token = lex();
                            if (token.type !== Token.Keyword || token.value !== keyword) {
                                throwUnexpected(token);
                            }
                        }
                        function match(value) {
                            var token = lookahead();
                            return token.type === Token.Punctuator && token.value === value;
                        }
                        function matchKeyword(keyword) {
                            var token = lookahead();
                            return token.type === Token.Keyword && token.value === keyword;
                        }
                        function matchAssign() {
                            var token = lookahead(),
                                op = token.value;
                            if (token.type !== Token.Punctuator) {
                                return false;
                            }
                            return op === "=" || op === "*=" || op === "/=" || op === "%=" || op === "+=" || op === "-=" || op === "<<=" || op === ">>=" || op === ">>>=" || op === "&=" || op === "^=" || op === "|=";
                        }
                        function consumeSemicolon() {
                            var token, line;
                            if (source[index] === ";") {
                                lex();
                                return;
                            }
                            line = lineNumber;
                            skipComment();
                            if (lineNumber !== line) {
                                return;
                            }
                            if (match(";")) {
                                lex();
                                return;
                            }
                            token = lookahead();
                            if (token.type !== Token.EOF && !match("}")) {
                                throwUnexpected(token);
                            }
                        }
                        function isLeftHandSide(expr) {
                            return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
                        }
                        function parseArrayInitialiser() {
                            var elements = [];
                            expect("[");
                            while (!match("]")) {
                                if (match(",")) {
                                    lex();
                                    elements.push(null);
                                } else {
                                    elements.push(parseAssignmentExpression());
                                    if (!match("]")) {
                                        expect(",");
                                    }
                                }
                            }
                            expect("]");
                            return { type: Syntax.ArrayExpression, elements: elements };
                        }
                        function parsePropertyFunction(param, first) {
                            var previousStrict, body;
                            previousStrict = strict;
                            body = parseFunctionSourceElements();
                            if (first && strict && isRestrictedWord(param[0].name)) {
                                throwErrorTolerant(first, Messages.StrictParamName);
                            }
                            strict = previousStrict;
                            return { type: Syntax.FunctionExpression, id: null, params: param, defaults: [], body: body, rest: null, generator: false, expression: false };
                        }
                        function parseObjectPropertyKey() {
                            var token = lex();
                            if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
                                if (strict && token.octal) {
                                    throwErrorTolerant(token, Messages.StrictOctalLiteral);
                                }
                                return createLiteral(token);
                            }
                            return { type: Syntax.Identifier, name: token.value };
                        }
                        function parseObjectProperty() {
                            var token, key, id, param;
                            token = lookahead();
                            if (token.type === Token.Identifier) {
                                id = parseObjectPropertyKey();
                                if (token.value === "get" && !match(":")) {
                                    key = parseObjectPropertyKey();
                                    expect("(");
                                    expect(")");
                                    return { type: Syntax.Property, key: key, value: parsePropertyFunction([]), kind: "get" };
                                } else if (token.value === "set" && !match(":")) {
                                    key = parseObjectPropertyKey();
                                    expect("(");
                                    token = lookahead();
                                    if (token.type !== Token.Identifier) {
                                        expect(")");
                                        throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
                                        return { type: Syntax.Property, key: key, value: parsePropertyFunction([]), kind: "set" };
                                    } else {
                                        param = [parseVariableIdentifier()];
                                        expect(")");
                                        return { type: Syntax.Property, key: key, value: parsePropertyFunction(param, token), kind: "set" };
                                    }
                                } else {
                                    expect(":");
                                    return { type: Syntax.Property, key: id, value: parseAssignmentExpression(), kind: "init" };
                                }
                            } else if (token.type === Token.EOF || token.type === Token.Punctuator) {
                                throwUnexpected(token);
                            } else {
                                key = parseObjectPropertyKey();
                                expect(":");
                                return { type: Syntax.Property, key: key, value: parseAssignmentExpression(), kind: "init" };
                            }
                        }
                        function parseObjectInitialiser() {
                            var properties = [],
                                property,
                                name,
                                kind,
                                map = {},
                                toString = String;
                            expect("{");
                            while (!match("}")) {
                                property = parseObjectProperty();
                                if (property.key.type === Syntax.Identifier) {
                                    name = property.key.name;
                                } else {
                                    name = toString(property.key.value);
                                }
                                kind = property.kind === "init" ? PropertyKind.Data : property.kind === "get" ? PropertyKind.Get : PropertyKind.Set;
                                if (Object.prototype.hasOwnProperty.call(map, name)) {
                                    if (map[name] === PropertyKind.Data) {
                                        if (strict && kind === PropertyKind.Data) {
                                            throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                                        } else if (kind !== PropertyKind.Data) {
                                            throwErrorTolerant({}, Messages.AccessorDataProperty);
                                        }
                                    } else {
                                        if (kind === PropertyKind.Data) {
                                            throwErrorTolerant({}, Messages.AccessorDataProperty);
                                        } else if (map[name] & kind) {
                                            throwErrorTolerant({}, Messages.AccessorGetSet);
                                        }
                                    }
                                    map[name] |= kind;
                                } else {
                                    map[name] = kind;
                                }
                                properties.push(property);
                                if (!match("}")) {
                                    expect(",");
                                }
                            }
                            expect("}");
                            return { type: Syntax.ObjectExpression, properties: properties };
                        }
                        function parseGroupExpression() {
                            var expr;
                            expect("(");
                            expr = parseExpression();
                            expect(")");
                            return expr;
                        }
                        function parsePrimaryExpression() {
                            var token = lookahead(),
                                type = token.type;
                            if (type === Token.Identifier) {
                                return { type: Syntax.Identifier, name: lex().value };
                            }
                            if (type === Token.StringLiteral || type === Token.NumericLiteral) {
                                if (strict && token.octal) {
                                    throwErrorTolerant(token, Messages.StrictOctalLiteral);
                                }
                                return createLiteral(lex());
                            }
                            if (type === Token.Keyword) {
                                if (matchKeyword("this")) {
                                    lex();
                                    return { type: Syntax.ThisExpression };
                                }
                                if (matchKeyword("function")) {
                                    return parseFunctionExpression();
                                }
                            }
                            if (type === Token.BooleanLiteral) {
                                lex();
                                token.value = token.value === "true";
                                return createLiteral(token);
                            }
                            if (type === Token.NullLiteral) {
                                lex();
                                token.value = null;
                                return createLiteral(token);
                            }
                            if (match("[")) {
                                return parseArrayInitialiser();
                            }
                            if (match("{")) {
                                return parseObjectInitialiser();
                            }
                            if (match("(")) {
                                return parseGroupExpression();
                            }
                            if (match("/") || match("/=")) {
                                return createLiteral(scanRegExp());
                            }
                            return throwUnexpected(lex());
                        }
                        function parseArguments() {
                            var args = [];
                            expect("(");
                            if (!match(")")) {
                                while (index < length) {
                                    args.push(parseAssignmentExpression());
                                    if (match(")")) {
                                        break;
                                    }
                                    expect(",");
                                }
                            }
                            expect(")");
                            return args;
                        }
                        function parseNonComputedProperty() {
                            var token = lex();
                            if (!isIdentifierName(token)) {
                                throwUnexpected(token);
                            }
                            return { type: Syntax.Identifier, name: token.value };
                        }
                        function parseNonComputedMember() {
                            expect(".");
                            return parseNonComputedProperty();
                        }
                        function parseComputedMember() {
                            var expr;
                            expect("[");
                            expr = parseExpression();
                            expect("]");
                            return expr;
                        }
                        function parseNewExpression() {
                            var expr;
                            expectKeyword("new");
                            expr = { type: Syntax.NewExpression, callee: parseLeftHandSideExpression(), arguments: [] };
                            if (match("(")) {
                                expr["arguments"] = parseArguments();
                            }
                            return expr;
                        }
                        function parseLeftHandSideExpressionAllowCall() {
                            var expr;
                            expr = matchKeyword("new") ? parseNewExpression() : parsePrimaryExpression();
                            while (match(".") || match("[") || match("(")) {
                                if (match("(")) {
                                    expr = { type: Syntax.CallExpression, callee: expr, arguments: parseArguments() };
                                } else if (match("[")) {
                                    expr = { type: Syntax.MemberExpression, computed: true, object: expr, property: parseComputedMember() };
                                } else {
                                    expr = { type: Syntax.MemberExpression, computed: false, object: expr, property: parseNonComputedMember() };
                                }
                            }
                            return expr;
                        }
                        function parseLeftHandSideExpression() {
                            var expr;
                            expr = matchKeyword("new") ? parseNewExpression() : parsePrimaryExpression();
                            while (match(".") || match("[")) {
                                if (match("[")) {
                                    expr = { type: Syntax.MemberExpression, computed: true, object: expr, property: parseComputedMember() };
                                } else {
                                    expr = { type: Syntax.MemberExpression, computed: false, object: expr, property: parseNonComputedMember() };
                                }
                            }
                            return expr;
                        }
                        function parsePostfixExpression() {
                            var expr = parseLeftHandSideExpressionAllowCall(),
                                token;
                            token = lookahead();
                            if (token.type !== Token.Punctuator) {
                                return expr;
                            }
                            if ((match("++") || match("--")) && !peekLineTerminator()) {
                                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                                    throwErrorTolerant({}, Messages.StrictLHSPostfix);
                                }
                                if (!isLeftHandSide(expr)) {
                                    throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                                }
                                expr = { type: Syntax.UpdateExpression, operator: lex().value, argument: expr, prefix: false };
                            }
                            return expr;
                        }
                        function parseUnaryExpression() {
                            var token, expr;
                            token = lookahead();
                            if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
                                return parsePostfixExpression();
                            }
                            if (match("++") || match("--")) {
                                token = lex();
                                expr = parseUnaryExpression();
                                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                                    throwErrorTolerant({}, Messages.StrictLHSPrefix);
                                }
                                if (!isLeftHandSide(expr)) {
                                    throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                                }
                                expr = { type: Syntax.UpdateExpression, operator: token.value, argument: expr, prefix: true };
                                return expr;
                            }
                            if (match("+") || match("-") || match("~") || match("!")) {
                                expr = { type: Syntax.UnaryExpression, operator: lex().value, argument: parseUnaryExpression(), prefix: true };
                                return expr;
                            }
                            if (matchKeyword("delete") || matchKeyword("void") || matchKeyword("typeof")) {
                                expr = { type: Syntax.UnaryExpression, operator: lex().value, argument: parseUnaryExpression(), prefix: true };
                                if (strict && expr.operator === "delete" && expr.argument.type === Syntax.Identifier) {
                                    throwErrorTolerant({}, Messages.StrictDelete);
                                }
                                return expr;
                            }
                            return parsePostfixExpression();
                        }
                        function parseMultiplicativeExpression() {
                            var expr = parseUnaryExpression();
                            while (match("*") || match("/") || match("%")) {
                                expr = { type: Syntax.BinaryExpression, operator: lex().value, left: expr, right: parseUnaryExpression() };
                            }
                            return expr;
                        }
                        function parseAdditiveExpression() {
                            var expr = parseMultiplicativeExpression();
                            while (match("+") || match("-")) {
                                expr = { type: Syntax.BinaryExpression, operator: lex().value, left: expr, right: parseMultiplicativeExpression() };
                            }
                            return expr;
                        }
                        function parseShiftExpression() {
                            var expr = parseAdditiveExpression();
                            while (match("<<") || match(">>") || match(">>>")) {
                                expr = { type: Syntax.BinaryExpression, operator: lex().value, left: expr, right: parseAdditiveExpression() };
                            }
                            return expr;
                        }
                        function parseRelationalExpression() {
                            var expr, previousAllowIn;
                            previousAllowIn = state.allowIn;
                            state.allowIn = true;
                            expr = parseShiftExpression();
                            while (match("<") || match(">") || match("<=") || match(">=") || (previousAllowIn && matchKeyword("in")) || matchKeyword("instanceof")) {
                                expr = { type: Syntax.BinaryExpression, operator: lex().value, left: expr, right: parseShiftExpression() };
                            }
                            state.allowIn = previousAllowIn;
                            return expr;
                        }
                        function parseEqualityExpression() {
                            var expr = parseRelationalExpression();
                            while (match("==") || match("!=") || match("===") || match("!==")) {
                                expr = { type: Syntax.BinaryExpression, operator: lex().value, left: expr, right: parseRelationalExpression() };
                            }
                            return expr;
                        }
                        function parseBitwiseANDExpression() {
                            var expr = parseEqualityExpression();
                            while (match("&")) {
                                lex();
                                expr = { type: Syntax.BinaryExpression, operator: "&", left: expr, right: parseEqualityExpression() };
                            }
                            return expr;
                        }
                        function parseBitwiseXORExpression() {
                            var expr = parseBitwiseANDExpression();
                            while (match("^")) {
                                lex();
                                expr = { type: Syntax.BinaryExpression, operator: "^", left: expr, right: parseBitwiseANDExpression() };
                            }
                            return expr;
                        }
                        function parseBitwiseORExpression() {
                            var expr = parseBitwiseXORExpression();
                            while (match("|")) {
                                lex();
                                expr = { type: Syntax.BinaryExpression, operator: "|", left: expr, right: parseBitwiseXORExpression() };
                            }
                            return expr;
                        }
                        function parseLogicalANDExpression() {
                            var expr = parseBitwiseORExpression();
                            while (match("&&")) {
                                lex();
                                expr = { type: Syntax.LogicalExpression, operator: "&&", left: expr, right: parseBitwiseORExpression() };
                            }
                            return expr;
                        }
                        function parseLogicalORExpression() {
                            var expr = parseLogicalANDExpression();
                            while (match("||")) {
                                lex();
                                expr = { type: Syntax.LogicalExpression, operator: "||", left: expr, right: parseLogicalANDExpression() };
                            }
                            return expr;
                        }
                        function parseConditionalExpression() {
                            var expr, previousAllowIn, consequent;
                            expr = parseLogicalORExpression();
                            if (match("?")) {
                                lex();
                                previousAllowIn = state.allowIn;
                                state.allowIn = true;
                                consequent = parseAssignmentExpression();
                                state.allowIn = previousAllowIn;
                                expect(":");
                                expr = { type: Syntax.ConditionalExpression, test: expr, consequent: consequent, alternate: parseAssignmentExpression() };
                            }
                            return expr;
                        }
                        function parseAssignmentExpression() {
                            var token, expr;
                            token = lookahead();
                            expr = parseConditionalExpression();
                            if (matchAssign()) {
                                if (!isLeftHandSide(expr)) {
                                    throwErrorTolerant({}, Messages.InvalidLHSInAssignment);
                                }
                                if (strict && expr.type === Syntax.Identifier && isRestrictedWord(expr.name)) {
                                    throwErrorTolerant(token, Messages.StrictLHSAssignment);
                                }
                                expr = { type: Syntax.AssignmentExpression, operator: lex().value, left: expr, right: parseAssignmentExpression() };
                            }
                            return expr;
                        }
                        function parseExpression() {
                            var expr = parseAssignmentExpression();
                            if (match(",")) {
                                expr = { type: Syntax.SequenceExpression, expressions: [expr] };
                                while (index < length) {
                                    if (!match(",")) {
                                        break;
                                    }
                                    lex();
                                    expr.expressions.push(parseAssignmentExpression());
                                }
                            }
                            return expr;
                        }
                        function parseStatementList() {
                            var list = [],
                                statement;
                            while (index < length) {
                                if (match("}")) {
                                    break;
                                }
                                statement = parseSourceElement();
                                if (typeof statement === "undefined") {
                                    break;
                                }
                                list.push(statement);
                            }
                            return list;
                        }
                        function parseBlock() {
                            var block;
                            expect("{");
                            block = parseStatementList();
                            expect("}");
                            return { type: Syntax.BlockStatement, body: block };
                        }
                        function parseVariableIdentifier() {
                            var token = lex();
                            if (token.type !== Token.Identifier) {
                                throwUnexpected(token);
                            }
                            return { type: Syntax.Identifier, name: token.value };
                        }
                        function parseVariableDeclaration(kind) {
                            var id = parseVariableIdentifier(),
                                init = null;
                            if (strict && isRestrictedWord(id.name)) {
                                throwErrorTolerant({}, Messages.StrictVarName);
                            }
                            if (kind === "const") {
                                expect("=");
                                init = parseAssignmentExpression();
                            } else if (match("=")) {
                                lex();
                                init = parseAssignmentExpression();
                            }
                            return { type: Syntax.VariableDeclarator, id: id, init: init };
                        }
                        function parseVariableDeclarationList(kind) {
                            var list = [];
                            do {
                                list.push(parseVariableDeclaration(kind));
                                if (!match(",")) {
                                    break;
                                }
                                lex();
                            } while (index < length);
                            return list;
                        }
                        function parseVariableStatement() {
                            var declarations;
                            expectKeyword("var");
                            declarations = parseVariableDeclarationList();
                            consumeSemicolon();
                            return { type: Syntax.VariableDeclaration, declarations: declarations, kind: "var" };
                        }
                        function parseConstLetDeclaration(kind) {
                            var declarations;
                            expectKeyword(kind);
                            declarations = parseVariableDeclarationList(kind);
                            consumeSemicolon();
                            return { type: Syntax.VariableDeclaration, declarations: declarations, kind: kind };
                        }
                        function parseEmptyStatement() {
                            expect(";");
                            return { type: Syntax.EmptyStatement };
                        }
                        function parseExpressionStatement() {
                            var expr = parseExpression();
                            consumeSemicolon();
                            return { type: Syntax.ExpressionStatement, expression: expr };
                        }
                        function parseIfStatement() {
                            var test, consequent, alternate;
                            expectKeyword("if");
                            expect("(");
                            test = parseExpression();
                            expect(")");
                            consequent = parseStatement();
                            if (matchKeyword("else")) {
                                lex();
                                alternate = parseStatement();
                            } else {
                                alternate = null;
                            }
                            return { type: Syntax.IfStatement, test: test, consequent: consequent, alternate: alternate };
                        }
                        function parseDoWhileStatement() {
                            var body, test, oldInIteration;
                            expectKeyword("do");
                            oldInIteration = state.inIteration;
                            state.inIteration = true;
                            body = parseStatement();
                            state.inIteration = oldInIteration;
                            expectKeyword("while");
                            expect("(");
                            test = parseExpression();
                            expect(")");
                            if (match(";")) {
                                lex();
                            }
                            return { type: Syntax.DoWhileStatement, body: body, test: test };
                        }
                        function parseWhileStatement() {
                            var test, body, oldInIteration;
                            expectKeyword("while");
                            expect("(");
                            test = parseExpression();
                            expect(")");
                            oldInIteration = state.inIteration;
                            state.inIteration = true;
                            body = parseStatement();
                            state.inIteration = oldInIteration;
                            return { type: Syntax.WhileStatement, test: test, body: body };
                        }
                        function parseForVariableDeclaration() {
                            var token = lex();
                            return { type: Syntax.VariableDeclaration, declarations: parseVariableDeclarationList(), kind: token.value };
                        }
                        function parseForStatement() {
                            var init, test, update, left, right, body, oldInIteration;
                            init = test = update = null;
                            expectKeyword("for");
                            expect("(");
                            if (match(";")) {
                                lex();
                            } else {
                                if (matchKeyword("var") || matchKeyword("let")) {
                                    state.allowIn = false;
                                    init = parseForVariableDeclaration();
                                    state.allowIn = true;
                                    if (init.declarations.length === 1 && matchKeyword("in")) {
                                        lex();
                                        left = init;
                                        right = parseExpression();
                                        init = null;
                                    }
                                } else {
                                    state.allowIn = false;
                                    init = parseExpression();
                                    state.allowIn = true;
                                    if (matchKeyword("in")) {
                                        if (!isLeftHandSide(init)) {
                                            throwErrorTolerant({}, Messages.InvalidLHSInForIn);
                                        }
                                        lex();
                                        left = init;
                                        right = parseExpression();
                                        init = null;
                                    }
                                }
                                if (typeof left === "undefined") {
                                    expect(";");
                                }
                            }
                            if (typeof left === "undefined") {
                                if (!match(";")) {
                                    test = parseExpression();
                                }
                                expect(";");
                                if (!match(")")) {
                                    update = parseExpression();
                                }
                            }
                            expect(")");
                            oldInIteration = state.inIteration;
                            state.inIteration = true;
                            body = parseStatement();
                            state.inIteration = oldInIteration;
                            if (typeof left === "undefined") {
                                return { type: Syntax.ForStatement, init: init, test: test, update: update, body: body };
                            }
                            return { type: Syntax.ForInStatement, left: left, right: right, body: body, each: false };
                        }
                        function parseContinueStatement() {
                            var token,
                                label = null;
                            expectKeyword("continue");
                            if (source[index] === ";") {
                                lex();
                                if (!state.inIteration) {
                                    throwError({}, Messages.IllegalContinue);
                                }
                                return { type: Syntax.ContinueStatement, label: null };
                            }
                            if (peekLineTerminator()) {
                                if (!state.inIteration) {
                                    throwError({}, Messages.IllegalContinue);
                                }
                                return { type: Syntax.ContinueStatement, label: null };
                            }
                            token = lookahead();
                            if (token.type === Token.Identifier) {
                                label = parseVariableIdentifier();
                                if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                                    throwError({}, Messages.UnknownLabel, label.name);
                                }
                            }
                            consumeSemicolon();
                            if (label === null && !state.inIteration) {
                                throwError({}, Messages.IllegalContinue);
                            }
                            return { type: Syntax.ContinueStatement, label: label };
                        }
                        function parseBreakStatement() {
                            var token,
                                label = null;
                            expectKeyword("break");
                            if (source[index] === ";") {
                                lex();
                                if (!(state.inIteration || state.inSwitch)) {
                                    throwError({}, Messages.IllegalBreak);
                                }
                                return { type: Syntax.BreakStatement, label: null };
                            }
                            if (peekLineTerminator()) {
                                if (!(state.inIteration || state.inSwitch)) {
                                    throwError({}, Messages.IllegalBreak);
                                }
                                return { type: Syntax.BreakStatement, label: null };
                            }
                            token = lookahead();
                            if (token.type === Token.Identifier) {
                                label = parseVariableIdentifier();
                                if (!Object.prototype.hasOwnProperty.call(state.labelSet, label.name)) {
                                    throwError({}, Messages.UnknownLabel, label.name);
                                }
                            }
                            consumeSemicolon();
                            if (label === null && !(state.inIteration || state.inSwitch)) {
                                throwError({}, Messages.IllegalBreak);
                            }
                            return { type: Syntax.BreakStatement, label: label };
                        }
                        function parseReturnStatement() {
                            var token,
                                argument = null;
                            expectKeyword("return");
                            if (!state.inFunctionBody) {
                                throwErrorTolerant({}, Messages.IllegalReturn);
                            }
                            if (source[index] === " ") {
                                if (isIdentifierStart(source[index + 1])) {
                                    argument = parseExpression();
                                    consumeSemicolon();
                                    return { type: Syntax.ReturnStatement, argument: argument };
                                }
                            }
                            if (peekLineTerminator()) {
                                return { type: Syntax.ReturnStatement, argument: null };
                            }
                            if (!match(";")) {
                                token = lookahead();
                                if (!match("}") && token.type !== Token.EOF) {
                                    argument = parseExpression();
                                }
                            }
                            consumeSemicolon();
                            return { type: Syntax.ReturnStatement, argument: argument };
                        }
                        function parseWithStatement() {
                            var object, body;
                            if (strict) {
                                throwErrorTolerant({}, Messages.StrictModeWith);
                            }
                            expectKeyword("with");
                            expect("(");
                            object = parseExpression();
                            expect(")");
                            body = parseStatement();
                            return { type: Syntax.WithStatement, object: object, body: body };
                        }
                        function parseSwitchCase() {
                            var test,
                                consequent = [],
                                statement;
                            if (matchKeyword("default")) {
                                lex();
                                test = null;
                            } else {
                                expectKeyword("case");
                                test = parseExpression();
                            }
                            expect(":");
                            while (index < length) {
                                if (match("}") || matchKeyword("default") || matchKeyword("case")) {
                                    break;
                                }
                                statement = parseStatement();
                                if (typeof statement === "undefined") {
                                    break;
                                }
                                consequent.push(statement);
                            }
                            return { type: Syntax.SwitchCase, test: test, consequent: consequent };
                        }
                        function parseSwitchStatement() {
                            var discriminant, cases, clause, oldInSwitch, defaultFound;
                            expectKeyword("switch");
                            expect("(");
                            discriminant = parseExpression();
                            expect(")");
                            expect("{");
                            cases = [];
                            if (match("}")) {
                                lex();
                                return { type: Syntax.SwitchStatement, discriminant: discriminant, cases: cases };
                            }
                            oldInSwitch = state.inSwitch;
                            state.inSwitch = true;
                            defaultFound = false;
                            while (index < length) {
                                if (match("}")) {
                                    break;
                                }
                                clause = parseSwitchCase();
                                if (clause.test === null) {
                                    if (defaultFound) {
                                        throwError({}, Messages.MultipleDefaultsInSwitch);
                                    }
                                    defaultFound = true;
                                }
                                cases.push(clause);
                            }
                            state.inSwitch = oldInSwitch;
                            expect("}");
                            return { type: Syntax.SwitchStatement, discriminant: discriminant, cases: cases };
                        }
                        function parseThrowStatement() {
                            var argument;
                            expectKeyword("throw");
                            if (peekLineTerminator()) {
                                throwError({}, Messages.NewlineAfterThrow);
                            }
                            argument = parseExpression();
                            consumeSemicolon();
                            return { type: Syntax.ThrowStatement, argument: argument };
                        }
                        function parseCatchClause() {
                            var param;
                            expectKeyword("catch");
                            expect("(");
                            if (match(")")) {
                                throwUnexpected(lookahead());
                            }
                            param = parseVariableIdentifier();
                            if (strict && isRestrictedWord(param.name)) {
                                throwErrorTolerant({}, Messages.StrictCatchVariable);
                            }
                            expect(")");
                            return { type: Syntax.CatchClause, param: param, body: parseBlock() };
                        }
                        function parseTryStatement() {
                            var block,
                                handlers = [],
                                finalizer = null;
                            expectKeyword("try");
                            block = parseBlock();
                            if (matchKeyword("catch")) {
                                handlers.push(parseCatchClause());
                            }
                            if (matchKeyword("finally")) {
                                lex();
                                finalizer = parseBlock();
                            }
                            if (handlers.length === 0 && !finalizer) {
                                throwError({}, Messages.NoCatchOrFinally);
                            }
                            return { type: Syntax.TryStatement, block: block, guardedHandlers: [], handlers: handlers, finalizer: finalizer };
                        }
                        function parseDebuggerStatement() {
                            expectKeyword("debugger");
                            consumeSemicolon();
                            return { type: Syntax.DebuggerStatement };
                        }
                        function parseStatement() {
                            var token = lookahead(),
                                expr,
                                labeledBody;
                            if (token.type === Token.EOF) {
                                throwUnexpected(token);
                            }
                            if (token.type === Token.Punctuator) {
                                switch (token.value) {
                                    case ";":
                                        return parseEmptyStatement();
                                    case "{":
                                        return parseBlock();
                                    case "(":
                                        return parseExpressionStatement();
                                    default:
                                        break;
                                }
                            }
                            if (token.type === Token.Keyword) {
                                switch (token.value) {
                                    case "break":
                                        return parseBreakStatement();
                                    case "continue":
                                        return parseContinueStatement();
                                    case "debugger":
                                        return parseDebuggerStatement();
                                    case "do":
                                        return parseDoWhileStatement();
                                    case "for":
                                        return parseForStatement();
                                    case "function":
                                        return parseFunctionDeclaration();
                                    case "if":
                                        return parseIfStatement();
                                    case "return":
                                        return parseReturnStatement();
                                    case "switch":
                                        return parseSwitchStatement();
                                    case "throw":
                                        return parseThrowStatement();
                                    case "try":
                                        return parseTryStatement();
                                    case "var":
                                        return parseVariableStatement();
                                    case "while":
                                        return parseWhileStatement();
                                    case "with":
                                        return parseWithStatement();
                                    default:
                                        break;
                                }
                            }
                            expr = parseExpression();
                            if (expr.type === Syntax.Identifier && match(":")) {
                                lex();
                                if (Object.prototype.hasOwnProperty.call(state.labelSet, expr.name)) {
                                    throwError({}, Messages.Redeclaration, "Label", expr.name);
                                }
                                state.labelSet[expr.name] = true;
                                labeledBody = parseStatement();
                                delete state.labelSet[expr.name];
                                return { type: Syntax.LabeledStatement, label: expr, body: labeledBody };
                            }
                            consumeSemicolon();
                            return { type: Syntax.ExpressionStatement, expression: expr };
                        }
                        function parseFunctionSourceElements() {
                            var sourceElement,
                                sourceElements = [],
                                token,
                                directive,
                                firstRestricted,
                                oldLabelSet,
                                oldInIteration,
                                oldInSwitch,
                                oldInFunctionBody;
                            expect("{");
                            while (index < length) {
                                token = lookahead();
                                if (token.type !== Token.StringLiteral) {
                                    break;
                                }
                                sourceElement = parseSourceElement();
                                sourceElements.push(sourceElement);
                                if (sourceElement.expression.type !== Syntax.Literal) {
                                    break;
                                }
                                directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
                                if (directive === "use strict") {
                                    strict = true;
                                    if (firstRestricted) {
                                        throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                                    }
                                } else {
                                    if (!firstRestricted && token.octal) {
                                        firstRestricted = token;
                                    }
                                }
                            }
                            oldLabelSet = state.labelSet;
                            oldInIteration = state.inIteration;
                            oldInSwitch = state.inSwitch;
                            oldInFunctionBody = state.inFunctionBody;
                            state.labelSet = {};
                            state.inIteration = false;
                            state.inSwitch = false;
                            state.inFunctionBody = true;
                            while (index < length) {
                                if (match("}")) {
                                    break;
                                }
                                sourceElement = parseSourceElement();
                                if (typeof sourceElement === "undefined") {
                                    break;
                                }
                                sourceElements.push(sourceElement);
                            }
                            expect("}");
                            state.labelSet = oldLabelSet;
                            state.inIteration = oldInIteration;
                            state.inSwitch = oldInSwitch;
                            state.inFunctionBody = oldInFunctionBody;
                            return { type: Syntax.BlockStatement, body: sourceElements };
                        }
                        function parseFunctionDeclaration() {
                            var id,
                                param,
                                params = [],
                                body,
                                token,
                                stricted,
                                firstRestricted,
                                message,
                                previousStrict,
                                paramSet;
                            expectKeyword("function");
                            token = lookahead();
                            id = parseVariableIdentifier();
                            if (strict) {
                                if (isRestrictedWord(token.value)) {
                                    throwErrorTolerant(token, Messages.StrictFunctionName);
                                }
                            } else {
                                if (isRestrictedWord(token.value)) {
                                    firstRestricted = token;
                                    message = Messages.StrictFunctionName;
                                } else if (isStrictModeReservedWord(token.value)) {
                                    firstRestricted = token;
                                    message = Messages.StrictReservedWord;
                                }
                            }
                            expect("(");
                            if (!match(")")) {
                                paramSet = {};
                                while (index < length) {
                                    token = lookahead();
                                    param = parseVariableIdentifier();
                                    if (strict) {
                                        if (isRestrictedWord(token.value)) {
                                            stricted = token;
                                            message = Messages.StrictParamName;
                                        }
                                        if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                            stricted = token;
                                            message = Messages.StrictParamDupe;
                                        }
                                    } else if (!firstRestricted) {
                                        if (isRestrictedWord(token.value)) {
                                            firstRestricted = token;
                                            message = Messages.StrictParamName;
                                        } else if (isStrictModeReservedWord(token.value)) {
                                            firstRestricted = token;
                                            message = Messages.StrictReservedWord;
                                        } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                            firstRestricted = token;
                                            message = Messages.StrictParamDupe;
                                        }
                                    }
                                    params.push(param);
                                    paramSet[param.name] = true;
                                    if (match(")")) {
                                        break;
                                    }
                                    expect(",");
                                }
                            }
                            expect(")");
                            previousStrict = strict;
                            body = parseFunctionSourceElements();
                            if (strict && firstRestricted) {
                                throwError(firstRestricted, message);
                            }
                            if (strict && stricted) {
                                throwErrorTolerant(stricted, message);
                            }
                            strict = previousStrict;
                            return { type: Syntax.FunctionDeclaration, id: id, params: params, defaults: [], body: body, rest: null, generator: false, expression: false };
                        }
                        function parseFunctionExpression() {
                            var token,
                                id = null,
                                stricted,
                                firstRestricted,
                                message,
                                param,
                                params = [],
                                body,
                                previousStrict,
                                paramSet;
                            expectKeyword("function");
                            if (!match("(")) {
                                token = lookahead();
                                id = parseVariableIdentifier();
                                if (strict) {
                                    if (isRestrictedWord(token.value)) {
                                        throwErrorTolerant(token, Messages.StrictFunctionName);
                                    }
                                } else {
                                    if (isRestrictedWord(token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictFunctionName;
                                    } else if (isStrictModeReservedWord(token.value)) {
                                        firstRestricted = token;
                                        message = Messages.StrictReservedWord;
                                    }
                                }
                            }
                            expect("(");
                            if (!match(")")) {
                                paramSet = {};
                                while (index < length) {
                                    token = lookahead();
                                    param = parseVariableIdentifier();
                                    if (strict) {
                                        if (isRestrictedWord(token.value)) {
                                            stricted = token;
                                            message = Messages.StrictParamName;
                                        }
                                        if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                            stricted = token;
                                            message = Messages.StrictParamDupe;
                                        }
                                    } else if (!firstRestricted) {
                                        if (isRestrictedWord(token.value)) {
                                            firstRestricted = token;
                                            message = Messages.StrictParamName;
                                        } else if (isStrictModeReservedWord(token.value)) {
                                            firstRestricted = token;
                                            message = Messages.StrictReservedWord;
                                        } else if (Object.prototype.hasOwnProperty.call(paramSet, token.value)) {
                                            firstRestricted = token;
                                            message = Messages.StrictParamDupe;
                                        }
                                    }
                                    params.push(param);
                                    paramSet[param.name] = true;
                                    if (match(")")) {
                                        break;
                                    }
                                    expect(",");
                                }
                            }
                            expect(")");
                            previousStrict = strict;
                            body = parseFunctionSourceElements();
                            if (strict && firstRestricted) {
                                throwError(firstRestricted, message);
                            }
                            if (strict && stricted) {
                                throwErrorTolerant(stricted, message);
                            }
                            strict = previousStrict;
                            return { type: Syntax.FunctionExpression, id: id, params: params, defaults: [], body: body, rest: null, generator: false, expression: false };
                        }
                        function parseSourceElement() {
                            var token = lookahead();
                            if (token.type === Token.Keyword) {
                                switch (token.value) {
                                    case "const":
                                    case "let":
                                        return parseConstLetDeclaration(token.value);
                                    case "function":
                                        return parseFunctionDeclaration();
                                    default:
                                        return parseStatement();
                                }
                            }
                            if (token.type !== Token.EOF) {
                                return parseStatement();
                            }
                        }
                        function parseSourceElements() {
                            var sourceElement,
                                sourceElements = [],
                                token,
                                directive,
                                firstRestricted;
                            while (index < length) {
                                token = lookahead();
                                if (token.type !== Token.StringLiteral) {
                                    break;
                                }
                                sourceElement = parseSourceElement();
                                sourceElements.push(sourceElement);
                                if (sourceElement.expression.type !== Syntax.Literal) {
                                    break;
                                }
                                directive = sliceSource(token.range[0] + 1, token.range[1] - 1);
                                if (directive === "use strict") {
                                    strict = true;
                                    if (firstRestricted) {
                                        throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
                                    }
                                } else {
                                    if (!firstRestricted && token.octal) {
                                        firstRestricted = token;
                                    }
                                }
                            }
                            while (index < length) {
                                sourceElement = parseSourceElement();
                                if (typeof sourceElement === "undefined") {
                                    break;
                                }
                                sourceElements.push(sourceElement);
                            }
                            return sourceElements;
                        }
                        function parseProgram() {
                            var program;
                            strict = false;
                            program = { type: Syntax.Program, body: parseSourceElements() };
                            return program;
                        }
                        function addComment(type, value, start, end, loc) {
                            assert(typeof start === "number", "Comment must have valid position");
                            if (extra.comments.length > 0) {
                                if (extra.comments[extra.comments.length - 1].range[1] > start) {
                                    return;
                                }
                            }
                            extra.comments.push({ type: type, value: value, range: [start, end], loc: loc });
                        }
                        function scanComment() {
                            var comment, ch, loc, start, blockComment, lineComment;
                            comment = "";
                            blockComment = false;
                            lineComment = false;
                            while (index < length) {
                                ch = source[index];
                                if (lineComment) {
                                    ch = source[index++];
                                    if (isLineTerminator(ch)) {
                                        loc.end = { line: lineNumber, column: index - lineStart - 1 };
                                        lineComment = false;
                                        addComment("Line", comment, start, index - 1, loc);
                                        if (ch === "\r" && source[index] === "\n") {
                                            ++index;
                                        }
                                        ++lineNumber;
                                        lineStart = index;
                                        comment = "";
                                    } else if (index >= length) {
                                        lineComment = false;
                                        comment += ch;
                                        loc.end = { line: lineNumber, column: length - lineStart };
                                        addComment("Line", comment, start, length, loc);
                                    } else {
                                        comment += ch;
                                    }
                                } else if (blockComment) {
                                    if (isLineTerminator(ch)) {
                                        if (ch === "\r" && source[index + 1] === "\n") {
                                            ++index;
                                            comment += "\r\n";
                                        } else {
                                            comment += ch;
                                        }
                                        ++lineNumber;
                                        ++index;
                                        lineStart = index;
                                        if (index >= length) {
                                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                        }
                                    } else {
                                        ch = source[index++];
                                        if (index >= length) {
                                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                        }
                                        comment += ch;
                                        if (ch === "*") {
                                            ch = source[index];
                                            if (ch === "/") {
                                                comment = comment.substr(0, comment.length - 1);
                                                blockComment = false;
                                                ++index;
                                                loc.end = { line: lineNumber, column: index - lineStart };
                                                addComment("Block", comment, start, index, loc);
                                                comment = "";
                                            }
                                        }
                                    }
                                } else if (ch === "/") {
                                    ch = source[index + 1];
                                    if (ch === "/") {
                                        loc = { start: { line: lineNumber, column: index - lineStart } };
                                        start = index;
                                        index += 2;
                                        lineComment = true;
                                        if (index >= length) {
                                            loc.end = { line: lineNumber, column: index - lineStart };
                                            lineComment = false;
                                            addComment("Line", comment, start, index, loc);
                                        }
                                    } else if (ch === "*") {
                                        start = index;
                                        index += 2;
                                        blockComment = true;
                                        loc = { start: { line: lineNumber, column: index - lineStart - 2 } };
                                        if (index >= length) {
                                            throwError({}, Messages.UnexpectedToken, "ILLEGAL");
                                        }
                                    } else {
                                        break;
                                    }
                                } else if (isWhiteSpace(ch)) {
                                    ++index;
                                } else if (isLineTerminator(ch)) {
                                    ++index;
                                    if (ch === "\r" && source[index] === "\n") {
                                        ++index;
                                    }
                                    ++lineNumber;
                                    lineStart = index;
                                } else {
                                    break;
                                }
                            }
                        }
                        function filterCommentLocation() {
                            var i,
                                entry,
                                comment,
                                comments = [];
                            for (i = 0; i < extra.comments.length; ++i) {
                                entry = extra.comments[i];
                                comment = { type: entry.type, value: entry.value };
                                if (extra.range) {
                                    comment.range = entry.range;
                                }
                                if (extra.loc) {
                                    comment.loc = entry.loc;
                                }
                                comments.push(comment);
                            }
                            extra.comments = comments;
                        }
                        function collectToken() {
                            var start, loc, token, range, value;
                            skipComment();
                            start = index;
                            loc = { start: { line: lineNumber, column: index - lineStart } };
                            token = extra.advance();
                            loc.end = { line: lineNumber, column: index - lineStart };
                            if (token.type !== Token.EOF) {
                                range = [token.range[0], token.range[1]];
                                value = sliceSource(token.range[0], token.range[1]);
                                extra.tokens.push({ type: TokenName[token.type], value: value, range: range, loc: loc });
                            }
                            return token;
                        }
                        function collectRegex() {
                            var pos, loc, regex, token;
                            skipComment();
                            pos = index;
                            loc = { start: { line: lineNumber, column: index - lineStart } };
                            regex = extra.scanRegExp();
                            loc.end = { line: lineNumber, column: index - lineStart };
                            if (extra.tokens.length > 0) {
                                token = extra.tokens[extra.tokens.length - 1];
                                if (token.range[0] === pos && token.type === "Punctuator") {
                                    if (token.value === "/" || token.value === "/=") {
                                        extra.tokens.pop();
                                    }
                                }
                            }
                            extra.tokens.push({ type: "RegularExpression", value: regex.literal, range: [pos, index], loc: loc });
                            return regex;
                        }
                        function filterTokenLocation() {
                            var i,
                                entry,
                                token,
                                tokens = [];
                            for (i = 0; i < extra.tokens.length; ++i) {
                                entry = extra.tokens[i];
                                token = { type: entry.type, value: entry.value };
                                if (extra.range) {
                                    token.range = entry.range;
                                }
                                if (extra.loc) {
                                    token.loc = entry.loc;
                                }
                                tokens.push(token);
                            }
                            extra.tokens = tokens;
                        }
                        function createLiteral(token) {
                            return { type: Syntax.Literal, value: token.value };
                        }
                        function createRawLiteral(token) {
                            return { type: Syntax.Literal, value: token.value, raw: sliceSource(token.range[0], token.range[1]) };
                        }
                        function createLocationMarker() {
                            var marker = {};
                            marker.range = [index, index];
                            marker.loc = { start: { line: lineNumber, column: index - lineStart }, end: { line: lineNumber, column: index - lineStart } };
                            marker.end = function () {
                                this.range[1] = index;
                                this.loc.end.line = lineNumber;
                                this.loc.end.column = index - lineStart;
                            };
                            marker.applyGroup = function (node) {
                                if (extra.range) {
                                    node.groupRange = [this.range[0], this.range[1]];
                                }
                                if (extra.loc) {
                                    node.groupLoc = { start: { line: this.loc.start.line, column: this.loc.start.column }, end: { line: this.loc.end.line, column: this.loc.end.column } };
                                }
                            };
                            marker.apply = function (node) {
                                if (extra.range) {
                                    node.range = [this.range[0], this.range[1]];
                                }
                                if (extra.loc) {
                                    node.loc = { start: { line: this.loc.start.line, column: this.loc.start.column }, end: { line: this.loc.end.line, column: this.loc.end.column } };
                                }
                            };
                            return marker;
                        }
                        function trackGroupExpression() {
                            var marker, expr;
                            skipComment();
                            marker = createLocationMarker();
                            expect("(");
                            expr = parseExpression();
                            expect(")");
                            marker.end();
                            marker.applyGroup(expr);
                            return expr;
                        }
                        function trackLeftHandSideExpression() {
                            var marker, expr;
                            skipComment();
                            marker = createLocationMarker();
                            expr = matchKeyword("new") ? parseNewExpression() : parsePrimaryExpression();
                            while (match(".") || match("[")) {
                                if (match("[")) {
                                    expr = { type: Syntax.MemberExpression, computed: true, object: expr, property: parseComputedMember() };
                                    marker.end();
                                    marker.apply(expr);
                                } else {
                                    expr = { type: Syntax.MemberExpression, computed: false, object: expr, property: parseNonComputedMember() };
                                    marker.end();
                                    marker.apply(expr);
                                }
                            }
                            return expr;
                        }
                        function trackLeftHandSideExpressionAllowCall() {
                            var marker, expr;
                            skipComment();
                            marker = createLocationMarker();
                            expr = matchKeyword("new") ? parseNewExpression() : parsePrimaryExpression();
                            while (match(".") || match("[") || match("(")) {
                                if (match("(")) {
                                    expr = { type: Syntax.CallExpression, callee: expr, arguments: parseArguments() };
                                    marker.end();
                                    marker.apply(expr);
                                } else if (match("[")) {
                                    expr = { type: Syntax.MemberExpression, computed: true, object: expr, property: parseComputedMember() };
                                    marker.end();
                                    marker.apply(expr);
                                } else {
                                    expr = { type: Syntax.MemberExpression, computed: false, object: expr, property: parseNonComputedMember() };
                                    marker.end();
                                    marker.apply(expr);
                                }
                            }
                            return expr;
                        }
                        function filterGroup(node) {
                            var n, i, entry;
                            n = Object.prototype.toString.apply(node) === "[object Array]" ? [] : {};
                            for (i in node) {
                                if (node.hasOwnProperty(i) && i !== "groupRange" && i !== "groupLoc") {
                                    entry = node[i];
                                    if (entry === null || typeof entry !== "object" || entry instanceof RegExp) {
                                        n[i] = entry;
                                    } else {
                                        n[i] = filterGroup(entry);
                                    }
                                }
                            }
                            return n;
                        }
                        function wrapTrackingFunction(range, loc) {
                            return function (parseFunction) {
                                function isBinary(node) {
                                    return node.type === Syntax.LogicalExpression || node.type === Syntax.BinaryExpression;
                                }
                                function visit(node) {
                                    var start, end;
                                    if (isBinary(node.left)) {
                                        visit(node.left);
                                    }
                                    if (isBinary(node.right)) {
                                        visit(node.right);
                                    }
                                    if (range) {
                                        if (node.left.groupRange || node.right.groupRange) {
                                            start = node.left.groupRange ? node.left.groupRange[0] : node.left.range[0];
                                            end = node.right.groupRange ? node.right.groupRange[1] : node.right.range[1];
                                            node.range = [start, end];
                                        } else if (typeof node.range === "undefined") {
                                            start = node.left.range[0];
                                            end = node.right.range[1];
                                            node.range = [start, end];
                                        }
                                    }
                                    if (loc) {
                                        if (node.left.groupLoc || node.right.groupLoc) {
                                            start = node.left.groupLoc ? node.left.groupLoc.start : node.left.loc.start;
                                            end = node.right.groupLoc ? node.right.groupLoc.end : node.right.loc.end;
                                            node.loc = { start: start, end: end };
                                        } else if (typeof node.loc === "undefined") {
                                            node.loc = { start: node.left.loc.start, end: node.right.loc.end };
                                        }
                                    }
                                }
                                return function () {
                                    var marker, node;
                                    skipComment();
                                    marker = createLocationMarker();
                                    node = parseFunction.apply(null, arguments);
                                    marker.end();
                                    if (range && typeof node.range === "undefined") {
                                        marker.apply(node);
                                    }
                                    if (loc && typeof node.loc === "undefined") {
                                        marker.apply(node);
                                    }
                                    if (isBinary(node)) {
                                        visit(node);
                                    }
                                    return node;
                                };
                            };
                        }
                        function patch() {
                            var wrapTracking;
                            if (extra.comments) {
                                extra.skipComment = skipComment;
                                skipComment = scanComment;
                            }
                            if (extra.raw) {
                                extra.createLiteral = createLiteral;
                                createLiteral = createRawLiteral;
                            }
                            if (extra.range || extra.loc) {
                                extra.parseGroupExpression = parseGroupExpression;
                                extra.parseLeftHandSideExpression = parseLeftHandSideExpression;
                                extra.parseLeftHandSideExpressionAllowCall = parseLeftHandSideExpressionAllowCall;
                                parseGroupExpression = trackGroupExpression;
                                parseLeftHandSideExpression = trackLeftHandSideExpression;
                                parseLeftHandSideExpressionAllowCall = trackLeftHandSideExpressionAllowCall;
                                wrapTracking = wrapTrackingFunction(extra.range, extra.loc);
                                extra.parseAdditiveExpression = parseAdditiveExpression;
                                extra.parseAssignmentExpression = parseAssignmentExpression;
                                extra.parseBitwiseANDExpression = parseBitwiseANDExpression;
                                extra.parseBitwiseORExpression = parseBitwiseORExpression;
                                extra.parseBitwiseXORExpression = parseBitwiseXORExpression;
                                extra.parseBlock = parseBlock;
                                extra.parseFunctionSourceElements = parseFunctionSourceElements;
                                extra.parseCatchClause = parseCatchClause;
                                extra.parseComputedMember = parseComputedMember;
                                extra.parseConditionalExpression = parseConditionalExpression;
                                extra.parseConstLetDeclaration = parseConstLetDeclaration;
                                extra.parseEqualityExpression = parseEqualityExpression;
                                extra.parseExpression = parseExpression;
                                extra.parseForVariableDeclaration = parseForVariableDeclaration;
                                extra.parseFunctionDeclaration = parseFunctionDeclaration;
                                extra.parseFunctionExpression = parseFunctionExpression;
                                extra.parseLogicalANDExpression = parseLogicalANDExpression;
                                extra.parseLogicalORExpression = parseLogicalORExpression;
                                extra.parseMultiplicativeExpression = parseMultiplicativeExpression;
                                extra.parseNewExpression = parseNewExpression;
                                extra.parseNonComputedProperty = parseNonComputedProperty;
                                extra.parseObjectProperty = parseObjectProperty;
                                extra.parseObjectPropertyKey = parseObjectPropertyKey;
                                extra.parsePostfixExpression = parsePostfixExpression;
                                extra.parsePrimaryExpression = parsePrimaryExpression;
                                extra.parseProgram = parseProgram;
                                extra.parsePropertyFunction = parsePropertyFunction;
                                extra.parseRelationalExpression = parseRelationalExpression;
                                extra.parseStatement = parseStatement;
                                extra.parseShiftExpression = parseShiftExpression;
                                extra.parseSwitchCase = parseSwitchCase;
                                extra.parseUnaryExpression = parseUnaryExpression;
                                extra.parseVariableDeclaration = parseVariableDeclaration;
                                extra.parseVariableIdentifier = parseVariableIdentifier;
                                parseAdditiveExpression = wrapTracking(extra.parseAdditiveExpression);
                                parseAssignmentExpression = wrapTracking(extra.parseAssignmentExpression);
                                parseBitwiseANDExpression = wrapTracking(extra.parseBitwiseANDExpression);
                                parseBitwiseORExpression = wrapTracking(extra.parseBitwiseORExpression);
                                parseBitwiseXORExpression = wrapTracking(extra.parseBitwiseXORExpression);
                                parseBlock = wrapTracking(extra.parseBlock);
                                parseFunctionSourceElements = wrapTracking(extra.parseFunctionSourceElements);
                                parseCatchClause = wrapTracking(extra.parseCatchClause);
                                parseComputedMember = wrapTracking(extra.parseComputedMember);
                                parseConditionalExpression = wrapTracking(extra.parseConditionalExpression);
                                parseConstLetDeclaration = wrapTracking(extra.parseConstLetDeclaration);
                                parseEqualityExpression = wrapTracking(extra.parseEqualityExpression);
                                parseExpression = wrapTracking(extra.parseExpression);
                                parseForVariableDeclaration = wrapTracking(extra.parseForVariableDeclaration);
                                parseFunctionDeclaration = wrapTracking(extra.parseFunctionDeclaration);
                                parseFunctionExpression = wrapTracking(extra.parseFunctionExpression);
                                parseLeftHandSideExpression = wrapTracking(parseLeftHandSideExpression);
                                parseLogicalANDExpression = wrapTracking(extra.parseLogicalANDExpression);
                                parseLogicalORExpression = wrapTracking(extra.parseLogicalORExpression);
                                parseMultiplicativeExpression = wrapTracking(extra.parseMultiplicativeExpression);
                                parseNewExpression = wrapTracking(extra.parseNewExpression);
                                parseNonComputedProperty = wrapTracking(extra.parseNonComputedProperty);
                                parseObjectProperty = wrapTracking(extra.parseObjectProperty);
                                parseObjectPropertyKey = wrapTracking(extra.parseObjectPropertyKey);
                                parsePostfixExpression = wrapTracking(extra.parsePostfixExpression);
                                parsePrimaryExpression = wrapTracking(extra.parsePrimaryExpression);
                                parseProgram = wrapTracking(extra.parseProgram);
                                parsePropertyFunction = wrapTracking(extra.parsePropertyFunction);
                                parseRelationalExpression = wrapTracking(extra.parseRelationalExpression);
                                parseStatement = wrapTracking(extra.parseStatement);
                                parseShiftExpression = wrapTracking(extra.parseShiftExpression);
                                parseSwitchCase = wrapTracking(extra.parseSwitchCase);
                                parseUnaryExpression = wrapTracking(extra.parseUnaryExpression);
                                parseVariableDeclaration = wrapTracking(extra.parseVariableDeclaration);
                                parseVariableIdentifier = wrapTracking(extra.parseVariableIdentifier);
                            }
                            if (typeof extra.tokens !== "undefined") {
                                extra.advance = advance;
                                extra.scanRegExp = scanRegExp;
                                advance = collectToken;
                                scanRegExp = collectRegex;
                            }
                        }
                        function unpatch() {
                            if (typeof extra.skipComment === "function") {
                                skipComment = extra.skipComment;
                            }
                            if (extra.raw) {
                                createLiteral = extra.createLiteral;
                            }
                            if (extra.range || extra.loc) {
                                parseAdditiveExpression = extra.parseAdditiveExpression;
                                parseAssignmentExpression = extra.parseAssignmentExpression;
                                parseBitwiseANDExpression = extra.parseBitwiseANDExpression;
                                parseBitwiseORExpression = extra.parseBitwiseORExpression;
                                parseBitwiseXORExpression = extra.parseBitwiseXORExpression;
                                parseBlock = extra.parseBlock;
                                parseFunctionSourceElements = extra.parseFunctionSourceElements;
                                parseCatchClause = extra.parseCatchClause;
                                parseComputedMember = extra.parseComputedMember;
                                parseConditionalExpression = extra.parseConditionalExpression;
                                parseConstLetDeclaration = extra.parseConstLetDeclaration;
                                parseEqualityExpression = extra.parseEqualityExpression;
                                parseExpression = extra.parseExpression;
                                parseForVariableDeclaration = extra.parseForVariableDeclaration;
                                parseFunctionDeclaration = extra.parseFunctionDeclaration;
                                parseFunctionExpression = extra.parseFunctionExpression;
                                parseGroupExpression = extra.parseGroupExpression;
                                parseLeftHandSideExpression = extra.parseLeftHandSideExpression;
                                parseLeftHandSideExpressionAllowCall = extra.parseLeftHandSideExpressionAllowCall;
                                parseLogicalANDExpression = extra.parseLogicalANDExpression;
                                parseLogicalORExpression = extra.parseLogicalORExpression;
                                parseMultiplicativeExpression = extra.parseMultiplicativeExpression;
                                parseNewExpression = extra.parseNewExpression;
                                parseNonComputedProperty = extra.parseNonComputedProperty;
                                parseObjectProperty = extra.parseObjectProperty;
                                parseObjectPropertyKey = extra.parseObjectPropertyKey;
                                parsePrimaryExpression = extra.parsePrimaryExpression;
                                parsePostfixExpression = extra.parsePostfixExpression;
                                parseProgram = extra.parseProgram;
                                parsePropertyFunction = extra.parsePropertyFunction;
                                parseRelationalExpression = extra.parseRelationalExpression;
                                parseStatement = extra.parseStatement;
                                parseShiftExpression = extra.parseShiftExpression;
                                parseSwitchCase = extra.parseSwitchCase;
                                parseUnaryExpression = extra.parseUnaryExpression;
                                parseVariableDeclaration = extra.parseVariableDeclaration;
                                parseVariableIdentifier = extra.parseVariableIdentifier;
                            }
                            if (typeof extra.scanRegExp === "function") {
                                advance = extra.advance;
                                scanRegExp = extra.scanRegExp;
                            }
                        }
                        function stringToArray(str) {
                            var length = str.length,
                                result = [],
                                i;
                            for (i = 0; i < length; ++i) {
                                result[i] = str.charAt(i);
                            }
                            return result;
                        }
                        function parse(code, options) {
                            var program, toString;
                            toString = String;
                            if (typeof code !== "string" && !(code instanceof String)) {
                                code = toString(code);
                            }
                            source = code;
                            index = 0;
                            lineNumber = source.length > 0 ? 1 : 0;
                            lineStart = 0;
                            length = source.length;
                            buffer = null;
                            state = { allowIn: true, labelSet: {}, inFunctionBody: false, inIteration: false, inSwitch: false };
                            extra = {};
                            if (typeof options !== "undefined") {
                                extra.range = typeof options.range === "boolean" && options.range;
                                extra.loc = typeof options.loc === "boolean" && options.loc;
                                extra.raw = typeof options.raw === "boolean" && options.raw;
                                if (typeof options.tokens === "boolean" && options.tokens) {
                                    extra.tokens = [];
                                }
                                if (typeof options.comment === "boolean" && options.comment) {
                                    extra.comments = [];
                                }
                                if (typeof options.tolerant === "boolean" && options.tolerant) {
                                    extra.errors = [];
                                }
                            }
                            if (length > 0) {
                                if (typeof source[0] === "undefined") {
                                    if (code instanceof String) {
                                        source = code.valueOf();
                                    }
                                    if (typeof source[0] === "undefined") {
                                        source = stringToArray(code);
                                    }
                                }
                            }
                            patch();
                            try {
                                program = parseProgram();
                                if (typeof extra.comments !== "undefined") {
                                    filterCommentLocation();
                                    program.comments = extra.comments;
                                }
                                if (typeof extra.tokens !== "undefined") {
                                    filterTokenLocation();
                                    program.tokens = extra.tokens;
                                }
                                if (typeof extra.errors !== "undefined") {
                                    program.errors = extra.errors;
                                }
                                if (extra.range || extra.loc) {
                                    program.body = filterGroup(program.body);
                                }
                            } catch (e) {
                                throw e;
                            } finally {
                                unpatch();
                                extra = {};
                            }
                            return program;
                        }
                        exports.version = "1.0.4";
                        exports.parse = parse;
                        exports.Syntax = (function () {
                            var name,
                                types = {};
                            if (typeof Object.create === "function") {
                                types = Object.create(null);
                            }
                            for (name in Syntax) {
                                if (Syntax.hasOwnProperty(name)) {
                                    types[name] = Syntax[name];
                                }
                            }
                            if (typeof Object.freeze === "function") {
                                Object.freeze(types);
                            }
                            return types;
                        })();
                    });
                },
                {},
            ],
            27: [
                function (require, module, exports) {
                    module.exports = {
                        author: { name: "Zach Carter", email: "zach@carter.name", url: "http://zaa.ch" },
                        name: "jison-lex",
                        description: "lexical analyzer generator used by jison",
                        version: "0.2.1",
                        keywords: ["jison", "parser", "generator", "lexer", "flex", "tokenizer"],
                        repository: { type: "git", url: "git://github.com/zaach/jison-lex.git" },
                        bugs: { url: "http://github.com/zaach/jison-lex/issues", email: "jison@librelist.com" },
                        main: "regexp-lexer",
                        bin: { "jison-lex": "cli.js" },
                        engines: { node: ">=0.4" },
                        dependencies: { "lex-parser": "0.1.x", nomnom: "1.5.2" },
                        devDependencies: { test: "0.4.4" },
                        scripts: { test: "node tests/all-tests.js" },
                        directories: { lib: "lib", tests: "tests" },
                        homepage: "http://jison.org",
                        readme:
                            "# jison-lex\nA lexical analyzer generator used by [jison](http://jison.org).\n\n## install\nnpm install jison-lex -g\n\n## usage\n```\nUsage: jison-lex [file] [options]\n\nfile     file containing a lexical grammar\n\nOptions:\n   -o FILE, --outfile FILE       Filename and base module name of the generated parser\n   -t TYPE, --module-type TYPE   The type of module to generate (commonjs, js)\n   --version                     print version and exit\n```\n\n## license\nMIT\n",
                        readmeFilename: "README.md",
                        _id: "jison-lex@0.2.1",
                        _from: "jison-lex@0.2.x",
                    };
                },
                {},
            ],
            28: [
                function (require, module, exports) {
                    var RegExpLexer = (function () {
                        "use strict";
                        var lexParser = require("lex-parser");
                        var version = require("./package.json").version;
                        function prepareRules(rules, macros, actions, tokens, startConditions, caseless) {
                            var m,
                                i,
                                k,
                                action,
                                conditions,
                                newRules = [];
                            if (macros) {
                                macros = prepareMacros(macros);
                            }
                            function tokenNumberReplacement(str, token) {
                                return "return " + (tokens[token] || "'" + token + "'");
                            }
                            actions.push("switch($avoiding_name_collisions) {");
                            for (i = 0; i < rules.length; i++) {
                                if (Object.prototype.toString.apply(rules[i][0]) !== "[object Array]") {
                                    for (k in startConditions) {
                                        if (startConditions[k].inclusive) {
                                            startConditions[k].rules.push(i);
                                        }
                                    }
                                } else if (rules[i][0][0] === "*") {
                                    for (k in startConditions) {
                                        startConditions[k].rules.push(i);
                                    }
                                    rules[i].shift();
                                } else {
                                    conditions = rules[i].shift();
                                    for (k = 0; k < conditions.length; k++) {
                                        startConditions[conditions[k]].rules.push(i);
                                    }
                                }
                                m = rules[i][0];
                                if (typeof m === "string") {
                                    for (k in macros) {
                                        if (macros.hasOwnProperty(k)) {
                                            m = m.split("{" + k + "}").join("(" + macros[k] + ")");
                                        }
                                    }
                                    m = new RegExp("^(?:" + m + ")", caseless ? "i" : "");
                                }
                                newRules.push(m);
                                if (typeof rules[i][1] === "function") {
                                    rules[i][1] = String(rules[i][1])
                                        .replace(/^\s*function \(\)\s?\{/, "")
                                        .replace(/\}\s*$/, "");
                                }
                                action = rules[i][1];
                                if (tokens && action.match(/return '[^']+'/)) {
                                    action = action.replace(/return '([^']+)'/g, tokenNumberReplacement);
                                }
                                actions.push("case " + i + ":" + action + "\nbreak;");
                            }
                            actions.push("}");
                            return newRules;
                        }
                        function prepareMacros(macros) {
                            var cont = true,
                                m,
                                i,
                                k,
                                mnew;
                            while (cont) {
                                cont = false;
                                for (i in macros)
                                    if (macros.hasOwnProperty(i)) {
                                        m = macros[i];
                                        for (k in macros)
                                            if (macros.hasOwnProperty(k) && i !== k) {
                                                mnew = m.split("{" + k + "}").join("(" + macros[k] + ")");
                                                if (mnew !== m) {
                                                    cont = true;
                                                    macros[i] = mnew;
                                                }
                                            }
                                    }
                            }
                            return macros;
                        }
                        function prepareStartConditions(conditions) {
                            var sc,
                                hash = {};
                            for (sc in conditions)
                                if (conditions.hasOwnProperty(sc)) {
                                    hash[sc] = { rules: [], inclusive: !!!conditions[sc] };
                                }
                            return hash;
                        }
                        function buildActions(dict, tokens) {
                            var actions = [dict.actionInclude || "", "var YYSTATE=YY_START;"];
                            var tok;
                            var toks = {};
                            for (tok in tokens) {
                                toks[tokens[tok]] = tok;
                            }
                            if (dict.options && dict.options.flex) {
                                dict.rules.push([".", "console.log(yytext);"]);
                            }
                            this.rules = prepareRules(dict.rules, dict.macros, actions, tokens && toks, this.conditions, this.options["case-insensitive"]);
                            var fun = actions.join("\n");
                            "yytext yyleng yylineno yylloc".split(" ").forEach(function (yy) {
                                fun = fun.replace(new RegExp("\\b(" + yy + ")\\b", "g"), "yy_.$1");
                            });
                            try {
                                return Function("yy,yy_,$avoiding_name_collisions,YY_START", fun);
                            } catch (e) {
                                return "function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {" + fun + "\n}";
                            }
                        }
                        function RegExpLexer(dict, input, tokens) {
                            if (typeof dict === "string") {
                                dict = lexParser.parse(dict);
                            }
                            dict = dict || {};
                            this.options = dict.options || {};
                            this.conditions = prepareStartConditions(dict.startConditions);
                            this.conditions.INITIAL = { rules: [], inclusive: true };
                            this.performAction = buildActions.call(this, dict, tokens);
                            this.conditionStack = ["INITIAL"];
                            this.moduleInclude = (dict.moduleInclude || "").trim();
                            this.yy = {};
                            if (input) {
                                this.setInput(input);
                            }
                        }
                        RegExpLexer.prototype = {
                            EOF: 1,
                            parseError: function parseError(str, hash) {
                                if (this.yy.parser) {
                                    this.yy.parser.parseError(str, hash);
                                } else {
                                    throw new Error(str);
                                }
                            },
                            setInput: function (input) {
                                this._input = input;
                                this._more = this._backtrack = this.done = false;
                                this.yylineno = this.yyleng = 0;
                                this.yytext = this.matched = this.match = "";
                                this.conditionStack = ["INITIAL"];
                                this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                                if (this.options.ranges) {
                                    this.yylloc.range = [0, 0];
                                }
                                this.offset = 0;
                                return this;
                            },
                            input: function () {
                                var ch = this._input[0];
                                this.yytext += ch;
                                this.yyleng++;
                                this.offset++;
                                this.match += ch;
                                this.matched += ch;
                                var lines = ch.match(/(?:\r\n?|\n).*/g);
                                if (lines) {
                                    this.yylineno++;
                                    this.yylloc.last_line++;
                                } else {
                                    this.yylloc.last_column++;
                                }
                                if (this.options.ranges) {
                                    this.yylloc.range[1]++;
                                }
                                this._input = this._input.slice(1);
                                return ch;
                            },
                            unput: function (ch) {
                                var len = ch.length;
                                var lines = ch.split(/(?:\r\n?|\n)/g);
                                this._input = ch + this._input;
                                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                                this.offset -= len;
                                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                                this.match = this.match.substr(0, this.match.length - 1);
                                this.matched = this.matched.substr(0, this.matched.length - 1);
                                if (lines.length - 1) {
                                    this.yylineno -= lines.length - 1;
                                }
                                var r = this.yylloc.range;
                                this.yylloc = {
                                    first_line: this.yylloc.first_line,
                                    last_line: this.yylineno + 1,
                                    first_column: this.yylloc.first_column,
                                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len,
                                };
                                if (this.options.ranges) {
                                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                                }
                                this.yyleng = this.yytext.length;
                                return this;
                            },
                            more: function () {
                                this._more = true;
                                return this;
                            },
                            reject: function () {
                                if (this.options.backtrack_lexer) {
                                    this._backtrack = true;
                                } else {
                                    return this.parseError(
                                        "Lexical error on line " +
                                            (this.yylineno + 1) +
                                            ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" +
                                            this.showPosition(),
                                        { text: "", token: null, line: this.yylineno }
                                    );
                                }
                                return this;
                            },
                            less: function (n) {
                                this.unput(this.match.slice(n));
                            },
                            pastInput: function () {
                                var past = this.matched.substr(0, this.matched.length - this.match.length);
                                return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
                            },
                            upcomingInput: function () {
                                var next = this.match;
                                if (next.length < 20) {
                                    next += this._input.substr(0, 20 - next.length);
                                }
                                return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
                            },
                            showPosition: function () {
                                var pre = this.pastInput();
                                var c = new Array(pre.length + 1).join("-");
                                return pre + this.upcomingInput() + "\n" + c + "^";
                            },
                            test_match: function (match, indexed_rule) {
                                var token, lines, backup;
                                if (this.options.backtrack_lexer) {
                                    backup = {
                                        yylineno: this.yylineno,
                                        yylloc: { first_line: this.yylloc.first_line, last_line: this.last_line, first_column: this.yylloc.first_column, last_column: this.yylloc.last_column },
                                        yytext: this.yytext,
                                        match: this.match,
                                        matches: this.matches,
                                        matched: this.matched,
                                        yyleng: this.yyleng,
                                        offset: this.offset,
                                        _more: this._more,
                                        _input: this._input,
                                        yy: this.yy,
                                        conditionStack: this.conditionStack.slice(0),
                                        done: this.done,
                                    };
                                    if (this.options.ranges) {
                                        backup.yylloc.range = this.yylloc.range.slice(0);
                                    }
                                }
                                lines = match[0].match(/(?:\r\n?|\n).*/g);
                                if (lines) {
                                    this.yylineno += lines.length;
                                }
                                this.yylloc = {
                                    first_line: this.yylloc.last_line,
                                    last_line: this.yylineno + 1,
                                    first_column: this.yylloc.last_column,
                                    last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length,
                                };
                                this.yytext += match[0];
                                this.match += match[0];
                                this.matches = match;
                                this.yyleng = this.yytext.length;
                                if (this.options.ranges) {
                                    this.yylloc.range = [this.offset, (this.offset += this.yyleng)];
                                }
                                this._more = false;
                                this._backtrack = false;
                                this._input = this._input.slice(match[0].length);
                                this.matched += match[0];
                                token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
                                if (this.done && this._input) {
                                    this.done = false;
                                }
                                if (token) {
                                    return token;
                                } else if (this._backtrack) {
                                    for (var k in backup) {
                                        this[k] = backup[k];
                                    }
                                    return false;
                                }
                                return false;
                            },
                            next: function () {
                                if (this.done) {
                                    return this.EOF;
                                }
                                if (!this._input) {
                                    this.done = true;
                                }
                                var token, match, tempMatch, index;
                                if (!this._more) {
                                    this.yytext = "";
                                    this.match = "";
                                }
                                var rules = this._currentRules();
                                for (var i = 0; i < rules.length; i++) {
                                    tempMatch = this._input.match(this.rules[rules[i]]);
                                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                                        match = tempMatch;
                                        index = i;
                                        if (this.options.backtrack_lexer) {
                                            token = this.test_match(tempMatch, rules[i]);
                                            if (token !== false) {
                                                return token;
                                            } else if (this._backtrack) {
                                                match = false;
                                                continue;
                                            } else {
                                                return false;
                                            }
                                        } else if (!this.options.flex) {
                                            break;
                                        }
                                    }
                                }
                                if (match) {
                                    token = this.test_match(match, rules[index]);
                                    if (token !== false) {
                                        return token;
                                    }
                                    return false;
                                }
                                if (this._input === "") {
                                    return this.EOF;
                                } else {
                                    return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
                                }
                            },
                            lex: function lex() {
                                var r = this.next();
                                if (r) {
                                    return r;
                                } else {
                                    return this.lex();
                                }
                            },
                            begin: function begin(condition) {
                                this.conditionStack.push(condition);
                            },
                            popState: function popState() {
                                var n = this.conditionStack.length - 1;
                                if (n > 0) {
                                    return this.conditionStack.pop();
                                } else {
                                    return this.conditionStack[0];
                                }
                            },
                            _currentRules: function _currentRules() {
                                if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
                                    return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
                                } else {
                                    return this.conditions["INITIAL"].rules;
                                }
                            },
                            topState: function topState(n) {
                                n = this.conditionStack.length - 1 - Math.abs(n || 0);
                                if (n >= 0) {
                                    return this.conditionStack[n];
                                } else {
                                    return "INITIAL";
                                }
                            },
                            pushState: function pushState(condition) {
                                this.begin(condition);
                            },
                            stateStackSize: function stateStackSize() {
                                return this.conditionStack.length;
                            },
                            generate: function generate(opt) {
                                var code = "";
                                if (opt.moduleType === "commonjs") {
                                    code = this.generateCommonJSModule(opt);
                                } else if (opt.moduleType === "amd") {
                                    code = this.generateAMDModule(opt);
                                } else {
                                    code = this.generateModule(opt);
                                }
                                return code;
                            },
                            generateModuleBody: function generateModule() {
                                var function_descriptions = {
                                    setInput: "resets the lexer, sets new input",
                                    input: "consumes and returns one char from the input",
                                    unput: "unshifts one char (or a string) into the input",
                                    more: "When called from action, caches matched text and appends it on next action",
                                    reject: "When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.",
                                    less: "retain first n characters of the match",
                                    pastInput: "displays already matched input, i.e. for error messages",
                                    upcomingInput: "displays upcoming input, i.e. for error messages",
                                    showPosition: "displays the character position where the lexing error occurred, i.e. for error messages",
                                    test_match: "test the lexed token: return FALSE when not a match, otherwise return token",
                                    next: "return next match in input",
                                    lex: "return next match that has a token",
                                    begin: "activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)",
                                    popState: "pop the previously active lexer condition state off the condition stack",
                                    _currentRules: "produce the lexer rule set which is active for the currently active lexer condition state",
                                    topState: "return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available",
                                    pushState: "alias for begin(condition)",
                                    stateStackSize: "return the number of states currently on the stack",
                                };
                                var out = "{\n";
                                var p = [];
                                var descr;
                                for (var k in RegExpLexer.prototype) {
                                    if (RegExpLexer.prototype.hasOwnProperty(k) && k.indexOf("generate") === -1) {
                                        descr = "\n";
                                        if (function_descriptions[k]) {
                                            descr += "// " + function_descriptions[k].replace(/\n/g, "\n// ") + "\n";
                                        }
                                        p.push(descr + k + ":" + (RegExpLexer.prototype[k].toString() || '""'));
                                    }
                                }
                                out += p.join(",\n");
                                if (this.options) {
                                    out += ",\noptions: " + JSON.stringify(this.options);
                                }
                                out += ",\nperformAction: " + String(this.performAction);
                                out += ",\nrules: [" + this.rules + "]";
                                out += ",\nconditions: " + JSON.stringify(this.conditions);
                                out += "\n}";
                                return out;
                            },
                            generateModule: function generateModule(opt) {
                                opt = opt || {};
                                var out = "/* generated by jison-lex " + version + " */";
                                var moduleName = opt.moduleName || "lexer";
                                out += "\nvar " + moduleName + " = (function(){\nvar lexer = " + this.generateModuleBody();
                                if (this.moduleInclude) out += ";\n" + this.moduleInclude;
                                out += ";\nreturn lexer;\n})();";
                                return out;
                            },
                            generateAMDModule: function generateAMDModule() {
                                var out = "/* generated by jison-lex " + version + " */";
                                out += "define([], function(){\nvar lexer = " + this.generateModuleBody();
                                if (this.moduleInclude) out += ";\n" + this.moduleInclude;
                                out += ";\nreturn lexer;" + "\n})();";
                                return out;
                            },
                            generateCommonJSModule: function generateCommonJSModule(opt) {
                                opt = opt || {};
                                var out = "";
                                var moduleName = opt.moduleName || "lexer";
                                out += this.generateModule(opt);
                                out += "\nexports.lexer = " + moduleName;
                                out += ";\nexports.lex = function () { return " + moduleName + ".lex.apply(lexer, arguments); };";
                                return out;
                            },
                        };
                        return RegExpLexer;
                    })();
                    module.exports = RegExpLexer;
                },
                { "./package.json": 27, "lex-parser": 29 },
            ],
            29: [
                function (require, module, exports) {
                    var process = require("__browserify_process");
                    var lex = (function () {
                        var parser = {
                            trace: function trace() {},
                            yy: {},
                            symbols_: {
                                error: 2,
                                lex: 3,
                                definitions: 4,
                                "%%": 5,
                                rules: 6,
                                epilogue: 7,
                                EOF: 8,
                                CODE: 9,
                                definition: 10,
                                ACTION: 11,
                                NAME: 12,
                                regex: 13,
                                START_INC: 14,
                                names_inclusive: 15,
                                START_EXC: 16,
                                names_exclusive: 17,
                                START_COND: 18,
                                rule: 19,
                                start_conditions: 20,
                                action: 21,
                                "{": 22,
                                action_body: 23,
                                "}": 24,
                                action_comments_body: 25,
                                ACTION_BODY: 26,
                                "<": 27,
                                name_list: 28,
                                ">": 29,
                                "*": 30,
                                ",": 31,
                                regex_list: 32,
                                "|": 33,
                                regex_concat: 34,
                                regex_base: 35,
                                "(": 36,
                                ")": 37,
                                SPECIAL_GROUP: 38,
                                "+": 39,
                                "?": 40,
                                "/": 41,
                                "/!": 42,
                                name_expansion: 43,
                                range_regex: 44,
                                any_group_regex: 45,
                                ".": 46,
                                "^": 47,
                                $: 48,
                                string: 49,
                                escape_char: 50,
                                NAME_BRACE: 51,
                                ANY_GROUP_REGEX: 52,
                                ESCAPE_CHAR: 53,
                                RANGE_REGEX: 54,
                                STRING_LIT: 55,
                                CHARACTER_LIT: 56,
                                $accept: 0,
                                $end: 1,
                            },
                            terminals_: {
                                2: "error",
                                5: "%%",
                                8: "EOF",
                                9: "CODE",
                                11: "ACTION",
                                12: "NAME",
                                14: "START_INC",
                                16: "START_EXC",
                                18: "START_COND",
                                22: "{",
                                24: "}",
                                26: "ACTION_BODY",
                                27: "<",
                                29: ">",
                                30: "*",
                                31: ",",
                                33: "|",
                                36: "(",
                                37: ")",
                                38: "SPECIAL_GROUP",
                                39: "+",
                                40: "?",
                                41: "/",
                                42: "/!",
                                46: ".",
                                47: "^",
                                48: "$",
                                51: "NAME_BRACE",
                                52: "ANY_GROUP_REGEX",
                                53: "ESCAPE_CHAR",
                                54: "RANGE_REGEX",
                                55: "STRING_LIT",
                                56: "CHARACTER_LIT",
                            },
                            productions_: [
                                0,
                                [3, 4],
                                [7, 1],
                                [7, 2],
                                [7, 3],
                                [4, 2],
                                [4, 2],
                                [4, 0],
                                [10, 2],
                                [10, 2],
                                [10, 2],
                                [15, 1],
                                [15, 2],
                                [17, 1],
                                [17, 2],
                                [6, 2],
                                [6, 1],
                                [19, 3],
                                [21, 3],
                                [21, 1],
                                [23, 0],
                                [23, 1],
                                [23, 5],
                                [23, 4],
                                [25, 1],
                                [25, 2],
                                [20, 3],
                                [20, 3],
                                [20, 0],
                                [28, 1],
                                [28, 3],
                                [13, 1],
                                [32, 3],
                                [32, 2],
                                [32, 1],
                                [32, 0],
                                [34, 2],
                                [34, 1],
                                [35, 3],
                                [35, 3],
                                [35, 2],
                                [35, 2],
                                [35, 2],
                                [35, 2],
                                [35, 2],
                                [35, 1],
                                [35, 2],
                                [35, 1],
                                [35, 1],
                                [35, 1],
                                [35, 1],
                                [35, 1],
                                [35, 1],
                                [43, 1],
                                [45, 1],
                                [50, 1],
                                [44, 1],
                                [49, 1],
                                [49, 1],
                            ],
                            performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
                                var $0 = $$.length - 1;
                                switch (yystate) {
                                    case 1:
                                        this.$ = { rules: $$[$0 - 1] };
                                        if ($$[$0 - 3][0]) this.$.macros = $$[$0 - 3][0];
                                        if ($$[$0 - 3][1]) this.$.startConditions = $$[$0 - 3][1];
                                        if ($$[$0]) this.$.moduleInclude = $$[$0];
                                        if (yy.options) this.$.options = yy.options;
                                        if (yy.actionInclude) this.$.actionInclude = yy.actionInclude;
                                        delete yy.options;
                                        delete yy.actionInclude;
                                        return this.$;
                                        break;
                                    case 2:
                                        this.$ = null;
                                        break;
                                    case 3:
                                        this.$ = null;
                                        break;
                                    case 4:
                                        this.$ = $$[$0 - 1];
                                        break;
                                    case 5:
                                        this.$ = $$[$0];
                                        if ("length" in $$[$0 - 1]) {
                                            this.$[0] = this.$[0] || {};
                                            this.$[0][$$[$0 - 1][0]] = $$[$0 - 1][1];
                                        } else {
                                            this.$[1] = this.$[1] || {};
                                            for (var name in $$[$0 - 1]) {
                                                this.$[1][name] = $$[$0 - 1][name];
                                            }
                                        }
                                        break;
                                    case 6:
                                        yy.actionInclude += $$[$0 - 1];
                                        this.$ = $$[$0];
                                        break;
                                    case 7:
                                        yy.actionInclude = "";
                                        this.$ = [null, null];
                                        break;
                                    case 8:
                                        this.$ = [$$[$0 - 1], $$[$0]];
                                        break;
                                    case 9:
                                        this.$ = $$[$0];
                                        break;
                                    case 10:
                                        this.$ = $$[$0];
                                        break;
                                    case 11:
                                        this.$ = {};
                                        this.$[$$[$0]] = 0;
                                        break;
                                    case 12:
                                        this.$ = $$[$0 - 1];
                                        this.$[$$[$0]] = 0;
                                        break;
                                    case 13:
                                        this.$ = {};
                                        this.$[$$[$0]] = 1;
                                        break;
                                    case 14:
                                        this.$ = $$[$0 - 1];
                                        this.$[$$[$0]] = 1;
                                        break;
                                    case 15:
                                        this.$ = $$[$0 - 1];
                                        this.$.push($$[$0]);
                                        break;
                                    case 16:
                                        this.$ = [$$[$0]];
                                        break;
                                    case 17:
                                        this.$ = $$[$0 - 2] ? [$$[$0 - 2], $$[$0 - 1], $$[$0]] : [$$[$0 - 1], $$[$0]];
                                        break;
                                    case 18:
                                        this.$ = $$[$0 - 1];
                                        break;
                                    case 19:
                                        this.$ = $$[$0];
                                        break;
                                    case 20:
                                        this.$ = "";
                                        break;
                                    case 21:
                                        this.$ = $$[$0];
                                        break;
                                    case 22:
                                        this.$ = $$[$0 - 4] + $$[$0 - 3] + $$[$0 - 2] + $$[$0 - 1] + $$[$0];
                                        break;
                                    case 23:
                                        this.$ = $$[$0 - 3] + $$[$0 - 2] + $$[$0 - 1] + $$[$0];
                                        break;
                                    case 24:
                                        this.$ = yytext;
                                        break;
                                    case 25:
                                        this.$ = $$[$0 - 1] + $$[$0];
                                        break;
                                    case 26:
                                        this.$ = $$[$0 - 1];
                                        break;
                                    case 27:
                                        this.$ = ["*"];
                                        break;
                                    case 29:
                                        this.$ = [$$[$0]];
                                        break;
                                    case 30:
                                        this.$ = $$[$0 - 2];
                                        this.$.push($$[$0]);
                                        break;
                                    case 31:
                                        this.$ = $$[$0];
                                        if (!(yy.options && yy.options.flex) && this.$.match(/[\w\d]$/) && !this.$.match(/\\(r|f|n|t|v|s|b|c[A-Z]|x[0-9A-F]{2}|u[a-fA-F0-9]{4}|[0-7]{1,3})$/)) {
                                            this.$ += "\\b";
                                        }
                                        break;
                                    case 32:
                                        this.$ = $$[$0 - 2] + "|" + $$[$0];
                                        break;
                                    case 33:
                                        this.$ = $$[$0 - 1] + "|";
                                        break;
                                    case 35:
                                        this.$ = "";
                                        break;
                                    case 36:
                                        this.$ = $$[$0 - 1] + $$[$0];
                                        break;
                                    case 38:
                                        this.$ = "(" + $$[$0 - 1] + ")";
                                        break;
                                    case 39:
                                        this.$ = $$[$0 - 2] + $$[$0 - 1] + ")";
                                        break;
                                    case 40:
                                        this.$ = $$[$0 - 1] + "+";
                                        break;
                                    case 41:
                                        this.$ = $$[$0 - 1] + "*";
                                        break;
                                    case 42:
                                        this.$ = $$[$0 - 1] + "?";
                                        break;
                                    case 43:
                                        this.$ = "(?=" + $$[$0] + ")";
                                        break;
                                    case 44:
                                        this.$ = "(?!" + $$[$0] + ")";
                                        break;
                                    case 46:
                                        this.$ = $$[$0 - 1] + $$[$0];
                                        break;
                                    case 48:
                                        this.$ = ".";
                                        break;
                                    case 49:
                                        this.$ = "^";
                                        break;
                                    case 50:
                                        this.$ = "$";
                                        break;
                                    case 54:
                                        this.$ = yytext;
                                        break;
                                    case 55:
                                        this.$ = yytext;
                                        break;
                                    case 56:
                                        this.$ = yytext;
                                        break;
                                    case 57:
                                        this.$ = prepareString(yytext.substr(1, yytext.length - 2));
                                        break;
                                }
                            },
                            table: [
                                { 3: 1, 4: 2, 5: [2, 7], 10: 3, 11: [1, 4], 12: [1, 5], 14: [1, 6], 16: [1, 7] },
                                { 1: [3] },
                                { 5: [1, 8] },
                                { 4: 9, 5: [2, 7], 10: 3, 11: [1, 4], 12: [1, 5], 14: [1, 6], 16: [1, 7] },
                                { 4: 10, 5: [2, 7], 10: 3, 11: [1, 4], 12: [1, 5], 14: [1, 6], 16: [1, 7] },
                                {
                                    5: [2, 35],
                                    11: [2, 35],
                                    12: [2, 35],
                                    13: 11,
                                    14: [2, 35],
                                    16: [2, 35],
                                    32: 12,
                                    33: [2, 35],
                                    34: 13,
                                    35: 14,
                                    36: [1, 15],
                                    38: [1, 16],
                                    41: [1, 17],
                                    42: [1, 18],
                                    43: 19,
                                    45: 20,
                                    46: [1, 21],
                                    47: [1, 22],
                                    48: [1, 23],
                                    49: 24,
                                    50: 25,
                                    51: [1, 26],
                                    52: [1, 27],
                                    53: [1, 30],
                                    55: [1, 28],
                                    56: [1, 29],
                                },
                                { 15: 31, 18: [1, 32] },
                                { 17: 33, 18: [1, 34] },
                                {
                                    6: 35,
                                    11: [2, 28],
                                    19: 36,
                                    20: 37,
                                    22: [2, 28],
                                    27: [1, 38],
                                    33: [2, 28],
                                    36: [2, 28],
                                    38: [2, 28],
                                    41: [2, 28],
                                    42: [2, 28],
                                    46: [2, 28],
                                    47: [2, 28],
                                    48: [2, 28],
                                    51: [2, 28],
                                    52: [2, 28],
                                    53: [2, 28],
                                    55: [2, 28],
                                    56: [2, 28],
                                },
                                { 5: [2, 5] },
                                { 5: [2, 6] },
                                { 5: [2, 8], 11: [2, 8], 12: [2, 8], 14: [2, 8], 16: [2, 8] },
                                { 5: [2, 31], 11: [2, 31], 12: [2, 31], 14: [2, 31], 16: [2, 31], 22: [2, 31], 33: [1, 39] },
                                {
                                    5: [2, 34],
                                    11: [2, 34],
                                    12: [2, 34],
                                    14: [2, 34],
                                    16: [2, 34],
                                    22: [2, 34],
                                    33: [2, 34],
                                    35: 40,
                                    36: [1, 15],
                                    37: [2, 34],
                                    38: [1, 16],
                                    41: [1, 17],
                                    42: [1, 18],
                                    43: 19,
                                    45: 20,
                                    46: [1, 21],
                                    47: [1, 22],
                                    48: [1, 23],
                                    49: 24,
                                    50: 25,
                                    51: [1, 26],
                                    52: [1, 27],
                                    53: [1, 30],
                                    55: [1, 28],
                                    56: [1, 29],
                                },
                                {
                                    5: [2, 37],
                                    11: [2, 37],
                                    12: [2, 37],
                                    14: [2, 37],
                                    16: [2, 37],
                                    22: [2, 37],
                                    30: [1, 42],
                                    33: [2, 37],
                                    36: [2, 37],
                                    37: [2, 37],
                                    38: [2, 37],
                                    39: [1, 41],
                                    40: [1, 43],
                                    41: [2, 37],
                                    42: [2, 37],
                                    44: 44,
                                    46: [2, 37],
                                    47: [2, 37],
                                    48: [2, 37],
                                    51: [2, 37],
                                    52: [2, 37],
                                    53: [2, 37],
                                    54: [1, 45],
                                    55: [2, 37],
                                    56: [2, 37],
                                },
                                {
                                    32: 46,
                                    33: [2, 35],
                                    34: 13,
                                    35: 14,
                                    36: [1, 15],
                                    37: [2, 35],
                                    38: [1, 16],
                                    41: [1, 17],
                                    42: [1, 18],
                                    43: 19,
                                    45: 20,
                                    46: [1, 21],
                                    47: [1, 22],
                                    48: [1, 23],
                                    49: 24,
                                    50: 25,
                                    51: [1, 26],
                                    52: [1, 27],
                                    53: [1, 30],
                                    55: [1, 28],
                                    56: [1, 29],
                                },
                                {
                                    32: 47,
                                    33: [2, 35],
                                    34: 13,
                                    35: 14,
                                    36: [1, 15],
                                    37: [2, 35],
                                    38: [1, 16],
                                    41: [1, 17],
                                    42: [1, 18],
                                    43: 19,
                                    45: 20,
                                    46: [1, 21],
                                    47: [1, 22],
                                    48: [1, 23],
                                    49: 24,
                                    50: 25,
                                    51: [1, 26],
                                    52: [1, 27],
                                    53: [1, 30],
                                    55: [1, 28],
                                    56: [1, 29],
                                },
                                { 35: 48, 36: [1, 15], 38: [1, 16], 41: [1, 17], 42: [1, 18], 43: 19, 45: 20, 46: [1, 21], 47: [1, 22], 48: [1, 23], 49: 24, 50: 25, 51: [1, 26], 52: [1, 27], 53: [1, 30], 55: [1, 28], 56: [1, 29] },
                                { 35: 49, 36: [1, 15], 38: [1, 16], 41: [1, 17], 42: [1, 18], 43: 19, 45: 20, 46: [1, 21], 47: [1, 22], 48: [1, 23], 49: 24, 50: 25, 51: [1, 26], 52: [1, 27], 53: [1, 30], 55: [1, 28], 56: [1, 29] },
                                {
                                    5: [2, 45],
                                    11: [2, 45],
                                    12: [2, 45],
                                    14: [2, 45],
                                    16: [2, 45],
                                    22: [2, 45],
                                    30: [2, 45],
                                    33: [2, 45],
                                    36: [2, 45],
                                    37: [2, 45],
                                    38: [2, 45],
                                    39: [2, 45],
                                    40: [2, 45],
                                    41: [2, 45],
                                    42: [2, 45],
                                    46: [2, 45],
                                    47: [2, 45],
                                    48: [2, 45],
                                    51: [2, 45],
                                    52: [2, 45],
                                    53: [2, 45],
                                    54: [2, 45],
                                    55: [2, 45],
                                    56: [2, 45],
                                },
                                {
                                    5: [2, 47],
                                    11: [2, 47],
                                    12: [2, 47],
                                    14: [2, 47],
                                    16: [2, 47],
                                    22: [2, 47],
                                    30: [2, 47],
                                    33: [2, 47],
                                    36: [2, 47],
                                    37: [2, 47],
                                    38: [2, 47],
                                    39: [2, 47],
                                    40: [2, 47],
                                    41: [2, 47],
                                    42: [2, 47],
                                    46: [2, 47],
                                    47: [2, 47],
                                    48: [2, 47],
                                    51: [2, 47],
                                    52: [2, 47],
                                    53: [2, 47],
                                    54: [2, 47],
                                    55: [2, 47],
                                    56: [2, 47],
                                },
                                {
                                    5: [2, 48],
                                    11: [2, 48],
                                    12: [2, 48],
                                    14: [2, 48],
                                    16: [2, 48],
                                    22: [2, 48],
                                    30: [2, 48],
                                    33: [2, 48],
                                    36: [2, 48],
                                    37: [2, 48],
                                    38: [2, 48],
                                    39: [2, 48],
                                    40: [2, 48],
                                    41: [2, 48],
                                    42: [2, 48],
                                    46: [2, 48],
                                    47: [2, 48],
                                    48: [2, 48],
                                    51: [2, 48],
                                    52: [2, 48],
                                    53: [2, 48],
                                    54: [2, 48],
                                    55: [2, 48],
                                    56: [2, 48],
                                },
                                {
                                    5: [2, 49],
                                    11: [2, 49],
                                    12: [2, 49],
                                    14: [2, 49],
                                    16: [2, 49],
                                    22: [2, 49],
                                    30: [2, 49],
                                    33: [2, 49],
                                    36: [2, 49],
                                    37: [2, 49],
                                    38: [2, 49],
                                    39: [2, 49],
                                    40: [2, 49],
                                    41: [2, 49],
                                    42: [2, 49],
                                    46: [2, 49],
                                    47: [2, 49],
                                    48: [2, 49],
                                    51: [2, 49],
                                    52: [2, 49],
                                    53: [2, 49],
                                    54: [2, 49],
                                    55: [2, 49],
                                    56: [2, 49],
                                },
                                {
                                    5: [2, 50],
                                    11: [2, 50],
                                    12: [2, 50],
                                    14: [2, 50],
                                    16: [2, 50],
                                    22: [2, 50],
                                    30: [2, 50],
                                    33: [2, 50],
                                    36: [2, 50],
                                    37: [2, 50],
                                    38: [2, 50],
                                    39: [2, 50],
                                    40: [2, 50],
                                    41: [2, 50],
                                    42: [2, 50],
                                    46: [2, 50],
                                    47: [2, 50],
                                    48: [2, 50],
                                    51: [2, 50],
                                    52: [2, 50],
                                    53: [2, 50],
                                    54: [2, 50],
                                    55: [2, 50],
                                    56: [2, 50],
                                },
                                {
                                    5: [2, 51],
                                    11: [2, 51],
                                    12: [2, 51],
                                    14: [2, 51],
                                    16: [2, 51],
                                    22: [2, 51],
                                    30: [2, 51],
                                    33: [2, 51],
                                    36: [2, 51],
                                    37: [2, 51],
                                    38: [2, 51],
                                    39: [2, 51],
                                    40: [2, 51],
                                    41: [2, 51],
                                    42: [2, 51],
                                    46: [2, 51],
                                    47: [2, 51],
                                    48: [2, 51],
                                    51: [2, 51],
                                    52: [2, 51],
                                    53: [2, 51],
                                    54: [2, 51],
                                    55: [2, 51],
                                    56: [2, 51],
                                },
                                {
                                    5: [2, 52],
                                    11: [2, 52],
                                    12: [2, 52],
                                    14: [2, 52],
                                    16: [2, 52],
                                    22: [2, 52],
                                    30: [2, 52],
                                    33: [2, 52],
                                    36: [2, 52],
                                    37: [2, 52],
                                    38: [2, 52],
                                    39: [2, 52],
                                    40: [2, 52],
                                    41: [2, 52],
                                    42: [2, 52],
                                    46: [2, 52],
                                    47: [2, 52],
                                    48: [2, 52],
                                    51: [2, 52],
                                    52: [2, 52],
                                    53: [2, 52],
                                    54: [2, 52],
                                    55: [2, 52],
                                    56: [2, 52],
                                },
                                {
                                    5: [2, 53],
                                    11: [2, 53],
                                    12: [2, 53],
                                    14: [2, 53],
                                    16: [2, 53],
                                    22: [2, 53],
                                    30: [2, 53],
                                    33: [2, 53],
                                    36: [2, 53],
                                    37: [2, 53],
                                    38: [2, 53],
                                    39: [2, 53],
                                    40: [2, 53],
                                    41: [2, 53],
                                    42: [2, 53],
                                    46: [2, 53],
                                    47: [2, 53],
                                    48: [2, 53],
                                    51: [2, 53],
                                    52: [2, 53],
                                    53: [2, 53],
                                    54: [2, 53],
                                    55: [2, 53],
                                    56: [2, 53],
                                },
                                {
                                    5: [2, 54],
                                    11: [2, 54],
                                    12: [2, 54],
                                    14: [2, 54],
                                    16: [2, 54],
                                    22: [2, 54],
                                    30: [2, 54],
                                    33: [2, 54],
                                    36: [2, 54],
                                    37: [2, 54],
                                    38: [2, 54],
                                    39: [2, 54],
                                    40: [2, 54],
                                    41: [2, 54],
                                    42: [2, 54],
                                    46: [2, 54],
                                    47: [2, 54],
                                    48: [2, 54],
                                    51: [2, 54],
                                    52: [2, 54],
                                    53: [2, 54],
                                    54: [2, 54],
                                    55: [2, 54],
                                    56: [2, 54],
                                },
                                {
                                    5: [2, 57],
                                    11: [2, 57],
                                    12: [2, 57],
                                    14: [2, 57],
                                    16: [2, 57],
                                    22: [2, 57],
                                    30: [2, 57],
                                    33: [2, 57],
                                    36: [2, 57],
                                    37: [2, 57],
                                    38: [2, 57],
                                    39: [2, 57],
                                    40: [2, 57],
                                    41: [2, 57],
                                    42: [2, 57],
                                    46: [2, 57],
                                    47: [2, 57],
                                    48: [2, 57],
                                    51: [2, 57],
                                    52: [2, 57],
                                    53: [2, 57],
                                    54: [2, 57],
                                    55: [2, 57],
                                    56: [2, 57],
                                },
                                {
                                    5: [2, 58],
                                    11: [2, 58],
                                    12: [2, 58],
                                    14: [2, 58],
                                    16: [2, 58],
                                    22: [2, 58],
                                    30: [2, 58],
                                    33: [2, 58],
                                    36: [2, 58],
                                    37: [2, 58],
                                    38: [2, 58],
                                    39: [2, 58],
                                    40: [2, 58],
                                    41: [2, 58],
                                    42: [2, 58],
                                    46: [2, 58],
                                    47: [2, 58],
                                    48: [2, 58],
                                    51: [2, 58],
                                    52: [2, 58],
                                    53: [2, 58],
                                    54: [2, 58],
                                    55: [2, 58],
                                    56: [2, 58],
                                },
                                {
                                    5: [2, 55],
                                    11: [2, 55],
                                    12: [2, 55],
                                    14: [2, 55],
                                    16: [2, 55],
                                    22: [2, 55],
                                    30: [2, 55],
                                    33: [2, 55],
                                    36: [2, 55],
                                    37: [2, 55],
                                    38: [2, 55],
                                    39: [2, 55],
                                    40: [2, 55],
                                    41: [2, 55],
                                    42: [2, 55],
                                    46: [2, 55],
                                    47: [2, 55],
                                    48: [2, 55],
                                    51: [2, 55],
                                    52: [2, 55],
                                    53: [2, 55],
                                    54: [2, 55],
                                    55: [2, 55],
                                    56: [2, 55],
                                },
                                { 5: [2, 9], 11: [2, 9], 12: [2, 9], 14: [2, 9], 16: [2, 9], 18: [1, 50] },
                                { 5: [2, 11], 11: [2, 11], 12: [2, 11], 14: [2, 11], 16: [2, 11], 18: [2, 11] },
                                { 5: [2, 10], 11: [2, 10], 12: [2, 10], 14: [2, 10], 16: [2, 10], 18: [1, 51] },
                                { 5: [2, 13], 11: [2, 13], 12: [2, 13], 14: [2, 13], 16: [2, 13], 18: [2, 13] },
                                {
                                    5: [1, 55],
                                    7: 52,
                                    8: [1, 54],
                                    11: [2, 28],
                                    19: 53,
                                    20: 37,
                                    22: [2, 28],
                                    27: [1, 38],
                                    33: [2, 28],
                                    36: [2, 28],
                                    38: [2, 28],
                                    41: [2, 28],
                                    42: [2, 28],
                                    46: [2, 28],
                                    47: [2, 28],
                                    48: [2, 28],
                                    51: [2, 28],
                                    52: [2, 28],
                                    53: [2, 28],
                                    55: [2, 28],
                                    56: [2, 28],
                                },
                                {
                                    5: [2, 16],
                                    8: [2, 16],
                                    11: [2, 16],
                                    22: [2, 16],
                                    27: [2, 16],
                                    33: [2, 16],
                                    36: [2, 16],
                                    38: [2, 16],
                                    41: [2, 16],
                                    42: [2, 16],
                                    46: [2, 16],
                                    47: [2, 16],
                                    48: [2, 16],
                                    51: [2, 16],
                                    52: [2, 16],
                                    53: [2, 16],
                                    55: [2, 16],
                                    56: [2, 16],
                                },
                                {
                                    11: [2, 35],
                                    13: 56,
                                    22: [2, 35],
                                    32: 12,
                                    33: [2, 35],
                                    34: 13,
                                    35: 14,
                                    36: [1, 15],
                                    38: [1, 16],
                                    41: [1, 17],
                                    42: [1, 18],
                                    43: 19,
                                    45: 20,
                                    46: [1, 21],
                                    47: [1, 22],
                                    48: [1, 23],
                                    49: 24,
                                    50: 25,
                                    51: [1, 26],
                                    52: [1, 27],
                                    53: [1, 30],
                                    55: [1, 28],
                                    56: [1, 29],
                                },
                                { 12: [1, 59], 28: 57, 30: [1, 58] },
                                {
                                    5: [2, 33],
                                    11: [2, 33],
                                    12: [2, 33],
                                    14: [2, 33],
                                    16: [2, 33],
                                    22: [2, 33],
                                    33: [2, 33],
                                    34: 60,
                                    35: 14,
                                    36: [1, 15],
                                    37: [2, 33],
                                    38: [1, 16],
                                    41: [1, 17],
                                    42: [1, 18],
                                    43: 19,
                                    45: 20,
                                    46: [1, 21],
                                    47: [1, 22],
                                    48: [1, 23],
                                    49: 24,
                                    50: 25,
                                    51: [1, 26],
                                    52: [1, 27],
                                    53: [1, 30],
                                    55: [1, 28],
                                    56: [1, 29],
                                },
                                {
                                    5: [2, 36],
                                    11: [2, 36],
                                    12: [2, 36],
                                    14: [2, 36],
                                    16: [2, 36],
                                    22: [2, 36],
                                    30: [1, 42],
                                    33: [2, 36],
                                    36: [2, 36],
                                    37: [2, 36],
                                    38: [2, 36],
                                    39: [1, 41],
                                    40: [1, 43],
                                    41: [2, 36],
                                    42: [2, 36],
                                    44: 44,
                                    46: [2, 36],
                                    47: [2, 36],
                                    48: [2, 36],
                                    51: [2, 36],
                                    52: [2, 36],
                                    53: [2, 36],
                                    54: [1, 45],
                                    55: [2, 36],
                                    56: [2, 36],
                                },
                                {
                                    5: [2, 40],
                                    11: [2, 40],
                                    12: [2, 40],
                                    14: [2, 40],
                                    16: [2, 40],
                                    22: [2, 40],
                                    30: [2, 40],
                                    33: [2, 40],
                                    36: [2, 40],
                                    37: [2, 40],
                                    38: [2, 40],
                                    39: [2, 40],
                                    40: [2, 40],
                                    41: [2, 40],
                                    42: [2, 40],
                                    46: [2, 40],
                                    47: [2, 40],
                                    48: [2, 40],
                                    51: [2, 40],
                                    52: [2, 40],
                                    53: [2, 40],
                                    54: [2, 40],
                                    55: [2, 40],
                                    56: [2, 40],
                                },
                                {
                                    5: [2, 41],
                                    11: [2, 41],
                                    12: [2, 41],
                                    14: [2, 41],
                                    16: [2, 41],
                                    22: [2, 41],
                                    30: [2, 41],
                                    33: [2, 41],
                                    36: [2, 41],
                                    37: [2, 41],
                                    38: [2, 41],
                                    39: [2, 41],
                                    40: [2, 41],
                                    41: [2, 41],
                                    42: [2, 41],
                                    46: [2, 41],
                                    47: [2, 41],
                                    48: [2, 41],
                                    51: [2, 41],
                                    52: [2, 41],
                                    53: [2, 41],
                                    54: [2, 41],
                                    55: [2, 41],
                                    56: [2, 41],
                                },
                                {
                                    5: [2, 42],
                                    11: [2, 42],
                                    12: [2, 42],
                                    14: [2, 42],
                                    16: [2, 42],
                                    22: [2, 42],
                                    30: [2, 42],
                                    33: [2, 42],
                                    36: [2, 42],
                                    37: [2, 42],
                                    38: [2, 42],
                                    39: [2, 42],
                                    40: [2, 42],
                                    41: [2, 42],
                                    42: [2, 42],
                                    46: [2, 42],
                                    47: [2, 42],
                                    48: [2, 42],
                                    51: [2, 42],
                                    52: [2, 42],
                                    53: [2, 42],
                                    54: [2, 42],
                                    55: [2, 42],
                                    56: [2, 42],
                                },
                                {
                                    5: [2, 46],
                                    11: [2, 46],
                                    12: [2, 46],
                                    14: [2, 46],
                                    16: [2, 46],
                                    22: [2, 46],
                                    30: [2, 46],
                                    33: [2, 46],
                                    36: [2, 46],
                                    37: [2, 46],
                                    38: [2, 46],
                                    39: [2, 46],
                                    40: [2, 46],
                                    41: [2, 46],
                                    42: [2, 46],
                                    46: [2, 46],
                                    47: [2, 46],
                                    48: [2, 46],
                                    51: [2, 46],
                                    52: [2, 46],
                                    53: [2, 46],
                                    54: [2, 46],
                                    55: [2, 46],
                                    56: [2, 46],
                                },
                                {
                                    5: [2, 56],
                                    11: [2, 56],
                                    12: [2, 56],
                                    14: [2, 56],
                                    16: [2, 56],
                                    22: [2, 56],
                                    30: [2, 56],
                                    33: [2, 56],
                                    36: [2, 56],
                                    37: [2, 56],
                                    38: [2, 56],
                                    39: [2, 56],
                                    40: [2, 56],
                                    41: [2, 56],
                                    42: [2, 56],
                                    46: [2, 56],
                                    47: [2, 56],
                                    48: [2, 56],
                                    51: [2, 56],
                                    52: [2, 56],
                                    53: [2, 56],
                                    54: [2, 56],
                                    55: [2, 56],
                                    56: [2, 56],
                                },
                                { 33: [1, 39], 37: [1, 61] },
                                { 33: [1, 39], 37: [1, 62] },
                                {
                                    5: [2, 43],
                                    11: [2, 43],
                                    12: [2, 43],
                                    14: [2, 43],
                                    16: [2, 43],
                                    22: [2, 43],
                                    30: [1, 42],
                                    33: [2, 43],
                                    36: [2, 43],
                                    37: [2, 43],
                                    38: [2, 43],
                                    39: [1, 41],
                                    40: [1, 43],
                                    41: [2, 43],
                                    42: [2, 43],
                                    44: 44,
                                    46: [2, 43],
                                    47: [2, 43],
                                    48: [2, 43],
                                    51: [2, 43],
                                    52: [2, 43],
                                    53: [2, 43],
                                    54: [1, 45],
                                    55: [2, 43],
                                    56: [2, 43],
                                },
                                {
                                    5: [2, 44],
                                    11: [2, 44],
                                    12: [2, 44],
                                    14: [2, 44],
                                    16: [2, 44],
                                    22: [2, 44],
                                    30: [1, 42],
                                    33: [2, 44],
                                    36: [2, 44],
                                    37: [2, 44],
                                    38: [2, 44],
                                    39: [1, 41],
                                    40: [1, 43],
                                    41: [2, 44],
                                    42: [2, 44],
                                    44: 44,
                                    46: [2, 44],
                                    47: [2, 44],
                                    48: [2, 44],
                                    51: [2, 44],
                                    52: [2, 44],
                                    53: [2, 44],
                                    54: [1, 45],
                                    55: [2, 44],
                                    56: [2, 44],
                                },
                                { 5: [2, 12], 11: [2, 12], 12: [2, 12], 14: [2, 12], 16: [2, 12], 18: [2, 12] },
                                { 5: [2, 14], 11: [2, 14], 12: [2, 14], 14: [2, 14], 16: [2, 14], 18: [2, 14] },
                                { 1: [2, 1] },
                                {
                                    5: [2, 15],
                                    8: [2, 15],
                                    11: [2, 15],
                                    22: [2, 15],
                                    27: [2, 15],
                                    33: [2, 15],
                                    36: [2, 15],
                                    38: [2, 15],
                                    41: [2, 15],
                                    42: [2, 15],
                                    46: [2, 15],
                                    47: [2, 15],
                                    48: [2, 15],
                                    51: [2, 15],
                                    52: [2, 15],
                                    53: [2, 15],
                                    55: [2, 15],
                                    56: [2, 15],
                                },
                                { 1: [2, 2] },
                                { 8: [1, 63], 9: [1, 64] },
                                { 11: [1, 67], 21: 65, 22: [1, 66] },
                                { 29: [1, 68], 31: [1, 69] },
                                { 29: [1, 70] },
                                { 29: [2, 29], 31: [2, 29] },
                                {
                                    5: [2, 32],
                                    11: [2, 32],
                                    12: [2, 32],
                                    14: [2, 32],
                                    16: [2, 32],
                                    22: [2, 32],
                                    33: [2, 32],
                                    35: 40,
                                    36: [1, 15],
                                    37: [2, 32],
                                    38: [1, 16],
                                    41: [1, 17],
                                    42: [1, 18],
                                    43: 19,
                                    45: 20,
                                    46: [1, 21],
                                    47: [1, 22],
                                    48: [1, 23],
                                    49: 24,
                                    50: 25,
                                    51: [1, 26],
                                    52: [1, 27],
                                    53: [1, 30],
                                    55: [1, 28],
                                    56: [1, 29],
                                },
                                {
                                    5: [2, 38],
                                    11: [2, 38],
                                    12: [2, 38],
                                    14: [2, 38],
                                    16: [2, 38],
                                    22: [2, 38],
                                    30: [2, 38],
                                    33: [2, 38],
                                    36: [2, 38],
                                    37: [2, 38],
                                    38: [2, 38],
                                    39: [2, 38],
                                    40: [2, 38],
                                    41: [2, 38],
                                    42: [2, 38],
                                    46: [2, 38],
                                    47: [2, 38],
                                    48: [2, 38],
                                    51: [2, 38],
                                    52: [2, 38],
                                    53: [2, 38],
                                    54: [2, 38],
                                    55: [2, 38],
                                    56: [2, 38],
                                },
                                {
                                    5: [2, 39],
                                    11: [2, 39],
                                    12: [2, 39],
                                    14: [2, 39],
                                    16: [2, 39],
                                    22: [2, 39],
                                    30: [2, 39],
                                    33: [2, 39],
                                    36: [2, 39],
                                    37: [2, 39],
                                    38: [2, 39],
                                    39: [2, 39],
                                    40: [2, 39],
                                    41: [2, 39],
                                    42: [2, 39],
                                    46: [2, 39],
                                    47: [2, 39],
                                    48: [2, 39],
                                    51: [2, 39],
                                    52: [2, 39],
                                    53: [2, 39],
                                    54: [2, 39],
                                    55: [2, 39],
                                    56: [2, 39],
                                },
                                { 1: [2, 3] },
                                { 8: [1, 71] },
                                {
                                    5: [2, 17],
                                    8: [2, 17],
                                    11: [2, 17],
                                    22: [2, 17],
                                    27: [2, 17],
                                    33: [2, 17],
                                    36: [2, 17],
                                    38: [2, 17],
                                    41: [2, 17],
                                    42: [2, 17],
                                    46: [2, 17],
                                    47: [2, 17],
                                    48: [2, 17],
                                    51: [2, 17],
                                    52: [2, 17],
                                    53: [2, 17],
                                    55: [2, 17],
                                    56: [2, 17],
                                },
                                { 22: [2, 20], 23: 72, 24: [2, 20], 25: 73, 26: [1, 74] },
                                {
                                    5: [2, 19],
                                    8: [2, 19],
                                    11: [2, 19],
                                    22: [2, 19],
                                    27: [2, 19],
                                    33: [2, 19],
                                    36: [2, 19],
                                    38: [2, 19],
                                    41: [2, 19],
                                    42: [2, 19],
                                    46: [2, 19],
                                    47: [2, 19],
                                    48: [2, 19],
                                    51: [2, 19],
                                    52: [2, 19],
                                    53: [2, 19],
                                    55: [2, 19],
                                    56: [2, 19],
                                },
                                { 11: [2, 26], 22: [2, 26], 33: [2, 26], 36: [2, 26], 38: [2, 26], 41: [2, 26], 42: [2, 26], 46: [2, 26], 47: [2, 26], 48: [2, 26], 51: [2, 26], 52: [2, 26], 53: [2, 26], 55: [2, 26], 56: [2, 26] },
                                { 12: [1, 75] },
                                { 11: [2, 27], 22: [2, 27], 33: [2, 27], 36: [2, 27], 38: [2, 27], 41: [2, 27], 42: [2, 27], 46: [2, 27], 47: [2, 27], 48: [2, 27], 51: [2, 27], 52: [2, 27], 53: [2, 27], 55: [2, 27], 56: [2, 27] },
                                { 1: [2, 4] },
                                { 22: [1, 77], 24: [1, 76] },
                                { 22: [2, 21], 24: [2, 21], 26: [1, 78] },
                                { 22: [2, 24], 24: [2, 24], 26: [2, 24] },
                                { 29: [2, 30], 31: [2, 30] },
                                {
                                    5: [2, 18],
                                    8: [2, 18],
                                    11: [2, 18],
                                    22: [2, 18],
                                    27: [2, 18],
                                    33: [2, 18],
                                    36: [2, 18],
                                    38: [2, 18],
                                    41: [2, 18],
                                    42: [2, 18],
                                    46: [2, 18],
                                    47: [2, 18],
                                    48: [2, 18],
                                    51: [2, 18],
                                    52: [2, 18],
                                    53: [2, 18],
                                    55: [2, 18],
                                    56: [2, 18],
                                },
                                { 22: [2, 20], 23: 79, 24: [2, 20], 25: 73, 26: [1, 74] },
                                { 22: [2, 25], 24: [2, 25], 26: [2, 25] },
                                { 22: [1, 77], 24: [1, 80] },
                                { 22: [2, 23], 24: [2, 23], 25: 81, 26: [1, 74] },
                                { 22: [2, 22], 24: [2, 22], 26: [1, 78] },
                            ],
                            defaultActions: { 9: [2, 5], 10: [2, 6], 52: [2, 1], 54: [2, 2], 63: [2, 3], 71: [2, 4] },
                            parseError: function parseError(str, hash) {
                                if (hash.recoverable) {
                                    this.trace(str);
                                } else {
                                    throw new Error(str);
                                }
                            },
                            parse: function parse(input) {
                                var self = this,
                                    stack = [0],
                                    vstack = [null],
                                    lstack = [],
                                    table = this.table,
                                    yytext = "",
                                    yylineno = 0,
                                    yyleng = 0,
                                    recovering = 0,
                                    TERROR = 2,
                                    EOF = 1;
                                this.lexer.setInput(input);
                                this.lexer.yy = this.yy;
                                this.yy.lexer = this.lexer;
                                this.yy.parser = this;
                                if (typeof this.lexer.yylloc == "undefined") {
                                    this.lexer.yylloc = {};
                                }
                                var yyloc = this.lexer.yylloc;
                                lstack.push(yyloc);
                                var ranges = this.lexer.options && this.lexer.options.ranges;
                                if (typeof this.yy.parseError === "function") {
                                    this.parseError = this.yy.parseError;
                                } else {
                                    this.parseError = Object.getPrototypeOf(this).parseError;
                                }
                                function popStack(n) {
                                    stack.length = stack.length - 2 * n;
                                    vstack.length = vstack.length - n;
                                    lstack.length = lstack.length - n;
                                }
                                function lex() {
                                    var token;
                                    token = self.lexer.lex() || EOF;
                                    if (typeof token !== "number") {
                                        token = self.symbols_[token] || token;
                                    }
                                    return token;
                                }
                                var symbol,
                                    preErrorSymbol,
                                    state,
                                    action,
                                    a,
                                    r,
                                    yyval = {},
                                    p,
                                    len,
                                    newState,
                                    expected;
                                while (true) {
                                    state = stack[stack.length - 1];
                                    if (this.defaultActions[state]) {
                                        action = this.defaultActions[state];
                                    } else {
                                        if (symbol === null || typeof symbol == "undefined") {
                                            symbol = lex();
                                        }
                                        action = table[state] && table[state][symbol];
                                    }
                                    if (typeof action === "undefined" || !action.length || !action[0]) {
                                        var errStr = "";
                                        expected = [];
                                        for (p in table[state]) {
                                            if (this.terminals_[p] && p > TERROR) {
                                                expected.push("'" + this.terminals_[p] + "'");
                                            }
                                        }
                                        if (this.lexer.showPosition) {
                                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                                        } else {
                                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == EOF ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                                        }
                                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
                                    }
                                    if (action[0] instanceof Array && action.length > 1) {
                                        throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                                    }
                                    switch (action[0]) {
                                        case 1:
                                            stack.push(symbol);
                                            vstack.push(this.lexer.yytext);
                                            lstack.push(this.lexer.yylloc);
                                            stack.push(action[1]);
                                            symbol = null;
                                            if (!preErrorSymbol) {
                                                yyleng = this.lexer.yyleng;
                                                yytext = this.lexer.yytext;
                                                yylineno = this.lexer.yylineno;
                                                yyloc = this.lexer.yylloc;
                                                if (recovering > 0) {
                                                    recovering--;
                                                }
                                            } else {
                                                symbol = preErrorSymbol;
                                                preErrorSymbol = null;
                                            }
                                            break;
                                        case 2:
                                            len = this.productions_[action[1]][1];
                                            yyval.$ = vstack[vstack.length - len];
                                            yyval._$ = {
                                                first_line: lstack[lstack.length - (len || 1)].first_line,
                                                last_line: lstack[lstack.length - 1].last_line,
                                                first_column: lstack[lstack.length - (len || 1)].first_column,
                                                last_column: lstack[lstack.length - 1].last_column,
                                            };
                                            if (ranges) {
                                                yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                                            }
                                            r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                                            if (typeof r !== "undefined") {
                                                return r;
                                            }
                                            if (len) {
                                                stack = stack.slice(0, -1 * len * 2);
                                                vstack = vstack.slice(0, -1 * len);
                                                lstack = lstack.slice(0, -1 * len);
                                            }
                                            stack.push(this.productions_[action[1]][0]);
                                            vstack.push(yyval.$);
                                            lstack.push(yyval._$);
                                            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                                            stack.push(newState);
                                            break;
                                        case 3:
                                            return true;
                                    }
                                }
                                return true;
                            },
                        };
                        function encodeRE(s) {
                            return s.replace(/([.*+?^${}()|[\]\/\\])/g, "\\$1").replace(/\\\\u([a-fA-F0-9]{4})/g, "\\u$1");
                        }
                        function prepareString(s) {
                            s = s.replace(/\\\\/g, "\\");
                            s = encodeRE(s);
                            return s;
                        }
                        var lexer = (function () {
                            var lexer = {
                                EOF: 1,
                                parseError: function parseError(str, hash) {
                                    if (this.yy.parser) {
                                        this.yy.parser.parseError(str, hash);
                                    } else {
                                        throw new Error(str);
                                    }
                                },
                                setInput: function (input) {
                                    this._input = input;
                                    this._more = this._backtrack = this.done = false;
                                    this.yylineno = this.yyleng = 0;
                                    this.yytext = this.matched = this.match = "";
                                    this.conditionStack = ["INITIAL"];
                                    this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
                                    if (this.options.ranges) {
                                        this.yylloc.range = [0, 0];
                                    }
                                    this.offset = 0;
                                    return this;
                                },
                                input: function () {
                                    var ch = this._input[0];
                                    this.yytext += ch;
                                    this.yyleng++;
                                    this.offset++;
                                    this.match += ch;
                                    this.matched += ch;
                                    var lines = ch.match(/(?:\r\n?|\n).*/g);
                                    if (lines) {
                                        this.yylineno++;
                                        this.yylloc.last_line++;
                                    } else {
                                        this.yylloc.last_column++;
                                    }
                                    if (this.options.ranges) {
                                        this.yylloc.range[1]++;
                                    }
                                    this._input = this._input.slice(1);
                                    return ch;
                                },
                                unput: function (ch) {
                                    var len = ch.length;
                                    var lines = ch.split(/(?:\r\n?|\n)/g);
                                    this._input = ch + this._input;
                                    this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                                    this.offset -= len;
                                    var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                                    this.match = this.match.substr(0, this.match.length - 1);
                                    this.matched = this.matched.substr(0, this.matched.length - 1);
                                    if (lines.length - 1) {
                                        this.yylineno -= lines.length - 1;
                                    }
                                    var r = this.yylloc.range;
                                    this.yylloc = {
                                        first_line: this.yylloc.first_line,
                                        last_line: this.yylineno + 1,
                                        first_column: this.yylloc.first_column,
                                        last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len,
                                    };
                                    if (this.options.ranges) {
                                        this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                                    }
                                    this.yyleng = this.yytext.length;
                                    return this;
                                },
                                more: function () {
                                    this._more = true;
                                    return this;
                                },
                                reject: function () {
                                    if (this.options.backtrack_lexer) {
                                        this._backtrack = true;
                                    } else {
                                        return this.parseError(
                                            "Lexical error on line " +
                                                (this.yylineno + 1) +
                                                ". You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n" +
                                                this.showPosition(),
                                            { text: "", token: null, line: this.yylineno }
                                        );
                                    }
                                    return this;
                                },
                                less: function (n) {
                                    this.unput(this.match.slice(n));
                                },
                                pastInput: function () {
                                    var past = this.matched.substr(0, this.matched.length - this.match.length);
                                    return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
                                },
                                upcomingInput: function () {
                                    var next = this.match;
                                    if (next.length < 20) {
                                        next += this._input.substr(0, 20 - next.length);
                                    }
                                    return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
                                },
                                showPosition: function () {
                                    var pre = this.pastInput();
                                    var c = new Array(pre.length + 1).join("-");
                                    return pre + this.upcomingInput() + "\n" + c + "^";
                                },
                                test_match: function (match, indexed_rule) {
                                    var token, lines, backup;
                                    if (this.options.backtrack_lexer) {
                                        backup = {
                                            yylineno: this.yylineno,
                                            yylloc: { first_line: this.yylloc.first_line, last_line: this.last_line, first_column: this.yylloc.first_column, last_column: this.yylloc.last_column },
                                            yytext: this.yytext,
                                            match: this.match,
                                            matches: this.matches,
                                            matched: this.matched,
                                            yyleng: this.yyleng,
                                            offset: this.offset,
                                            _more: this._more,
                                            _input: this._input,
                                            yy: this.yy,
                                            conditionStack: this.conditionStack.slice(0),
                                            done: this.done,
                                        };
                                        if (this.options.ranges) {
                                            backup.yylloc.range = this.yylloc.range.slice(0);
                                        }
                                    }
                                    lines = match[0].match(/(?:\r\n?|\n).*/g);
                                    if (lines) {
                                        this.yylineno += lines.length;
                                    }
                                    this.yylloc = {
                                        first_line: this.yylloc.last_line,
                                        last_line: this.yylineno + 1,
                                        first_column: this.yylloc.last_column,
                                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length,
                                    };
                                    this.yytext += match[0];
                                    this.match += match[0];
                                    this.matches = match;
                                    this.yyleng = this.yytext.length;
                                    if (this.options.ranges) {
                                        this.yylloc.range = [this.offset, (this.offset += this.yyleng)];
                                    }
                                    this._more = false;
                                    this._backtrack = false;
                                    this._input = this._input.slice(match[0].length);
                                    this.matched += match[0];
                                    token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
                                    if (this.done && this._input) {
                                        this.done = false;
                                    }
                                    if (token) {
                                        return token;
                                    } else if (this._backtrack) {
                                        for (var k in backup) {
                                            this[k] = backup[k];
                                        }
                                        return false;
                                    }
                                    return false;
                                },
                                next: function () {
                                    if (this.done) {
                                        return this.EOF;
                                    }
                                    if (!this._input) {
                                        this.done = true;
                                    }
                                    var token, match, tempMatch, index;
                                    if (!this._more) {
                                        this.yytext = "";
                                        this.match = "";
                                    }
                                    var rules = this._currentRules();
                                    for (var i = 0; i < rules.length; i++) {
                                        tempMatch = this._input.match(this.rules[rules[i]]);
                                        if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                                            match = tempMatch;
                                            index = i;
                                            if (this.options.backtrack_lexer) {
                                                token = this.test_match(tempMatch, rules[i]);
                                                if (token !== false) {
                                                    return token;
                                                } else if (this._backtrack) {
                                                    match = false;
                                                    continue;
                                                } else {
                                                    return false;
                                                }
                                            } else if (!this.options.flex) {
                                                break;
                                            }
                                        }
                                    }
                                    if (match) {
                                        token = this.test_match(match, rules[index]);
                                        if (token !== false) {
                                            return token;
                                        }
                                        return false;
                                    }
                                    if (this._input === "") {
                                        return this.EOF;
                                    } else {
                                        return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), { text: "", token: null, line: this.yylineno });
                                    }
                                },
                                lex: function lex() {
                                    var r = this.next();
                                    if (r) {
                                        return r;
                                    } else {
                                        return this.lex();
                                    }
                                },
                                begin: function begin(condition) {
                                    this.conditionStack.push(condition);
                                },
                                popState: function popState() {
                                    var n = this.conditionStack.length - 1;
                                    if (n > 0) {
                                        return this.conditionStack.pop();
                                    } else {
                                        return this.conditionStack[0];
                                    }
                                },
                                _currentRules: function _currentRules() {
                                    if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
                                        return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
                                    } else {
                                        return this.conditions["INITIAL"].rules;
                                    }
                                },
                                topState: function topState(n) {
                                    n = this.conditionStack.length - 1 - Math.abs(n || 0);
                                    if (n >= 0) {
                                        return this.conditionStack[n];
                                    } else {
                                        return "INITIAL";
                                    }
                                },
                                pushState: function pushState(condition) {
                                    this.begin(condition);
                                },
                                stateStackSize: function stateStackSize() {
                                    return this.conditionStack.length;
                                },
                                options: {},
                                performAction: function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
                                    var YYSTATE = YY_START;
                                    switch ($avoiding_name_collisions) {
                                        case 0:
                                            return 26;
                                            break;
                                        case 1:
                                            return 26;
                                            break;
                                        case 2:
                                            return 26;
                                            break;
                                        case 3:
                                            return 26;
                                            break;
                                        case 4:
                                            return 26;
                                            break;
                                        case 5:
                                            return 26;
                                            break;
                                        case 6:
                                            return 26;
                                            break;
                                        case 7:
                                            yy.depth++;
                                            return 22;
                                            break;
                                        case 8:
                                            yy.depth == 0 ? this.begin("trail") : yy.depth--;
                                            return 24;
                                            break;
                                        case 9:
                                            return 12;
                                            break;
                                        case 10:
                                            this.popState();
                                            return 29;
                                            break;
                                        case 11:
                                            return 31;
                                            break;
                                        case 12:
                                            return 30;
                                            break;
                                        case 13:
                                            break;
                                        case 14:
                                            break;
                                        case 15:
                                            this.begin("indented");
                                            break;
                                        case 16:
                                            this.begin("code");
                                            return 5;
                                            break;
                                        case 17:
                                            return 56;
                                            break;
                                        case 18:
                                            yy.options[yy_.yytext] = true;
                                            break;
                                        case 19:
                                            this.begin("INITIAL");
                                            break;
                                        case 20:
                                            this.begin("INITIAL");
                                            break;
                                        case 21:
                                            break;
                                        case 22:
                                            return 18;
                                            break;
                                        case 23:
                                            this.begin("INITIAL");
                                            break;
                                        case 24:
                                            this.begin("INITIAL");
                                            break;
                                        case 25:
                                            break;
                                        case 26:
                                            this.begin("rules");
                                            break;
                                        case 27:
                                            yy.depth = 0;
                                            this.begin("action");
                                            return 22;
                                            break;
                                        case 28:
                                            this.begin("trail");
                                            yy_.yytext = yy_.yytext.substr(2, yy_.yytext.length - 4);
                                            return 11;
                                            break;
                                        case 29:
                                            yy_.yytext = yy_.yytext.substr(2, yy_.yytext.length - 4);
                                            return 11;
                                            break;
                                        case 30:
                                            this.begin("rules");
                                            return 11;
                                            break;
                                        case 31:
                                            break;
                                        case 32:
                                            break;
                                        case 33:
                                            break;
                                        case 34:
                                            break;
                                        case 35:
                                            return 12;
                                            break;
                                        case 36:
                                            yy_.yytext = yy_.yytext.replace(/\\"/g, '"');
                                            return 55;
                                            break;
                                        case 37:
                                            yy_.yytext = yy_.yytext.replace(/\\'/g, "'");
                                            return 55;
                                            break;
                                        case 38:
                                            return 33;
                                            break;
                                        case 39:
                                            return 52;
                                            break;
                                        case 40:
                                            return 38;
                                            break;
                                        case 41:
                                            return 38;
                                            break;
                                        case 42:
                                            return 38;
                                            break;
                                        case 43:
                                            return 36;
                                            break;
                                        case 44:
                                            return 37;
                                            break;
                                        case 45:
                                            return 39;
                                            break;
                                        case 46:
                                            return 30;
                                            break;
                                        case 47:
                                            return 40;
                                            break;
                                        case 48:
                                            return 47;
                                            break;
                                        case 49:
                                            return 31;
                                            break;
                                        case 50:
                                            return 48;
                                            break;
                                        case 51:
                                            this.begin("conditions");
                                            return 27;
                                            break;
                                        case 52:
                                            return 42;
                                            break;
                                        case 53:
                                            return 41;
                                            break;
                                        case 54:
                                            return 53;
                                            break;
                                        case 55:
                                            yy_.yytext = yy_.yytext.replace(/^\\/g, "");
                                            return 53;
                                            break;
                                        case 56:
                                            return 48;
                                            break;
                                        case 57:
                                            return 46;
                                            break;
                                        case 58:
                                            yy.options = {};
                                            this.begin("options");
                                            break;
                                        case 59:
                                            this.begin("start_condition");
                                            return 14;
                                            break;
                                        case 60:
                                            this.begin("start_condition");
                                            return 16;
                                            break;
                                        case 61:
                                            this.begin("rules");
                                            return 5;
                                            break;
                                        case 62:
                                            return 54;
                                            break;
                                        case 63:
                                            return 51;
                                            break;
                                        case 64:
                                            return 22;
                                            break;
                                        case 65:
                                            return 24;
                                            break;
                                        case 66:
                                            break;
                                        case 67:
                                            return 8;
                                            break;
                                        case 68:
                                            return 9;
                                            break;
                                    }
                                },
                                rules: [
                                    /^(?:\/\*(.|\n|\r)*?\*\/)/,
                                    /^(?:\/\/.*)/,
                                    /^(?:\/[^ /]*?['"{}'][^ ]*?\/)/,
                                    /^(?:"(\\\\|\\"|[^"])*")/,
                                    /^(?:'(\\\\|\\'|[^'])*')/,
                                    /^(?:[/"'][^{}/"']+)/,
                                    /^(?:[^{}/"']+)/,
                                    /^(?:\{)/,
                                    /^(?:\})/,
                                    /^(?:([a-zA-Z_][a-zA-Z0-9_-]*))/,
                                    /^(?:>)/,
                                    /^(?:,)/,
                                    /^(?:\*)/,
                                    /^(?:(\r\n|\n|\r)+)/,
                                    /^(?:\s+(\r\n|\n|\r)+)/,
                                    /^(?:\s+)/,
                                    /^(?:%%)/,
                                    /^(?:[a-zA-Z0-9_]+)/,
                                    /^(?:([a-zA-Z_][a-zA-Z0-9_-]*))/,
                                    /^(?:(\r\n|\n|\r)+)/,
                                    /^(?:\s+(\r\n|\n|\r)+)/,
                                    /^(?:\s+)/,
                                    /^(?:([a-zA-Z_][a-zA-Z0-9_-]*))/,
                                    /^(?:(\r\n|\n|\r)+)/,
                                    /^(?:\s+(\r\n|\n|\r)+)/,
                                    /^(?:\s+)/,
                                    /^(?:.*(\r\n|\n|\r)+)/,
                                    /^(?:\{)/,
                                    /^(?:%\{(.|(\r\n|\n|\r))*?%\})/,
                                    /^(?:%\{(.|(\r\n|\n|\r))*?%\})/,
                                    /^(?:.+)/,
                                    /^(?:\/\*(.|\n|\r)*?\*\/)/,
                                    /^(?:\/\/.*)/,
                                    /^(?:(\r\n|\n|\r)+)/,
                                    /^(?:\s+)/,
                                    /^(?:([a-zA-Z_][a-zA-Z0-9_-]*))/,
                                    /^(?:"(\\\\|\\"|[^"])*")/,
                                    /^(?:'(\\\\|\\'|[^'])*')/,
                                    /^(?:\|)/,
                                    /^(?:\[(\\\\|\\\]|[^\]])*\])/,
                                    /^(?:\(\?:)/,
                                    /^(?:\(\?=)/,
                                    /^(?:\(\?!)/,
                                    /^(?:\()/,
                                    /^(?:\))/,
                                    /^(?:\+)/,
                                    /^(?:\*)/,
                                    /^(?:\?)/,
                                    /^(?:\^)/,
                                    /^(?:,)/,
                                    /^(?:<<EOF>>)/,
                                    /^(?:<)/,
                                    /^(?:\/!)/,
                                    /^(?:\/)/,
                                    /^(?:\\([0-7]{1,3}|[rfntvsSbBwWdD\\*+()${}|[\]\/.^?]|c[A-Z]|x[0-9A-F]{2}|u[a-fA-F0-9]{4}))/,
                                    /^(?:\\.)/,
                                    /^(?:\$)/,
                                    /^(?:\.)/,
                                    /^(?:%options\b)/,
                                    /^(?:%s\b)/,
                                    /^(?:%x\b)/,
                                    /^(?:%%)/,
                                    /^(?:\{\d+(,\s?\d+|,)?\})/,
                                    /^(?:\{([a-zA-Z_][a-zA-Z0-9_-]*)\})/,
                                    /^(?:\{)/,
                                    /^(?:\})/,
                                    /^(?:.)/,
                                    /^(?:$)/,
                                    /^(?:(.|(\r\n|\n|\r))+)/,
                                ],
                                conditions: {
                                    code: { rules: [67, 68], inclusive: false },
                                    start_condition: { rules: [22, 23, 24, 25, 67], inclusive: false },
                                    options: { rules: [18, 19, 20, 21, 67], inclusive: false },
                                    conditions: { rules: [9, 10, 11, 12, 67], inclusive: false },
                                    action: { rules: [0, 1, 2, 3, 4, 5, 6, 7, 8, 67], inclusive: false },
                                    indented: { rules: [27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67], inclusive: true },
                                    trail: { rules: [26, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67], inclusive: true },
                                    rules: {
                                        rules: [13, 14, 15, 16, 17, 29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67],
                                        inclusive: true,
                                    },
                                    INITIAL: { rules: [29, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67], inclusive: true },
                                },
                            };
                            return lexer;
                        })();
                        parser.lexer = lexer;
                        function Parser() {
                            this.yy = {};
                        }
                        Parser.prototype = parser;
                        parser.Parser = Parser;
                        return new Parser();
                    })();
                    if (typeof require !== "undefined" && typeof exports !== "undefined") {
                        exports.parser = lex;
                        exports.Parser = lex.Parser;
                        exports.parse = function () {
                            return lex.parse.apply(lex, arguments);
                        };
                        exports.main = function commonjsMain(args) {
                            if (!args[1]) {
                                console.log("Usage: " + args[0] + " FILE");
                                process.exit(1);
                            }
                            var source = require("fs").readFileSync(require("path").normalize(args[1]), "utf8");
                            return exports.parser.parse(source);
                        };
                        if (typeof module !== "undefined" && require.main === module) {
                            exports.main(process.argv.slice(1));
                        }
                    }
                },
                { __browserify_process: 8, fs: 6, path: 7 },
            ],
            30: [
                function (require, module, exports) {
                    module.exports = {
                        author: "Zach Carter <zach@carter.name> (http://zaa.ch)",
                        name: "jison",
                        description: "A parser generator with Bison's API",
                        version: "0.4.13",
                        keywords: ["jison", "bison", "yacc", "parser", "generator", "lexer", "flex", "tokenizer", "compiler"],
                        preferGlobal: true,
                        repository: { type: "git", url: "git://github.com/zaach/jison.git" },
                        bugs: { email: "jison@librelist.com", url: "http://github.com/zaach/jison/issues" },
                        main: "lib/jison",
                        bin: "lib/cli.js",
                        engines: { node: ">=0.4" },
                        dependencies: { JSONSelect: "0.4.0", esprima: "1.0.x", escodegen: "0.0.21", "jison-lex": "0.2.x", "ebnf-parser": "~0.1.9", "lex-parser": "~0.1.3", nomnom: "1.5.2", cjson: "~0.2.1" },
                        devDependencies: { test: "0.6.x", jison: "0.4.x", "uglify-js": "~2.4.0", browserify: "2.x.x" },
                        scripts: { test: "node tests/all-tests.js" },
                        homepage: "http://jison.org",
                    };
                },
                {},
            ],
        },
        {},
        [1]
    );
    var ret = Jison; //skullquake hacks
    //delete(window.Jison);
    return ret;
});
