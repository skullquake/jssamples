define(["module"],function(module){
	var baseUrl="";
	var modPath="../lib/";
	requirejs.config({
		"waitSeconds":0,
		"baseUrl":baseUrl,
		"paths":{
			"text":modPath+"requirejs/require.text",
		},
		"packages":[],
		"config":{
			"text":{}
		},
		"map":{},
		"shim":{
		},
		"deps":[]
	});
});
