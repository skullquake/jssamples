//domino specific globals
var window;
var document;
var navigator={userAgent:""};
//jison
var self=this;
require(["module"],function(module){
	var env="";
	if(typeof(Duktape)=="object"){//duktape
		env="duktape";
	}else if(typeof(std)=="object"){//quickjs
		env="quickjs";
	}else if(typeof(fsutils)=="object"){//goja
		env="goja";
	}else if(typeof(read)=="function"){//mujs
		env="mujs";
	}
	var baseUrl="";
	var modPath="../lib/";
	requirejs.config({
		"waitSeconds":0,
		"baseUrl":baseUrl,
		"paths":{
			"text":modPath+"requirejs/require.text",
			"underscore":modPath+"underscore/underscore-umd",
			"domino":(env=="mujs"?(modPath+"domino/domino.compat"):(modPath+"domino/domino")),
			"document":modPath+"util/domino/document",
			"window":modPath+"util/domino/window",
			"backbone":modPath+"backbone/backbone",
			"knockout":modPath+"knockout/knockout-min",
			//"jquery":modPath+"jquery/jquery.slim.min",
			"jquery":modPath+"jquery/3.6.0/jquery-3.6.0.min",
			//"jquery":modPath+"jquery/3.6.0/jquery-3.6.0.slim.min",
			"jqueryui":modPath+"jqueryui/1.12.0/jquery-ui.min",
			"mustache":modPath+"mustache/mustache.min",
			"babel":modPath+"babel/6.4.4/babel.min",
			//"babel":modPath+"babel/7.14.6/babel.min",
			//"babel":modPath+"babel/7.14.6/babel",
			"babel-plugin-transform-remove-strict-mode":modPath+"babel/plugins/babel-plugin-transform-remove-strict-mode/index",
			"babel-plugin-module-resolver":modPath+"babel/plugins/babel-plugin-module-resolver-standalone/index",
			"es6":modPath+"es6/es6",
			"jison":modPath+"jison/jison",
			"cyclejs":modPath+"cyclejs/cycle",
			"weakmap":modPath+"weakmap-polyfill/weakmap-polyfill",
			"fsutils":modPath+"fsutils/"+env+"/index"
		},
		"packages":[],
		"config":{
			"text":{}
		},
		"map":{},
		"shim":{
			"jquery":{
				"exports":"jQuery",
				"deps":["document","window"]
			},
			"jqueryui":{
				//"exports":"jQuery",
				"deps":["jquery","document","window"]
			},
			"underscore":{
				"exports":"_"
			},
			"backbone":{
				"deps":["document","window","underscore"]
			},
			"knockout":{
				"deps":["document","window"]
			},
			"babel":{
				"deps":[],
				"exports":"Babel"
			},
			"es6":{
				"deps":["babel","text"]
			},
			"cyclejs":{
				"deps":(env=="duktape"?["weakmap"]:[])
			},
			"jison":{
				"exports":"Jison"
			},
			"weakmap":{
				"exports":"WeakMap",
			}
		},
		"deps":[]//default deps
	});
});
