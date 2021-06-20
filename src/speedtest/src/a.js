var lib=(function(){
	var test=function(options){
		options=typeof(options)=="object"?options:{}
		if(typeof(options.fns)!="object"||typeof(options.funcs.forEach)!="function")throw("EFUNCTIONS");
		if(typeof(options.arg)!="object"||typeof(options.arg.forEach)!="function")throw("EFUNCTIONS");
	};
	return{
		test:test
	}
})();
