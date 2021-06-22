/*
 * strategy patterns allow one of a family of algorithms to be selected on the fly at runtime
 * the pattern devines a family of algorithms, encapsulates each one,
 * and makes the interchangeable at run time without client interference
 */
var lib=(function(){
	function S0(){console.log("S0");};
	function S1(){console.log("S1");};
	function S2(){console.log("S2");};
	function S3(){console.log("S3");};
	function Proc(){
		this.strategy=null;
	};
	Proc.prototype.setStrategy=function(s){
		this.strategy=s;
	}
	Proc.prototype.exec=function(){
		if(this.strategy==null)throw("ESTRATEGY");
		this.strategy.apply(this,arguments);
	}
	return{
		S0:S0,
		S1:S1,
		S2:S2,
		S3:S3,
		Proc:Proc
	}
})();
{
	var p=new lib.Proc();
	p.setStrategy(lib.S0);
	p.exec();
	p.setStrategy(lib.S1);
	p.exec();
	p.setStrategy(lib.S2);
	p.exec();
	p.setStrategy(lib.S3);
	p.exec();
}
