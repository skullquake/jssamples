require(["jquery"],function(jq){
	var $=window.jQuery;
	$(document.body).append($("<h3/>").text("test"));
	console.log(document.documentElement.innerHTML);
});
