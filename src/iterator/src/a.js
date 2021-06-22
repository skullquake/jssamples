var lib=(function(){
	function Itr(o){
		if(typeof(o.length)!="number")throw("ETYPE");
		this.o=o;
		this.i=0;
	};
	Itr.prototype.hasNext=function(){
		return this.i<this.o.length;
	};
	Itr.prototype.next=function(){
		return this.o[this.i++];
	};
	return{
		Itr:Itr
	};
})();
{
	var a="asdf";
	var ia=new lib.Itr(a);
	while(ia.hasNext())console.log(ia.next());
}
{
	var a=[0,1,2,3];
	var ia=new lib.Itr(a);
	while(ia.hasNext())console.log(ia.next());
}
