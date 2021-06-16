require([
	"./src/a",
	"./src/b",
	"./src/c"
],function(
	A,
	B,
	C
){
	var a=new A();
	var b=new B();
	var c=new C();
	a.a();
	b.a();
	b.b();
	c.a();
	c.b();
	c.c();
});
