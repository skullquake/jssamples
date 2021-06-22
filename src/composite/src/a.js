//--------------------------------------------------------------------------------
var libfs=(function(){
	function File(n,parent){
		if(!n)throw("EARG");
		this.parent=parent;
		this.n=n;
	};
	function Folder(n,parent){
		if(!n)throw("EARG");
		this.children={};
		this.parent=parent;
		this.n=n;
	};
	Folder.prototype.mkdir=function(n){
		if(!n)throw("EARG");
		this.children[n]=new Folder(n,this);
	};
	Folder.prototype.touch=function(n){
		if(!n)throw("EARG");
		this.children[n]=new File(n);
	};
	Folder.prototype.rm=function(n){
		if(!n)throw("EARG");
		delete(this.children[n]);
		//Object.values.filter ... compare with obj
		// test n is string or obj
		// if is obj perform this comment description (to implemente)
	};
	Folder.prototype.ls=function(){
		return Object.keys(this.children);
	};
	Folder.prototype.cd=function(n){
		if(!n)throw("EARG");
		if(n==".."){
			return this.parent;
		}else{
			return this.children[n];
		}
	};
	//todo:create cwd class
	return{
		File:File,
		Folder:Folder
	};
})();
//--------------------------------------------------------------------------------
var root=new libfs.Folder("root");
var cwd=root;
cwd.mkdir("home");
cwd.mkdir("usr");
cwd.mkdir("etc");
cwd.mkdir("boot");
cwd.mkdir("mt");
console.log(cwd.ls());
cwd=cwd.cd("usr");
cwd.mkdir("bin");
cwd.mkdir("lib");
cwd.mkdir("include");
cwd.mkdir("share");
cwd.mkdir("local");
console.log(cwd.ls());
cwd=cwd.cd("..");
cwd=cwd.cd("home");
cwd.mkdir("root");
cwd=cwd.cd("root");
cwd.mkdir("doc");
cwd.mkdir("aud");
cwd.mkdir("dev");
cwd.mkdir("src");
console.log(cwd.ls());
cwd=cwd.cd("doc");
cwd.touch("a.txt");
cwd.touch("b.txt");
cwd.touch("c.txt");
cwd.touch("d.txt");
console.log(cwd.ls());
//--------------------------------------------------------------------------------
