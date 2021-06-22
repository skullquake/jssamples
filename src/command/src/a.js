var lib=(function(){
	function C(){};
	C.prototype.f0=function(){console.log("f0");};
	C.prototype.f1=function(a){console.log("f1",a);};
	C.prototype.f2=function(a,b){console.log("f2",a,b);};
	C.prototype.f3=function(a,b,c){console.log("f3",a,b,c);};
	function CMgr(){};
	CMgr.prototype.ex=function(o,f){
		o[f].apply(o,[].slice.call(arguments,2));
	};
	return{
		C:C,
		CMgr:CMgr
	};
})();
var c=new lib.C();
var m=new lib.CMgr();
m.ex(c,"f0");
m.ex(c,"f1",1);
m.ex(c,"f2",1,2);
m.ex(c,"f3",1,2,3);
