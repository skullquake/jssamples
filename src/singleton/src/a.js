var lib=(function(){
	function C0(){
		this.sig=Math.random();
	};
	var c;
	function instance(){
		if(typeof(c)=="undefined")
			c=new C0();
		return c;
	}
	return{
		instance:instance
	}
})();
//--------------------------------------------------------------------------------
{
	var a=lib.instance();
	console.log(JSON.stringify(a));
}
{
	var a=lib.instance();
	console.log(JSON.stringify(a));
}
{
	var a=lib.instance();
	console.log(JSON.stringify(a));
}
{
	var a=lib.instance();
	console.log(JSON.stringify(a));
}
