define(["module"],function(module){
	module.exports=function(a){
		a.b=function(){
			console.log([module.id,"b","start"].join(":"));
			console.log([module.id,"b","end"].join(":"));
		};
		return a;
	}
});
