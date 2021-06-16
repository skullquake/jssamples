define(["module"],function(module){
	module.exports=function(foo){
		foo.b=function(){console.log([module.id,"b"].join(":"));};
		return foo;
	}
});
