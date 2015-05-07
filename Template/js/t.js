/**
 * Created by xyz on 2015/5/8.
 */
var Maps = {
  'test-unit-1': '<div style="color: #f00;background-color: #ddd;">测试元件1-html内容</div>',
  'test-unit-2': '<div style="color: #00f;background-color: #ddd;">测试元件2-html内容</div>',
  'test-unit-3': '<div style="color: #0f0;background-color: #ddd;">测试元件3-html内容</div>',
  'test-other': '<i>other</i>'
};

$(function(){

  var $win = $(window);
  var $doc = $(document);
  var $new_container = $('.t-new-container');

  // $active的offset
  var Offset = { x: 0, y: 0 };

  $doc
    .delegate(this, {
      // 鼠标弹起时清空新建的实体
      'mouseup': function(){
        $('.t-new').removeClass('t-new');
        $('.t-active').removeClass('t-active');
        //$new_container.html('');
      },
      // 鼠标移动时新建实体跟着移动
      'mousemove': function(e){
        var $active = $('.t-active.t-dragable');
        //if(e.target === $active[0]) {
          var isNew = $active.hasClass('t-new');
          if (isNew) {
            $active.css({
              top: e.clientY,
              left: e.clientX
            });
          }
          else {
            $active.css({
              top: e.clientY - Offset.y,
              left: e.clientX - Offset.x
            });
          }
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
          .addClass('t-new t-active t-dragable')
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
          .addClass('t-active')
          .css({
            top: e.clientY - Offset.y,
            left: e.clientX - Offset.x
          })
        ;
      }
    })
  ;

});