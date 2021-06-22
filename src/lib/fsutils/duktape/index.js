define(["module"],function(module){
	module.exports={
		cat:function(p){
			src=new TextDecoder("utf-8").decode(readFile(p));
			if(typeof(src)==="string"){
				return src;
			}else{
				throw("failed to get file contents");
			}
		},
		set:function(p,v){
			throw("stub");
		},
		append:function(p,v){
			throw("stub");
		}

	};
});
