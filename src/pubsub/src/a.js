var lib=(function(){
	var pubsub={};
	(function(o){
		var topics={};
		var subUid=-1;
		o.publish=function(topic,args){
			if(!topics[topic]){
				return false;
			}
			var subscribers=topics[topic];
			var len=subscribers?subscribers.length:0;
			while(len--){
				subscribers[len].func(topic,args);
			}
			return this;
		};
		o.subscribe=function(topic,func){
			if(!topics[topic]){
				topics[topic]=[];
			}
			var token=(++subUid).toString();
			topics[topic].push({
				token:token,
				func:func
			});
			return token;
		};
		o.unsubscribe=function(token){
			for(var m in topics){
				if(topics[m]){
					for(var i=0,j=topics[m].length;i<j;i++){
						if(topics[m][i].token===token){
							topics[m].splice(i,1);
							return token;
						}
					}
				}
			}
			return this;
		};
	})(pubsub)
	return{
		pubsub:pubsub
	};
})();
//--------------------------------------------------------------------------------
require(["../lib/test/index"],function(test){
	//--------------------------------------------------------------------------------
	{//test0
		var t0=new Date();
		var ml=function(topics,data){};
		var sid=lib.pubsub.subscribe("inbox/newMessage",ml);
		console.log(
			test({
				fns:{
					"nop":function(s){},
					"psg":function(s){
						lib.pubsub.publish("inbox/newMessage","t0");
						lib.pubsub.publish("inbox/newMessage","t1");
						lib.pubsub.publish("inbox/newMessage","t2");
						lib.pubsub.publish("inbox/newMessage","t3");

					},
					"psl":function(s){
						var sid=lib.pubsub.subscribe("inbox/newMessage",ml);
						lib.pubsub.publish("inbox/newMessage","t0");
						lib.pubsub.publish("inbox/newMessage","t1");
						lib.pubsub.publish("inbox/newMessage","t2");
						lib.pubsub.publish("inbox/newMessage","t3");
						lib.pubsub.unsubscribe(sid);
					},
				},
				arg:[4],
				itr:4096,
				fmt:true
			})
		);
		lib.pubsub.unsubscribe(sid);
	}
});
