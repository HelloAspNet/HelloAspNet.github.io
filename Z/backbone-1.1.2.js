//     Backbone.js 1.1.2

//     (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(root, factory) {

  // Set up Backbone appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    define(['underscore', 'jquery', 'exports'], function(_, $, exports) {
      // Export global even in AMD case in case this script is loaded with
      // others that may still expect a global Backbone.
      root.Backbone = factory(root, exports, _, $);
    });

  // Next for Node.js or CommonJS. jQuery may not be needed as a module.
  } else if (typeof exports !== 'undefined') {
    var _ = require('underscore');
    factory(root, exports, _);

  // Finally, as a browser global.
  } else {
    root.Backbone = factory(root, {}, root._, (root.jQuery || root.Zepto || root.ender || root.$));
  }

}(this, function(root, Backbone, _, $) {
    
  // Initial Setup
  // -------------

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.1.2';

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  //把【jquery/zepto/ender】的$挂到Backbone下。
  Backbone.$ = $;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  //交还控制权
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    //为对象添加事件
    //name可以是对象，可以是单个事件名，也可以是多个事件名以空格为连接符拼接起来的字符串
    on: function(name, callback, context) {
      //如果事件添加成功，或者没有回调函数，则返回this 
      // /* 这里返回this应该是为了链式操作，不然可以直接返回空，下面没特殊说明的话，则都是这个意思 */
      //其实这里，有个递归，因为eventsApi里面，重新调用了on这个方法，而这时候会跳过这个if执行下面的代码
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      //这里是给这个eObj添加一个_events属性，用于存储eObj上的所有事件。
      this._events || (this._events = {});
      //若_events里未存在该事件，则为_events的该类型事件，定义一个队列，有序的存储新添加进来的事件
      //就像是，注册事件吧。
      var events = this._events[name] || (this._events[name] = []);
      //callback就是这个事件的处理函数。
      //context是指定的上下文，不一定存在。
      //ctx是真正的上下文，或者说运行时的上下文，任何时候都存在
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    //类似jquery的one
    once: function(name, callback, context) {
      //同on
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      //调用_.once方法生成一个只执行一次的函数。
      var once = _.once(function() {
        //移除name类型的所有事件
        self.off(name, once);
        //执行回调
        callback.apply(this, arguments);
      });
      //设置_callback属性，保存回调函数，off里面可以根据这个筛选是否当前移除的函数。
      once._callback = callback;
      //调用on方法添加事件，这个事件只会执行一次。
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    //移除指定事件。
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      //如果存在_events则调用eventsApi移除指定事件，移除成功，直接返回，否则继续下一步。_events不存在时也直接返回
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      //如果name、callback、context全部为假，则移除所有事件。
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }
      //建立一个数组，存储所有将要移除的事件名，如果name不存在，则取对象下所有事件名
      //(这里说的事件，是指用户添加的事件，非on/off这些事件，下面没有特殊说明，皆是这个意思。)
      //而这里name只能是字符串，并且是单个事件名。不能是拼接的事件名。
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        //取得该事件的处理函数，若存在，则进入if条件
        if (events = this._events[name]) {
          //清空该事件的事件队列。
          this._events[name] = retain = [];
          //如果有回调或上下文存在(不知道这个上下文存在又能怎样。)
          if (callback || context) {
            //这个events是清空前的事件队列。
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              //如果callback存在，且不与原队列里面的事件相等，且不与原队列事件的_callback属性相等，
              //或者是context存在且不与原队列里面的context相等，
              //则把事件存到retain里面，这个下面用来判断是否删除整个属性用到，
              //不过，除了那里我也不知道它还有哪里用到了，估计以后还有别的用处，例如把事件加回去(猜测)
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          //如果该事件队列的长度为0，即移除了所有事件，则删掉对象_events下的[name]这个属性。
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    //触发指定事件
    trigger: function(name) {
      //如果不存在事件
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      //为对象添加trigger事件
      if (!eventsApi(this, 'trigger', name, args)) return this;
      //获取该类型的事件队列
      var events = this._events[name];
      //不知道哪里冒出来的all /**********************************/
      var allEvents = this._events.all;
      //如果事件队列存在，则调用triggerEvents方法按顺序触发各个事件处理函数。
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    //停止监听，不知道这里为什么会有两个Events的实例，this和obj应该都是它的实例。 /************************/
    stopListening: function(obj, name, callback) {
      //获取这个eObj上的监听列表
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      //若name和callback，则为移除的意思。
      var remove = !name && !callback; 
      //如果没有回调函数，且name为对象，则把上下文存到callback里传到下面的方法里
      if (!callback && typeof name === 'object') callback = this;
      //如果obj存在，初始化监听列表，
      //这个写法有点奇葩，正常应该分开写，即：if (obj) { listeningTo = {}, listeningTo[obj._listenId] = obj; }
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      //如果这个监听列表存在要监听的对象，这个对象是以【key：id, value: eObj】这样的方式存在listeningTo中的。
      for (var id in listeningTo) {
        obj = listeningTo[id];
        //移除obj的事件
        obj.off(name, callback, this);
        //如果移除条件成立，或obj上没有事件，则移除Events的该条监听属性
        if (remove || _.isEmpty(obj._events)) delete this._listeningTo[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  //验证方法名是否以空格隔开的正则
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  //一个用来添加或移除事件的方法。(返回true的意思是没有执行任何操作，即没有添加或移除事件，
  //返回false是说明已经成功为obj添加了事件。)
  var eventsApi = function(obj, action, name, rest) {
    //如果不传事件名，返回true
    if (!name) return true;

    // Handle event maps.
    //如果name是对象，即认为这是多个事件组成的一个对象。则迭代这个对象，去调用obj的action方法给obj添加或移除事件。
    //比如这个action是on，即是obj.on(eName, eFunc, ctx)。
    //添加或移除事件后返回false
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    //判断这个是不是由多个事件名组成的字符串，是的话，则还是迭代处理它。
    if (eventSplitter.test(name)) { 
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }
    
    //若来到这个返回，就说明这个name不是Object类型又不是有效的方法名以空格拼接成的字符串
    //则，不作处理，返回true
    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  //触发队列里的所有事件，以args为参数，这里的events是一个数组，里面的元素是有序的事件处理函数。
  var triggerEvents = function(events, args) {
    //ev是单个事件，i用来迭代events，a1、a2、a3是传进ev里面的参数。
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    //根据参数长度选择不同处理方式， 反正每种方式都要迭代events，执行里面的每个事件的。
    //不明白为什么不直接用最后一个。。/****************************/
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args); return;
    }
  };

  //监听方式，一直或一次。
  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  //迭代监听方式，为Events对象添加各个方式的监听处理函数
  //就是说给Events对象添加listenTo和listenToOnce的监听方式，处理的时候为obj添加对应的事件
  _.each(listenMethods, function(implementation, method) { 
    //这里这个obj其实是Events的一个实例。
    Events[method] = function(obj, name, callback) {
      //若Events对象上_listeningTo属性不存在则创建一个监听列表
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      //若对象的_listenId不存在，则新建一个前缀为l的唯一id。
      var id = obj._listenId || (obj._listenId = _.uniqueId('l'));
      //把该obj放到Events的监听列表里，key值为obj的_listenId
      listeningTo[id] = obj;
      //如果没有回调函数，且name为对象，则把上下文存到callback里传到下面的方法里
      if (!callback && typeof name === 'object') callback = this;
      //以对应的方式为obj添加事件(即添加on方法还是once事件)
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  //调用_.extend方法为Backbone对象添加事件的属性，即添加与事件相关的方法。
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    //传递这个parse参数(true或false)，确定是否要调用model的parse事件解析attrs
    if (options.parse) attrs = this.parse(attrs, options) || {};
    //_.defaults方法是为第一个对象填充其他对象的属性，但不会覆盖存在的属性。
    //_.result方法返回this的defaults值，如果this是func，则调用它再去defaults值
    attrs = _.defaults({}, attrs, _.result(this, 'defaults'));
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // Attach all inheritable methods to the Model prototype.
  //为Model的原型添加事件的属性， 和它自己的共有方法。使Model拥有事件的方法。
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    //这在set方法里面会初始化为一个对象，是用来存储被set方法改变的属性的键值对。
    changed: null,

    //这个是set方法里面能否通过验证的输出信息。若为假，则表示没有验证错误，即通过验证。
    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    //这是model属性里面存储id用的标识，视情况而定，因为未必每个id名都叫id，或者有_id或者__id之类的。
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    //这个方法，是用来初始化的，而在这里为一个空函数，则说明是给子类重写用的。
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    //返回attributes的一份副本
    toJSON: function(options) {
      //_.clone是浅拷贝
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    //以model为对象调用Backbone的sync方法返回一个xhr
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
      //获取Model的某个属性
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    //获取Model的某个属性(经过转义的，相应的字符会转成html实体)
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    //判断Model是否包含某个属性
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      //如果key是键值对形式的时候
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        //否则key就是字符串的形式
        (attrs = {})[key] = val;
      }
      //若配置不存在，则创建
      options || (options = {});

      //到这里，attrs和options就准备好了

      // Run validation.
      //调用_validate方法，验证attrs和options能否通过验证，不能则直接返回false。
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      //获取配置里面的某些固定配置(添加属性还是删除属性，要不要触发change事件)。
      //这个属性表明当前的set操作是添加属性还是移除属性，若unset为真，则为移除。
      unset           = options.unset;
      //这个属性，是告诉model是否在不触发change的情况下改变属性
      silent          = options.silent;
      changes         = [];
      //先获取model._changing，判断是否处于【正在修改】的状态。
      changing        = this._changing;
      //设置model._changing状态为【正在修改】
      this._changing  = true;
      //判断是否在改变，若不在改变，则拷贝一份【原属性】存起来
      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      //获取当前属性和前一次的属性。
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      //如果新属性对象里面存在model的id属性标记，则将model的id配置为新属性里面的那个，即可以在attrs里面传递参数修改model的id
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      //迭代新属性
      for (attr in attrs) {
        val = attrs[attr];
        //如果当前的属性和将要设置的属性不等价，则把新属性的属性名放到changes数组里
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        //如果上一次设置的属性和将要设置的属性不等价，则把新属性放到changed对象里，
        //正常情况下，current和prev两个是一样的，只有当model递归调用set方法才可能造成两个不一样。
        //这里注意一下，如果current和prev一样说明这是第一次调用set，
        //若不一样，则是递归调用set，而prev存储的，一定是第一次调用set方法之前的旧的属性。
        if (!_.isEqual(prev[attr], val)) {
          //如果和原设置不一样，则把新设置放到一个【已改变属性对象(我把changed称为这个)】里
          this.changed[attr] = val;
        } else {
          //否则，就说明这和没调用set方法之前的旧属性是一样的，则把新添加的属性从【已改变属性对象】中删掉，说明这个属性没有修改。
          delete this.changed[attr];
        }
        //检查这个固定设置unset，判断是否要设置到model的attributes里。
        //若unset为真，则删除当前属性值，即相当于移除属性的操作。
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      //这个silent翻译是沉默的意思，那silent在这里就是用来判断是否静默设置，静默的意思就是不触发change事件。
      if (!silent) {
        //如果changes(存的是改变过的新属性的属性名)里面有东西，将配置存到model._pending上。这里就是把options存起来给下面while用。
        if (changes.length) this._pending = options;
        //迭代调用改变属性的事件，居然是改变每个attr都对应着一个change方法。好大的坑。。
        for (var i = 0, l = changes.length; i < l; i++) {
          //这里会触发自定义的【change:attrName】事件。
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      //如果还处于【正在修改】状态，
      //若changing为真，则说明现在调用的这个set方法，是递归里面的set方法(即递归里层的set方法)，
      //则返回this，等回到最外层递归的时候再去执行下面的，再看是否要触发最终的change。
      if (changing) return this;
      //执行到这里，就说明回到了递归函数的最外层。
      //还是那个沉默。
      if (!silent) {
        //当model._pending存在的时候，获取配置，调用change事件
        while (this._pending) {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      //不沉默是也得把model._pending设为false
      this._pending = false;
      //改变完毕
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    //这个是移除指定属性的方法，也可以传silent告诉set方法是否不触发change事件。
    //擦。。如果先看这里，上面那个set就不用想这么久了。
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    //清除model上的所有属性。可配置是否触发各种change。
    clear: function(options) {
      var attrs = {};
      //其实在这里已经清掉了model上的属性了，只是没有移除属性
      for (var key in this.attributes) attrs[key] = void 0;
      //这个会移除model上的属性，和根据options选择是否触发各种change事件。
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    //判断model的属性是否改变过。可指定属性名。
    hasChanged: function(attr) {
      //若attr为null或undefined，直接判断【已改变属性对象】(model.changed对象存储改变过的键值对)属性是否为空，是则改变过。
      if (attr == null) return !_.isEmpty(this.changed);
      //若attr不为空，则判断该属性是否改变过。_.has方法本质就是obj.hasOwnProperty。
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    //1、若不传参数，则获取model上【已改变属性对象】
    //2、若传进一个属性键值对象，则返回该对象与【旧属性对象】不同的属性键值组成的对象。
    //比如，想设置diff属性到model上，可以先用这个方法确定diff中有哪些是不同于旧属性的，再设置这些不同的属性即可。
    //不知道这在实际运用中，会在哪些地方用得上。
    changedAttributes: function(diff) {
      //如果diff为假，分两种情况：
      //  1、model属性改变过，则返回【已改变属性对象】的副本
      //  2、model属性没改变过，返回false
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      //获取旧属性，_changing表明model是否处于正在修改属性的状态
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        //若旧属性和传进来的属性同属性名下属性相等，则继续下次循环
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        //不等则保存到changed对象上
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    //获取修改前的旧属性，可指定具体某个。
    //感觉这里不用副本，可能在某些情况下会有点问题(其实很多方法(如previousAttributes)里用浅拷贝_.clone也是会有这个隐患)，
    //比如这个属性的值是对象或数组，那就可能错误的把它给改掉。
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    //获取旧属性的副本。
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    //通过ajax读取数据。方法是read(实际上是get)，返回xhr供链式使用，也可以在options里配置好success方法。
    fetch: function(options) {
      //若options存在，拷贝一份，使后面的操作不影响原来的options
      options = options ? _.clone(options) : {};
      //如果没传parse这个属性，则设为true，告诉model默认是要用model.parse来解析数据
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      //把options里面的回调重新封装。
      options.success = function(resp) {
        //这里model先调用parse处理返回的请求，再把对应属性设置到model上
        if (!model.set(model.parse(resp, options), options)) return false;
        //如果原来有在options里定义回调函数，则执行该回调。
        if (success) success(model, resp, options);
        //这才是真正的调用model的sync方法做ajax请求
        model.trigger('sync', model, resp, options);
      };
      //包装【error函数】，其实和上面包装success的方法类似，目的是使它触发model的error方法
      wrapError(this, options);
      //这里model调用自己的sync方法返回一个真实的xhr
      //这个return是使model.fetch().success()可以这样链式的操作下去，而不一定要写成model.fetch({success:function(){}})的形式，
      //其实都是会调用上面的success方法，触发真正的回调。
      //这个就要根据【jquery/zepto/ender】返回的xhr来看了，因为没看过它们源码，仅仅感觉是这样。
      //若不支持链式的这个应该是废的。
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    //保存数据到服务器，这里的数据指model的属性。
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      //针对第一个key为null或是Object的情况，这种情况只能有两个参数。
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        //否则，按常规设置
        (attrs = {})[key] = val;
      }

      //这里传一个validate只是为了防止出现options里面没写validate的情况
      //这里一开始没有拷贝一份options是因为这个options会改变，而且想在调用save之后用户看到改变后的options
      options = _.extend({validate: true}, options);

      // If we're not waiting and attributes exist, save acts as
      // `set(attr).save(null, opts)` with validation. Otherwise, check if
      // the model will be valid when the attributes, if any, are set.
      //这里根据options.wait来判断设置属性是否需要等待，
      //等待的意思是，先验证不设置，之后根据其他情况再做设置。
      //其实有那么几种情况：
      //  1、需要验证，需要等待，则先验证，不设置，验证失败时直接返回
      //  2、需要验证，无需等待，则直接设置，验证失败时直接返回
      //  3、不需要验证，需要等待，则直接设置，必然不会返回
      //  4、不需要验证，不需要等待，则完全可以忽略这个验证，继续下一步
      if (attrs && !options.wait) {
        //不需要等待则直接设置，若验证失败会返回false
        if (!this.set(attrs, options)) return false;
      } else {
        //若需要等待则先做验证，验证失败也是直接返回false。
        if (!this._validate(attrs, options)) return false;
      }

      //反正到这里肯定就是通过验证了。

      // Set temporary attributes if `{wait: true}`.
      //这是针对上面的【情况1】和【情况3】做的处理，其实说白点是对【情况3】做处理，因为【情况1】，上面已经设置过了，这里应该无需重新再设置。
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      //翻译：服务器端保存成功后,客户端与服务器端状态(可选)更新。
      if (options.parse === void 0) options.parse = true;
      var model = this;
      //这里的操作和fetch的差不多。
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        //翻译：确保属性恢复期间同步保存。
        //不太明白这个是用来干嘛的。。为什么要恢复呢
        model.attributes = attributes;
        //根据不同的服务器返回值做不同处理，提取attrs
        var serverAttrs = model.parse(resp, options);
        //如果需要等待，则先取得属性，暂时不设置到model上
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        //如果处理后的serverAttrs是一个对象且不能通过验证，则返回
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      //如果model是新的，这里说的新是指还没存在于数据库的，因为存在于数据库的话一定要生成
      //一个id字段，即idAttribute这个字段一定有值(即这里isNew方法的判断依据)。
      //若是新的，则设置action为create，若不是，再判断是否为patch，这里update实际是put
      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      //如果是打补丁，则将之前【通过验证设置好的】或者【没通过验证原有的】attrs设置到options上
      //反正就是，设置好options.attrs属性，因为sync那边要拿这个属性作为传输的数据。
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      //只有等待的才会进入这里，在这里恢复attributes，留待给用户进行后续操作。
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    //
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      //这个应该是从model.collection里面销毁model
      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        //这个不理解了，如果【需要等待】且model是新的，销毁model /*******这里不应该是需要等待吧，是不需要等待的吧***********/
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        //如果模型不是新的，就是说它已经存在于数据库，则通过ajax请求从数据库里面删掉。
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      //如果model是新的，直接调用success，返回，false还不知道是什么意思 /***********************/
      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      //调用model.sync返回一个delete的xhr
      var xhr = this.sync('delete', this, options);
      //如果无需等待，则调用destroy销毁model，否则，返回xhr给用户自行根据情况销毁
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base =
        _.result(this, 'urlRoot') ||
        _.result(this.collection, 'url') ||
        urlError();
      if (this.isNew()) return base;
      return base.replace(/([^\/])$/, '$1/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    //处理响应，这里直接返回，应该是说默认直接返回响应内容，可重写这个方法。
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    //判断这个model是否从未在服务求上保存过，它是根据model是否存在这个idAttribute属性(这个属性是存储id字段的字段名的)来判断的
    isNew: function() {
      return !this.has(this.idAttribute);
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    //验证set的属性是否能通过验证，
    //验证方法validate和验证不通过时的处理方法invalid都是要自己设置的。
    //validate(attrs, options) 这里需要返回值，true或false，不通过验证时返回true
    //invalid(errorInfo, options)
    _validate: function(attrs, options) {
      //如果配置项的validate为假或者model不存在validate验证方法，则说明不需要验证，直接返回true通过验证。
      if (!options.validate || !this.validate) return true;
      //合并属性
      attrs = _.extend({}, this.attributes, attrs);
      //调用model的验证方法返回验证后错误信息，存到model.validationError上
      var error = this.validationError = this.validate(attrs, options) || null;
      //如果验证没有错误，则返回true通过验证。
      if (!error) return true;
      //执行到这里，说明不通过验证，调用自定义的invalid方法
      this.trigger('invalid', this, error, _.extend(options, {validationError: error}));
      //验证不通过时返回false
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: false}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      var singular = !_.isArray(models);
      models = singular ? [models] : _.clone(models);
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model, options);
      }
      return singular ? models[0] : models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults({}, options, setOptions);
      if (options.parse) models = this.parse(models, options);
      var singular = !_.isArray(models);
      models = singular ? (models ? [models] : []) : _.clone(models);
      var i, l, id, model, attrs, existing, sort;
      var at = options.at;
      var targetModel = this.model;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};
      var add = options.add, merge = options.merge, remove = options.remove;
      var order = !sortable && add && remove ? [] : false;

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        attrs = models[i] || {};
        if (attrs instanceof Model) {
          id = model = attrs;
        } else {
          id = attrs[targetModel.prototype.idAttribute || 'id'];
        }

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(id)) {
          if (remove) modelMap[existing.cid] = true;
          if (merge) {
            attrs = attrs === model ? model.attributes : attrs;
            if (options.parse) attrs = existing.parse(attrs, options);
            existing.set(attrs, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (add) {
          model = models[i] = this._prepareModel(attrs, options);
          if (!model) continue;
          toAdd.push(model);
          this._addReference(model, options);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (order && (model.isNew() || !modelMap[model.id])) order.push(model);
        modelMap[model.id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length || (order && order.length)) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          for (i = 0, l = toAdd.length; i < l; i++) {
            this.models.splice(at + i, 0, toAdd[i]);
          }
        } else {
          if (order) this.models.length = 0;
          var orderedModels = order || toAdd;
          for (i = 0, l = orderedModels.length; i < l; i++) {
            this.models.push(orderedModels[i]);
          }
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      // Unless silenced, it's time to fire all appropriate add/sort events.
      if (!options.silent) {
        for (i = 0, l = toAdd.length; i < l; i++) {
          (model = toAdd[i]).trigger('add', model, this, options);
        }
        if (sort || (order && order.length)) this.trigger('sort', this, options);
      }

      // Return the added (or merged) model (or models).
      return singular ? models[0] : models;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i], options);
      }
      options.previousModels = this.models;
      this._reset();
      models = this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function() {
      return slice.apply(this.models, arguments);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj] || this._byId[obj.id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(model, resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) return attrs;
      options = options ? _.clone(options) : {};
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model.validationError) return model;
      this.trigger('invalid', this, model.validationError, options);
      return false;
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model, options) {
      this._byId[model.cid] = model;
      if (model.id != null) this._byId[model.id] = model;
      if (!model.collection) model.collection = this;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model, options) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy', 'indexBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    options || (options = {});
    _.extend(this, _.pick(options, viewOptions));
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  //Backbone的异步调用方法。不知道这里为什么名字叫同步。。明明真实调用的是别的库的ajax方法。
  //其实这里就相当于一个，一个适配器之类的东西吧。。
  Backbone.sync = function(method, model, options) {
    //从methodMap里获取正确的请求类型
    var type = methodMap[method];

    // Default options, unless specified.
    //为options填充emulateHTTP和emulateJSON属性，若存在则不会填充。(找了一下，这两个属性都是false)
    //这个emulateHTTP和emulateJSON是判断request是否模仿http和data是否模仿json
    //emulateHTTP若是为true，则【put/delete/patch】都会改回post
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    //定义xhr的配置
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    //若options里不存在url，则获取对象上的url作为xhr的url
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    //如果data为undefined或null，且model存在且调用的方法是【create/update/patch】其中一种。
    //则设置xhr的contentType和data为json格式和json格式的字符串
    //具体请参考：https://www.imququ.com/post/four-ways-to-post-data-in-http.html
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      //options的attrs存在则将attrs设置为data，不存在则把options设置为data
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    //这里就是说，如果模仿json。则设置为下面这种类型，并且将data封装成一个Object类型。
    //application/x-www-form-urlencoded这种类型会将【窗体数据被编码为名称/值对】
    //网上说，如果form在get的时候，会把数据转成(name1=value1&name2=value2..)这种形式，
    //post时，浏览器把form数据封装到http body中，然后发送到server，
    //若form内不存在type=file，默认用urlencoded那样转换数据就可以了，若存在，则要用multipart/form-data，
    //浏览器会把整个表单以控件为单位分割，并为每个部分加上Content-Disposition(form-data或者file),
    //Content-Type(默认为text/plain),name(控件name)等信息，并加上分割符(boundary)。
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    //如果是模仿http，且类型为【put/delete/patch】中的一个，则实际上是用post的方式提交的
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      //如果要模仿json，则设置data._method为put
      if (options.emulateJSON) params.data._method = type;
      //这里对原来的beforeSend事件重新封装了一下。
      //即如果在【put/delete/patch】的情况下，需要重写beforeSend方法，
      //在里面修改contentType为X-HTTP-Method-Override，再执行原来的beforeSend
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    //这里应该是说，不要对不是get方法的请求做缓存之类的吧。/* 暂时不是很确定 */
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    //若类型时patch，且该环境xhr只支持用ActiveXObject的方式。则重设xhr。
    if (params.type === 'PATCH' && noXhrPatch) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    //调用Backbone.ajax返回一个xhr
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    //若发送了request，则告诉model触发一下request事件。这里的request是自己定义的。
    //只是说，在发送请求的时候，它会帮你触发一下request事件，让你可以做出对应操作
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  //这个是用来检测是否在不支持XMLHttpRequest但支持ActiveXObject的window环境下。
  //说的好复杂，就是判断当前是否在只支持ActiveXObject的IE上吧。。
  var noXhrPatch =
    typeof window !== 'undefined' && !!window.ActiveXObject &&
      !(window.XMLHttpRequest && (new XMLHttpRequest).dispatchEvent);

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  //设置action真实对应的请求类型，其实这个可能还不是最终request时的类型，比如【put/patch/delete】这些类型，在模仿http的情况下会转成post
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  //调用【jquery/zepto/ender】的ajax方法，返回一个xhr。
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  //
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        router.execute(callback, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args) {
      if (callback) callback.apply(this, args);
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional) {
                     return optional ? match : '([^/?]+)';
                   })
                   .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = decodeURI(this.location.pathname + this.location.search);
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        var frame = Backbone.$('<iframe src="javascript:0" tabindex="-1">');
        this.iframe = frame.hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot() && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment);
        }

      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      if (this._checkUrlInterval) clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragment) {
      fragment = this.fragment = this.getFragment(fragment);
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var url = this.root + (fragment = this.getFragment(fragment || ''));

      // Strip the hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) return this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  //xhr里面没有指定url时候的错误提示
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  //重新封装自定义的错误处理程序，使之触发model的error方法。
  var wrapError = function(model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

  return Backbone;

}));
