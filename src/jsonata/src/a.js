require([
	"module",
	"jsonata",
	"../lib/test/index"
],function(
	module,
	jsonata,
	test
){
	console.log([module.id,"start"].join(":"));
	println=typeof(println)=="function"?println:function(){console.log(JSON.stringify(arguments));};
	print=typeof(println)=="function"?println:function(){console.log(JSON.stringify(arguments));};
	{//basic
		var data ={
			example:[
				{value:4},
				{value:7},
				{value:13}
			]
		};
		var expression=jsonata("$sum(example.value)");
		var result=expression.evaluate(data);
		println(result);
	}
	{//function registration
		var expression=jsonata("$foo()");
		expression.registerFunction(
			"foo",
			function(){
				return 42;
			}
		);
		var result=expression.evaluate({});
		println(result);
	}
	{//signature specification
		//b-bool
		//n-number
		//s-string
		//l-null
		//a-array
		//o-object
		//f-function
		//(o)-object
		//(sao)-string,array,or object
		//j-json
		//u-(bndl)
		//x-any
		//a<s>-array of string
		//a<x>-array of any
		var expression=jsonata("$acc(4,2)");
		expression.registerFunction(
			"acc",
			function(a,b){
				return a+b;
			},
			"<nn:n>"
		);
		var result=expression.evaluate({});
		println(result);
	}
	{//test query
		var data={
			"FirstName": "Fred",
			"Surname": "Smith",
			"Age": 28,
			"Address": {
				"Street": "Hursley Park",
				"City": "Winchester",
				"Postcode": "SO21 2JN"
			},
			"Phone": [
				{
					"type": "home",
					"number": "0203 544 1234"
				},
				{
					"type": "office",
					"number": "01962 001234"
				},
				{
					"type": "office",
					"number": "01962 001235"
				},
				{
					"type": "mobile",
					"number": "077 7700 1234"
				}
			],
			"Email": [
				{
					"type": "work",
					"address": ["fred.smith@my-work.com", "fsmith@my-work.com"]
				},
				{
					"type": "home",
					"address": ["freddy@my-social.com", "frederic.smith@very-serious.com"]
				}
			],
			"Other": {
				"Over 18 ?": true,
				"Misc": null,
				"Alternative.Address": {
					"Street": "Brick Lane",
					"City": "London",
					"Postcode": "E1 6RF"
				},
				"piet":"pompies",
				"foo":{
					"bar":{
						"werf":"etter"
					}
				}
			}
		};
		var expression=jsonata("Surname");
		var result=expression.evaluate(data);
		println(result);
		var expression=jsonata("*.piet");//explicit level
		var result=expression.evaluate(data);
		println(result);
		var expression=jsonata("**.werf");//undefined level
		var result=expression.evaluate(data);
		println(result);
	}
	{//test0
		var data ={
			example:[
				{value:4},
				{value:7},
				{value:13}
			]
		};
		var expression=jsonata("$sum(example.value)");
		console.log(
			test({
				fns:{
					/*
					*/
					"nop":function(){},
					"lexp":function(){
						var expression=jsonata("$sum(example.value)");
						var result=expression.evaluate(data);
					},
					"gexp":function(){
						var result=expression.evaluate(data);
					},
				},
				arg:[],
				itr:512,
				fmt:true
			})
		);
	}

	console.log([module.id,"end"].join(":"));
});




