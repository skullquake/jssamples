define(["module","./b"],function(module,B){
	var C=function(){
		B.call(this/*,args*/);
		console.log([module.id,"ctor","start"].join(":"));
		console.log([module.id,"ctor","end"].join(":"));
	};
	C.prototype=Object.create(B.prototype);
	C.prototype.c=function(){
		console.log([module.id,"c","start"].join(":"));
		console.log([module.id,"c","end"].join(":"));
	};
	module.exports=C;
});
