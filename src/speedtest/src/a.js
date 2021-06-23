var lib=(function(){
	var test=function(options){
		options=typeof(options)=="object"?options:{}
		if(typeof(options.fns)!="object")throw("EFNS");
		if(typeof(options.arg)!="object"||typeof(options.arg.forEach)!="function")throw("EARG");
		options.itr=typeof(options.itr)!="undefined"?options.itr:1;
		if(typeof(options.itr)!="number")throw("EITR");
		var itrbuf=[];
		var statbuf=[];
		var kbuf=[];
		if(typeof(options.fns.length)=="number"){
			options.fns.forEach(function(k,i){kbuf.push(i);});
		}else{
			var fns=[];
			Object.keys(options.fns).forEach(function(k){kbuf.push(k);fns.push(options.fns[k]);});
			options.fns=fns;
		}
		options.fns.forEach(function(fn){
			var t0=new Date();
			for(var i=0;i<options.itr;i++){
				fn.apply(this,options.arg);
			}
			var t1=new Date();
			var td=t1-t0;
			if(isNaN(td))td=0;
			statbuf.push(td);
		});
		var max=0;
		var maxidx=null;
		var minidx=null;
		statbuf.forEach(function(val,validx){
			if(maxidx==null)maxidx=validx;
			if(minidx==null)minidx=validx;
			if(statbuf[maxidx]<val)maxidx=validx
			if(statbuf[minidx]>val)minidx=validx
			max+=val;
		});
		var ratiobuf=[];
		statbuf.forEach(function(val){
			var p=Math.floor(10000*val/max)/100;
			if(isNaN(p))p=0;
			ratiobuf.push(p);
		});
		if(options.fmt){
			var ret="";
			statbuf.forEach(function(val,validx){
				ret+=kbuf[validx]+":\t"+val+"ms"+"\t"+ratiobuf[validx]+"%\t"+Math.floor(1/(val/options.itr))+"op/s\t"+(maxidx==validx?">":"")+(minidx==validx?"<":"")+"\n"
			});
			return ret;
		}else{
			return [statbuf,ratiobuf];
		}
	};
	return{
		test:test
	}
})();
//--------------------------------------------------------------------------------
{//test0
	console.log(
		lib.test({
			fns:{
				"sqrt":function(a,b){
					Math.sqrt(a);
				},
				"exp":function(a,b){
					Math.exp(a,b);
				},
				"pow":function(a,b){
					Math.pow(a,b);
				},
				"sin":function(a,b){
					Math.sin(a);
				},
				"cos":function(a,b){
					Math.cos(a);
				},
				"tan":function(a,b){
					Math.tan(a);
				},
			},
			arg:[4,2],
			itr:512*512,
			fmt:true
		})
	);
}
{//test0
	console.log(
		lib.test({
			fns:[
				function(a,b){
					Math.sqrt(a);
				},
				function(a,b){
					Math.exp(a,b);
				},
				function(a,b){
					Math.pow(a,b);
				},
				function(a,b){
					Math.sin(a);
				},
				function(a,b){
					Math.cos(a);
				},
				function(a,b){
					Math.tan(a);
				},
			],
			arg:[4,2],
			itr:512*512,
			fmt:true
		})
	);
}
