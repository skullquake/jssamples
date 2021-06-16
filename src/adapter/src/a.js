//translates one interface to another
//allows programming components to work together by providing uniform interfaces
//may work on properties and/or method interfaces
//also known as wrapper pattern
var lib=(function(){
	var A=function(){
		this.a=null;
	};
	A.prototype.set_a=function(a){
		this.a=a;
	};
	A.prototype.get_a=function(){
		return this.a;
	};
	var B=function(){
		this.a=null;
	};
	B.prototype.setA=function(a){
		this.a=a;
	};
	B.prototype.getA=function(){
		return this.a;
	};
	var ia={
		set_a:function(a,b){
			return a.set_a(b);
		},
		get_a:function(a,b){
			return a.get_a(b);
		},
	};
	var ib={
		set_a:function(a,b){
			return a.setA(b);
		},
		get_a:function(a,b){
			return a.getA();
		},
	};
	return{
		A:A,
		B:B,
		ia:ia,
		ib:ib
	};

})();
//--------------------------------------------------------------------------------
var a=new lib.A();
var b=new lib.B();
//without iface
a.set_a(42);
console.log(a.get_a());
b.setA(24);
console.log(b.getA());
//with iface
lib.ia.set_a(a,24);
console.log(lib.ia.get_a(a));
lib.ib.set_a(b,42);
console.log(lib.ib.get_a(b));
