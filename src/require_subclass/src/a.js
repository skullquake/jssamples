define(["module"],function(module){
	var A=function(){
		console.log([module.id,"ctor","start"].join(":"));
		console.log([module.id,"ctor","end"].join(":"));
	};
	A.prototype.a=function(){
		console.log([module.id,"a","start"].join(":"));
		console.log([module.id,"a","end"].join(":"));
	};
	module.exports=A;
});
