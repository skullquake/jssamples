define(["module"],function(module){
	module.exports={
		cat:function(p){
			return read(p);
		},
		set:function(p,v){
			throw("stub");
		},
		append:function(p,v){
			throw("stub");
		}
	};
});
