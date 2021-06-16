define(["module","./a"],function(module,A){
	var B=function(){
		A.call(this/*,args*/);
		console.log([module.id,"ctor","start"].join(":"));
		console.log([module.id,"ctor","end"].join(":"));
	};
	B.prototype=Object.create(A.prototype);
	B.prototype.b=function(){
		console.log([module.id,"b","start"].join(":"));
		console.log([module.id,"b","end"].join(":"));
	};
	module.exports=B;
});
