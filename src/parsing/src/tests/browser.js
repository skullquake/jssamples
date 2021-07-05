define([
	"module",
	"jquery",
	"../lib/parsing/parsing.js",
],function(
	module,
	jq,
	p,
){
	var $=window.jQuery;
	module.exports=function(){
		function render(src,options){
			var options={
				target:null,//target,
				options:options,
				src:src,
				beglbl:"[[",
				endlbl:"]]",
				out:"",
				startParsing:function(){
				},
				foo:function(){console.log("foo")},//exposed???
				print:function(val){//exposed???
					if(arguments!=="undefined"&&arguments.length>0){
						this.out+=val;
					}
				},
				endParsing:function(){
				}
			};
			p(options,src);
			return options.out;
		}
		//--------------------------------------------------------------------------------
		{
			var t0=new Date();
			var out=render(`
				[[
					//options
					var bg_r=Math.floor(Math.random()*255);
					var bg_g=Math.floor(Math.random()*255);
					var bg_b=Math.floor(Math.random()*255);
					var fg_r=Math.floor(Math.random()*255);
					var fg_g=Math.floor(Math.random()*255);
					var fg_b=Math.floor(Math.random()*255);
					var p=function(val){print(val.toString())};
				]]
				<style>
					*{
						background:rgba([[p(bg_g);]],[[p(bg_g);]],[[p(bg_b);]],1);
						color:rgba([[p(fg_g);]],[[p(fg_g);]],[[p(fg_b);]],1);
					}
				</style>
				<h3>[[print("test1:begin\\n");]]</h3>
				[[for(var i=0;i<8;i++){]]
					<pre>[[print(JSON.stringify(prsng.options));]]</pre>
					foo();
				[[}]]
				<h3>[[print("\\ntest1:end");]]</h3>
			`,{foo:42});
			var t1=new Date();
			console.log((t1-t0));
			out=$("<div/>").html(out);
			$(document.body).append(out)
			console.log(out.html());
		}
		//--------------------------------------------------------------------------------
	}
});
