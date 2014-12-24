//     Underscore.js 1.5.0
//     http://underscorejs.org
//     (c) 2009-2011 Jeremy Ashkenas, DocumentCloud Inc.
//     (c) 2011-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  //这个做为一个标识，用来跳出each循环
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  //定义一个_
  var _ = function(obj) {
	//如果obj已经是【_对象】了，则直接返回obj
    if (obj instanceof _) return obj;
	//如果当前上下文不是【_】实例化出来的(也就是说是通过_.xxx的方式直接调用的)，则实例化一个【_对象】返回。
    if (!(this instanceof _)) return new _(obj);
	//实例化时，吧obj的原始值存到【_对象】的_wrapped属性里。
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  //如果在node环境下，则exports这个【_】
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
	//若不是node环境，则将_挂到全局对象下
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  //定义一个each，遍历数组元素或对象属性，iterator函数的参数依次为【值，索引/属性名，上下文】
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
		//当接收到的返回值是breaker时，跳出循环。这是自定义的一个跳出循环的标识。
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  //返回一个新的数组，新数组里的每个元素为原数组每个元素经过iterator方法处理后返回的结果。
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  //迭代处理一个数组，并将每次处理的结果传给下个处理程序作为参数(这通常要求处理函数中必须有返回值，不然可能有意料外的结果)，这一般用于叠加计算或拼接数组的元素。
  //这里有一个命名叫做inject，估计它想表达的就是，这个函数能把上一个处理函数的处理结果返回并注入到下一个处理函数里
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
	  //这里检测是否有传递上下文，有的话，则为iterator处理函数绑定上下文。(其实我不知道这个上下文在这里有什么作用的)
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
	  //如果初始调用reduce时没有传memo这个参数，则把第一个obj的值作为memo传递给下个处理函数
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
	//若到这里initial还是为false，即代表该数组或对象为空。
    if (!initial) throw new TypeError(reduceError);
	//返回最后计算结果
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  //这个就是和从右边开始的一个reduce，就是反序的reduce，不知道怎么表达，反正就是从后面开始。
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
	//这个length一来是为了检测obj是对象还是数组，二是确保即使obj是对象的情况下，还是能够按照默认顺序的反序逐个获取。
    var length = obj.length;
    if (length !== +length) {
	  //保存obj的key的集合，下面反序时候将要用到
      var keys = _.keys(obj);
      length = keys.length;
    }
	//其实感觉这个each在这里有点奇怪，它只是确保了迭代对象的长度正确，而每次迭代的对象，并非这次处理所需要用到的对象。
    each(obj, function(value, index, list) {
	  //重置index的值，以保证处理是按照我们想要的反序进行的。
      index = keys ? keys[--length] : --length;
	  //同样，这里若没有初始的memo，则以最后一个obj的值作为memo传递给下个处理函数
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  //如果对象或数组里面，存在一个obj，是在经过处理程序(iterator)处理之后返回true的，则将该obj的值返回。
  //detect是检测的意思。英文不好就是要把这些翻译结果记下来。
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  //这个很简单。就是过滤的作用，把过滤出来的结果存起来并返回。obj是数组或对象，iterator就是这个过滤的条件。
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
	  //如果对象或数组里面，存在能通过iterator处理并返回true的对象，则将这些对象存到一个集合里，并返回。
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  //这个。。就是和filter相反的一个东西。。把过滤掉的东西存到一个集合并返回。
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  //若obj里面的每个元素经过iterator的检测都返回真值(即不为undefined/null/0/false/NaN)，则结果为true，否则为false
  //原意说这是一个真值检测的方法。
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
	  //这个地方差点把我坑了：result = result && iterator.call(context, value, index, list)
	  //一时没注意复制优先级是最低的，就按左到右的顺序看过去，怎么想怎么不明白。
	  //后面return breaker是告诉each跳出循环。
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  //中文翻译好像是说检测至少有一个元素能通过真值检测。
  //即判断obj里是否存在至少一个真值。iterator为检测的方法，该方法返回true或false。
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
	  //【result ||】即【if(!result)】的意思，上面iterator || (iterator = _.identity)也是这个意思。
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  //检测obj里面是否包含target，对象和数组均适用。
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false; 
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
	//用any来判断target是否和obj里面的其中一个元素相等，是则返回true
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  //返回一个数组，数组的每个元素为obj每个元素调用method方法得到的结果，第三个参数起的每个参数都会在调用method的时候传进去。
  //这个方法和map方法很像，只是map方法只有3个参数，依次为【数组/对象，调用的方法，上下文】。
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
	  //如果method不是function，则也就只能是字符串了吧，就直接以value[method]的方式来调用。
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  //pluck也许是map最常使用的用例模型的简化版本，即萃取对象数组中某属性值，返回一个数组。(这是网上的解释，反正我是想不出萃取这个词的。)
  //也就是，仅留下每个对象的某一个属性值，或者每个数组的某一个索引指向的值。
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  //筛选对象数组里面，能与attrs匹配的第一个对象或集合。
  _.where = function(obj, attrs, first) {
	//若attrs为空，判断first是否为空，是的话返回undefined，不是的话返回空数组。
    if (_.isEmpty(attrs)) return first ? void 0 : [];
	//这里这个first，其实就是用来判断是返回第一个结果还是返回整个结果集的。
    return _[first ? 'find' : 'filter'](obj, function(value) {
	  //循环一下，判断value是不是能和attrs里面的每个key匹配
      for (var key in attrs) {
		//我得注意这里，这里的value，也就是obj里面的每一项，它就是一个对象，而不是这个对象的属性值。
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  //这个很明显就是筛选对象数组里面能与attrs匹配的第一个对象。
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  //很奇怪的一个取最大值的方法，iterator不存在的时候一般就是取数字数组最大值的
  //但如果这个是对象或不是由数字组成的数组(当然，这样的话iterator必须存在，它确定取值规则)，可以根据iterator来确定这个比较规则，取得在这种规则下的最大值。
  _.max = function(obj, iterator, context) {
	//如果不存在iterator，且obj是数组，且这个数组至少有一个数字，且数组长度小于65535，则直接调用Math的max方法
	//其实不知道为什么要限制数组长度，难道是因为效率问题？因为1.3.3版本是没有这个限制的。。
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
	//如果不存在iterator，且obj为空，则返回负无穷大
    if (!iterator && _.isEmpty(obj)) return -Infinity;
	//来到这里，要么是存在iterator，要么是不存在iterator但obj不为空
	//设定一个默认值。
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
	  //如果iterator存在，则取它的返回值作为比较的值，不存在则默认取value做比较，这个只是一个用作比较的值，不是最终要返回的值
      var computed = iterator ? iterator.call(context, value, index, list) : value;
	  //如果大于默认值，则重设result，这里的value就是最终要返回的最大值。computed只是用来比较的。
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  //这个就是取最小值的方法，实现和max差不多的。。
  _.min = function(obj, iterator, context) { 
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  //返回随机乱序的数组副本。实现起来很巧妙，有意思。。
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
	  //返回一个[0, index]范围内的随机整数
      rand = _.random(index++);
	  //逐个往shuffled数组添加元素，这个元素，是从shuffled已有的元素中随机取得的，之后再给旧元素赋上新值，以确保不会有同一个元素放到两个不同位置。
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  //返回一个依据，传进来的如果不是function，则用function包裹起来作为【排序/分组/计数】依据。 供sortBy/groupBy/countBy使用
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  //这是个排序函数，obj是要排序的对象，value是依据，按这个依据返回值从小到大排列出obj中的元素或属性。
  _.sortBy = function(obj, value, context) {
	//包裹起来做为排序依据。
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
	  //先用map方法返回obj的【每个元素(或属性)值，元素索引(或key)，排序依据的值】组成的对象数组。
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
	//注意，这里的括号是map方法的，后面这个sort是内置方法，left和right分别是每次比较用的值(即上面那个对象数组中的其中两个对象)。
    }).sort(function(left, right) {	//这里要注意一下，这个排序，是以【排序依据值】从小到大排列的
	  //把对象中排序依据的值取出来
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
	    //若a > b，或者a为undefined，则调换顺序，a排在后面。
        if (a > b || a === void 0) return 1;
		//若a < b，或者b为undefined，则不改变顺序，b排在后面。
        if (a < b || b === void 0) return -1;
      }
	  //若a等价于b，则按index从小到大排列
      return left.index < right.index ? -1 : 1;
	//最终，用pluck方法，从排好序的对象数组里，筛选出最后要的value值组成集合返回。
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  //这是一个私有方法，供groupBy使用。
  var group = function(obj, value, context, behavior) {
    //这个result用以保存最后分组结果
    var result = {};
	//创建一个分组的依据，执行这个依据得到的结果用以确定属于哪个组
    var iterator = lookupIterator(value == null ? _.identity : value);
    each(obj, function(value, index) {
	  //执行这个依据获取分组组名(这里key即组名)
      var key = iterator.call(context, value, index, obj);
	  //以上面结果调用分组的函数
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  //对数组或对象进行分组，value为分组依据
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
	  //按结果集内该分组(key)存在情况，适当的将值添加进该分组
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });	//最后返回结果集
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  //对数组或对象进行分组计数，value为分组依据
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
	  //若分组不存在，初始化count为0。然后count自加
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  // 利用二分查找确定obj应该插入到array的哪个位置。iterator是排序依据，iterator方法运行的结果就是用以排序的值。
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
	  // (low + high) >> 1 相当于 Math.floor((low + high) / 2)
	  // >>>是无符号右移运算符，这里low和high的和必然>=0，所以在这里用>>和>>>结果都一样。
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  //把【数组，类数组，对象】转成数组。
  _.toArray = function(obj) {
    if (!obj) return [];
	//如果obj就是数组类型，则直接返回
    if (_.isArray(obj)) return slice.call(obj);
    //如果obj是类数组，则返回
	if (obj.length === +obj.length) return _.map(obj, _.identity);
	//如果是对象，则将每个属性值添加到一个数组里返回，
	//如果是其他类型，则会返回空数组，因为values里面是在for in循环里给数组添加元素的，
	//其他类型应该key都是undefined，自然不会有东西添加到数组里
    return _.values(obj);
  };

  // Return the number of elements in an object.
  //返回对象或数组的长度。
  _.size = function(obj) {
    if (obj == null) return 0;
	//如果obj.length存在，且是数字，则直接返回length(即obj为数组时)，否则返回obj所有属性名的集合的长度。
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`. 
  //返回一个数组副本，包含数组前n个元素，n不存在时只包含第一个元素
  //有点不明白后面这个guard有什么作用。若n存在，guard为true时，也是返回第一个元素。这个不知道在哪里有用到。/*** Mark ***/
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  //返回一个数组副本，排除数组最后的n个元素，n不存在时只排除最后一个元素
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  //返回一个数组副本，包含数组最后的n个元素，n不存在时只包含最后一个元素
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  //返回数组的副本，该副本包括下标1(n存在时为n)到最后的所有元素。
  _.rest = _.tail = _.drop = function(array, n, guard) {
	//如果n为null或guard为真，则从下标为1的位置开始截取数组，若n不为空，则从下标为n的位置开始截取数组
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  //返回一个除去falsy值的array副本。在javascript中, false, null, 0, "", undefined 和 NaN 都是false值.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  //这是将一个n层数组转换成1层或n-1层数组的方法。
  //shallow是浅的意思。
  var flatten = function(input, shallow, output) {
	//如果shallow为真，且input里面每个元素或属性都是数组，则将output和input合并返回。
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
	//其实这里有几种情况，
	//	1、方式为【浅】，且每个元素都是数组，则直接去掉最外层嵌套，把每个元素合并在一起成为一个数组。即上面那个if 
	//	2、方式为【浅】，子元素是任意元素，则直接追加到输出数组里。
	//	3、方式为【非浅】，子元素是非数组元素，则直接追加到输出数组里。
	//	4、方式为【非浅】，子元素是数组或类数组元素，则递归继续找下层元素，直到所有元素都经过步骤3。
    each(input, function(value) {
	  //如果value是数组或类数组
      if (_.isArray(value) || _.isArguments(value)) {
		//如果是浅方式(这个实在不会表达)，则直接把value追加到output里，如果不是，则递归的方式逐层解开嵌套数组(应该说多层数组比较合适)
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
	    //若已经不是数组，则直接追加到后面。
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  //将一个多层数组转换成一层数组。如果shallow为真，则数组只减少最外层嵌套。
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  //和difference功能一模一样，过滤掉数组中的某些元素。
  //定义两个方法的原因可能是为了接受不同参数，
  //without用来接收(array, param1, param2, param3)这样的参数，
  //difference用来接收(array, array1, array2, param1, param2)这样的参数的吧。
  //纯属个人猜测。。
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  //返回数组去重复之后的副本(使用===做等值检测)，isSorted是告诉这个函数数组是否已经排过序，是的话，将调用更快的方法去重复。
  //也可以传递iterator，告诉该函数是以经过iterator处理的结果的数组做去重复操作。
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
	//如果isSorted为function，则说明可能传了3个参数进来，则重设参数。
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
	//初始化数组。如果iterator存在则，用map处理array返回数组副本做初始值。
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
	  //如果是排过序的，则直接用【!==】判断是否相等，否则调用contains判断数组内是否已存在该元素
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
		//不知道这里为什么要写多个seen变量，感觉用一个results就够了。
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  //【网上】：返回传入的 arrays（数组）并集，按顺序返回，返回数组的元素是唯一的，可以传入一个或多个 arrays（数组）。
  //返回传入数组合并再去重复值后得到的数组副本，嵌套的数组将当作一个普通的值做比较，不会解掉嵌套。
  //可传入单个或多个数组。
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  //【网上】：返回传入的 arrays（数组）交集，结果中的每个值是存在于传入的每个arrays（数组）里。
  //若之后的数组与array有共同的值(注意这里是每个数组与array的比较得到的相同值，其他数组之间不做比较)，
  //则把这些共同值合并为一个数组返回。
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
	//先对array执行去重复操作，然后过滤array数组里面，能与其他数组有交集的元素。
    return _.filter(_.uniq(array), function(item) {
	  //对rest每个元素进行真值检测
      return _.every(rest, function(other) {
		//真值检测的检测条件就是该值存在于数组array里，
		//就是说，除array外的所有数组，若与array有相同元素，则留下通过检测，返回真值。
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  //过滤一个数组，将后面参数(可以是数组)所包含的元素过滤掉。
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  //和unzip一样。(不过unzip在1.5.1版本中去除了，直接改用这个_.zip.apply(_, list)代替)
  _.zip = function() {
    return _.unzip.apply(_, slice.call(arguments));
  };

  // The inverse operation to `_.zip`. If given an array of pairs it
  // returns an array of the paired elements split into two left and
  // right element arrays, if given an array of triples it returns a
  // three element array and so on. For example, `_.unzip` given
  // `[['a',1],['b',2],['c',3]]` returns the array
  // [['a','b','c'],[1,2,3]].
  //【网上】：将每个arrays中相应位置的值合并在一起。在合并分开保存的数据时很有用. 如果你用来处理矩阵嵌套数组时,它可以做类似的效果。
  //就是建立一个二维数组，将原各个数组中相同位置的值组成数组作为这个二维数组第一维的元素。
  //原数组中最大长度的数组确定二维数组一维元素的个数。
  _.unzip = function() {
	//先取每个数组长度值，并上个0，求最大长度值。
    var length = _.max(_.pluck(arguments, "length").concat(0));
	//确定二维数组第一维的长度。
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
	  //将各个数组相同位置的值组成数组放到二位数组里。
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  //将两个数组一一对应组成object &:object(['moe', 'larry', 'curly'], [30, 40, 50])
  //或者是一个二维数组，将第二维的第一项做key，第二项做value，组成object &:object([['moe', 30], ['larry', 40], ['curly', 50]])
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  //实现类似原生indexOf的功能，isSorted是开始查找的位置(若isSorted为-2，则表示从倒数第2个元素开始查找)。
  //但与原生indexOf不同的是，_.indexOf是用于查找元素在数组中的位置的，而不能查找字符在字符串中的位置。
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
		//若isSorted < 0，则从尾部isSorted位置开始查找
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
		//利用二分查找确定item在array中的位置
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  //从尾部开始查找元素在数组中的位置。
  //但与原生lastIndexOf不同，_.lastIndexOf是用于查找元素在数组中的位置的，而不能查找字符在字符串中的位置。
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
	//不知道为什么不和indexOf那样写，用 if(typeof from == 'number') i = Math.min(from, array.length), 而要在上面定义hasIndex
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  //创建一个等差数列的数组，_.range([start = 0], stop, [step = 1]) 
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;
	//step和(stop - start)的符号要统一，不然的话返回空数组，即这里的len = 0
    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  //创建一个函数，作为继承的时候的一个过渡，让对象只继承父类prototype上的属性。
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  //网上说绑定函数func到context上，无论何时调用函数，函数里的this都是指向该context。
  //我觉得应该这么说，为func函数绑定上下文。
  _.bind = function(func, context) {
    var args, bound;
    //if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
	//可以在绑定的时候就设置好参数，调用的时候传的参数默认追加到这些参数后面
    args = slice.call(arguments, 2);
    return bound = function() {
	  //如果这里的this不是bound实例化出来的，直接以context为上下文调用这个func方法。
	  //感觉一般都会进这个方法吧，暂时想不到什么情况下这个this会是bound实例化出来的对象，虽然可以用call替换这个this，但这应该没什么意义。
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
	  //否则，创建一个对象，该对象的构造函数为ctor，原型指向func的原型，
	  //即这个对象继承了func原型上的属性，即原型继承
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
	  //如果这个result是对象(即func里面有返回一个对象或数组类型的值)，则直接返回。否则返回func的这个实例
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  //上面英文大概是这个意思吧：创建一个能局部应用func的函数，它可预置参数，并不会改变它的动态this上下文。
  //就是创建一个对func函数的调用，可以预置参数(预置参数将并到调用参数之后，所以最好不要预置参数)，
  //也可以在调用时传递参数，/* 后面这句不会理解 */。
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  //为obj下的某些方法绑定上下文，若要绑定上下文，则在之后的参数传递各个方法名
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  //这个方法是使函数拥有记忆功能(这是网上说的)，
  //确实是，作用在递归上，它可以把递归的结果存起来，
  //那么递归时，不用每次计算结果，有的话直接取值，
  //没有的话再计算结果存起来。
  _.memoize = function(func, hasher) {
    var memo = {};  //存储递归结果的对象
    hasher || (hasher = _.identity);  //用来计算存在memo的key值的方法
    return function() {
      var key = hasher.apply(this, arguments);  //meno的key值
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  //延迟函数执行，第一个参数是要执行的函数，第二个是delay时间，第三个起是执行函数的参数
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  ///*** 不明白这个有什么作用。感觉就是调用了一下delay的方法。。英文说作一个延迟，等当前堆栈清除了再运行这个方法。 ***
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  //这方法有点象setInterval，它是在【事件或方法】运行过程中，每隔wait时间执行一次func，当该【事件或方法】执行完时，清除计时器
  //可传递options设置是否马上开始或停止调用。
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
	//上次调用的时间
    var previous = 0;
	//这是配置是否禁用第一次或最后一次的调用。禁用第一次传{leading: false}，禁用最后一次传{trailing: false}
    options || (options = {});
	//这是计时器下次要触发的函数。
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
	  //如果上次调用的时间不存在，或者传递设置告诉它不马上执行第一次调用。则重设上次调用时间。
      if (!previous && options.leading === false) previous = now;
	  //这里获取剩余时间。即【等待时间】减去【上次调用到现在的时间】
      var remaining = wait - (now - previous);
	  //这里不知道为啥用这个this做上下文，因为this在这里是Window
      context = this;
      args = arguments;
	  //如果剩余时间小于0，则清除计时器(这里清除计时器是因为每次设置计时器都一定会执行，
	  //而因为setTimeout的某些缺陷(因为js是单线程的，所以这个setTimeout可能会等队列上的事件都执行完了再执行)，
	  //这就可能造成连续调用的情况，为了减少因setTimeout缺陷带来的问题，这里也是计算了remaining来判断是否调用func。
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
	  //判断是否需要禁用最后一次调用。这个，在这里不知道作用是什么，除了在leading和
	  //trailing不同时设为false的时候的作用明显一点，可以马上执行调用，在下次延迟之前停止掉的话，不会执行下次延迟的函数。
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
	  //如果leading和trailing不同时设为false时，其实就相当于延迟wait时间开始第一次执行，之后每隔wait时间执行一次，停止时马上停止。
	  //若leading和trailing都不存在时，相当于开始马上执行，之后每隔wait时间执行一次，停止时延迟还会继续调用一次。
	  //即leading控制开始时是否马上执行调用，trailing控制停止时是否马上停止计时器。
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  //防止在wait时间内重复运行一个函数。。immediate用来设置边界，为true时，马上调用，在wait时间内不会再调用该函数
  //为false时，延迟wait时间再调用，同样在之后的wait时间内不会再调用该函数，
  //防止因操作过快引起的重复操作问题。如鼠标连点同一个按钮造成两次调用同一方法。
  _.debounce = function(func, wait, immediate) {
    var result;
    var timeout = null;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
		//这里判断immediate是为了防止设置了immediate为true的情况下错误的设置一个额外的计时器。
		//因为immediate为true时，是不需要再设置计时器的。
        if (!immediate) result = func.apply(context, args);
      };
	  //callNow是用于判断是否需要马上执行func，当immediate为true或不存在timeout时。
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
	  //这里设置计时器，其实在immediate为true时，这个计时器里面真正需要调用那个方法并不会执行。
      timeout = setTimeout(later, wait);
	  //因为immediate为true时，需要马上执行。
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  //创建一个只执行一次的函数，即使之后再次调用，也是返回第一次执行的结果。
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  //将一个函数用wrapper包起来，wrapper的第一个参数为原来的函数。直接调用
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  //执行一堆方法，以反向的顺序，传的参数最终将会作为第一个执行的方法(即原顺序的最后一个)的参数，
  //再把最后的执行那个方法(即原顺序的第一个)的结果返回。这一般要求每个方法都有返回值，因为这个返回值将作为下个方法的参数。
  //下面是【网上的解释】(我感觉不太合适，因为这不是把方法组合起来，而是把结果传给下个方法而已)
  //返回函数集 functions 组合后的复合函数, 也就是一个函数执行完之后把返回的结果再作为参数赋给下一个函数来执行. 以此类推. 在数学里, 把函数 f(), g(), 和 h() 组合起来可以得到复合函数 f(g(h()))。
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
		//这里要注意，args是每次都会重新赋值作供下次循环使用
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  //在调用times次数后执行func函数。
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  //把一个对象的所有属性名存到一个数组，并返回。
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  //把一个对象的所有属性值存到一个数组，并返回。
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs. 
  //把一个对象的所有属性名和属性值存到一个二维数组，并返回。第二维为[key, value]
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  //返回一个对象的键值倒置的副本。源对象的属性值必须唯一【且可以序列化成字符串(这个不太理解，可以序列化成字符串是什么意思)】。
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  //返回对象里所有方法名的集合，且这个集合是经过排序的
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  //为obj对象填充(第二个参数起的所有参数的)属性，属性已存在时，覆盖之前的(这里和下面那个defaults方法相反)。
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  //返回一个obj的副本，且该副本的属性是根据后面参数筛选出来的(即该副本的属性仅包含后面的参数，下面的omit方法和这方法刚好相反)。
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
   //返回一个obj的副本，且该副本是过滤掉obj部分属性值的。
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  //为obj对象填充(第二个参数起的所有参数的)属性，属性已存在时，不填充(即不覆盖之前的属性)。
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  //浅拷贝
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  //以obj为参数调用interceptor方法，并返回obj。这是为了调用其他方法时能保持对obj的链式操作。
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  //按深度判断两个对象是否等价
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
	//这貌似说如果两个值全等，那么看上去不相同的情况就只有【0 === -0】这种，针对这种情况，则用下面两个方法来判断：
	//	1、判断其中一个不为 0/-0。
	//	2、用1除以这两个数，若除数为0时，除法的结果为Infinity，-0时，结果为-Infinity。
	//	任意一种情况为false时，都说明a和b是0和-0。
	//	不过，为什么要有这两种判断？一种不就可以了？
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
	//针对【null == undefined】为true的情况
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
	//如果a为_实例出来的对象，则先去掉包装
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
	//类型不同的时候返回false
    var className = toString.call(a);
    if (className != toString.call(b)) return false; 
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value. 
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
		//这里的英文好像说，一个对象的原意(即这个对象)是和它对应的包装器包装的结果是等价的。因此，"5" 等价于 new String("5")
		//我的理解这里直接比较应该也是可以的
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
		//如果【a != +a】为true时(即a为NaN)，此时只要再判断b是不是为NaN就好了。
		//若a不为NaN，判断这两个数是否为【0和-0】，是的话按照刚才上面的方法判断，否则按常规判断
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
		//这里说有效的日期或布尔值，都可以转成数字来做比较，无效的会转成NaN，NaN用等号比较只会返回false
		//就是说，如果两个日期是无效的，即使一模一样，也会返回false	/*** 这是推测，还没测试 ***/
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
	  //若对象是正则时，判断几个属性是否相等
	  //global	RegExp 对象是否具有标志 g。
	  //ignoreCase	RegExp 对象是否具有标志 i。
	  //lastIndex	一个整数，标示开始下一次匹配的字符位置。
	  //multiline	RegExp 对象是否具有标志 m。
	  //source	正则表达式的源文本。
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
	//执行到这里，说明a和b应该是两个类型相同的对象或是数组对象。所以若还有其中一个不是object类型，则直接返回false
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
	//有道翻译：承担平等的循环结构。检测循环结构的算法是改编自ES 5.1节15.12.3,抽象操作“JO”。
	//感觉这个while没什么作用，本来a就是上一层递归的时候加到aStack里面的，这里又循环比较一次，好像有点多此一举。
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    } 
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
	//结合有道翻译：来自不同的构造函数的对象并不等价,但来自不同框架的对象可能不是这样。
	//其实这个还是不怎么理解，难道来自不同框架的两个对象，一样的定义方法，那就可以说是等价的？(查完之后我发现这个翻译好像错了)
	//查了一下，原来这里是为了防止某些情况，如：
	//	1、
	//		var attrs = Object.create(null);
	//		attrs.name = "Bob";
	//		console.log(_.isEqual(attrs, {name: "Bob"}));
	//	2、
	//		var Class1 = function(){
	//			this.say = say;
	//		}
	//		var Class2 = function(){
	//			this.say = say;
	//		}
	//		function say(){
	//			console.log('hello');
	//		}
	//		var class1 = new Class1;
	//		var class2 = new Class2;  
	//		console.log(_.isEqual(class1, class2));
	//	没有这个方法的话，上面两个输出的都是true。
	//	其实还是不懂这里想表达的是什么情况。。尤其是这个【aCtor instanceof aCtor】	/*** Mark ***/
    var aCtor = a.constructor, bCtor = b.constructor;
	//	/*** Mark ***/
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
		return false;
    }
    // Add the first object to the stack of traversed objects.
	//把经过递归的对象存放到这两个堆栈里。。
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
	//若是数组的时候，递归比较。。
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
	  //数组当然先判断长度。。不一样的话扯什么都没用。
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
	  //若这个是对象时，逐层逐个属性比较
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
		  //记录比较过的属性个数
          size++;
          // Deep compare each member.
		  //若b也存在这个属性，则递归对比两个属性的值
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
	  //若这个时候，result还是true，则判断b的属性(不包括b原型上的属性)个数，
	  //如果和上面记录的个数相同，则【!(size--)】到了最后一个的时候跳出循环，即【result = !size(此时size为0)】为true，
	  //否则，若b的key个数少于上面的，【result = !size(此时size大于0)】为false。
	  //若b的key个数大于上面的，【result = !size(此时也是为0)】为true。这里好像有点问题。。不是应该为false才对的吗？/*** Mark ***/
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
	//出栈。
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  //深度比较两个对象是否相等。
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  //判断obj是否为空，obj可以是Array/String/Object
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  //判断obj是否为DomElement
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  //判断obj是否为Array
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  //判断obj是否为为Object类型
  //这种判断应该相当于typeof obj == 'object' && obj.constructor == Object
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  //添加一些isType的方法到underscore下面
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  //如果用isArguments判断当前arguments返回false，则说明isArguments这个方法有问题，则重新定义该方法，当obj存在名为callee的属性则该认为该对象为arguments类型。
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  //不明白这里为什么做这个判断 /*** mark ***/
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  //判断这个obj是不是一个有限的数字。+/-Infinity将返回false(这是调用内置方法判断的)。
  _.isFinite = function(obj) {
	//这个isFinite，我不知道在哪里，找不到。莫非是给我们自定义的？若不是的话，必然会进后面的条件。
	//试了下，原来这个isFinite是js里面的。w3cshool: isFinite() 函数用于检查其参数是否是无穷大。
	//而isFinite(Infinity)将返回false。所以若是Infinity则不会进入后面判断。
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  //判断数字是否为NaN，除了NaN，所有数字都能使【obj != +obj】返回true
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  //判断是否为布尔值
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  //判断是否为空
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  //判断是否未定义，【void 0】在任何时候都将返回undefined，不直接使用undefined做比较是因为undefined可以被改写。
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  //判断对象是否包含某个属性，且这个属性不是原型上的。
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  //交还控制权
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  //这里好像说为迭代器包裹一层function，不知道有什么用。
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  //运行一个方法n次，将每次运行的结果存到集合并返回
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  //返回区间[min, max]内的随机整数，包含边界，若max不存在，则范围是[0, min]
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  //字符实体对照表
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  }; 
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  //字符实体表对应正则
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  //添加字符实体转换方法。
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
		var aaa = entityMap[method][match];
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  //获取一个对象的某个属性值，如果该属性是一个function，则返回调用它得到的值。
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  //允许用您自己的实用程序函数扩展Underscore。传递一个 {name: function}定义的哈希添加到Underscore对象，以及面向对象封装。
  //mix in应该是集成进的意思吧。
  //这就是一个扩展【_对象】对象的方法，如扩展了{name: function(o, x, c){}}这样一个方法，那就可以这样调用：_(obj).name(xx, cc)
  //同样，这也会为_加上同样的方法，所以也可以这样调用：_.name(obj, x, c) 
  //以上两种方式返回的结果均相同。
  _.mixin = function(obj) {
	//遍历obj里面的所有function的方法名
    each(_.functions(obj), function(name){
	  //为_添加属性。_是一个普通的对象。
      var func = _[name] = obj[name]; 
	  //_是一个普通的对象，_(obj)是_的实例，为_添加原型方法，则_(obj)这样的对象都有了对应的方法，
	  //平时直接_.xxx调用方法，用的是_对象上的方法
	  //而_(obj).xxx这样调用方法，用的是_原型上的方法，默认会把obj作为第一个参数传递到方法里，
	  //如：
	  //	var obj = [1, 3, 5, 2, 4, 6];
	  //	var filter = function(n){
	  //		return n < 4;
	  //	}
	  //	var conResult1 = _.filter(obj, filter);		//[1, 3, 2]
	  //	var protoResult1 = _(obj).filter(filter);	//[1, 3, 2]
	  //	var conResult2 = _.sortBy(obj, _.identity);		//[1, 2, 3, 4, 5, 6]
	  //	var protoResul2 = _(obj).sortBy(_.identity);	//[1, 2, 3, 4, 5, 6]
	  //两种方法都是得到相同的结果。
	  //给_的原型添加方法，就是增加了上面的第二种方法，是之更像面向对象。
      _.prototype[name] = function() {
		//默认以对象本身作为第一个参数传进该方法
		var args = [this._wrapped];
		//后面调用的实参都会跟着之前那个参数一并传进方法里
        push.apply(args, arguments);
		//先调用func方法，返回结果，这里把_作为上下文是因为本来_的方法的上下文就是_，
		//其实也就是相当于_.func(args1, args2)这样子。
		//再把这个结果作为result方法的参数，
		//调用它，返回对象(可链则是之封装成【_对象】返回，否则返回本身)
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  //生成一个唯一的id，如果有传入参数，则该参数为id的前缀
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  //默认使用ERB方式的模板分隔符，可以改变下面设置修改模板分隔符 
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  //定义一个不能匹配任意值的正则，给不提供默认设置的情况使用。
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  //需要转移的字符
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  //有道翻译：强调模板处理任意分隔符,保留空白,并正确地转义引号插入代码中。
  //一个微型模板解析函数。
  //这个。。夹杂着javascript字符串，比较不好看明白，估计在调试的时候看会比较清晰。。
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
	//根据模板设置组成总的正则表达式，以匹配任意设置
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
	//编译模板源，适当地解析出字符串。
    var index = 0;
	//这个source拼接的是javascript字符串。
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
	  //这段是把两个匹配值之间的字符串拼接起来的，按照转义那个对照表取得文本，再往前面加上两个反斜杠，为了之后运行完得到正确的转义字符
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

	  //这个是直接对照html实体，输出html字符串
      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
	  //这个是普通的解析对象到字符串里面。
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
	  //这个是执行代码文本
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
	  //把匹配过的位置存起来(即下次开始处的索引)，以便进入下次匹配使用
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
	//如果没有指定一个变量，则数据值在这个obj的范围里面。
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
	
	//定义刚才上面用那些变量，这个print应该是可以在执行javascript字符串(<% print() %>)的时候输出拼接的那段字符串的
    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
	  //定义一个解析字符串的方法，带两个参数，第一个为那堆数据值的作用域(如果这个obj存在的话，应该会把上面那些东西挂到obj下吧，纯属猜测)
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }
	
	//如果data存在，调用解析函数。
    if (data) return render(data, _);
	//否则，返回一个经过包装的render
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
	//提供解析的源代码以方便预编译
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  //_只是一个普通的对象，_(obj)才是一个【_对象】，而返回_(obj).chain()，
  //即是调用下面extend里面那个方chain方法，使【_对象】达到链式的效果。
  //也就是说，_.chain方法是用来给对象添加链式效果的，使一个普通对象也像【_对象】那样可链。
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.
  //翻译：如果强调称为一个函数,它返回一个包装对象,可以使用oo风格。这个包装器拥有修改版本的强调功能。包裹可能链接对象。
  
  // Helper function to continue chaining intermediate results.
  //获取结果，有链式操作的返回链式调用，没的直接返回结果。
  var result = function(obj) {
	//如果上下文存在链式操作，即说明这个this是【_对象】，则返回链式调用，否则返回原对象
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  //翻译：把所有的强调功能添加到包装器对象。
  //为【_对象】集成_的所有方法，使【_对象】可以调用这些方法。(其实是把_的所有方法设置到_的原型上)
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  //为_添加数组内置的方法(这些方法都是直接改变原数组的)，返回_包裹的对象，增加其可链性
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
	  //先把原对象取出
      var obj = this._wrapped;
	  //以原对象调用原生js方法
      method.apply(obj, arguments);
	  //如果是调用shift和splice方法之后obj长度为0了，把这个对象下的第一个元素删掉。
	  //(这里很是不明白为什么要这样，shift和splice方法调用之后不是这个obj里面对应的元素已经删掉了么，为何还要再删一次。)
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
	  //调用result方法返回对obj的正确引用。
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  //为_添加数组内置的方法(这些方法返回的都是数组的副本)，返回_包裹的对象，增加其可链性
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
	  //把调用这些方法返回的数组包裹起来作为链式的对象，这若在jquery里面，属于有破坏性的操作。
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  //为【_的原型】添加chain和value方法，是【_对象】也有这些方法。
  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
	//增加chain方法，标记【_对象】为可链，返回this使对象真正可链(这里的this就是【_对象】)
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
	//返回原始对象的方法。
    value: function() {
      return this._wrapped;
    }

  });

//这个call是把this(window或者是global)换成这里的上下文。
}).call(this);
