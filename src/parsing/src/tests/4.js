define([
	"module",
	"../render"
],function(module,render){
	console.log(render(`
		[[
			function f0(j,msg){
				for(var i=0;i<j;i++){
		]]
					<p>[[print(msg);]]</p>
		[[
				}
			}
		]]
		<h3>Test f0:</h3>
		[[
			f0(8,"foo");
		]]

			[[
			function f1(i,msg){
				for(var j=0;j<i;j++)print(" ");]]<div>[[print(msg);]]
[[
				if(i<4)f1(i+1,msg);
				for(var j=0;j<i;j++)print(" ");]]</div>
[[
			}
		]]
		<h3>Test f1:</h3>
		[[
			f1(0,"foo");
		]]

	`));
	module.exports=function(){
	}
});

