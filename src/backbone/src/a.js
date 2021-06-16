require(["module","jquery","backbone","underscore","text!./src/index.html"],function(module,$,Backbone,_,index){
	try{
		$(document.body).html(index)
		function prompt(text){
			console.log(text);
			return std.in.getline();
		}
		var div_sidebar=$("<div/>").attr({"id":"sidebar"})
		$(document.body).append(div_sidebar);
		var Sidebar=Backbone.Model.extend({
			promptColor:function(){
				var cssColor=prompt("Please enter a CSS color:");
				this.set({color:cssColor});
			}
		});
		window.sidebar=new Sidebar();
		window.sidebar.on("change:color",function(model,color){
			console.log("sidebar:changing color");
			$("#sidebar").css({background:color});
		});
		var colors=["red","green","blue"]
		colors.forEach(function(color){
			window.sidebar.set({"color":color});
		});
		window.sidebar.promptColor();
		console.log(document.documentElement.innerHTML);
	}catch(e){
		console.log(e.toString());
	}
});
