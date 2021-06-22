//--------------------------------------------------------------------------------
//map scan utility
//--------------------------------------------------------------------------------
var lib=(function(){
	function v(/*object*/o,pr/*predicate*/,cb/*callback*/){
		pr=typeof(pr)=="function"?pr:function(){return false};
		cb=typeof(cb)=="function"?cb:function(){return false};
		var kbuf=[];
		function _v(o){
			Object.keys(o).forEach(function(k){
				kbuf.push(k);
				var pth=kbuf.join(".");
				if(pr(pth,o[k]))cb(pth,o[k]);
				_v(o[k]);
			});
			kbuf.pop();
		};
		_v(o);
	};
	return{
		visit:v
	}
})();
//--------------------------------------------------------------------------------
var a={
	a:{
		a:{
		},
		b:{
			a:{
			}
		},
		c:{
			a:{
			},
			b:{
			}
		}
	},
	b:{
		a:{
		},
		b:{
			a:{
			}
		},
		c:{
			a:{
			},
			b:{
			}
		},
		d:{
			a:{
			},
			b:{
			},
			c:{
			}
		}

	}
};
console.log(JSON.stringify(a));
{
	lib.visit(a);
}
{
	var pmap={};
	lib.visit(a,function(pth,o){
		return true;
	},function(pth,o){
		pmap[pth]=o;
	});
	console.log(JSON.stringify(pmap));
}
{
	var pbuf=[];
	lib.visit(a,function(pth,o){
		return pth.indexOf("a.b")==0;
	},function(pth,o){
		pbuf.push(pth);
	});
	console.log(JSON.stringify(pbuf));
}
