/*
 * template pattern defines the skeleton of an algorithm
 * the operations are defined at some higher level
 * the steps are then implemented by lower level helper methods, that need not be implemented
 * an implementing object is involved, and it implements the missing steps while retaining the original structure step ordering
 */
var lib=(function(){
	var base={
		proc:function(){
			this.fn0();
			this.fn1();
			this.fn2();
			this.fn3();
		}
	}
	function inherit(proto){
		var F=function(){};
		F.prototype=proto;
		return new F();
	}
	return{
		base:base,
		inherit:inherit
	};
})();
{
	var a=lib.inherit(lib.base);
	a.fn0=function(){console.log("a:fn0");}
	a.fn1=function(){console.log("a:fn1");}
	a.fn2=function(){console.log("a:fn2");}
	a.fn3=function(){console.log("a:fn3");}
	a.proc();
}
{
	var b=lib.inherit(lib.base);
	b.fn0=function(){console.log("b:fn0");}
	b.fn1=function(){console.log("b:fn1");}
	b.fn2=function(){console.log("b:fn2");}
	b.fn3=function(){console.log("b:fn3");}
	b.proc();

}
