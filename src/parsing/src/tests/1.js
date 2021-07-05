define([
	"module"
],function(
	module
){
	module.exports=function(render){
		var t0=new Date();
		var out=render('[@print("test1:begin\\n");print(JSON.stringify(prsng.options));print("\\ntest1:end");@]',{foo:4});
		var t1=new Date();
		console.log((t1-t0));
		console.log(out);
	}
});
