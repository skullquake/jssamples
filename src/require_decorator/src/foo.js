define(["module"],function(module){
	var Foo=function(){};
	Foo.prototype.a=function(){console.log([module.id,"a"].join(":"));}
	module.exports=Foo
});
