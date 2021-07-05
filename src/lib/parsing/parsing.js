!(function(name,context,definition){if(typeof exports==='object'){module.exports=definition(require);}else if(typeof define==='function'&&define.amd){define(definition); }else{context[name]=definition();}}).call(this,'parseActivePassive',this,function(require){
	function parseActivePassive(prsng,unparsedcontent){
		if (typeof prsng.startParsing === "function") {
			prsng.startParsing();
		}

		var passive="";
		var print=function(prntthis) {
			if (typeof prntthis === "string" && prntthis!=="") {
				if (prntthis.length>3 && prntthis[0]==="`" && prntthis[prntthis.length-1]==="`"){
					passive+=eval(prntthis);
				} else {
					passive+=prntthis;
				}
			}	   
		}

		function iterateString(prsgn,stringtoiterate,functoprsr) {
			if (typeof stringtoiterate==="string" && typeof functoprsr === "function") {
				//for(let cdr of stringtoiterate) {
				for(var i=0;i<stringtoiterate.length;i++){//duktape
					functoprsr(prsgn,stringtoiterate[i])
				}
			}
		}

		var foundCode=false;
		var hasCode=false;
		var tmppassive="";
		var tmpcode="";
		var code="";
		var prvc="";
		var begi=0;
		var endi=0;
		var content=[];

		function flushPassive(prsng){
			if (tmppassive!="") {
				if(foundCode) {
					var cntntl=content.push(tmppassive+"");
					tmpcode+="print(content["+(cntntl-1)+"]);";
				} else {
					print(tmppassive)
				}
				tmppassive="";
			}
		}

		function parsePsvChar(prsng,chr) {
			flushCode();
			tmppassive+=chr;
		}

		function parseCodeChar(prsng,chr) {
			if(!hasCode) {
				if ((chr+"").trim()!=="") {
					hasCode=true;
				}
			}
			if (hasCode) {
				flushPassive(prsng)
				if (!foundCode) {
					foundCode=true;
				}
				tmpcode+=chr;
			}
		}

		function flushCode(){
			if(tmpcode!="") {
				code+=tmpcode;
				tmpcode="";
			}
		}
		
		function parsechr(prsng,chr) {
			if (endi==0 && begi<prsng.beglbl.length) {
				if (begi>0 && prsng.beglbl[begi-1]==prvc && prsng.beglbl[begi]!==chr) {
					var bi=begi;
					begi=0;
					iterateString(prsng,prsng.beglbl.substring(0,bi),parsePsvChar);
				}
				if (prsng.beglbl[begi]===chr) {
					begi++;
					if (begi===prsng.beglbl.length){
						prvc="";
						prvc="";
					} else {
						prvc=chr;
					}
				} else {
					if (begi>0) {
						var bi=begi;
						begi=0;
						iterateString(prsng,prsng.beglbl.substring(0,bi),parsePsvChar);
					}
					parsePsvChar(prsng, prvc=chr);
				}
			} else if (begi==prsng.beglbl.length && endi<prsng.endlbl.length) {
				if (prsng.endlbl[endi]===chr) {
					endi++;
					if (endi===prsng.endlbl.length){
						begi=0;
						endi=0;
						prvc="";
					}
				} else {
					if (endi>0) {
						var bi=endi;
						endi=0;
						iterateString(prsng,prsng.endlbl.substring(0,bi),parseCodeChar);
					}
					parseCodeChar(prsng, chr);
				}
			}
		}

		iterateString(prsng,unparsedcontent,parsechr);
		
		flushPassive(prsng); 
		flushCode();
		if (foundCode && code!="") {
			eval(code);
		}		 

		if (passive!=="") {
			if (typeof prsng.print === "function" ){
				//this.prsng=prsng;//asdf='fdsa'
				prsng.print(passive);
			}
		}

		if (typeof prsng.endParsing === "function") {
			prsng.endParsing();
		}
	}
	return parseActivePassive;
});
