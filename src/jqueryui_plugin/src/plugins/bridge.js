//jquery ui widget factory bridge plugin boilerplate
//built in solution to achieving object-based plugin definitions
//create stateful plugins usin a custom constructor
//$.widget.bridge provides
// * public/private methods as in oop
// auto protection agains multiple initializations
// auto generation of instance of a passed object, stored within selections internal $.data cache
// options can be altered post-initialization
//usage:
// var wid=$.widget.bridge("foo",bridge);
// var inst=somediv.somenamespace({foo:'bar'});
// //widget on elements data
// instance.data("foo).element;
// calling functions
// instance.foo(("publicfunction");
// instance.foo(("_publicfunction");//uncallable
;(function(name,context,definition){typeof exports=='object'?module.exports=definition(require):typeof define=='function'&&define.amd?define(definition):context[name]=definition()}.call(this,'lightweight',this,function(require){
	var ret;
	var jQuery=typeof(require)=='function'?require('jquery'):window.jQuery;
	if(typeof(jQuery)!="function")throw("jquery not found");
	if(typeof(require)=='function')require('jqueryui');
	if(typeof(jQuery.widget)!="function")throw("jqueryui not found");
	return(function($,window,document,undefined){
		var widgetBridge=function(options,element){
			this.name="widgetBridge";
			this.options=options;
			this.element=element;
			this._init();
		};
		widgetBridge.prototype={
			_create:function(){},
			_init:function(){},
			option:function(key,value){
				if($.isPlainObject(key)){
					this.options=$.extend(true,this.options,key);
				}else if(key&&typeof value==="undefined"){
					return this.options[key];
				}else{
					this.options[key]=value;
				}
				return this;
			},
			publicFunction:function(){//without _
				console.log("public function");
			},
			_privateFunction:function(){//with _
				console.log("private function");
			}
		};
		return widgetBridge;
	})(window.jQuery,window,document);
}));
