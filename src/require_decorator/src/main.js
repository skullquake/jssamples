require([
	"./src/a",
	"./src/da"
],function(
	A,
	dA
){
	var a=new A();
	a.a();
	var a2=new A();
	dA(a2);
	a2.a();
	a2.b();
});
