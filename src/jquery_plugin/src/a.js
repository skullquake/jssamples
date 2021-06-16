require([
	"jquery",
	"./src/plugins/greenify",
	"./src/plugins/redify",
	"./src/plugins/lightweight"
],function(
	jq,
	greenify,
	redify,
	lightweight
){
	var $=window.jQuery;
	$(document.body).append($("<h3/>").text("green").greenify());
	$(document.body).append($("<h3/>").text("red").redify());
	$(document.body).append($("<div/>").append((function(){
		var ret=[];
		for(var i=0;i<8;i++){
			ret.push($("<h3/>").addClass("test0").text("test_"+i));
		}
		return ret;
	})()));
	$(".test0").greenify();
	$(document.body).append($("<div/>").append((function(){
		var ret=[];
		for(var i=0;i<8;i++){
			ret.push($("<h3/>").css("color","blue").addClass("test1").text("test_"+i));
		}
		return ret;
	}.bind(this))()));
	$(".test1").redify();
	$(".test1").unredify();
	$(document.body).append($("<h3/>").text("test").defaultPluginName({propertyName:"lorem"}));
	console.log(document.documentElement.innerHTML);
});
