var lib=(function(){
	function extend(tgt,src){
		var toString=Object.prototype.toString,otst=toString.call({});
		for(var prop in src){
			if(src[prop]&&otst===toString.call(src[prop])){
				tgt[prop]=tgt[prop]||{};
				extend(tgt[prop],src[prop]);
			}else{
				tgt[prop]=src[prop];
			}
		}
		return tgt;
	};
	return{
		extend:extend
	};
})();
var a={
	c:"foo"
};
var b={
	a:42,
	b:{
		c:24
	}
};
console.log(JSON.stringify(a));
console.log(JSON.stringify(b));
lib.extend(a,b);
console.log(JSON.stringify(a));
console.log(JSON.stringify(b));
