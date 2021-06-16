define(["module","jquery"],function(module,jq){
	module.exports=(function($){
		$.extend($.fn,{
			redify:function(){
				this.each(function(idx,el){
					$(el).css({"color":"yellow"});
				});
				return this;
			},
			unredify:function(){
				this.each(function(idx,el){
					$(el).css({"color":""});
				});
				return this;
			},
		});
		return $.fn.greenify;
	}(window.jQuery));
});
