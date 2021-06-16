var window;
var document;
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
			"jquery":modPath+"jquery/jquery.slim.min",
			"mustache":modPath+"mustache/mustache.min"
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
			"underscore":{
				"exports":"_"
			},
			"backbone":{
				"deps":["document","window","underscore"]
			},
			"knockout":{
				"deps":["document","window"]
			}
		},
		"deps":[]
	});
});
