require(["../lib/require.conf"],function(){});
require(["./../lib/domino/blocks/domino","text!./res/a.html"],function(domino,a_html){
	var window=domino.createWindow(a_html);
	var document=window.document;
	this.window=window;
	this.document=window.document;
});
require(["./../lib/jquery/jquery.slim.min"],function(jq){
	var $=window.jQuery;
	$("h3").text("A");
	//console.log(div.prop("outerHTML"));
	console.log(document.documentElement.innerHTML);
});