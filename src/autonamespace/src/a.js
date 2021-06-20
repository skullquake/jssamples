var lib0=(function(){
	function extend(o,ns,v){
		var c=o,nsb=ns.split("."),ln=nsb.length,k,i=0;
		do{
			k=nsb[i];
			if((i==ln-1)&&typeof(v)!="undefined"){
				c[k]=v;
				break;
			}else
			if(typeof(c[k])=="undefined"){
				c[k]={};
			}else{
				c[k]=c[k]||{};
			}
			c=c[k];
			i++;
		}while(i<ln);
		return c;
	};
	return{
		extend:extend
	}
})();
var lib1=(function(){
	function extend(ns,ns_string){
		var parts=ns_string.split(".");
		var parent=ns;
		var pl;
		pl=parts.length;
		for(var i=0;i<pl;i++){
			if(typeof(parent[parts[i]])==="undefined"){
				parent[parts[i]]={};
			}
			parent=parent[parts[i]];
		}
		return ns;
	};
	return{
		extend:extend
	}
})();
//--------------------------------------------------------------------------------
{
	var a={};
	lib0.extend(a,"k0.k1.k2",42);
	lib0.extend(a,"k0.k1.k3",24);
	lib0.extend(a,"k0.k2");
	console.log(JSON.stringify(a));
}
{
	var a={};
	lib1.extend(a,"k0.k1.k2.k3.k4.k5");
	lib1.extend(a,"k0.k1.k2.k3.k6.k7");
	console.log(JSON.stringify(a));
}

