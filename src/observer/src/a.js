var liba=(function(){
	function ObserverList(){
		this.observerList=[];
	};
	ObserverList.prototype.add=function(obj){
		return this.observerList.push(obj);
	};
	ObserverList.prototype.count=function(){
		return this.observerList.length;
	};
	ObserverList.prototype.get=function(index){
		if(index>-1&&index<this.observerList.length){
			return this.observerList[index];
		}
	};
	ObserverList.prototype.indexOf=function(obj,startIndex){
		var i=startIndex;
		while(i<this.observerList.length){
			if(this.observerList[i]===obj){
				return i;
			}
			i++;
		}
		return -1;
	};
	ObserverList.prototype.removeAt=function(index){
		this.observerList.splice(index,1);
	};
	function Subject(){
		this.observers=new ObserverList();
	};
	Subject.prototype.addObserver=function(observer){
		this.observers.add(observer);
	};
	Subject.prototype.removeObserver=function(objserver){
		this.observers.removeAt(this.observers.indexOf(observer,0));
	};
	Subject.prototype.notify=function(context){
		var observerCount=this.observers.count()
		for(var i=0;i<observerCount;i++){
			this.observers.get(i).update(context);
		}
	};
	function Observer(options){
		if(typeof(options)!="object")throw("EOPTIONS");
		if(typeof(options.update)!="function")throw("EUPDATE");
		this.update=options.update;
	};
	return{
		ObserverList:ObserverList,
		Subject:Subject,
		Observer:Observer
	};
})();
//--------------------------------------------------------------------------------
{
	var s=new liba.Subject();
	var o0=new liba.Observer({update:function(val){console.log(["o0",val].join(":"));}});
	var o1=new liba.Observer({update:function(val){console.log(["o1",val].join(":"));}});
	var o2=new liba.Observer({update:function(val){console.log(["o2",val].join(":"));}});
	var o3=new liba.Observer({update:function(val){console.log(["o3",val].join(":"));}});
	s.addObserver(o0);
	s.addObserver(o1);
	s.addObserver(o2);
	s.addObserver(o3);
	s.notify(42);
	s.notify(24);
}
//--------------------------------------------------------------------------------
var libb=(function(){
	function Observer(){
		this.obuf=[];
	}
	Observer.prototype={
		subscribe:function(f){
			this.obuf.push(f);
		},
		unsubscribe:function(f){
			this.obuf=this.obuf.filter(function(el){
				if(el!=f)return el;
			});
		},
		notify:function(o,ctx){
			this.obuf.forEach(function(el){
				el.call(ctx,o);
			});
		}
	};
	return{
		Observer:Observer
	}
})();
//--------------------------------------------------------------------------------
{
	var cb0=function(a){console.log("cb0:"+a);};
	var cb1=function(a){console.log("cb1:"+a);};
	var cb2=function(a){console.log("cb2:"+a);};
	var cb3=function(a){console.log("cb3:"+a);};
	var o=new libb.Observer();
	o.subscribe(cb0);
	o.subscribe(cb1);
	o.subscribe(cb2);
	o.subscribe(cb3);
	o.notify("m0");
	o.unsubscribe(cb3);
	o.notify("m1");
	o.unsubscribe(cb2);
	o.notify("m2");
	o.unsubscribe(cb1);
	o.notify("m3");
	o.unsubscribe(cb0);
	o.notify("m4");
	o.notify("m3");
	o.unsubscribe(cb3);
	o.notify("m2");
	o.unsubscribe(cb2);
	o.notify("m1");
}
