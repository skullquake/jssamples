define([
	"module",
	"./d",
	"./c/a",
	"./c/b",
	"./c/c"
],function(
	module,
	d,
	c_a,
	c_b,
	c_c
){
	console.log([module.id,"start"].join(":"));
	console.log(JSON.stringify(Object.keys(requirejs.s.contexts._.defined)));
	module.exports=module.id;
	console.log([module.id,"end"].join(":"));
});