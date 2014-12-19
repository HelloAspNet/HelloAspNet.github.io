$(function(){
	var ImageSrc = {
		check: '../image/y-form-check.png',
		uncheck: '../image/y-form-uncheck.png',
		select: '../image/y-form-select.png'
	};
	
	//
	var $box = $('<div class="y-box"></div>').appendTo('body'),
		//mask
		$mask = $('<div class="y-mask" />').appendTo($box),
		$maskMain = $('<div class="y-mask-main"/>').appendTo($mask);
		
	//select
	$('.y-form select').each(function(){
		var name = $(this).attr('name'),
			width = $(this).width();
		if(!name){ 
			name = 'select_' + (+new Date());
			$(this).attr('name', name);
		}
		var $selectOptionList = $(this).next('span.y-select'),
			$option = $(this).children('option');
		if($selectOptionList.length === 0){ 
			$selectOptionList = $('<span class="y-select ' + name + '" data-select-name="' + name + '"><img class="y-select-img" src="' + ImageSrc.select + '" alt="" /></span>').insertAfter($(this)); 
		}
		$selectOptionList.css({
			'width': width
		});
		$option.each(function(){
			var value = $(this).val(),
				text = $(this).html(),
				selected = $(this).prop('selected'),
				$selectOption = $('<span class="y-select-option" style="display:' + (selected ? 'block' : 'none') + ';" data-value="' + value + '">' + text + '</span>');
			$selectOptionList.append($selectOption);
		}); 
	}).hide();
	$('.y-select').on({
		'click': function(){
			var name = $(this).data('select-name'),
				$list = $(this).children('.y-select-option'),
				winHeight = $(window).height(); 
			$maskMain.html('');
			$list.each(function(){
				var $item = $('<div class="y-mask-main-select" data-name="' + name + '" data-value="' + $(this).data('value') + '">' + $(this).html() + '</div>'); 
				$maskMain.append($item);
			});
			$mask.css({
				height: winHeight
			}).show(); 
			$maskMain.css({
				marginTop:(winHeight - $maskMain.height()) / 2 * 0.9
			}); 
			
			$('.y-mask-main-select').on({
				'click': function(){
					$mask.hide(); 
					var //name = $(this).data('name'),
						value = $(this).data('value'),
						text = $(this).html(); 
					$('.y-select.' + name).children('.y-select-option').hide();  
					$('.y-select.' + name).children('span[data-value="' + value + '"]').show();
					$('select[name="' + name + '"] option[value="' + value + '"]').prop('selected', true);
				}
			});
		}
	}); 
	
	//checkbox		
	$('.y-form input[type="radio"]').hide().each(function(){
		var $img = $(this).next('img.y-checkbox-img'); 
		if($img.length === 0){ $img = $('<img class="y-checkbox-img" src="" alt=""/>').insertAfter($(this)); }
		$img.attr({ 'src': $(this).prop('checked') ? ImageSrc.check : ImageSrc.uncheck });
	});
	
	$('.y-form input[type="radio"]').on({
		'click': function(){
			var name = $(this).attr('name');
			$('input[type="radio"][name="' + name + '"]').next('img.y-checkbox-img').attr({ 'src': ImageSrc.uncheck });
			$(this).next('img.y-checkbox-img').attr({ 'src': ImageSrc.check });
		}
	});
	
	$(window).on({
		'resize': function(){
			var winHeight = $(window).height(),
				docHeight = $(document).height(),
				htmlHeight = $('html').height(),
				bodyHeight = $('body').height(),
				height = Math.max(winHeight, winHeight, winHeight, winHeight);
			$mask.css({
				height: height
			});
			$maskMain.css({
				marginTop: (height - $maskMain.height()) / 2
			});
		}
	});
	
})