require([
	"module",
	"./src/render"
],function(
	module,
	render
){
	//non-browser tests (quickjs,duktape,mujs,goja)
	if(env!="browser"){
		require([
			//"./src/tests/0.js",
			//"./src/tests/1.js",
			//"./src/tests/2.js",
			//"./src/tests/3.js"
			"./src/tests/4.js"
		],function(
			//test_0,
			//test_1,
			//test_2,
			//test_3,
			test_4
		){
			//test_0(render);
			//test_1(render);
			//test_2(render);
			//test_3(render);
			test_4();
		});
	//browser test
	}else{
		window.setTimeout(function(){document.location.reload();},5000);
		require([
			"./src/tests/browser.js"
		],function(
			test
		){
			test();
		});

	}
});
