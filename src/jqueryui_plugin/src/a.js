require([
	"jquery",
	"jqueryui",
	"./src/plugins/template",
	"./src/plugins/a"
],function(
	jq,
	jqui,
	template,
	a
){
	var $=window.jQuery;
	{
		var div=$("<div>").attr({"id":"test0"});
		var dt=div.widgetTemplate({foo:false});
		$(document.body).append(div);
	}
	{
		var div=$("<div/>").attr({"id":"test1"});
		var dt=$(div).widgetA({foo:false});
		$(document.body).append(div);
	}
	console.log(document.documentElement.innerHTML);
	//console.log(typeof(div.datepicker))
	//console.log(a);
	//console.log(div.widgetName);
});
