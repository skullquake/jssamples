var lib=(function(){
	function create(nm){
		switch(nm){
			case"C0":
				return new C0(/*note:args*/);
				break;
			case"C1":
				return new C1(/*note:args*/);
				break;
			default:
				throw("ECLS");
		}
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
