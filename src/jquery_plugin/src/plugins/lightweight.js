// best practices
// * window,document,undefined passed in as arguments
// * basic defaults object
// * simple plugin constructor for logic related to the initiali creation and the assignment of the element to work with
// * extending the options with defaults
// * a lightweight wrapper around the constructor, which helps avoid issues such as multiple instantiations
// * adherence to the jQuery core style guidelines for maximized readability

/*!
 * jQuery lightweight plugin boilerplate
 * Original author: @ajpiano
 * Further changes, commens: @addyosmani
 * Licensed under the MIT license
 */
// the semi-color before the function invocation is a safety
// net agains concatenated scripts and/or other plugins
// that are not closed properly
//
// amd/script wrapper
;(function(name,context,definition){typeof exports=='object'?module.exports=definition(require):typeof define=='function'&&define.amd?define(definition):context[name]=definition()}.call(this,'lightweight',this,function(require){
	// import jquery
	var jQuery=typeof(require)=='function'?require('jquery'):window.jQuery;
	if(typeof(jQuery)!="function")throw("jquery not found");
	return(function($,window,document,undefined){
		// undefined is used here as the undefined global
		// variable in ECMAScript 3 is mutable (i.e. it can
		// be changed by someone else). undefined isn't really
		// being passed in so we can assure that its value is
		// true undefined. In ES5, undefined can no longer be
		// modified
		//
		// window and document are apssed through as local
		// variables rather than as globals, because this (slightly)
		// quickens the resolution process and can be more
		// efficiently minified (especially when both are
		// regularly referenced in our plugin).
		//
		// create the defaults once
		var pluginName="defaultPluginName",defaults={propertyName:"value"};
		function Plugin(element,options){
			this.element=element;
			// jQuery has an extend method that merges the
			// contents of two or more objects, storing the
			// result in the first object. The first object
			// is generally empty because we don't want to alter
			// the default options for future instances of the plugin
			this.options=$.extend({},defaults,options);
			this._defaults=defaults;
			this._name=pluginName;
			this.init();
		};
		Plugin.prototype.init=function(){
			// place initialization logic here
			// we already have access to the DOM element and
			// the options via the instance, e.g. this.element
			// and this.options
		};
		// a really lightweight plugin wrapper around the constructor,
		// preventing against multiple instantiations
		$.fn[pluginName]=function(options){
			return this.each(function(){
				if(!$.data(this,"plugin_"+pluginName)){
					$.data(this,"plugin_"+pluginName,new Plugin(this,options));
				}
			});
		};
		return Plugin;
	})(jQuery,window,document);
}));
