/*
 * Copyright (C) 2014 Deltamation Software. All rights reserved.
 * @author Jared Wiltshire
 */

define(['./Element', './CSSStyleDeclaration'], function(Element, CSSStyleDeclaration) {

function SVGElement() {
    Element.apply(this, arguments);
}

SVGElement.prototype = Object.create(Element.prototype, {
    style: { get: function() {
        if (!this._style)
          this._style = new CSSStyleDeclaration(this);
        return this._style;
    }},
});
//--------------------------------------------------------------------------------
//skullquake
/*
SVGElement.prototype.getTransformToElement = 
SVGElement.prototype.getTransformToElement || function(elem) { 
  //return elem.getScreenCTM().inverse().multiply(this.getScreenCTM()); 
  //return elem.getCTM().inverse().multiply(this.getCTM()); 
};
*/
SVGElement.prototype.getScreenCTM=function(elem) { 
};


function getBBox(element, withoutTransforms, toElement) {//skullquake
console.Log("HERERE");
console.Log(withoutTransforms);
  var svg = element.ownerSVGElement;

  if (!svg) {
    return { x: 0, y: 0, cx: 0, cy: 0, width: 0, height: 0 };
  }

  var r = element.getBBox(); 

  if (withoutTransforms) {
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,        
      cx: r.x + r.width / 2,
      cy: r.y + r.height / 2
    };
  }

  var p = svg.createSVGPoint(); 
  var matrix = (toElement || svg).getScreenCTM().inverse().multiply(element.getScreenCTM()); 

  p.x = r.x;
  p.y = r.y;
  var a = p.matrixTransform(matrix);

  p.x = r.x + r.width;
  p.y = r.y;
  var b = p.matrixTransform(matrix);

  p.x = r.x + r.width;
  p.y = r.y + r.height;
  var c = p.matrixTransform(matrix);

  p.x = r.x;
  p.y = r.y + r.height;
  var d = p.matrixTransform(matrix);

  var minX = Math.min(a.x, b.x, c.x, d.x);
  var maxX = Math.max(a.x, b.x, c.x, d.x);
  var minY = Math.min(a.y, b.y, c.y, d.y);
  var maxY = Math.max(a.y, b.y, c.y, d.y);

  var width = maxX - minX;
  var height = maxY - minY;

  return {
    x: minX,
    y: minY,
    width: width,
    height: height,        
    cx: minX + width / 2,
    cy: minY + height / 2
  };
}
SVGElement.prototype.getBBox=function(){
	return getBBox(this,true);
}
//--------------------------------------------------------------------------------
////skullquake
//--------------------------------------------------------------------------------

return SVGElement;

});
