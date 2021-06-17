(function(){})();
(function(a){
	console.log(a);
	if(a>0)arguments.callee(a-1)
})(4);
{
	var a=(function(){return arguments.callee})();
	console.log(typeof(a));
}
{
	(function(){
		this.a=this.a||0;
		console.log(this.a);
		this.a++;
		return arguments.callee;
	})()()()()()()()()()()()();
}
{
	var ns=ns||{};
	(function(ctx){
		ctx.a0=4;
		ctx.b0=2;
		ctx.c0=42;
		ctx.d0=24;
	})(ns);//iife
	(function(ctx){
		ctx.a1=40;
		ctx.b1=20;
		ctx.c1=420;
		ctx.d1=240;
	})(ns);//iife

	console.log(JSON.stringify(ns));
}
{
	var ns0=ns0||{};
	var ns1=ns1||{};
	var ns2=ns2||{};
	var ns3=ns3||{};
	(function(ctx){
		ctx.a=4;
		ctx.b=2;
		ctx.c=42;
		ctx.d=24;
		return arguments.callee
	})(ns0)(ns1)(ns2)(ns3);
	console.log(JSON.stringify(ns0));
	console.log(JSON.stringify(ns1));
	console.log(JSON.stringify(ns2));
	console.log(JSON.stringify(ns3));
}
