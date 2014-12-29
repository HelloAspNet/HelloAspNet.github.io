var Move = function(){};

Move.prototype = {
  getStyle: function(obj, attr) {
    return obj.currentStyle ? obj.currentStyle[attr] : getComputedStyle(obj, false)[attr];
  },
  start: function(obj, attr, end, fn) {
    clearInterval(obj.timer);
    obj.timer = setInterval(function() {
      var attrValue = this.getStyle(obj, attr),
          begin = attr === 'opacity' ? Math.round(parseFloat(attrValue) * 100) : (attrValue | 0);
      var speed = (end - begin) / 10;

      speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed);

      if (begin >= end) {
        clearInterval(obj.timer);
      } else {
        if (attr == 'opacity') {
          obj.style.filter = 'alpha(opacity=' + begin + speed + ')';
          obj.style.opacity = (begin + speed) / 100;
        } else {
          obj.style[attr] = begin + speed + 'px';
        }
      }
    }, 10);
  }
};