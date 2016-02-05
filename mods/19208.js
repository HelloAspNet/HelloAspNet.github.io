//// 暂时不能用模版
//(function () {
//  var template = $.Tpl;
//
//  template.helper('kidFormatIndex', function (i) {
//    i += 1;
//    return i > 9 ? i : '0' + i;
//  });
//
//  template.helper('kidFormatEnIndex', function (i) {
//    return 'abcdefghijklmnopqrstuvwxyz'.charAt(i % 26);
//  });
//
//  $('#kmodBodyHtml').html(template('kmodBodyTpl', {mods: new Array(20), links: new Array(4)}));
//})();


var wh = $.Cookie.get('vip_wh') || 'VIP_NH';
var whs = wh.toLocaleUpperCase();


var linksData = {};
var links = linksData[whs];
// 添加商品链接
$('.kmod-body .kmod-link').each(function (i) {
  $(this).attr({
    target: '_blank',
    href: 'http://www.vip.com/detail-' + links[i] + '.html'
  });
});


var blinksData = {};
var blinks = blinksData[whs];
// 添加专场链接
$('.kmod-body .kmod-blink').each(function (i) {
  $(this).attr({
    target: '_blank',
    href: 'http://list.vip.com/' + blinks[i % 3] + '.html'
  });
});

