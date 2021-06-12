define({
	load:function(name,req,onload,config){
		config=config.config.text;
		if(typeof(config.env)=="undefined"){
			if(typeof(Duktape)=="object"){//duktape
				config.env="duktape";
			}else if(typeof(std)=="object"){//quickjs
				config.env="quickjs";
			}else if(typeof(fsutils)=="object"){//goja
				config.env="goja";
			}else if(typeof(read)=="function"){//mujs
				config.env="mujs";
			}
		}
		switch(config.env){
			case"quickjs":
				onload(std.loadFile(name));
				break;
			case"duktape":
				src=new TextDecoder("utf-8").decode(readFile(name));
				if(typeof(src)==="string"){
					onload(src);
				}else{
					throw("failed to acquire contents");
				}
				break;
			case"mujs":
				var src=read(name);
				onload(src);
				break;
			case"goja":
				onload(fsutils.file2string(name));
				break;
			default:
				throw("invalid environment");
		}
	}
});

