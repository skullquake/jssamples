console.log("./a.js:start");
require(["module","./../lib/domino/domino.compat"],function(module,domino){
	var t0=new Date();
	var window=domino.createWindow("");
	var document=window.document;
	console.log(document.documentElement.innerHTML);
	var t1=new Date();
	console.log(t1-t0);
});
console.log("./a.js:end");
