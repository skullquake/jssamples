var lib=(function(){
	function C(){};
	C.prototype.f0=function(){return this;};
	C.prototype.f1=function(){return this;};
	return{
		C:C
	};
})();
var c=new lib.C();
c.f0().f1().f0().f1().f0().f1().f0().f1();
