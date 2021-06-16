define(["module"],function(module){
	console.log([module.id,"start"].join(":"));
	console.log(JSON.stringify(Object.keys(requirejs.s.contexts._.defined)));
	module.exports=module.id;
	console.log([module.id,"end"].join(":"));
});
