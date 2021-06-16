require([
	"document",
	"mustache",
	"text!./src/index.html"
],function(
	document,
	Mustache,
	index
){
	document.body.innerHTML=index;
	var template=document.getElementById('template').innerHTML;
	var rendered=Mustache.render(template,{name:"Luke"});
	document.getElementById("target").innerHTML=rendered;
	console.log(document.documentElement.innerHTML);
});
