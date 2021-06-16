require([
	"module",
	"babel"
],function(
	module,
	Babel
){
	console.log([module.id,"start"].join(":"));
	try{
		var out=Babel.transform(
			[
				"console.log('start')",
				"const test=()=>'hello';",
				"console.log(test());",
				"console.log('end')"
			].join("\n"),
			{
				//presets:["env"]
				presets:["es2015"]
			}
		);
		console.log(out.code);
		eval(out.code);
	}catch(e){
		console.log(e.toString());
	}
	console.log([module.id,"end"].join(":"));
});
