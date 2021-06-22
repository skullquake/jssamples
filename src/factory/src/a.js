var lib=(function(){
	function create(n){
		var r=null;
		switch(n){
			case"C0":
				r=new C0(/*note:args*/);
				break;
			case"C1":
				r=new C1(/*note:args*/);
				break;
			default:
				throw("ECLS");
		}
		return r;
	};
	function C0(){};
	C0.prototype.f=function(){console.log("C0:f");}
	function C1(){};
	C1.prototype.f=function(){console.log("C1:f");}
	return{
		create:create
	};
})();
//--------------------------------------------------------------------------------
var a=lib.create("C0")
var b=lib.create("C1")
a.f();
b.f();
