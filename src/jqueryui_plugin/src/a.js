require([
	"jquery",
	"jqueryui",
	"./src/plugins/template",
	"./src/plugins/a",
	"./src/plugins/evented",
	"./src/plugins/bridge"
],function(
	jq,
	jqui,
	template,
	a,
	evented,
	bridge
){
	var $=window.jQuery;
	{
		var div=$("<div>").attr({"id":"test0"});
		var wid=div.widgetTemplate({foo:false});
		$(document.body).append(div);
	}
	{
		var div=$("<div/>").attr({"id":"test1"});
		var wid=$(div).widgetA({foo:false});
		$(document.body).append(div);
	}
	{
		var div=$("<div/>").attr({"id":"test2"});
		var wid=$(div).widgetEvented({});
		$(document.body).append(div);
		div.trigger("myEventStart");
		div.trigger("myEventEnd");
	}
	{
		var div=$("<div/>").attr({"id":"test2"});
		var wid=$.widget.bridge("somenamespace",bridge);
		var inst=div.somenamespace({foo:'bar'});
		$(document.body).append(div);
		inst.somenamespace("publicFunction");
		try{inst.somenamespace("_privatefunction");}catch(e){console.log(e.toString());}
	}
	console.log(document.documentElement.innerHTML);
});
