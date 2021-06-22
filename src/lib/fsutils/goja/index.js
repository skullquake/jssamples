define(["module"],function(module){
	module.exports={
		cat:function(p){
			return fsutils.file2string(p);
		},
		set:function(p,v){
			throw("stub");
		},
		append:function(p,v){
			throw("stub");
		}

	};
});
