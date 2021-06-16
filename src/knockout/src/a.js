require([
	"module",
	"jquery",
	"knockout",
	"text!./src/index.html"
],function(
	module,
	$,
	ko,
	index
){
	try{
		$(document.body).html(index)
		var Todo=function(content,done){
			this.content=ko.observable(content);
			this.done=ko.observable(done);
			this.editing=ko.observable(false);
		};
		//--------------------------------------------------------------------------------
		$(document.body).append($("<div/>").html([
'<p><input id="source" data-bind="value: contactName, valueUpdate: \'keyup\'" /></p>',
'<div data-bind="visible: contactName().length > 10">',
'	You have a really long name!',
'</div>',
'<p>Contact name: <strong data-bind="text: contactName"></strong></p>',
		].join("\n")));
		var aViewModel={
			contactName:ko.observable("0123456789abcdef")
		};
		ko.applyBindings(aViewModel);
		$("input#source").val("012345678");
		$("input#source").on("keyup",function(){});
		$("input#source").trigger("keyup");
		//--------------------------------------------------------------------------------
		console.log(document.documentElement.innerHTML);
	}catch(e){
		console.log(e.toString());
	}
});
