var lib=(function(){
	function C(){};
	C.prototype.f0=function(){};
	C.prototype.f1=function(){};
	function CP(){
		this.c=new C();
	};
	CP.prototype.f0=function(){return this.c.f0(arguments);};
	CP.prototype.f1=function(){return this.c.f1(arguments);};
	return{
		C:C,
		CP:CP
	}
})();
var c=new lib.C();
c.f0();
c.f1();
var cp=new lib.CP();
cp.f0();
cp.f1();
