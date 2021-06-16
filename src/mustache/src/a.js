require(["mustache"],function(Mustache){
	console.log(Mustache.render("{{title}} spends {{calc}}",{
		title:"Joe",
		calc:function(){
			return 2+4;
		}
	}));
	console.log(Mustache.render("{{a}}",{a:"<"}));//html escaped
	console.log(Mustache.render("{{{a}}}",{a:"<"}));//html unescaped
	console.log(Mustache.render("{{a.b}}",{a:{b:42}}));
	console.log(Mustache.render("{{#a}}true{{/a}}{{^a}}false{{/a}}",{a:true}));
	console.log(Mustache.render("{{#a}}true{{/a}}{{^a}}false{{/a}}",{a:false}));
	console.log(Mustache.render("{{#a}}[{{.}}]{{/a}}",{a:[0,1,2,3]}));
	console.log(Mustache.render("{{#a}}[{{b}}]{{/a}}",{a:[{b:0},{b:1},{b:2},{b:3}]}));
	console.log(Mustache.render("{{a}}{{! comment }}",{a:42}));
	console.log(Mustache.render(
		"{{>t0}}{{>t1}}",	//template
		{
			a:42,
			b:24
		},			//view
		{
			t0:"[{{a}}]",
			t1:"<{{b}}>",
		}			//partials
	));//partials, rendered at runtime
	console.log(Mustache.render("<<a>>",{a:42},{},["<<",">>"]));//custom delimiters
	console.log(Mustache.render("[[a]]",{a:24},{},["[[","]]"]));//custom delimiters
	console.log(Mustache.render("{{=<< >>=}}<<a>>_<<=[[ ]]=>>[[b]]",{a:42,b:24}));//custom delimiters - set in template - modified twice
	{
		var t="{{a}}";
		Mustache.parse(t);//caches???
		console.log(Mustache.render(t,{a:42}));
	}//pre-parsing
});
