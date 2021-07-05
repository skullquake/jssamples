define(["module","window"],function(module,window){
	if(typeof(document)=="undefined")document=window.document;//added
	//module.exports=window.document;//orig
	module.exports=document;
	document=module.exports;//predefined global
});
