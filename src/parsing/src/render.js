define([
	"module",
	"../../lib/parsing/parsing.js"
],function(
	module,
	parseActivePassive
){
	module.exports=function render(src,options){
		var out="";
		var prsng={
			target:null,//target,
			options:options,
			src:src,
			beglbl:"[[",
			endlbl:"]]",
			out:"",
			startParsing:function(){
			},
			print:function(val){
				if(arguments!=="undefined"&&arguments.length>0){
					out+=val;
				}
			},
			endParsing:function(){
			}
		};
		parseActivePassive(prsng,src);
		return out;
	};
});
