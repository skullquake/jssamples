define([
	"module"
],function(
	module
){
	module.exports=function(render){
		var t0=new Date();
		var out=render('[@print("test0:begin\\n");@][@for(var i=0;i<8;i++){@]test_[@print(i.toString());print("\\n");@][@}@][@print("\\ntest0:end");@]');
		var t1=new Date();
		var td=(t1-t0);
		console.log(td);
		console.log(out);
	}
});
