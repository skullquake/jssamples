//mediator pattern
//the mediator pattern provides central authority over a group of objects by encapsulating how these object interact
//this model is useful for scenarios where there is a need to manage complex conditions
//which very object is aware of any state change in other object in the group
var lib=(function(){
	var Client=function(name){//participants
		this.id=name;
		this.room=null;
	}
	Client.prototype={
		tx:function(msg,to){
			this.room.tx(msg,this,to);//mediate...
		},
		rx:function(msg,from){
			log.buffer(from.id+">"+this.id+":"+msg);
		}
	};
	var Room=function(){//mediator
		var participants={};
		return{
			register:function(participant){
				participants[participant.id]=participant;
				participant.room=this;
			},
			tx:function(msg,from,to){
				if(to){
					to.rx(msg,from);
				}else{
					for(var key in participants){
						if(participants[key]!==from){
							participants[key].rx(msg,from);
						}
					}
				}
			}
		}
	};
	var log=(function(){
		var log="";
		return{
			buffer:function(msg){log+=msg+"\n";},
			flush:function(){console.log(log);log="";}
	}
	})()
	return{
		Client:Client,
		Room:Room,
		log:log
	};
})();
//--------------------------------------------------------------------------------
{
	var u0=new lib.Client("u0");
	var u1=new lib.Client("u1");
	var u2=new lib.Client("u2");
	var u3=new lib.Client("u3");
	var room=new lib.Room();
	room.register(u0);
	room.register(u1);
	room.register(u2);
	room.register(u3);
	u0.tx("m0");
	u1.tx("m1");
	u2.tx("m2",u0);
	u3.tx("m3",u1);
	lib.log.flush();
}
