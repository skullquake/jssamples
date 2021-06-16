require([
	"./src/foo",
	"./src/decoratefoo"
],function(
	Foo,
	decoratefoo
){
	var foo=new Foo();
	foo.a();
	var foo2=new Foo();
	decoratefoo(foo2);
	foo2.a();
	foo2.b();
});
