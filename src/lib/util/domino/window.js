define(["module","domino"],function(module,domino){
	if(typeof(window)=="undefined")window=domino.createWindow();//added
	//module.exports=domino.createWindow();//orig
	module.exports=window;//domino.createWindow();//test exists? for browser vs non-browser
	window=module.exports;//predefined global
});
