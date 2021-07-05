
//es2020 class
class A{
	constructor(){console.log("constructor")}
	#a="a";//private
	b="b";
	#c(){console.log("#c");}//private
	d(){
		console.log("d");
	};
	e(){
		console.log("e");
		console.log(this.#a);
		console.log(this.b);
		this.#c();
		this.d();
	};
};
a=new A();
a.e();
