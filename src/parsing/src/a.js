function render(src,options){
	var out="";
	var prsng={
		target:null,//target,
		options:options,
		src:src,
		beglbl:"[@",
		endlbl:"@]",
		t0:null,
		t1:null,
		out:"",
		startParsing:function(){
		},
		print:function(val){
			if(arguments!=="undefined"&&arguments.length>0){
				out+=val;
			}
		},
		endParsing:function(){
		}
	};
	parseActivePassive(prsng,src);
	return out;
}
//--------------------------------------------------------------------------------
{
	var t0=new Date();
	var out=render('[@print("test0:begin\\n");@][@for(var i=0;i<8192;i++){@]test_[@print(i.toString());print("\\n");@][@}@][@print("\\ntest0:end");@]');
	var t1=new Date();
	var td=(t1-t0);
	console.log(td);
	//console.log(out);
}
{
	var out=render('[@print("test1:begin\\n");print(JSON.stringify(prsng.options));print("\\ntest1:end");@]',{foo:42});console.log(out);
}
