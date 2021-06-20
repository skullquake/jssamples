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
{//namespace injection
	var a={
		a:42
	};
	(function(){
		this.set_a=function(val){this.a=val;return this};
		this.get_a=function(val){return this.a};
		var b=24;//captured in closure, inacessible directly from a
		this.set_b=function(val){this.a=val;return this};
		this.get_b=function(val){return this.a};
	}).apply(a);
	console.log(JSON.stringify(a));
	console.log(JSON.stringify(Object.keys(a)));
	console.log(a.get_a());
	a.set_a(24);
	console.log(a.get_a());
	console.log(a.get_b());
	a.set_b(42);
	console.log(a.get_b());
}
{
	var a={
		a:2,
		b:4,
		c:24,
		d:42
	};
	(function(){
		Object.keys(this).forEach(function(k){
			this[["get",k].join("_")]=function(){
				return this[k];
			};
			this[["set",k].join("_")]=function(val){
				this[k]=val;
				return this;
			};
		}.bind(this));
	}).apply(a);
	console.log(JSON.stringify(a));
	console.log(JSON.stringify(Object.keys(a)));
	a.set_a(42);
	a.set_b(24);
	a.set_c(2);
	a.set_d(4);
	console.log(a.get_a());
	console.log(a.a);
	console.log(a.get_b());
	console.log(a.b);
	console.log(a.get_c());
	console.log(a.c);
	console.log(a.get_d());
	console.log(a.d);
}
