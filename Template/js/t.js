/**
 * Created by xyz on 2015/5/8.
 */
var Maps = {
  'test-unit-1': '<div style="color: #f00;">测试元件1-html内容</div>',
  'test-unit-2': '<div style="color: #00f;">测试元件2-html内容</div>',
  'test-unit-3': '<div style="color: #0f0;">测试元件3-html内容</div>',
  'test-other': '<i>other</i>'
};

$(function(){

  var $win = $(window);
  var $doc = $(document);
  var $new_container = $('.t-new-container');
  var $active_region = $('.t-active-region');

  // $active的offset
  var Offset = { x: 0, y: 0 };

  $doc
    .delegate(this, {
      // 鼠标弹起时清空新建的实体
      'mouseup': function(){
        $('.t-new').removeClass('t-new');
        $('.t-state-active').removeClass('t-state-active');
        //$new_container.html('');
      },
      // 鼠标移动时新建实体跟着移动
      'mousemove': function(e){
        var $active = $('.t-state-active.t-dragable');
        //if(e.target === $active[0]) {
          var isNew = $active.hasClass('t-new');
          var size = {
            width: $active.width(),
            height: $active.height()
          };
          var position = {};
          if (isNew) {
            position = {
              top: e.clientY,
              left: e.clientX
            };
          }
          else {
            position = {
              top: e.clientY - Offset.y,
              left: e.clientX - Offset.x
            };
          }

        $active.css(position);
          $('.t-unit-container').each(function () {
            var $this = $(this);

            var top = parseInt($this.offset().top);
            var left = parseInt($this.offset().left);
            var width = parseInt($this.css('width'));
            var height = parseInt($this.css('height'));

            if (position.top > top && position.top < top + height && position.left > left && position.left < left + width) {
              $active_region.addClass('t-state-active').animate({
                top: top,
                left: left,
                width: size.width,
                height: size.height
              });
            }
            else {
//              $active_region.removeClass('t-state-active').stop(true).animate({
//                top: 0,
//                left: 0,
//                width: 0,
//                height: 0
//              });
            }
          });
        //}
      }
    })
    // 鼠标按下时新建实体
    .delegate('.t-unit-drag-btn', {
      'mousedown': function(e){
        var $this = $(this);
        var uid = $this.closest('.t-unit-drag').data('uid');
        var $template = $(Maps[uid]);
        $template
          .addClass('t-new t-state-active t-dragable')
          .css({
            top: e.clientY,
            left: e.clientX
          })
          .appendTo($new_container)
        ;
      }
    })
    // 鼠标按下时拖动元件
    .delegate('.t-dragable', {
      'mousedown': function(e){
        var $this = $(this);
        Offset = {
          x: e.offsetX,
          y: e.offsetY
        };
        $this
          .addClass('t-state-active')
          .css({
            top: e.clientY - Offset.y,
            left: e.clientX - Offset.x
          })
        ;
      }
    })
  ;

});