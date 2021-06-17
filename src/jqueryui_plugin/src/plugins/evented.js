;(function(name,context,definition){typeof exports=='object'?module.exports=definition(require):typeof define=='function'&&define.amd?define(definition):context[name]=definition()}.call(this,'lightweight',this,function(require){
	var ret;
	var jQuery=typeof(require)=='function'?require('jquery'):window.jQuery;
	if(typeof(jQuery)!="function")throw("jquery not found");
	if(typeof(require)=='function')require('jqueryui');
	if(typeof(jQuery.widget)!="function")throw("jqueryui not found");
	return(function($,window,document,undefined){
		return $.widget("namespace.widgetEvented",{
			options:{},
			_create:function(){
				var self=this;
				self.element.on("myEventStart",function(e){
					console.log("event start");
				});
				self.element.on("myEventEnd",function(e){
					console.log("event end");
				});
			},
			destroy:function(){
				$.Widget.prototype.destroy.call( this );
			},
			_setOption:function(key,value){
				switch(key){
					default:
						break;
				}
				$.Widget.prototype._setOption.apply(this,arguments);
			}
		});
	})(window.jQuery,window,document);
}));
