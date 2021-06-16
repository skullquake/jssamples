require(["jquery","jqueryui"],function(jq,jqui){
	var $=window.jQuery;
	var div=$("div").text("test");
	var dp=div.datepicker({orientation:"vertical"});
	dp.show();
	$(document.body).append(div);
	console.log(document.documentElement.innerHTML);
	//console.log(typeof(div.datepicker))
});
