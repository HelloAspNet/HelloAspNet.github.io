#神奇的下划线

    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>JS Bin</title>
        <style>
            a{text-decoration:none;}
            a:hover{text-decoration:underline;}
            .fl{float:left; width:300px;text-decoration:inherit;} 
        </style>
    </head>
    <body>
        <a href="#">
            <span class="fl">456</span>123
        </a>
    </body>
    </html>
这是一个很奇怪的东西，鼠标移到`a`上面时`456`那几个数字为什么会没有下划线呢？
因为`float`使`span`脱离了文档流，所以`span`恢复了默认的设置，若用户设置了`span`的样式，则用该样式，没有则用浏览器对`span`的默认样式。
可能在这里看到span没有下划线，其实不是因为`a`的`text-decoration`设置为`none`，而是它脱离文档流之后浏览器默认样式就没有下划线。

解决办法，通常是加个`a span{text-decoration:inherit;}`就可以了。
`inherit`属性的意思是继承父元素的属性。
虽然这个属性不支持低版本ie，不过没关系，低版本ie本来默认`a`里面的东西都是`underline`，所以没有影响。

***

但是如果改成这样，那`span`又没下划线了。咋办。。

    <a href="#">
        <em class="fl"><span class="fl">456</span></em>123
    </a>
    
改改写法，把`text-decoration:inherit;`写到`fl`里面就好了。这样即使多层嵌套`fl`也不会有问题。
但是若`a`也是`fl`，那不是还有问题。这时就要自定义一下`a.fl{text-decoration:none;}`