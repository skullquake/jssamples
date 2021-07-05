define([
	"module",
	"jquery"
],function(
	module,
	jq
){
	var $=window.jQuery;
	module.exports=function(render){
		var t0=new Date();
		var out=render('[@print("test1:begin\\n");print(JSON.stringify(prsng.options));print("\\ntest1:end");@]',{foo:42});
		var t1=new Date();
		console.log((t1-t0));
		out=$("<div/>").html(out);
		$(document.body).append()
		console.log(out.html());
	}
});
