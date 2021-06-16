define(["module","jquery"],function(module,jq){
	module.exports=(function($){
		$.fn.greenify=function(){
			this.css("color","green");
			return this;
		};
		return $.fn.greenify;
	}(window.jQuery));
});
