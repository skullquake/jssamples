//references:
//http://www.adequatelygood.com/JavaScript-Module-Pattern-In-Depth.html
//osmani design patterns book
//--------------------------------------------------------------------------------
//basic module
//--------------------------------------------------------------------------------
{
	var lib=(function(someArgAlias){
		var foo=42;
		function SomeClass(){
		};
		SomeClass.prototype.foo=function(){};
		return{
			fooalias:42,
			literal:42,
			SomeClass:SomeClass
		};
	})('someArg');
}
//--------------------------------------------------------------------------------
//augmentation pattern
//--------------------------------------------------------------------------------
{
	var MODULE={};
	var lib=(function(module){
		module.foo=function(){return 42;};
		return module;
	})(MODULE);
	console.log(MODULE.foo());
}
//--------------------------------------------------------------------------------
//loose augmentation
//--------------------------------------------------------------------------------
{
	var MODULE=(function(module){
		module.foo=function(){return 42;};
		return module;
	})(MODULE||{});//allows asynchronous loading in any order, assuming MODULE
	console.log(MODULE.foo());
}
//--------------------------------------------------------------------------------
//tight augmatation
//--------------------------------------------------------------------------------
{
	var MODULE=(function(module){
		var oldfoo=module.foo;//old method maintained
		module.foo=function(){return 42;};
		return module;
	})(MODULE||{});//assumes loading in specific order
	console.log(MODULE.foo());
}
//--------------------------------------------------------------------------------
//cloning
//--------------------------------------------------------------------------------
{
	var MODULE=(function(module){
		var newmodule={};
		for(var k in module){
			if(module.hasOwnProperty(k)){
				newmodule[k]=module[k];
			}
		}
		newmodule.foo=function(){return 42;};
		return newmodule;
	})(MODULE||{});
	console.log(MODULE.foo());
}
