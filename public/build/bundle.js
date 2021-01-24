
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\ModeSwitcher.svelte generated by Svelte v3.31.2 */

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const THEME_KEY = "themePreference";

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ModeSwitcher", slots, []);
    	let darkMode = false;

    	function setDarkTheme(dark) {
    		darkMode = dark;
    		document.documentElement.classList.toggle("dark", darkMode);
    	}

    	function toggleMode() {
    		setDarkTheme(!darkMode);
    		window.localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
    	}

    	onMount(() => {
    		const theme = window.localStorage.getItem(THEME_KEY);

    		if (theme === "dark") {
    			setDarkTheme(true);
    		} else if (theme == null && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    			setDarkTheme(true);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ModeSwitcher> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		darkMode,
    		THEME_KEY,
    		setDarkTheme,
    		toggleMode
    	});

    	$$self.$inject_state = $$props => {
    		if ("darkMode" in $$props) darkMode = $$props.darkMode;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class ModeSwitcher extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ModeSwitcher",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\Tailwindcss.svelte generated by Svelte v3.31.2 */

    function create_fragment$1(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Tailwindcss", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Tailwindcss> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Tailwindcss extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tailwindcss",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /*! @license is-dom-node v1.0.4

    	Copyright 2018 Fisssion LLC.

    	Permission is hereby granted, free of charge, to any person obtaining a copy
    	of this software and associated documentation files (the "Software"), to deal
    	in the Software without restriction, including without limitation the rights
    	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    	copies of the Software, and to permit persons to whom the Software is
    	furnished to do so, subject to the following conditions:

    	The above copyright notice and this permission notice shall be included in all
    	copies or substantial portions of the Software.

    	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    	SOFTWARE.

    */
    function isDomNode(x) {
    	return typeof window.Node === 'object'
    		? x instanceof window.Node
    		: x !== null &&
    				typeof x === 'object' &&
    				typeof x.nodeType === 'number' &&
    				typeof x.nodeName === 'string'
    }

    /*! @license is-dom-node-list v1.2.1

    	Copyright 2018 Fisssion LLC.

    	Permission is hereby granted, free of charge, to any person obtaining a copy
    	of this software and associated documentation files (the "Software"), to deal
    	in the Software without restriction, including without limitation the rights
    	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    	copies of the Software, and to permit persons to whom the Software is
    	furnished to do so, subject to the following conditions:

    	The above copyright notice and this permission notice shall be included in all
    	copies or substantial portions of the Software.

    	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    	SOFTWARE.

    */

    function isDomNodeList(x) {
    	var prototypeToString = Object.prototype.toString.call(x);
    	var regex = /^\[object (HTMLCollection|NodeList|Object)\]$/;

    	return typeof window.NodeList === 'object'
    		? x instanceof window.NodeList
    		: x !== null &&
    				typeof x === 'object' &&
    				typeof x.length === 'number' &&
    				regex.test(prototypeToString) &&
    				(x.length === 0 || isDomNode(x[0]))
    }

    /*! @license Tealight v0.3.6

    	Copyright 2018 Fisssion LLC.

    	Permission is hereby granted, free of charge, to any person obtaining a copy
    	of this software and associated documentation files (the "Software"), to deal
    	in the Software without restriction, including without limitation the rights
    	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    	copies of the Software, and to permit persons to whom the Software is
    	furnished to do so, subject to the following conditions:

    	The above copyright notice and this permission notice shall be included in all
    	copies or substantial portions of the Software.

    	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    	SOFTWARE.

    */

    function tealight(target, context) {
      if ( context === void 0 ) context = document;

      if (target instanceof Array) { return target.filter(isDomNode); }
      if (isDomNode(target)) { return [target]; }
      if (isDomNodeList(target)) { return Array.prototype.slice.call(target); }
      if (typeof target === "string") {
        try {
          var query = context.querySelectorAll(target);
          return Array.prototype.slice.call(query);
        } catch (err) {
          return [];
        }
      }
      return [];
    }

    /*! @license Rematrix v0.3.0

    	Copyright 2018 Julian Lloyd.

    	Permission is hereby granted, free of charge, to any person obtaining a copy
    	of this software and associated documentation files (the "Software"), to deal
    	in the Software without restriction, including without limitation the rights
    	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    	copies of the Software, and to permit persons to whom the Software is
    	furnished to do so, subject to the following conditions:

    	The above copyright notice and this permission notice shall be included in
    	all copies or substantial portions of the Software.

    	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    	THE SOFTWARE.
    */
    /**
     * @module Rematrix
     */

    /**
     * Transformation matrices in the browser come in two flavors:
     *
     *  - `matrix` using 6 values (short)
     *  - `matrix3d` using 16 values (long)
     *
     * This utility follows this [conversion guide](https://goo.gl/EJlUQ1)
     * to expand short form matrices to their equivalent long form.
     *
     * @param  {array} source - Accepts both short and long form matrices.
     * @return {array}
     */
    function format(source) {
    	if (source.constructor !== Array) {
    		throw new TypeError('Expected array.')
    	}
    	if (source.length === 16) {
    		return source
    	}
    	if (source.length === 6) {
    		var matrix = identity$1();
    		matrix[0] = source[0];
    		matrix[1] = source[1];
    		matrix[4] = source[2];
    		matrix[5] = source[3];
    		matrix[12] = source[4];
    		matrix[13] = source[5];
    		return matrix
    	}
    	throw new RangeError('Expected array with either 6 or 16 values.')
    }

    /**
     * Returns a matrix representing no transformation. The product of any matrix
     * multiplied by the identity matrix will be the original matrix.
     *
     * > **Tip:** Similar to how `5 * 1 === 5`, where `1` is the identity.
     *
     * @return {array}
     */
    function identity$1() {
    	var matrix = [];
    	for (var i = 0; i < 16; i++) {
    		i % 5 == 0 ? matrix.push(1) : matrix.push(0);
    	}
    	return matrix
    }

    /**
     * Returns a 4x4 matrix describing the combined transformations
     * of both arguments.
     *
     * > **Note:** Order is very important. For example, rotating 45°
     * along the Z-axis, followed by translating 500 pixels along the
     * Y-axis... is not the same as translating 500 pixels along the
     * Y-axis, followed by rotating 45° along on the Z-axis.
     *
     * @param  {array} m - Accepts both short and long form matrices.
     * @param  {array} x - Accepts both short and long form matrices.
     * @return {array}
     */
    function multiply(m, x) {
    	var fm = format(m);
    	var fx = format(x);
    	var product = [];

    	for (var i = 0; i < 4; i++) {
    		var row = [fm[i], fm[i + 4], fm[i + 8], fm[i + 12]];
    		for (var j = 0; j < 4; j++) {
    			var k = j * 4;
    			var col = [fx[k], fx[k + 1], fx[k + 2], fx[k + 3]];
    			var result =
    				row[0] * col[0] + row[1] * col[1] + row[2] * col[2] + row[3] * col[3];

    			product[i + k] = result;
    		}
    	}

    	return product
    }

    /**
     * Attempts to return a 4x4 matrix describing the CSS transform
     * matrix passed in, but will return the identity matrix as a
     * fallback.
     *
     * > **Tip:** This method is used to convert a CSS matrix (retrieved as a
     * `string` from computed styles) to its equivalent array format.
     *
     * @param  {string} source - `matrix` or `matrix3d` CSS Transform value.
     * @return {array}
     */
    function parse(source) {
    	if (typeof source === 'string') {
    		var match = source.match(/matrix(3d)?\(([^)]+)\)/);
    		if (match) {
    			var raw = match[2].split(', ').map(parseFloat);
    			return format(raw)
    		}
    	}
    	return identity$1()
    }

    /**
     * Returns a 4x4 matrix describing X-axis rotation.
     *
     * @param  {number} angle - Measured in degrees.
     * @return {array}
     */
    function rotateX(angle) {
    	var theta = Math.PI / 180 * angle;
    	var matrix = identity$1();

    	matrix[5] = matrix[10] = Math.cos(theta);
    	matrix[6] = matrix[9] = Math.sin(theta);
    	matrix[9] *= -1;

    	return matrix
    }

    /**
     * Returns a 4x4 matrix describing Y-axis rotation.
     *
     * @param  {number} angle - Measured in degrees.
     * @return {array}
     */
    function rotateY(angle) {
    	var theta = Math.PI / 180 * angle;
    	var matrix = identity$1();

    	matrix[0] = matrix[10] = Math.cos(theta);
    	matrix[2] = matrix[8] = Math.sin(theta);
    	matrix[2] *= -1;

    	return matrix
    }

    /**
     * Returns a 4x4 matrix describing Z-axis rotation.
     *
     * @param  {number} angle - Measured in degrees.
     * @return {array}
     */
    function rotateZ(angle) {
    	var theta = Math.PI / 180 * angle;
    	var matrix = identity$1();

    	matrix[0] = matrix[5] = Math.cos(theta);
    	matrix[1] = matrix[4] = Math.sin(theta);
    	matrix[4] *= -1;

    	return matrix
    }

    /**
     * Returns a 4x4 matrix describing 2D scaling. The first argument
     * is used for both X and Y-axis scaling, unless an optional
     * second argument is provided to explicitly define Y-axis scaling.
     *
     * @param  {number} scalar    - Decimal multiplier.
     * @param  {number} [scalarY] - Decimal multiplier.
     * @return {array}
     */
    function scale(scalar, scalarY) {
    	var matrix = identity$1();

    	matrix[0] = scalar;
    	matrix[5] = typeof scalarY === 'number' ? scalarY : scalar;

    	return matrix
    }

    /**
     * Returns a 4x4 matrix describing X-axis translation.
     *
     * @param  {number} distance - Measured in pixels.
     * @return {array}
     */
    function translateX(distance) {
    	var matrix = identity$1();
    	matrix[12] = distance;
    	return matrix
    }

    /**
     * Returns a 4x4 matrix describing Y-axis translation.
     *
     * @param  {number} distance - Measured in pixels.
     * @return {array}
     */
    function translateY(distance) {
    	var matrix = identity$1();
    	matrix[13] = distance;
    	return matrix
    }

    /*! @license miniraf v1.0.0

    	Copyright 2018 Fisssion LLC.

    	Permission is hereby granted, free of charge, to any person obtaining a copy
    	of this software and associated documentation files (the "Software"), to deal
    	in the Software without restriction, including without limitation the rights
    	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    	copies of the Software, and to permit persons to whom the Software is
    	furnished to do so, subject to the following conditions:

    	The above copyright notice and this permission notice shall be included in all
    	copies or substantial portions of the Software.

    	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    	SOFTWARE.

    */
    var polyfill = (function () {
    	var clock = Date.now();

    	return function (callback) {
    		var currentTime = Date.now();
    		if (currentTime - clock > 16) {
    			clock = currentTime;
    			callback(currentTime);
    		} else {
    			setTimeout(function () { return polyfill(callback); }, 0);
    		}
    	}
    })();

    var index = window.requestAnimationFrame ||
    	window.webkitRequestAnimationFrame ||
    	window.mozRequestAnimationFrame ||
    	polyfill;

    /*! @license ScrollReveal v4.0.7

    	Copyright 2020 Fisssion LLC.

    	Licensed under the GNU General Public License 3.0 for
    	compatible open source projects and non-commercial use.

    	For commercial sites, themes, projects, and applications,
    	keep your source code private/proprietary by purchasing
    	a commercial license from https://scrollrevealjs.org/
    */

    var defaults = {
    	delay: 0,
    	distance: '0',
    	duration: 600,
    	easing: 'cubic-bezier(0.5, 0, 0, 1)',
    	interval: 0,
    	opacity: 0,
    	origin: 'bottom',
    	rotate: {
    		x: 0,
    		y: 0,
    		z: 0
    	},
    	scale: 1,
    	cleanup: false,
    	container: document.documentElement,
    	desktop: true,
    	mobile: true,
    	reset: false,
    	useDelay: 'always',
    	viewFactor: 0.0,
    	viewOffset: {
    		top: 0,
    		right: 0,
    		bottom: 0,
    		left: 0
    	},
    	afterReset: function afterReset() {},
    	afterReveal: function afterReveal() {},
    	beforeReset: function beforeReset() {},
    	beforeReveal: function beforeReveal() {}
    };

    function failure() {
    	document.documentElement.classList.remove('sr');

    	return {
    		clean: function clean() {},
    		destroy: function destroy() {},
    		reveal: function reveal() {},
    		sync: function sync() {},
    		get noop() {
    			return true
    		}
    	}
    }

    function success() {
    	document.documentElement.classList.add('sr');

    	if (document.body) {
    		document.body.style.height = '100%';
    	} else {
    		document.addEventListener('DOMContentLoaded', function () {
    			document.body.style.height = '100%';
    		});
    	}
    }

    var mount = { success: success, failure: failure };

    function isObject(x) {
    	return (
    		x !== null &&
    		x instanceof Object &&
    		(x.constructor === Object ||
    			Object.prototype.toString.call(x) === '[object Object]')
    	)
    }

    function each(collection, callback) {
    	if (isObject(collection)) {
    		var keys = Object.keys(collection);
    		return keys.forEach(function (key) { return callback(collection[key], key, collection); })
    	}
    	if (collection instanceof Array) {
    		return collection.forEach(function (item, i) { return callback(item, i, collection); })
    	}
    	throw new TypeError('Expected either an array or object literal.')
    }

    function logger(message) {
    	var details = [], len = arguments.length - 1;
    	while ( len-- > 0 ) details[ len ] = arguments[ len + 1 ];

    	if (this.constructor.debug && console) {
    		var report = "%cScrollReveal: " + message;
    		details.forEach(function (detail) { return (report += "\n — " + detail); });
    		console.log(report, 'color: #ea654b;'); // eslint-disable-line no-console
    	}
    }

    function rinse() {
    	var this$1 = this;

    	var struct = function () { return ({
    		active: [],
    		stale: []
    	}); };

    	var elementIds = struct();
    	var sequenceIds = struct();
    	var containerIds = struct();

    	/**
    	 * Take stock of active element IDs.
    	 */
    	try {
    		each(tealight('[data-sr-id]'), function (node) {
    			var id = parseInt(node.getAttribute('data-sr-id'));
    			elementIds.active.push(id);
    		});
    	} catch (e) {
    		throw e
    	}
    	/**
    	 * Destroy stale elements.
    	 */
    	each(this.store.elements, function (element) {
    		if (elementIds.active.indexOf(element.id) === -1) {
    			elementIds.stale.push(element.id);
    		}
    	});

    	each(elementIds.stale, function (staleId) { return delete this$1.store.elements[staleId]; });

    	/**
    	 * Take stock of active container and sequence IDs.
    	 */
    	each(this.store.elements, function (element) {
    		if (containerIds.active.indexOf(element.containerId) === -1) {
    			containerIds.active.push(element.containerId);
    		}
    		if (element.hasOwnProperty('sequence')) {
    			if (sequenceIds.active.indexOf(element.sequence.id) === -1) {
    				sequenceIds.active.push(element.sequence.id);
    			}
    		}
    	});

    	/**
    	 * Destroy stale containers.
    	 */
    	each(this.store.containers, function (container) {
    		if (containerIds.active.indexOf(container.id) === -1) {
    			containerIds.stale.push(container.id);
    		}
    	});

    	each(containerIds.stale, function (staleId) {
    		var stale = this$1.store.containers[staleId].node;
    		stale.removeEventListener('scroll', this$1.delegate);
    		stale.removeEventListener('resize', this$1.delegate);
    		delete this$1.store.containers[staleId];
    	});

    	/**
    	 * Destroy stale sequences.
    	 */
    	each(this.store.sequences, function (sequence) {
    		if (sequenceIds.active.indexOf(sequence.id) === -1) {
    			sequenceIds.stale.push(sequence.id);
    		}
    	});

    	each(sequenceIds.stale, function (staleId) { return delete this$1.store.sequences[staleId]; });
    }

    function clean(target) {
    	var this$1 = this;

    	var dirty;
    	try {
    		each(tealight(target), function (node) {
    			var id = node.getAttribute('data-sr-id');
    			if (id !== null) {
    				dirty = true;
    				var element = this$1.store.elements[id];
    				if (element.callbackTimer) {
    					window.clearTimeout(element.callbackTimer.clock);
    				}
    				node.setAttribute('style', element.styles.inline.generated);
    				node.removeAttribute('data-sr-id');
    				delete this$1.store.elements[id];
    			}
    		});
    	} catch (e) {
    		return logger.call(this, 'Clean failed.', e.message)
    	}

    	if (dirty) {
    		try {
    			rinse.call(this);
    		} catch (e) {
    			return logger.call(this, 'Clean failed.', e.message)
    		}
    	}
    }

    function destroy() {
    	var this$1 = this;

    	/**
    	 * Remove all generated styles and element ids
    	 */
    	each(this.store.elements, function (element) {
    		element.node.setAttribute('style', element.styles.inline.generated);
    		element.node.removeAttribute('data-sr-id');
    	});

    	/**
    	 * Remove all event listeners.
    	 */
    	each(this.store.containers, function (container) {
    		var target =
    			container.node === document.documentElement ? window : container.node;
    		target.removeEventListener('scroll', this$1.delegate);
    		target.removeEventListener('resize', this$1.delegate);
    	});

    	/**
    	 * Clear all data from the store
    	 */
    	this.store = {
    		containers: {},
    		elements: {},
    		history: [],
    		sequences: {}
    	};
    }

    var getPrefixedCssProp = (function () {
    	var properties = {};
    	var style = document.documentElement.style;

    	function getPrefixedCssProperty(name, source) {
    		if ( source === void 0 ) source = style;

    		if (name && typeof name === 'string') {
    			if (properties[name]) {
    				return properties[name]
    			}
    			if (typeof source[name] === 'string') {
    				return (properties[name] = name)
    			}
    			if (typeof source[("-webkit-" + name)] === 'string') {
    				return (properties[name] = "-webkit-" + name)
    			}
    			throw new RangeError(("Unable to find \"" + name + "\" style property."))
    		}
    		throw new TypeError('Expected a string.')
    	}

    	getPrefixedCssProperty.clearCache = function () { return (properties = {}); };

    	return getPrefixedCssProperty
    })();

    function style(element) {
    	var computed = window.getComputedStyle(element.node);
    	var position = computed.position;
    	var config = element.config;

    	/**
    	 * Generate inline styles
    	 */
    	var inline = {};
    	var inlineStyle = element.node.getAttribute('style') || '';
    	var inlineMatch = inlineStyle.match(/[\w-]+\s*:\s*[^;]+\s*/gi) || [];

    	inline.computed = inlineMatch ? inlineMatch.map(function (m) { return m.trim(); }).join('; ') + ';' : '';

    	inline.generated = inlineMatch.some(function (m) { return m.match(/visibility\s?:\s?visible/i); })
    		? inline.computed
    		: inlineMatch.concat( ['visibility: visible']).map(function (m) { return m.trim(); }).join('; ') + ';';

    	/**
    	 * Generate opacity styles
    	 */
    	var computedOpacity = parseFloat(computed.opacity);
    	var configOpacity = !isNaN(parseFloat(config.opacity))
    		? parseFloat(config.opacity)
    		: parseFloat(computed.opacity);

    	var opacity = {
    		computed: computedOpacity !== configOpacity ? ("opacity: " + computedOpacity + ";") : '',
    		generated: computedOpacity !== configOpacity ? ("opacity: " + configOpacity + ";") : ''
    	};

    	/**
    	 * Generate transformation styles
    	 */
    	var transformations = [];

    	if (parseFloat(config.distance)) {
    		var axis = config.origin === 'top' || config.origin === 'bottom' ? 'Y' : 'X';

    		/**
    		 * Let’s make sure our our pixel distances are negative for top and left.
    		 * e.g. { origin: 'top', distance: '25px' } starts at `top: -25px` in CSS.
    		 */
    		var distance = config.distance;
    		if (config.origin === 'top' || config.origin === 'left') {
    			distance = /^-/.test(distance) ? distance.substr(1) : ("-" + distance);
    		}

    		var ref = distance.match(/(^-?\d+\.?\d?)|(em$|px$|%$)/g);
    		var value = ref[0];
    		var unit = ref[1];

    		switch (unit) {
    			case 'em':
    				distance = parseInt(computed.fontSize) * value;
    				break
    			case 'px':
    				distance = value;
    				break
    			case '%':
    				/**
    				 * Here we use `getBoundingClientRect` instead of
    				 * the existing data attached to `element.geometry`
    				 * because only the former includes any transformations
    				 * current applied to the element.
    				 *
    				 * If that behavior ends up being unintuitive, this
    				 * logic could instead utilize `element.geometry.height`
    				 * and `element.geoemetry.width` for the distance calculation
    				 */
    				distance =
    					axis === 'Y'
    						? (element.node.getBoundingClientRect().height * value) / 100
    						: (element.node.getBoundingClientRect().width * value) / 100;
    				break
    			default:
    				throw new RangeError('Unrecognized or missing distance unit.')
    		}

    		if (axis === 'Y') {
    			transformations.push(translateY(distance));
    		} else {
    			transformations.push(translateX(distance));
    		}
    	}

    	if (config.rotate.x) { transformations.push(rotateX(config.rotate.x)); }
    	if (config.rotate.y) { transformations.push(rotateY(config.rotate.y)); }
    	if (config.rotate.z) { transformations.push(rotateZ(config.rotate.z)); }
    	if (config.scale !== 1) {
    		if (config.scale === 0) {
    			/**
    			 * The CSS Transforms matrix interpolation specification
    			 * basically disallows transitions of non-invertible
    			 * matrixes, which means browsers won't transition
    			 * elements with zero scale.
    			 *
    			 * That’s inconvenient for the API and developer
    			 * experience, so we simply nudge their value
    			 * slightly above zero; this allows browsers
    			 * to transition our element as expected.
    			 *
    			 * `0.0002` was the smallest number
    			 * that performed across browsers.
    			 */
    			transformations.push(scale(0.0002));
    		} else {
    			transformations.push(scale(config.scale));
    		}
    	}

    	var transform = {};
    	if (transformations.length) {
    		transform.property = getPrefixedCssProp('transform');
    		/**
    		 * The default computed transform value should be one of:
    		 * undefined || 'none' || 'matrix()' || 'matrix3d()'
    		 */
    		transform.computed = {
    			raw: computed[transform.property],
    			matrix: parse(computed[transform.property])
    		};

    		transformations.unshift(transform.computed.matrix);
    		var product = transformations.reduce(multiply);

    		transform.generated = {
    			initial: ((transform.property) + ": matrix3d(" + (product.join(', ')) + ");"),
    			final: ((transform.property) + ": matrix3d(" + (transform.computed.matrix.join(', ')) + ");")
    		};
    	} else {
    		transform.generated = {
    			initial: '',
    			final: ''
    		};
    	}

    	/**
    	 * Generate transition styles
    	 */
    	var transition = {};
    	if (opacity.generated || transform.generated.initial) {
    		transition.property = getPrefixedCssProp('transition');
    		transition.computed = computed[transition.property];
    		transition.fragments = [];

    		var delay = config.delay;
    		var duration = config.duration;
    		var easing = config.easing;

    		if (opacity.generated) {
    			transition.fragments.push({
    				delayed: ("opacity " + (duration / 1000) + "s " + easing + " " + (delay / 1000) + "s"),
    				instant: ("opacity " + (duration / 1000) + "s " + easing + " 0s")
    			});
    		}

    		if (transform.generated.initial) {
    			transition.fragments.push({
    				delayed: ((transform.property) + " " + (duration / 1000) + "s " + easing + " " + (delay / 1000) + "s"),
    				instant: ((transform.property) + " " + (duration / 1000) + "s " + easing + " 0s")
    			});
    		}

    		/**
    		 * The default computed transition property should be undefined, or one of:
    		 * '' || 'none 0s ease 0s' || 'all 0s ease 0s' || 'all 0s 0s cubic-bezier()'
    		 */
    		var hasCustomTransition =
    			transition.computed && !transition.computed.match(/all 0s|none 0s/);

    		if (hasCustomTransition) {
    			transition.fragments.unshift({
    				delayed: transition.computed,
    				instant: transition.computed
    			});
    		}

    		var composed = transition.fragments.reduce(
    			function (composition, fragment, i) {
    				composition.delayed += i === 0 ? fragment.delayed : (", " + (fragment.delayed));
    				composition.instant += i === 0 ? fragment.instant : (", " + (fragment.instant));
    				return composition
    			},
    			{
    				delayed: '',
    				instant: ''
    			}
    		);

    		transition.generated = {
    			delayed: ((transition.property) + ": " + (composed.delayed) + ";"),
    			instant: ((transition.property) + ": " + (composed.instant) + ";")
    		};
    	} else {
    		transition.generated = {
    			delayed: '',
    			instant: ''
    		};
    	}

    	return {
    		inline: inline,
    		opacity: opacity,
    		position: position,
    		transform: transform,
    		transition: transition
    	}
    }

    function animate(element, force) {
    	if ( force === void 0 ) force = {};

    	var pristine = force.pristine || this.pristine;
    	var delayed =
    		element.config.useDelay === 'always' ||
    		(element.config.useDelay === 'onload' && pristine) ||
    		(element.config.useDelay === 'once' && !element.seen);

    	var shouldReveal = element.visible && !element.revealed;
    	var shouldReset = !element.visible && element.revealed && element.config.reset;

    	if (force.reveal || shouldReveal) {
    		return triggerReveal.call(this, element, delayed)
    	}

    	if (force.reset || shouldReset) {
    		return triggerReset.call(this, element)
    	}
    }

    function triggerReveal(element, delayed) {
    	var styles = [
    		element.styles.inline.generated,
    		element.styles.opacity.computed,
    		element.styles.transform.generated.final
    	];
    	if (delayed) {
    		styles.push(element.styles.transition.generated.delayed);
    	} else {
    		styles.push(element.styles.transition.generated.instant);
    	}
    	element.revealed = element.seen = true;
    	element.node.setAttribute('style', styles.filter(function (s) { return s !== ''; }).join(' '));
    	registerCallbacks.call(this, element, delayed);
    }

    function triggerReset(element) {
    	var styles = [
    		element.styles.inline.generated,
    		element.styles.opacity.generated,
    		element.styles.transform.generated.initial,
    		element.styles.transition.generated.instant
    	];
    	element.revealed = false;
    	element.node.setAttribute('style', styles.filter(function (s) { return s !== ''; }).join(' '));
    	registerCallbacks.call(this, element);
    }

    function registerCallbacks(element, isDelayed) {
    	var this$1 = this;

    	var duration = isDelayed
    		? element.config.duration + element.config.delay
    		: element.config.duration;

    	var beforeCallback = element.revealed
    		? element.config.beforeReveal
    		: element.config.beforeReset;

    	var afterCallback = element.revealed
    		? element.config.afterReveal
    		: element.config.afterReset;

    	var elapsed = 0;
    	if (element.callbackTimer) {
    		elapsed = Date.now() - element.callbackTimer.start;
    		window.clearTimeout(element.callbackTimer.clock);
    	}

    	beforeCallback(element.node);

    	element.callbackTimer = {
    		start: Date.now(),
    		clock: window.setTimeout(function () {
    			afterCallback(element.node);
    			element.callbackTimer = null;
    			if (element.revealed && !element.config.reset && element.config.cleanup) {
    				clean.call(this$1, element.node);
    			}
    		}, duration - elapsed)
    	};
    }

    var nextUniqueId = (function () {
    	var uid = 0;
    	return function () { return uid++; }
    })();

    function sequence(element, pristine) {
    	if ( pristine === void 0 ) pristine = this.pristine;

    	/**
    	 * We first check if the element should reset.
    	 */
    	if (!element.visible && element.revealed && element.config.reset) {
    		return animate.call(this, element, { reset: true })
    	}

    	var seq = this.store.sequences[element.sequence.id];
    	var i = element.sequence.index;

    	if (seq) {
    		var visible = new SequenceModel(seq, 'visible', this.store);
    		var revealed = new SequenceModel(seq, 'revealed', this.store);

    		seq.models = { visible: visible, revealed: revealed };

    		/**
    		 * If the sequence has no revealed members,
    		 * then we reveal the first visible element
    		 * within that sequence.
    		 *
    		 * The sequence then cues a recursive call
    		 * in both directions.
    		 */
    		if (!revealed.body.length) {
    			var nextId = seq.members[visible.body[0]];
    			var nextElement = this.store.elements[nextId];

    			if (nextElement) {
    				cue.call(this, seq, visible.body[0], -1, pristine);
    				cue.call(this, seq, visible.body[0], +1, pristine);
    				return animate.call(this, nextElement, { reveal: true, pristine: pristine })
    			}
    		}

    		/**
    		 * If our element isn’t resetting, we check the
    		 * element sequence index against the head, and
    		 * then the foot of the sequence.
    		 */
    		if (
    			!seq.blocked.head &&
    			i === [].concat( revealed.head ).pop() &&
    			i >= [].concat( visible.body ).shift()
    		) {
    			cue.call(this, seq, i, -1, pristine);
    			return animate.call(this, element, { reveal: true, pristine: pristine })
    		}

    		if (
    			!seq.blocked.foot &&
    			i === [].concat( revealed.foot ).shift() &&
    			i <= [].concat( visible.body ).pop()
    		) {
    			cue.call(this, seq, i, +1, pristine);
    			return animate.call(this, element, { reveal: true, pristine: pristine })
    		}
    	}
    }

    function Sequence(interval) {
    	var i = Math.abs(interval);
    	if (!isNaN(i)) {
    		this.id = nextUniqueId();
    		this.interval = Math.max(i, 16);
    		this.members = [];
    		this.models = {};
    		this.blocked = {
    			head: false,
    			foot: false
    		};
    	} else {
    		throw new RangeError('Invalid sequence interval.')
    	}
    }

    function SequenceModel(seq, prop, store) {
    	var this$1 = this;

    	this.head = [];
    	this.body = [];
    	this.foot = [];

    	each(seq.members, function (id, index) {
    		var element = store.elements[id];
    		if (element && element[prop]) {
    			this$1.body.push(index);
    		}
    	});

    	if (this.body.length) {
    		each(seq.members, function (id, index) {
    			var element = store.elements[id];
    			if (element && !element[prop]) {
    				if (index < this$1.body[0]) {
    					this$1.head.push(index);
    				} else {
    					this$1.foot.push(index);
    				}
    			}
    		});
    	}
    }

    function cue(seq, i, direction, pristine) {
    	var this$1 = this;

    	var blocked = ['head', null, 'foot'][1 + direction];
    	var nextId = seq.members[i + direction];
    	var nextElement = this.store.elements[nextId];

    	seq.blocked[blocked] = true;

    	setTimeout(function () {
    		seq.blocked[blocked] = false;
    		if (nextElement) {
    			sequence.call(this$1, nextElement, pristine);
    		}
    	}, seq.interval);
    }

    function initialize() {
    	var this$1 = this;

    	rinse.call(this);

    	each(this.store.elements, function (element) {
    		var styles = [element.styles.inline.generated];

    		if (element.visible) {
    			styles.push(element.styles.opacity.computed);
    			styles.push(element.styles.transform.generated.final);
    			element.revealed = true;
    		} else {
    			styles.push(element.styles.opacity.generated);
    			styles.push(element.styles.transform.generated.initial);
    			element.revealed = false;
    		}

    		element.node.setAttribute('style', styles.filter(function (s) { return s !== ''; }).join(' '));
    	});

    	each(this.store.containers, function (container) {
    		var target =
    			container.node === document.documentElement ? window : container.node;
    		target.addEventListener('scroll', this$1.delegate);
    		target.addEventListener('resize', this$1.delegate);
    	});

    	/**
    	 * Manually invoke delegate once to capture
    	 * element and container dimensions, container
    	 * scroll position, and trigger any valid reveals
    	 */
    	this.delegate();

    	/**
    	 * Wipe any existing `setTimeout` now
    	 * that initialization has completed.
    	 */
    	this.initTimeout = null;
    }

    function isMobile(agent) {
    	if ( agent === void 0 ) agent = navigator.userAgent;

    	return /Android|iPhone|iPad|iPod/i.test(agent)
    }

    function deepAssign(target) {
    	var sources = [], len = arguments.length - 1;
    	while ( len-- > 0 ) sources[ len ] = arguments[ len + 1 ];

    	if (isObject(target)) {
    		each(sources, function (source) {
    			each(source, function (data, key) {
    				if (isObject(data)) {
    					if (!target[key] || !isObject(target[key])) {
    						target[key] = {};
    					}
    					deepAssign(target[key], data);
    				} else {
    					target[key] = data;
    				}
    			});
    		});
    		return target
    	} else {
    		throw new TypeError('Target must be an object literal.')
    	}
    }

    function reveal(target, options, syncing) {
    	var this$1 = this;
    	if ( options === void 0 ) options = {};
    	if ( syncing === void 0 ) syncing = false;

    	var containerBuffer = [];
    	var sequence$$1;
    	var interval = options.interval || defaults.interval;

    	try {
    		if (interval) {
    			sequence$$1 = new Sequence(interval);
    		}

    		var nodes = tealight(target);
    		if (!nodes.length) {
    			throw new Error('Invalid reveal target.')
    		}

    		var elements = nodes.reduce(function (elementBuffer, elementNode) {
    			var element = {};
    			var existingId = elementNode.getAttribute('data-sr-id');

    			if (existingId) {
    				deepAssign(element, this$1.store.elements[existingId]);

    				/**
    				 * In order to prevent previously generated styles
    				 * from throwing off the new styles, the style tag
    				 * has to be reverted to its pre-reveal state.
    				 */
    				element.node.setAttribute('style', element.styles.inline.computed);
    			} else {
    				element.id = nextUniqueId();
    				element.node = elementNode;
    				element.seen = false;
    				element.revealed = false;
    				element.visible = false;
    			}

    			var config = deepAssign({}, element.config || this$1.defaults, options);

    			if ((!config.mobile && isMobile()) || (!config.desktop && !isMobile())) {
    				if (existingId) {
    					clean.call(this$1, element);
    				}
    				return elementBuffer // skip elements that are disabled
    			}

    			var containerNode = tealight(config.container)[0];
    			if (!containerNode) {
    				throw new Error('Invalid container.')
    			}
    			if (!containerNode.contains(elementNode)) {
    				return elementBuffer // skip elements found outside the container
    			}

    			var containerId;
    			{
    				containerId = getContainerId(
    					containerNode,
    					containerBuffer,
    					this$1.store.containers
    				);
    				if (containerId === null) {
    					containerId = nextUniqueId();
    					containerBuffer.push({ id: containerId, node: containerNode });
    				}
    			}

    			element.config = config;
    			element.containerId = containerId;
    			element.styles = style(element);

    			if (sequence$$1) {
    				element.sequence = {
    					id: sequence$$1.id,
    					index: sequence$$1.members.length
    				};
    				sequence$$1.members.push(element.id);
    			}

    			elementBuffer.push(element);
    			return elementBuffer
    		}, []);

    		/**
    		 * Modifying the DOM via setAttribute needs to be handled
    		 * separately from reading computed styles in the map above
    		 * for the browser to batch DOM changes (limiting reflows)
    		 */
    		each(elements, function (element) {
    			this$1.store.elements[element.id] = element;
    			element.node.setAttribute('data-sr-id', element.id);
    		});
    	} catch (e) {
    		return logger.call(this, 'Reveal failed.', e.message)
    	}

    	/**
    	 * Now that element set-up is complete...
    	 * Let’s commit any container and sequence data we have to the store.
    	 */
    	each(containerBuffer, function (container) {
    		this$1.store.containers[container.id] = {
    			id: container.id,
    			node: container.node
    		};
    	});
    	if (sequence$$1) {
    		this.store.sequences[sequence$$1.id] = sequence$$1;
    	}

    	/**
    	 * If reveal wasn't invoked by sync, we want to
    	 * make sure to add this call to the history.
    	 */
    	if (syncing !== true) {
    		this.store.history.push({ target: target, options: options });

    		/**
    		 * Push initialization to the event queue, giving
    		 * multiple reveal calls time to be interpreted.
    		 */
    		if (this.initTimeout) {
    			window.clearTimeout(this.initTimeout);
    		}
    		this.initTimeout = window.setTimeout(initialize.bind(this), 0);
    	}
    }

    function getContainerId(node) {
    	var collections = [], len = arguments.length - 1;
    	while ( len-- > 0 ) collections[ len ] = arguments[ len + 1 ];

    	var id = null;
    	each(collections, function (collection) {
    		each(collection, function (container) {
    			if (id === null && container.node === node) {
    				id = container.id;
    			}
    		});
    	});
    	return id
    }

    /**
     * Re-runs the reveal method for each record stored in history,
     * for capturing new content asynchronously loaded into the DOM.
     */
    function sync() {
    	var this$1 = this;

    	each(this.store.history, function (record) {
    		reveal.call(this$1, record.target, record.options, true);
    	});

    	initialize.call(this);
    }

    var polyfill$1 = function (x) { return (x > 0) - (x < 0) || +x; };
    var mathSign = Math.sign || polyfill$1;

    function getGeometry(target, isContainer) {
    	/**
    	 * We want to ignore padding and scrollbars for container elements.
    	 * More information here: https://goo.gl/vOZpbz
    	 */
    	var height = isContainer ? target.node.clientHeight : target.node.offsetHeight;
    	var width = isContainer ? target.node.clientWidth : target.node.offsetWidth;

    	var offsetTop = 0;
    	var offsetLeft = 0;
    	var node = target.node;

    	do {
    		if (!isNaN(node.offsetTop)) {
    			offsetTop += node.offsetTop;
    		}
    		if (!isNaN(node.offsetLeft)) {
    			offsetLeft += node.offsetLeft;
    		}
    		node = node.offsetParent;
    	} while (node)

    	return {
    		bounds: {
    			top: offsetTop,
    			right: offsetLeft + width,
    			bottom: offsetTop + height,
    			left: offsetLeft
    		},
    		height: height,
    		width: width
    	}
    }

    function getScrolled(container) {
    	var top, left;
    	if (container.node === document.documentElement) {
    		top = window.pageYOffset;
    		left = window.pageXOffset;
    	} else {
    		top = container.node.scrollTop;
    		left = container.node.scrollLeft;
    	}
    	return { top: top, left: left }
    }

    function isElementVisible(element) {
    	if ( element === void 0 ) element = {};

    	var container = this.store.containers[element.containerId];
    	if (!container) { return }

    	var viewFactor = Math.max(0, Math.min(1, element.config.viewFactor));
    	var viewOffset = element.config.viewOffset;

    	var elementBounds = {
    		top: element.geometry.bounds.top + element.geometry.height * viewFactor,
    		right: element.geometry.bounds.right - element.geometry.width * viewFactor,
    		bottom: element.geometry.bounds.bottom - element.geometry.height * viewFactor,
    		left: element.geometry.bounds.left + element.geometry.width * viewFactor
    	};

    	var containerBounds = {
    		top: container.geometry.bounds.top + container.scroll.top + viewOffset.top,
    		right: container.geometry.bounds.right + container.scroll.left - viewOffset.right,
    		bottom:
    			container.geometry.bounds.bottom + container.scroll.top - viewOffset.bottom,
    		left: container.geometry.bounds.left + container.scroll.left + viewOffset.left
    	};

    	return (
    		(elementBounds.top < containerBounds.bottom &&
    			elementBounds.right > containerBounds.left &&
    			elementBounds.bottom > containerBounds.top &&
    			elementBounds.left < containerBounds.right) ||
    		element.styles.position === 'fixed'
    	)
    }

    function delegate(
    	event,
    	elements
    ) {
    	var this$1 = this;
    	if ( event === void 0 ) event = { type: 'init' };
    	if ( elements === void 0 ) elements = this.store.elements;

    	index(function () {
    		var stale = event.type === 'init' || event.type === 'resize';

    		each(this$1.store.containers, function (container) {
    			if (stale) {
    				container.geometry = getGeometry.call(this$1, container, true);
    			}
    			var scroll = getScrolled.call(this$1, container);
    			if (container.scroll) {
    				container.direction = {
    					x: mathSign(scroll.left - container.scroll.left),
    					y: mathSign(scroll.top - container.scroll.top)
    				};
    			}
    			container.scroll = scroll;
    		});

    		/**
    		 * Due to how the sequencer is implemented, it’s
    		 * important that we update the state of all
    		 * elements, before any animation logic is
    		 * evaluated (in the second loop below).
    		 */
    		each(elements, function (element) {
    			if (stale || element.geometry === undefined) {
    				element.geometry = getGeometry.call(this$1, element);
    			}
    			element.visible = isElementVisible.call(this$1, element);
    		});

    		each(elements, function (element) {
    			if (element.sequence) {
    				sequence.call(this$1, element);
    			} else {
    				animate.call(this$1, element);
    			}
    		});

    		this$1.pristine = false;
    	});
    }

    function isTransformSupported() {
    	var style = document.documentElement.style;
    	return 'transform' in style || 'WebkitTransform' in style
    }

    function isTransitionSupported() {
    	var style = document.documentElement.style;
    	return 'transition' in style || 'WebkitTransition' in style
    }

    var version = "4.0.7";

    var boundDelegate;
    var boundDestroy;
    var boundReveal;
    var boundClean;
    var boundSync;
    var config;
    var debug;
    var instance$2;

    function ScrollReveal(options) {
    	if ( options === void 0 ) options = {};

    	var invokedWithoutNew =
    		typeof this === 'undefined' ||
    		Object.getPrototypeOf(this) !== ScrollReveal.prototype;

    	if (invokedWithoutNew) {
    		return new ScrollReveal(options)
    	}

    	if (!ScrollReveal.isSupported()) {
    		logger.call(this, 'Instantiation failed.', 'This browser is not supported.');
    		return mount.failure()
    	}

    	var buffer;
    	try {
    		buffer = config
    			? deepAssign({}, config, options)
    			: deepAssign({}, defaults, options);
    	} catch (e) {
    		logger.call(this, 'Invalid configuration.', e.message);
    		return mount.failure()
    	}

    	try {
    		var container = tealight(buffer.container)[0];
    		if (!container) {
    			throw new Error('Invalid container.')
    		}
    	} catch (e) {
    		logger.call(this, e.message);
    		return mount.failure()
    	}

    	config = buffer;

    	if ((!config.mobile && isMobile()) || (!config.desktop && !isMobile())) {
    		logger.call(
    			this,
    			'This device is disabled.',
    			("desktop: " + (config.desktop)),
    			("mobile: " + (config.mobile))
    		);
    		return mount.failure()
    	}

    	mount.success();

    	this.store = {
    		containers: {},
    		elements: {},
    		history: [],
    		sequences: {}
    	};

    	this.pristine = true;

    	boundDelegate = boundDelegate || delegate.bind(this);
    	boundDestroy = boundDestroy || destroy.bind(this);
    	boundReveal = boundReveal || reveal.bind(this);
    	boundClean = boundClean || clean.bind(this);
    	boundSync = boundSync || sync.bind(this);

    	Object.defineProperty(this, 'delegate', { get: function () { return boundDelegate; } });
    	Object.defineProperty(this, 'destroy', { get: function () { return boundDestroy; } });
    	Object.defineProperty(this, 'reveal', { get: function () { return boundReveal; } });
    	Object.defineProperty(this, 'clean', { get: function () { return boundClean; } });
    	Object.defineProperty(this, 'sync', { get: function () { return boundSync; } });

    	Object.defineProperty(this, 'defaults', { get: function () { return config; } });
    	Object.defineProperty(this, 'version', { get: function () { return version; } });
    	Object.defineProperty(this, 'noop', { get: function () { return false; } });

    	return instance$2 ? instance$2 : (instance$2 = this)
    }

    ScrollReveal.isSupported = function () { return isTransformSupported() && isTransitionSupported(); };

    Object.defineProperty(ScrollReveal, 'debug', {
    	get: function () { return debug || false; },
    	set: function (value) { return (debug = typeof value === 'boolean' ? value : debug); }
    });

    ScrollReveal();

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src\components\Home.svelte generated by Svelte v3.31.2 */
    const file = "src\\components\\Home.svelte";

    // (32:16) {#if (visible)}
    function create_if_block(ctx) {
    	let h1;
    	let t0;
    	let br;
    	let t1;
    	let span;
    	let h1_transition;
    	let t3;
    	let h2;
    	let h2_transition;
    	let current;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("Hello, ");
    			br = element("br");
    			t1 = text(" I'm ");
    			span = element("span");
    			span.textContent = "Adam.";
    			t3 = space();
    			h2 = element("h2");
    			h2.textContent = "Developer, Designer and Student";
    			add_location(br, file, 32, 115, 1031);
    			attr_dev(span, "class", "text-highlightblue");
    			add_location(span, file, 32, 124, 1040);
    			attr_dev(h1, "class", " invisible md:visible   text-5xl lg:text-7xl font-extrabold");
    			add_location(h1, file, 32, 20, 936);
    			attr_dev(h2, "class", "invisible md:visible text-xl lg:text-2xl");
    			add_location(h2, file, 33, 20, 1112);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t0);
    			append_dev(h1, br);
    			append_dev(h1, t1);
    			append_dev(h1, span);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h2, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!h1_transition) h1_transition = create_bidirectional_transition(h1, fade, {}, true);
    				h1_transition.run(1);
    			});

    			add_render_callback(() => {
    				if (!h2_transition) h2_transition = create_bidirectional_transition(h2, fade, { duration: 1000 }, true);
    				h2_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!h1_transition) h1_transition = create_bidirectional_transition(h1, fade, {}, false);
    			h1_transition.run(0);
    			if (!h2_transition) h2_transition = create_bidirectional_transition(h2, fade, { duration: 1000 }, false);
    			h2_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching && h1_transition) h1_transition.end();
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h2);
    			if (detaching && h2_transition) h2_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(32:16) {#if (visible)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let div5;
    	let div1;
    	let div0;
    	let t2;
    	let div4;
    	let img;
    	let img_src_value;
    	let t3;
    	let div3;
    	let div2;
    	let h10;
    	let t5;
    	let h11;
    	let t7;
    	let h12;
    	let t9;
    	let div8;
    	let div7;
    	let svg0;
    	let path0;
    	let t10;
    	let div6;
    	let h13;
    	let t12;
    	let div11;
    	let div10;
    	let svg1;
    	let path1;
    	let div9;
    	let h14;
    	let t14;
    	let h3;
    	let t16;
    	let div14;
    	let div13;
    	let svg2;
    	let path2;
    	let t17;
    	let div12;
    	let h15;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	modeswitcher = new ModeSwitcher({ $$inline: true });
    	let if_block = /*visible*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			create_component(modeswitcher.$$.fragment);
    			t1 = space();
    			main = element("main");
    			div5 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t2 = space();
    			div4 = element("div");
    			img = element("img");
    			t3 = space();
    			div3 = element("div");
    			div2 = element("div");
    			h10 = element("h1");
    			h10.textContent = "UI/UX";
    			t5 = space();
    			h11 = element("h1");
    			h11.textContent = "Development";
    			t7 = space();
    			h12 = element("h1");
    			h12.textContent = "Design";
    			t9 = space();
    			div8 = element("div");
    			div7 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t10 = space();
    			div6 = element("div");
    			h13 = element("h1");
    			h13.textContent = "Design";
    			t12 = space();
    			div11 = element("div");
    			div10 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			div9 = element("div");
    			h14 = element("h1");
    			h14.textContent = "Development";
    			t14 = space();
    			h3 = element("h3");
    			h3.textContent = "Full Stack";
    			t16 = space();
    			div14 = element("div");
    			div13 = element("div");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t17 = space();
    			div12 = element("div");
    			h15 = element("h1");
    			h15.textContent = "UI/UX";
    			attr_dev(div0, "class", "ml-auto my-auto order-2");
    			add_location(div0, file, 30, 12, 844);
    			attr_dev(div1, "class", " flex  pl-8 ");
    			add_location(div1, file, 29, 8, 804);
    			if (img.src !== (img_src_value = "images/Black.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "300px");
    			attr_dev(img, "height", "auto");
    			attr_dev(img, "class", "lreveal");
    			add_location(img, file, 39, 12, 1377);
    			attr_dev(h10, "class", "font-bold text-xl mx-2");
    			add_location(h10, file, 42, 24, 1622);
    			attr_dev(h11, "class", "font-bold text-xl mx-2");
    			add_location(h11, file, 43, 24, 1693);
    			attr_dev(h12, "class", "font-bold text-xl mx-2");
    			add_location(h12, file, 44, 24, 1770);
    			attr_dev(div2, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div2, file, 41, 16, 1536);
    			attr_dev(div3, "class", "flex flex-none lg:hidden  justify-center");
    			add_location(div3, file, 40, 12, 1463);
    			attr_dev(div4, "class", " items-center justify-center flex flex-col ");
    			add_location(div4, file, 38, 8, 1306);
    			attr_dev(div5, "class", "grid grid-cols-3 flex-1 pb-12");
    			add_location(div5, file, 28, 4, 751);
    			attr_dev(path0, "d", "M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z");
    			add_location(path0, file, 53, 142, 2206);
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "width", "36");
    			attr_dev(svg0, "height", "36");
    			attr_dev(svg0, "fill", "currentColor");
    			attr_dev(svg0, "class", "bi bi-pencil mx-4");
    			attr_dev(svg0, "viewBox", "0 0 16 16");
    			add_location(svg0, file, 53, 12, 2076);
    			attr_dev(h13, "class", "font-bold text-xl");
    			add_location(h13, file, 55, 16, 2692);
    			attr_dev(div6, "class", "flex flex-col mr-8 ");
    			add_location(div6, file, 54, 12, 2641);
    			attr_dev(div7, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div7, file, 52, 8, 2002);
    			attr_dev(div8, "class", "hidden lg:flex absolute pos1 shadow rounded-2xl backdrop-blur cc justify-center  svelte-wb4084");
    			add_location(div8, file, 51, 4, 1898);
    			attr_dev(path1, "stroke-linecap", "round");
    			attr_dev(path1, "stroke-linejoin", "round");
    			attr_dev(path1, "stroke-width", "1");
    			attr_dev(path1, "d", "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z");
    			add_location(path1, file, 62, 132, 3087);
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "stroke", "currentColor");
    			attr_dev(svg1, "width", "120");
    			attr_dev(svg1, "height", "120");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			add_location(svg1, file, 62, 12, 2967);
    			attr_dev(h14, "class", "font-bold text-xl");
    			add_location(h14, file, 63, 16, 3325);
    			attr_dev(h3, "class", "");
    			add_location(h3, file, 64, 16, 3389);
    			attr_dev(div9, "class", "flex flex-col mr-8 ");
    			add_location(div9, file, 62, 319, 3274);
    			attr_dev(div10, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div10, file, 61, 8, 2893);
    			attr_dev(div11, "class", "hidden lg:flex absolute pos2 shadow rounded-2xl backdrop-blur cc justify-center  svelte-wb4084");
    			add_location(div11, file, 60, 4, 2789);
    			attr_dev(path2, "d", "M2 10h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm9-9h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 9a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-3zm0-10a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-3zM2 9a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H2zm7 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3zM0 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5.354.854a.5.5 0 1 0-.708-.708L3 3.793l-.646-.647a.5.5 0 1 0-.708.708l1 1a.5.5 0 0 0 .708 0l2-2z");
    			add_location(path2, file, 72, 149, 3790);
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "width", "48");
    			attr_dev(svg2, "height", "48");
    			attr_dev(svg2, "fill", "currentColor");
    			attr_dev(svg2, "class", "bi bi-ui-checks-grid mx-4");
    			attr_dev(svg2, "viewBox", "0 0 16 16");
    			add_location(svg2, file, 72, 12, 3653);
    			attr_dev(h15, "class", "font-bold text-xl");
    			add_location(h15, file, 74, 16, 4463);
    			attr_dev(div12, "class", "flex flex-col mr-8 ");
    			add_location(div12, file, 73, 12, 4412);
    			attr_dev(div13, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div13, file, 71, 8, 3579);
    			attr_dev(div14, "class", "hidden lg:flex absolute pos3 shadow rounded-2xl backdrop-blur cc justify-center  svelte-wb4084");
    			add_location(div14, file, 70, 4, 3475);
    			attr_dev(main, "class", "h-screen flex flex-col text-bgblue");
    			add_location(main, file, 24, 0, 690);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modeswitcher, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div5);
    			append_dev(div5, div1);
    			append_dev(div1, div0);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div5, t2);
    			append_dev(div5, div4);
    			append_dev(div4, img);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, h10);
    			append_dev(div2, t5);
    			append_dev(div2, h11);
    			append_dev(div2, t7);
    			append_dev(div2, h12);
    			append_dev(main, t9);
    			append_dev(main, div8);
    			append_dev(div8, div7);
    			append_dev(div7, svg0);
    			append_dev(svg0, path0);
    			append_dev(div7, t10);
    			append_dev(div7, div6);
    			append_dev(div6, h13);
    			append_dev(main, t12);
    			append_dev(main, div11);
    			append_dev(div11, div10);
    			append_dev(div10, svg1);
    			append_dev(svg1, path1);
    			append_dev(div10, div9);
    			append_dev(div9, h14);
    			append_dev(div9, t14);
    			append_dev(div9, h3);
    			append_dev(main, t16);
    			append_dev(main, div14);
    			append_dev(div14, div13);
    			append_dev(div13, svg2);
    			append_dev(svg2, path2);
    			append_dev(div13, t17);
    			append_dev(div13, div12);
    			append_dev(div12, h15);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*visible*/ ctx[0]) {
    				if (if_block) {
    					if (dirty & /*visible*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(modeswitcher.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(modeswitcher.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modeswitcher, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	let visible = false;

    	onMount(() => {
    		$$invalidate(0, visible = true);

    		const logoreveal = ScrollReveal({
    			scale: 0.5,
    			opacity: 1,
    			duration: 750,
    			reset: true
    		});

    		logoreveal.reveal(".lreveal", {});
    		ScrollReveal().reveal(".pos1", { delay: 100 });
    		ScrollReveal().reveal(".pos2", { delay: 200 });
    		ScrollReveal().reveal(".pos3", { delay: 300 });
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ModeSwitcher,
    		Tailwindcss,
    		ScrollReveal,
    		onMount,
    		fade,
    		visible
    	});

    	$$self.$inject_state = $$props => {
    		if ("visible" in $$props) $$invalidate(0, visible = $$props.visible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [visible];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\About.svelte generated by Svelte v3.31.2 */
    const file$1 = "src\\components\\About.svelte";

    function create_fragment$3(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let div0;
    	let t2;
    	let div1;
    	let t3;
    	let div2;
    	let t4;
    	let div19;
    	let div4;
    	let div3;
    	let h10;
    	let t5;
    	let br;
    	let t6;
    	let t7;
    	let div18;
    	let div5;
    	let h11;
    	let t9;
    	let div9;
    	let div6;
    	let img0;
    	let img0_src_value;
    	let t10;
    	let h12;
    	let t12;
    	let div7;
    	let img1;
    	let img1_src_value;
    	let t13;
    	let h13;
    	let t15;
    	let div8;
    	let img2;
    	let img2_src_value;
    	let t16;
    	let h14;
    	let t18;
    	let div13;
    	let div10;
    	let img3;
    	let img3_src_value;
    	let t19;
    	let h15;
    	let t21;
    	let div11;
    	let img4;
    	let img4_src_value;
    	let t22;
    	let h16;
    	let t24;
    	let div12;
    	let img5;
    	let img5_src_value;
    	let t25;
    	let h17;
    	let t27;
    	let div17;
    	let div14;
    	let img6;
    	let img6_src_value;
    	let t28;
    	let h18;
    	let t30;
    	let div15;
    	let img7;
    	let img7_src_value;
    	let t31;
    	let h19;
    	let t33;
    	let div16;
    	let img8;
    	let img8_src_value;
    	let t34;
    	let h110;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	modeswitcher = new ModeSwitcher({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			create_component(modeswitcher.$$.fragment);
    			t1 = space();
    			main = element("main");
    			div0 = element("div");
    			t2 = space();
    			div1 = element("div");
    			t3 = space();
    			div2 = element("div");
    			t4 = space();
    			div19 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h10 = element("h1");
    			t5 = text("Here's what ");
    			br = element("br");
    			t6 = text("I can do.");
    			t7 = space();
    			div18 = element("div");
    			div5 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Here's what I can do.";
    			t9 = space();
    			div9 = element("div");
    			div6 = element("div");
    			img0 = element("img");
    			t10 = space();
    			h12 = element("h1");
    			h12.textContent = "Javascript";
    			t12 = space();
    			div7 = element("div");
    			img1 = element("img");
    			t13 = space();
    			h13 = element("h1");
    			h13.textContent = "HTML5";
    			t15 = space();
    			div8 = element("div");
    			img2 = element("img");
    			t16 = space();
    			h14 = element("h1");
    			h14.textContent = "Photoshop";
    			t18 = space();
    			div13 = element("div");
    			div10 = element("div");
    			img3 = element("img");
    			t19 = space();
    			h15 = element("h1");
    			h15.textContent = "Go";
    			t21 = space();
    			div11 = element("div");
    			img4 = element("img");
    			t22 = space();
    			h16 = element("h1");
    			h16.textContent = "Svelte";
    			t24 = space();
    			div12 = element("div");
    			img5 = element("img");
    			t25 = space();
    			h17 = element("h1");
    			h17.textContent = "XD";
    			t27 = space();
    			div17 = element("div");
    			div14 = element("div");
    			img6 = element("img");
    			t28 = space();
    			h18 = element("h1");
    			h18.textContent = "Tailwind";
    			t30 = space();
    			div15 = element("div");
    			img7 = element("img");
    			t31 = space();
    			h19 = element("h1");
    			h19.textContent = "Python";
    			t33 = space();
    			div16 = element("div");
    			img8 = element("img");
    			t34 = space();
    			h110 = element("h1");
    			h110.textContent = "Git";
    			attr_dev(div0, "class", "absolute h-72 w-72 pos1 text-gray-500  bg-blue-900 rounded-full blurred  svelte-kh19fo");
    			add_location(div0, file$1, 48, 4, 907);
    			attr_dev(div1, "class", "absolute h-96 w-96 pos2 text-gray-500  bg-green-200 opacity-30 rounded-full blurred   svelte-kh19fo");
    			add_location(div1, file$1, 50, 4, 1011);
    			attr_dev(div2, "class", "absolute h-96 w-96 pos3 text-gray-500  bg-purple-700 opacity-10  rounded-full blurred   svelte-kh19fo");
    			add_location(div2, file$1, 52, 4, 1128);
    			add_location(br, file$1, 58, 100, 1525);
    			attr_dev(h10, "class", "text-3xl md:text-5xl lg:text-7xl font-extrabold textreveal ");
    			add_location(h10, file$1, 58, 16, 1441);
    			attr_dev(div3, "class", "flex pl-8");
    			add_location(div3, file$1, 57, 12, 1400);
    			attr_dev(div4, "class", "hidden xl:flex flex-1 justify-center ");
    			add_location(div4, file$1, 56, 8, 1335);
    			attr_dev(h11, "class", "text-3xl md:text-5xl lg:text-7xl font-extrabold mb-5 textreveal");
    			add_location(h11, file$1, 64, 16, 1751);
    			attr_dev(div5, "class", "flex xl:hidden  flex-1 justify-center items-center  ");
    			add_location(div5, file$1, 63, 12, 1667);
    			if (img0.src !== (img0_src_value = "images/logos/js.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "height", "auto");
    			attr_dev(img0, "width", "56px");
    			attr_dev(img0, "class", "rounded-xl ml-2");
    			add_location(img0, file$1, 69, 20, 2075);
    			attr_dev(h12, "class", "font-bold text-xl ml-4");
    			add_location(h12, file$1, 70, 20, 2180);
    			attr_dev(div6, "class", " w-56 h-16 lg:w-64 lg:h-24     shadow rounded-xl backdrop-blur cc  flex items-center ml-4 my-4 boxreveal  svelte-kh19fo");
    			add_location(div6, file$1, 68, 16, 1934);
    			if (img1.src !== (img1_src_value = "images/logos/html5.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "height", "auto");
    			attr_dev(img1, "width", "56px");
    			attr_dev(img1, "class", "rounded-xl ml-2");
    			add_location(img1, file$1, 75, 24, 2416);
    			attr_dev(h13, "class", "font-bold text-xl ml-2");
    			add_location(h13, file$1, 76, 24, 2528);
    			attr_dev(div7, "class", " w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div7, file$1, 74, 16, 2276);
    			if (img2.src !== (img2_src_value = "images/logos/ps.webp")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "height", "auto");
    			attr_dev(img2, "width", "56px");
    			attr_dev(img2, "class", "rounded-xl ml-2");
    			add_location(img2, file$1, 80, 20, 2768);
    			attr_dev(h14, "class", "font-bold text-xl ml-2");
    			add_location(h14, file$1, 81, 20, 2874);
    			attr_dev(div8, "class", "hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div8, file$1, 79, 16, 2617);
    			attr_dev(div9, "class", "flex-row flex");
    			add_location(div9, file$1, 66, 12, 1887);
    			if (img3.src !== (img3_src_value = "images/logos/gopher.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "height", "auto");
    			attr_dev(img3, "width", "56px");
    			attr_dev(img3, "class", "rounded-xl ml-2");
    			add_location(img3, file$1, 89, 20, 3167);
    			attr_dev(h15, "class", "font-bold text-xl ml-4");
    			add_location(h15, file$1, 90, 20, 3276);
    			attr_dev(div10, "class", "w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div10, file$1, 88, 16, 3032);
    			if (img4.src !== (img4_src_value = "images/logos/svelte.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "height", "auto");
    			attr_dev(img4, "width", "56px");
    			attr_dev(img4, "class", "rounded-xl ml-2");
    			add_location(img4, file$1, 95, 20, 3499);
    			attr_dev(h16, "class", "font-bold text-xl ml-2");
    			add_location(h16, file$1, 96, 20, 3608);
    			attr_dev(div11, "class", "w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div11, file$1, 94, 16, 3364);
    			if (img5.src !== (img5_src_value = "images/logos/xd.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "height", "auto");
    			attr_dev(img5, "width", "56px");
    			attr_dev(img5, "class", "rounded-xl ml-2");
    			add_location(img5, file$1, 100, 20, 3849);
    			attr_dev(h17, "class", "font-bold text-xl ml-2");
    			add_location(h17, file$1, 101, 20, 3954);
    			attr_dev(div12, "class", "hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div12, file$1, 99, 16, 3698);
    			attr_dev(div13, "class", "flex-row flex");
    			add_location(div13, file$1, 86, 12, 2985);
    			if (img6.src !== (img6_src_value = "images/logos/tailwind.png")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "height", "auto");
    			attr_dev(img6, "width", "56px");
    			attr_dev(img6, "class", "rounded-xl ml-2");
    			add_location(img6, file$1, 109, 20, 4240);
    			attr_dev(h18, "class", "font-bold text-xl ml-4");
    			add_location(h18, file$1, 110, 20, 4351);
    			attr_dev(div14, "class", "w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div14, file$1, 108, 16, 4105);
    			if (img7.src !== (img7_src_value = "images/logos/python.png")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "height", "auto");
    			attr_dev(img7, "width", "56px");
    			attr_dev(img7, "class", "rounded-xl ml-2");
    			add_location(img7, file$1, 115, 20, 4581);
    			attr_dev(h19, "class", "font-bold text-xl ml-2");
    			add_location(h19, file$1, 116, 20, 4690);
    			attr_dev(div15, "class", "w-56 h-16 lg:w-64 lg:h-24  shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div15, file$1, 114, 16, 4445);
    			if (img8.src !== (img8_src_value = "images/logos/git.png")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "height", "auto");
    			attr_dev(img8, "width", "56px");
    			attr_dev(img8, "class", "rounded-xl ml-2");
    			add_location(img8, file$1, 120, 20, 4931);
    			attr_dev(h110, "class", "font-bold text-xl ml-2");
    			add_location(h110, file$1, 121, 20, 5037);
    			attr_dev(div16, "class", "hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center ml-2 my-4 boxreveal svelte-kh19fo");
    			add_location(div16, file$1, 119, 16, 4780);
    			attr_dev(div17, "class", "flex-row flex");
    			add_location(div17, file$1, 106, 12, 4058);
    			attr_dev(div18, "class", "flex-col flex flex-1 items-center justify-center");
    			add_location(div18, file$1, 62, 8, 1591);
    			attr_dev(div19, "class", " flex flex-1 flex-row min-h-full justify-around items-center z");
    			add_location(div19, file$1, 55, 4, 1249);
    			attr_dev(main, "class", "h-screen bg-bgblue flex-col text-whiteblue w-full h-full ");
    			add_location(main, file$1, 45, 0, 825);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modeswitcher, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(main, t2);
    			append_dev(main, div1);
    			append_dev(main, t3);
    			append_dev(main, div2);
    			append_dev(main, t4);
    			append_dev(main, div19);
    			append_dev(div19, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h10);
    			append_dev(h10, t5);
    			append_dev(h10, br);
    			append_dev(h10, t6);
    			append_dev(div19, t7);
    			append_dev(div19, div18);
    			append_dev(div18, div5);
    			append_dev(div5, h11);
    			append_dev(div18, t9);
    			append_dev(div18, div9);
    			append_dev(div9, div6);
    			append_dev(div6, img0);
    			append_dev(div6, t10);
    			append_dev(div6, h12);
    			append_dev(div9, t12);
    			append_dev(div9, div7);
    			append_dev(div7, img1);
    			append_dev(div7, t13);
    			append_dev(div7, h13);
    			append_dev(div9, t15);
    			append_dev(div9, div8);
    			append_dev(div8, img2);
    			append_dev(div8, t16);
    			append_dev(div8, h14);
    			append_dev(div18, t18);
    			append_dev(div18, div13);
    			append_dev(div13, div10);
    			append_dev(div10, img3);
    			append_dev(div10, t19);
    			append_dev(div10, h15);
    			append_dev(div13, t21);
    			append_dev(div13, div11);
    			append_dev(div11, img4);
    			append_dev(div11, t22);
    			append_dev(div11, h16);
    			append_dev(div13, t24);
    			append_dev(div13, div12);
    			append_dev(div12, img5);
    			append_dev(div12, t25);
    			append_dev(div12, h17);
    			append_dev(div18, t27);
    			append_dev(div18, div17);
    			append_dev(div17, div14);
    			append_dev(div14, img6);
    			append_dev(div14, t28);
    			append_dev(div14, h18);
    			append_dev(div17, t30);
    			append_dev(div17, div15);
    			append_dev(div15, img7);
    			append_dev(div15, t31);
    			append_dev(div15, h19);
    			append_dev(div17, t33);
    			append_dev(div17, div16);
    			append_dev(div16, img8);
    			append_dev(div16, t34);
    			append_dev(div16, h110);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(modeswitcher.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(modeswitcher.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modeswitcher, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	let visible = false;

    	onMount(() => {
    		visible = true;
    		const sr = ScrollReveal({ scale: 0.5, opacity: 0, reset: true });
    		sr.reveal(".textreveal");
    		sr.reveal(".boxreveal", { duration: 1000 });
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ModeSwitcher,
    		Tailwindcss,
    		ScrollReveal,
    		onMount,
    		fade,
    		visible
    	});

    	$$self.$inject_state = $$props => {
    		if ("visible" in $$props) visible = $$props.visible;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Recent.svelte generated by Svelte v3.31.2 */
    const file$2 = "src\\components\\Recent.svelte";

    function create_fragment$4(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let div0;
    	let h1;
    	let t3;
    	let div13;
    	let div4;
    	let div2;
    	let div1;
    	let a0;
    	let t5;
    	let h40;
    	let t7;
    	let div3;
    	let img0;
    	let img0_src_value;
    	let t8;
    	let div8;
    	let div6;
    	let div5;
    	let a1;
    	let t10;
    	let h41;
    	let t12;
    	let div7;
    	let img1;
    	let img1_src_value;
    	let t13;
    	let div12;
    	let div10;
    	let div9;
    	let a2;
    	let t15;
    	let h42;
    	let t16;
    	let br;
    	let t17;
    	let t18;
    	let div11;
    	let img2;
    	let img2_src_value;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	modeswitcher = new ModeSwitcher({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			create_component(modeswitcher.$$.fragment);
    			t1 = space();
    			main = element("main");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Recent Projects";
    			t3 = space();
    			div13 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "getmoney.com";
    			t5 = space();
    			h40 = element("h4");
    			h40.textContent = "Cryptocurrency platform";
    			t7 = space();
    			div3 = element("div");
    			img0 = element("img");
    			t8 = space();
    			div8 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			a1 = element("a");
    			a1.textContent = "miramar.qa";
    			t10 = space();
    			h41 = element("h4");
    			h41.textContent = "Architecture and Consulting platform for thousands of plans.";
    			t12 = space();
    			div7 = element("div");
    			img1 = element("img");
    			t13 = space();
    			div12 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			a2 = element("a");
    			a2.textContent = "codemetoafterlife.game";
    			t15 = space();
    			h42 = element("h4");
    			t16 = text("Frontend for Code Me To Afterlife, isometric pixel-art  programming   ");
    			br = element("br");
    			t17 = text("game,   for beginners and advanced coders.");
    			t18 = space();
    			div11 = element("div");
    			img2 = element("img");
    			attr_dev(h1, "class", "lreveal");
    			add_location(h1, file$2, 25, 4, 802);
    			attr_dev(div0, "class", "py-16 mb-12  text-bgblue font-extrabold text-4xl md:text-5xl lg:text-6xl flex justify-center items-center");
    			add_location(div0, file$2, 24, 4, 677);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "hover:text-white text-highlightblue font-bold text-4xl");
    			add_location(a0, file$2, 33, 16, 1147);
    			add_location(div1, file$2, 32, 16, 1124);
    			attr_dev(h40, "class", "text-bgblue text-xl");
    			add_location(h40, file$2, 35, 16, 1280);
    			attr_dev(div2, "class", "flex flex-col text-center justify-center  items-center  lg:items-baseline pb-8");
    			add_location(div2, file$2, 31, 12, 1014);
    			if (img0.src !== (img0_src_value = "images/crypto.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "width", "650px");
    			attr_dev(img0, "height", "auto");
    			attr_dev(img0, "class", "rounded-xl shadow-md");
    			add_location(img0, file$2, 38, 16, 1411);
    			attr_dev(div3, "class", "ml-12");
    			add_location(div3, file$2, 37, 12, 1374);
    			attr_dev(div4, "class", "grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox");
    			add_location(div4, file$2, 30, 8, 928);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "hover:text-white text-highlightblue font-bold text-4xl");
    			add_location(a1, file$2, 45, 16, 1765);
    			add_location(div5, file$2, 44, 16, 1742);
    			attr_dev(h41, "class", "text-bgblue text-xl");
    			add_location(h41, file$2, 47, 16, 1896);
    			attr_dev(div6, "class", "flex flex-col justify-center text-center  items-center  lg:items-baseline pb-8");
    			add_location(div6, file$2, 43, 12, 1632);
    			if (img1.src !== (img1_src_value = "images/miramar.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "width", "650px");
    			attr_dev(img1, "height", "auto");
    			attr_dev(img1, "class", "rounded-xl shadow-md");
    			add_location(img1, file$2, 50, 16, 2065);
    			attr_dev(div7, "class", "ml-12");
    			add_location(div7, file$2, 49, 12, 2027);
    			attr_dev(div8, "class", "grid grid-cols-1 lg:grid-cols-2 items-center py-12 gridbox ");
    			add_location(div8, file$2, 42, 8, 1545);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "hover:text-white text-highlightblue font-bold text-4xl");
    			add_location(a2, file$2, 57, 16, 2433);
    			add_location(div9, file$2, 56, 16, 2410);
    			add_location(br, file$2, 59, 127, 2687);
    			attr_dev(h42, "class", "text-bgblue text-xs text-xl ");
    			add_location(h42, file$2, 59, 16, 2576);
    			attr_dev(div10, "class", "flex flex-col justify-around  items-center  lg:items-baseline pb-8 text-center  lg:text-left");
    			add_location(div10, file$2, 55, 12, 2286);
    			if (img2.src !== (img2_src_value = "images/afterlife.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "width", "650px");
    			attr_dev(img2, "height", "auto");
    			attr_dev(img2, "class", "rounded-xl shadow-md");
    			add_location(img2, file$2, 62, 16, 2810);
    			attr_dev(div11, "class", "ml-12");
    			add_location(div11, file$2, 61, 12, 2772);
    			attr_dev(div12, "class", "grid grid-cols-1 lg:grid-cols-2 items-center py-12 gridbox");
    			add_location(div12, file$2, 54, 8, 2200);
    			attr_dev(div13, "class", "flex flex-1 flex-col items-center px-16 ");
    			add_location(div13, file$2, 28, 4, 862);
    			attr_dev(main, "class", " flex flex-grow flex-col justify-center  text-whiteblue  bg-gradient-to-tl to-lgrayblue from-white  ");
    			add_location(main, file$2, 22, 0, 554);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modeswitcher, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, h1);
    			append_dev(main, t3);
    			append_dev(main, div13);
    			append_dev(div13, div4);
    			append_dev(div4, div2);
    			append_dev(div2, div1);
    			append_dev(div1, a0);
    			append_dev(div2, t5);
    			append_dev(div2, h40);
    			append_dev(div4, t7);
    			append_dev(div4, div3);
    			append_dev(div3, img0);
    			append_dev(div13, t8);
    			append_dev(div13, div8);
    			append_dev(div8, div6);
    			append_dev(div6, div5);
    			append_dev(div5, a1);
    			append_dev(div6, t10);
    			append_dev(div6, h41);
    			append_dev(div8, t12);
    			append_dev(div8, div7);
    			append_dev(div7, img1);
    			append_dev(div13, t13);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div10, div9);
    			append_dev(div9, a2);
    			append_dev(div10, t15);
    			append_dev(div10, h42);
    			append_dev(h42, t16);
    			append_dev(h42, br);
    			append_dev(h42, t17);
    			append_dev(div12, t18);
    			append_dev(div12, div11);
    			append_dev(div11, img2);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(modeswitcher.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(modeswitcher.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modeswitcher, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Recent", slots, []);
    	let visible = false;

    	onMount(() => {
    		visible = true;

    		const proj = ScrollReveal({
    			scale: 0.8,
    			opacity: 0,
    			duration: 1000,
    			reset: false
    		});

    		ScrollReveal().reveal(".lreveal", {});
    		proj.reveal(".gridbox", { interval: 200 });
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Recent> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ModeSwitcher,
    		Tailwindcss,
    		ScrollReveal,
    		onMount,
    		visible
    	});

    	$$self.$inject_state = $$props => {
    		if ("visible" in $$props) visible = $$props.visible;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class Recent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Recent",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    function getUserAgent() {
        if (typeof navigator === "object" && "userAgent" in navigator) {
            return navigator.userAgent;
        }
        if (typeof process === "object" && "version" in process) {
            return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
        }
        return "<environment undetectable>";
    }

    var register_1 = register;

    function register (state, name, method, options) {
      if (typeof method !== 'function') {
        throw new Error('method for before hook must be a function')
      }

      if (!options) {
        options = {};
      }

      if (Array.isArray(name)) {
        return name.reverse().reduce(function (callback, name) {
          return register.bind(null, state, name, callback, options)
        }, method)()
      }

      return Promise.resolve()
        .then(function () {
          if (!state.registry[name]) {
            return method(options)
          }

          return (state.registry[name]).reduce(function (method, registered) {
            return registered.hook.bind(null, method, options)
          }, method)()
        })
    }

    var add = addHook;

    function addHook (state, kind, name, hook) {
      var orig = hook;
      if (!state.registry[name]) {
        state.registry[name] = [];
      }

      if (kind === 'before') {
        hook = function (method, options) {
          return Promise.resolve()
            .then(orig.bind(null, options))
            .then(method.bind(null, options))
        };
      }

      if (kind === 'after') {
        hook = function (method, options) {
          var result;
          return Promise.resolve()
            .then(method.bind(null, options))
            .then(function (result_) {
              result = result_;
              return orig(result, options)
            })
            .then(function () {
              return result
            })
        };
      }

      if (kind === 'error') {
        hook = function (method, options) {
          return Promise.resolve()
            .then(method.bind(null, options))
            .catch(function (error) {
              return orig(error, options)
            })
        };
      }

      state.registry[name].push({
        hook: hook,
        orig: orig
      });
    }

    var remove = removeHook;

    function removeHook (state, name, method) {
      if (!state.registry[name]) {
        return
      }

      var index = state.registry[name]
        .map(function (registered) { return registered.orig })
        .indexOf(method);

      if (index === -1) {
        return
      }

      state.registry[name].splice(index, 1);
    }

    // bind with array of arguments: https://stackoverflow.com/a/21792913
    var bind = Function.bind;
    var bindable = bind.bind(bind);

    function bindApi (hook, state, name) {
      var removeHookRef = bindable(remove, null).apply(null, name ? [state, name] : [state]);
      hook.api = { remove: removeHookRef };
      hook.remove = removeHookRef

      ;['before', 'error', 'after', 'wrap'].forEach(function (kind) {
        var args = name ? [state, kind, name] : [state, kind];
        hook[kind] = hook.api[kind] = bindable(add, null).apply(null, args);
      });
    }

    function HookSingular () {
      var singularHookName = 'h';
      var singularHookState = {
        registry: {}
      };
      var singularHook = register_1.bind(null, singularHookState, singularHookName);
      bindApi(singularHook, singularHookState, singularHookName);
      return singularHook
    }

    function HookCollection () {
      var state = {
        registry: {}
      };

      var hook = register_1.bind(null, state);
      bindApi(hook, state);

      return hook
    }

    var collectionHookDeprecationMessageDisplayed = false;
    function Hook () {
      if (!collectionHookDeprecationMessageDisplayed) {
        console.warn('[before-after-hook]: "Hook()" repurposing warning, use "Hook.Collection()". Read more: https://git.io/upgrade-before-after-hook-to-1.4');
        collectionHookDeprecationMessageDisplayed = true;
      }
      return HookCollection()
    }

    Hook.Singular = HookSingular.bind();
    Hook.Collection = HookCollection.bind();

    var beforeAfterHook = Hook;
    // expose constructors as a named property for TypeScript
    var Hook_1 = Hook;
    var Singular = Hook.Singular;
    var Collection = Hook.Collection;
    beforeAfterHook.Hook = Hook_1;
    beforeAfterHook.Singular = Singular;
    beforeAfterHook.Collection = Collection;

    /*!
     * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
     *
     * Copyright (c) 2014-2017, Jon Schlinkert.
     * Released under the MIT License.
     */

    function isObject$1(o) {
      return Object.prototype.toString.call(o) === '[object Object]';
    }

    function isPlainObject(o) {
      var ctor,prot;

      if (isObject$1(o) === false) return false;

      // If has modified constructor
      ctor = o.constructor;
      if (ctor === undefined) return true;

      // If has modified prototype
      prot = ctor.prototype;
      if (isObject$1(prot) === false) return false;

      // If constructor does not have an Object-specific method
      if (prot.hasOwnProperty('isPrototypeOf') === false) {
        return false;
      }

      // Most likely a plain Object
      return true;
    }

    function lowercaseKeys(object) {
        if (!object) {
            return {};
        }
        return Object.keys(object).reduce((newObj, key) => {
            newObj[key.toLowerCase()] = object[key];
            return newObj;
        }, {});
    }

    function mergeDeep(defaults, options) {
        const result = Object.assign({}, defaults);
        Object.keys(options).forEach((key) => {
            if (isPlainObject(options[key])) {
                if (!(key in defaults))
                    Object.assign(result, { [key]: options[key] });
                else
                    result[key] = mergeDeep(defaults[key], options[key]);
            }
            else {
                Object.assign(result, { [key]: options[key] });
            }
        });
        return result;
    }

    function removeUndefinedProperties(obj) {
        for (const key in obj) {
            if (obj[key] === undefined) {
                delete obj[key];
            }
        }
        return obj;
    }

    function merge(defaults, route, options) {
        if (typeof route === "string") {
            let [method, url] = route.split(" ");
            options = Object.assign(url ? { method, url } : { url: method }, options);
        }
        else {
            options = Object.assign({}, route);
        }
        // lowercase header names before merging with defaults to avoid duplicates
        options.headers = lowercaseKeys(options.headers);
        // remove properties with undefined values before merging
        removeUndefinedProperties(options);
        removeUndefinedProperties(options.headers);
        const mergedOptions = mergeDeep(defaults || {}, options);
        // mediaType.previews arrays are merged, instead of overwritten
        if (defaults && defaults.mediaType.previews.length) {
            mergedOptions.mediaType.previews = defaults.mediaType.previews
                .filter((preview) => !mergedOptions.mediaType.previews.includes(preview))
                .concat(mergedOptions.mediaType.previews);
        }
        mergedOptions.mediaType.previews = mergedOptions.mediaType.previews.map((preview) => preview.replace(/-preview/, ""));
        return mergedOptions;
    }

    function addQueryParameters(url, parameters) {
        const separator = /\?/.test(url) ? "&" : "?";
        const names = Object.keys(parameters);
        if (names.length === 0) {
            return url;
        }
        return (url +
            separator +
            names
                .map((name) => {
                if (name === "q") {
                    return ("q=" + parameters.q.split("+").map(encodeURIComponent).join("+"));
                }
                return `${name}=${encodeURIComponent(parameters[name])}`;
            })
                .join("&"));
    }

    const urlVariableRegex = /\{[^}]+\}/g;
    function removeNonChars(variableName) {
        return variableName.replace(/^\W+|\W+$/g, "").split(/,/);
    }
    function extractUrlVariableNames(url) {
        const matches = url.match(urlVariableRegex);
        if (!matches) {
            return [];
        }
        return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
    }

    function omit(object, keysToOmit) {
        return Object.keys(object)
            .filter((option) => !keysToOmit.includes(option))
            .reduce((obj, key) => {
            obj[key] = object[key];
            return obj;
        }, {});
    }

    // Based on https://github.com/bramstein/url-template, licensed under BSD
    // TODO: create separate package.
    //
    // Copyright (c) 2012-2014, Bram Stein
    // All rights reserved.
    // Redistribution and use in source and binary forms, with or without
    // modification, are permitted provided that the following conditions
    // are met:
    //  1. Redistributions of source code must retain the above copyright
    //     notice, this list of conditions and the following disclaimer.
    //  2. Redistributions in binary form must reproduce the above copyright
    //     notice, this list of conditions and the following disclaimer in the
    //     documentation and/or other materials provided with the distribution.
    //  3. The name of the author may not be used to endorse or promote products
    //     derived from this software without specific prior written permission.
    // THIS SOFTWARE IS PROVIDED BY THE AUTHOR "AS IS" AND ANY EXPRESS OR IMPLIED
    // WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
    // MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
    // EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
    // INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
    // BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    // DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
    // OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
    // NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
    // EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
    /* istanbul ignore file */
    function encodeReserved(str) {
        return str
            .split(/(%[0-9A-Fa-f]{2})/g)
            .map(function (part) {
            if (!/%[0-9A-Fa-f]/.test(part)) {
                part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
            }
            return part;
        })
            .join("");
    }
    function encodeUnreserved(str) {
        return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
            return "%" + c.charCodeAt(0).toString(16).toUpperCase();
        });
    }
    function encodeValue(operator, value, key) {
        value =
            operator === "+" || operator === "#"
                ? encodeReserved(value)
                : encodeUnreserved(value);
        if (key) {
            return encodeUnreserved(key) + "=" + value;
        }
        else {
            return value;
        }
    }
    function isDefined(value) {
        return value !== undefined && value !== null;
    }
    function isKeyOperator(operator) {
        return operator === ";" || operator === "&" || operator === "?";
    }
    function getValues(context, operator, key, modifier) {
        var value = context[key], result = [];
        if (isDefined(value) && value !== "") {
            if (typeof value === "string" ||
                typeof value === "number" ||
                typeof value === "boolean") {
                value = value.toString();
                if (modifier && modifier !== "*") {
                    value = value.substring(0, parseInt(modifier, 10));
                }
                result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
            }
            else {
                if (modifier === "*") {
                    if (Array.isArray(value)) {
                        value.filter(isDefined).forEach(function (value) {
                            result.push(encodeValue(operator, value, isKeyOperator(operator) ? key : ""));
                        });
                    }
                    else {
                        Object.keys(value).forEach(function (k) {
                            if (isDefined(value[k])) {
                                result.push(encodeValue(operator, value[k], k));
                            }
                        });
                    }
                }
                else {
                    const tmp = [];
                    if (Array.isArray(value)) {
                        value.filter(isDefined).forEach(function (value) {
                            tmp.push(encodeValue(operator, value));
                        });
                    }
                    else {
                        Object.keys(value).forEach(function (k) {
                            if (isDefined(value[k])) {
                                tmp.push(encodeUnreserved(k));
                                tmp.push(encodeValue(operator, value[k].toString()));
                            }
                        });
                    }
                    if (isKeyOperator(operator)) {
                        result.push(encodeUnreserved(key) + "=" + tmp.join(","));
                    }
                    else if (tmp.length !== 0) {
                        result.push(tmp.join(","));
                    }
                }
            }
        }
        else {
            if (operator === ";") {
                if (isDefined(value)) {
                    result.push(encodeUnreserved(key));
                }
            }
            else if (value === "" && (operator === "&" || operator === "?")) {
                result.push(encodeUnreserved(key) + "=");
            }
            else if (value === "") {
                result.push("");
            }
        }
        return result;
    }
    function parseUrl(template) {
        return {
            expand: expand.bind(null, template),
        };
    }
    function expand(template, context) {
        var operators = ["+", "#", ".", "/", ";", "?", "&"];
        return template.replace(/\{([^\{\}]+)\}|([^\{\}]+)/g, function (_, expression, literal) {
            if (expression) {
                let operator = "";
                const values = [];
                if (operators.indexOf(expression.charAt(0)) !== -1) {
                    operator = expression.charAt(0);
                    expression = expression.substr(1);
                }
                expression.split(/,/g).forEach(function (variable) {
                    var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
                    values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
                });
                if (operator && operator !== "+") {
                    var separator = ",";
                    if (operator === "?") {
                        separator = "&";
                    }
                    else if (operator !== "#") {
                        separator = operator;
                    }
                    return (values.length !== 0 ? operator : "") + values.join(separator);
                }
                else {
                    return values.join(",");
                }
            }
            else {
                return encodeReserved(literal);
            }
        });
    }

    function parse$1(options) {
        // https://fetch.spec.whatwg.org/#methods
        let method = options.method.toUpperCase();
        // replace :varname with {varname} to make it RFC 6570 compatible
        let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
        let headers = Object.assign({}, options.headers);
        let body;
        let parameters = omit(options, [
            "method",
            "baseUrl",
            "url",
            "headers",
            "request",
            "mediaType",
        ]);
        // extract variable names from URL to calculate remaining variables later
        const urlVariableNames = extractUrlVariableNames(url);
        url = parseUrl(url).expand(parameters);
        if (!/^http/.test(url)) {
            url = options.baseUrl + url;
        }
        const omittedParameters = Object.keys(options)
            .filter((option) => urlVariableNames.includes(option))
            .concat("baseUrl");
        const remainingParameters = omit(parameters, omittedParameters);
        const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
        if (!isBinaryRequest) {
            if (options.mediaType.format) {
                // e.g. application/vnd.github.v3+json => application/vnd.github.v3.raw
                headers.accept = headers.accept
                    .split(/,/)
                    .map((preview) => preview.replace(/application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/, `application/vnd$1$2.${options.mediaType.format}`))
                    .join(",");
            }
            if (options.mediaType.previews.length) {
                const previewsFromAcceptHeader = headers.accept.match(/[\w-]+(?=-preview)/g) || [];
                headers.accept = previewsFromAcceptHeader
                    .concat(options.mediaType.previews)
                    .map((preview) => {
                    const format = options.mediaType.format
                        ? `.${options.mediaType.format}`
                        : "+json";
                    return `application/vnd.github.${preview}-preview${format}`;
                })
                    .join(",");
            }
        }
        // for GET/HEAD requests, set URL query parameters from remaining parameters
        // for PATCH/POST/PUT/DELETE requests, set request body from remaining parameters
        if (["GET", "HEAD"].includes(method)) {
            url = addQueryParameters(url, remainingParameters);
        }
        else {
            if ("data" in remainingParameters) {
                body = remainingParameters.data;
            }
            else {
                if (Object.keys(remainingParameters).length) {
                    body = remainingParameters;
                }
                else {
                    headers["content-length"] = 0;
                }
            }
        }
        // default content-type for JSON if body is set
        if (!headers["content-type"] && typeof body !== "undefined") {
            headers["content-type"] = "application/json; charset=utf-8";
        }
        // GitHub expects 'content-length: 0' header for PUT/PATCH requests without body.
        // fetch does not allow to set `content-length` header, but we can set body to an empty string
        if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
            body = "";
        }
        // Only return body/request keys if present
        return Object.assign({ method, url, headers }, typeof body !== "undefined" ? { body } : null, options.request ? { request: options.request } : null);
    }

    function endpointWithDefaults(defaults, route, options) {
        return parse$1(merge(defaults, route, options));
    }

    function withDefaults(oldDefaults, newDefaults) {
        const DEFAULTS = merge(oldDefaults, newDefaults);
        const endpoint = endpointWithDefaults.bind(null, DEFAULTS);
        return Object.assign(endpoint, {
            DEFAULTS,
            defaults: withDefaults.bind(null, DEFAULTS),
            merge: merge.bind(null, DEFAULTS),
            parse: parse$1,
        });
    }

    const VERSION = "6.0.10";

    const userAgent = `octokit-endpoint.js/${VERSION} ${getUserAgent()}`;
    // DEFAULTS has all properties set that EndpointOptions has, except url.
    // So we use RequestParameters and add method as additional required property.
    const DEFAULTS = {
        method: "GET",
        baseUrl: "https://api.github.com",
        headers: {
            accept: "application/vnd.github.v3+json",
            "user-agent": userAgent,
        },
        mediaType: {
            format: "",
            previews: [],
        },
    };

    const endpoint = withDefaults(null, DEFAULTS);

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var browser = createCommonjsModule(function (module, exports) {

    // ref: https://github.com/tc39/proposal-global
    var getGlobal = function () {
    	// the only reliable means to get the global object is
    	// `Function('return this')()`
    	// However, this causes CSP violations in Chrome apps.
    	if (typeof self !== 'undefined') { return self; }
    	if (typeof window !== 'undefined') { return window; }
    	if (typeof global !== 'undefined') { return global; }
    	throw new Error('unable to locate global object');
    };

    var global = getGlobal();

    module.exports = exports = global.fetch;

    // Needed for TypeScript and Webpack.
    if (global.fetch) {
    	exports.default = global.fetch.bind(global);
    }

    exports.Headers = global.Headers;
    exports.Request = global.Request;
    exports.Response = global.Response;
    });

    class Deprecation extends Error {
      constructor(message) {
        super(message); // Maintains proper stack trace (only available on V8)

        /* istanbul ignore next */

        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        }

        this.name = 'Deprecation';
      }

    }

    // Returns a wrapper function that returns a wrapped callback
    // The wrapper function should do some stuff, and return a
    // presumably different callback function.
    // This makes sure that own properties are retained, so that
    // decorations and such are not lost along the way.
    var wrappy_1 = wrappy;
    function wrappy (fn, cb) {
      if (fn && cb) return wrappy(fn)(cb)

      if (typeof fn !== 'function')
        throw new TypeError('need wrapper function')

      Object.keys(fn).forEach(function (k) {
        wrapper[k] = fn[k];
      });

      return wrapper

      function wrapper() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        var ret = fn.apply(this, args);
        var cb = args[args.length-1];
        if (typeof ret === 'function' && ret !== cb) {
          Object.keys(cb).forEach(function (k) {
            ret[k] = cb[k];
          });
        }
        return ret
      }
    }

    var once_1 = wrappy_1(once);
    var strict = wrappy_1(onceStrict);

    once.proto = once(function () {
      Object.defineProperty(Function.prototype, 'once', {
        value: function () {
          return once(this)
        },
        configurable: true
      });

      Object.defineProperty(Function.prototype, 'onceStrict', {
        value: function () {
          return onceStrict(this)
        },
        configurable: true
      });
    });

    function once (fn) {
      var f = function () {
        if (f.called) return f.value
        f.called = true;
        return f.value = fn.apply(this, arguments)
      };
      f.called = false;
      return f
    }

    function onceStrict (fn) {
      var f = function () {
        if (f.called)
          throw new Error(f.onceError)
        f.called = true;
        return f.value = fn.apply(this, arguments)
      };
      var name = fn.name || 'Function wrapped with `once`';
      f.onceError = name + " shouldn't be called more than once";
      f.called = false;
      return f
    }
    once_1.strict = strict;

    const logOnce = once_1((deprecation) => console.warn(deprecation));
    /**
     * Error with extra properties to help with debugging
     */
    class RequestError extends Error {
        constructor(message, statusCode, options) {
            super(message);
            // Maintains proper stack trace (only available on V8)
            /* istanbul ignore next */
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
            this.name = "HttpError";
            this.status = statusCode;
            Object.defineProperty(this, "code", {
                get() {
                    logOnce(new Deprecation("[@octokit/request-error] `error.code` is deprecated, use `error.status`."));
                    return statusCode;
                },
            });
            this.headers = options.headers || {};
            // redact request credentials without mutating original request options
            const requestCopy = Object.assign({}, options.request);
            if (options.request.headers.authorization) {
                requestCopy.headers = Object.assign({}, options.request.headers, {
                    authorization: options.request.headers.authorization.replace(/ .*$/, " [REDACTED]"),
                });
            }
            requestCopy.url = requestCopy.url
                // client_id & client_secret can be passed as URL query parameters to increase rate limit
                // see https://developer.github.com/v3/#increasing-the-unauthenticated-rate-limit-for-oauth-applications
                .replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]")
                // OAuth tokens can be passed as URL query parameters, although it is not recommended
                // see https://developer.github.com/v3/#oauth2-token-sent-in-a-header
                .replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
            this.request = requestCopy;
        }
    }

    const VERSION$1 = "5.4.12";

    function getBufferResponse(response) {
        return response.arrayBuffer();
    }

    function fetchWrapper(requestOptions) {
        if (isPlainObject(requestOptions.body) ||
            Array.isArray(requestOptions.body)) {
            requestOptions.body = JSON.stringify(requestOptions.body);
        }
        let headers = {};
        let status;
        let url;
        const fetch = (requestOptions.request && requestOptions.request.fetch) || browser;
        return fetch(requestOptions.url, Object.assign({
            method: requestOptions.method,
            body: requestOptions.body,
            headers: requestOptions.headers,
            redirect: requestOptions.redirect,
        }, requestOptions.request))
            .then((response) => {
            url = response.url;
            status = response.status;
            for (const keyAndValue of response.headers) {
                headers[keyAndValue[0]] = keyAndValue[1];
            }
            if (status === 204 || status === 205) {
                return;
            }
            // GitHub API returns 200 for HEAD requests
            if (requestOptions.method === "HEAD") {
                if (status < 400) {
                    return;
                }
                throw new RequestError(response.statusText, status, {
                    headers,
                    request: requestOptions,
                });
            }
            if (status === 304) {
                throw new RequestError("Not modified", status, {
                    headers,
                    request: requestOptions,
                });
            }
            if (status >= 400) {
                return response
                    .text()
                    .then((message) => {
                    const error = new RequestError(message, status, {
                        headers,
                        request: requestOptions,
                    });
                    try {
                        let responseBody = JSON.parse(error.message);
                        Object.assign(error, responseBody);
                        let errors = responseBody.errors;
                        // Assumption `errors` would always be in Array format
                        error.message =
                            error.message + ": " + errors.map(JSON.stringify).join(", ");
                    }
                    catch (e) {
                        // ignore, see octokit/rest.js#684
                    }
                    throw error;
                });
            }
            const contentType = response.headers.get("content-type");
            if (/application\/json/.test(contentType)) {
                return response.json();
            }
            if (!contentType || /^text\/|charset=utf-8$/.test(contentType)) {
                return response.text();
            }
            return getBufferResponse(response);
        })
            .then((data) => {
            return {
                status,
                url,
                headers,
                data,
            };
        })
            .catch((error) => {
            if (error instanceof RequestError) {
                throw error;
            }
            throw new RequestError(error.message, 500, {
                headers,
                request: requestOptions,
            });
        });
    }

    function withDefaults$1(oldEndpoint, newDefaults) {
        const endpoint = oldEndpoint.defaults(newDefaults);
        const newApi = function (route, parameters) {
            const endpointOptions = endpoint.merge(route, parameters);
            if (!endpointOptions.request || !endpointOptions.request.hook) {
                return fetchWrapper(endpoint.parse(endpointOptions));
            }
            const request = (route, parameters) => {
                return fetchWrapper(endpoint.parse(endpoint.merge(route, parameters)));
            };
            Object.assign(request, {
                endpoint,
                defaults: withDefaults$1.bind(null, endpoint),
            });
            return endpointOptions.request.hook(request, endpointOptions);
        };
        return Object.assign(newApi, {
            endpoint,
            defaults: withDefaults$1.bind(null, endpoint),
        });
    }

    const request = withDefaults$1(endpoint, {
        headers: {
            "user-agent": `octokit-request.js/${VERSION$1} ${getUserAgent()}`,
        },
    });

    const VERSION$2 = "4.5.8";

    class GraphqlError extends Error {
        constructor(request, response) {
            const message = response.data.errors[0].message;
            super(message);
            Object.assign(this, response.data);
            Object.assign(this, { headers: response.headers });
            this.name = "GraphqlError";
            this.request = request;
            // Maintains proper stack trace (only available on V8)
            /* istanbul ignore next */
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
        }
    }

    const NON_VARIABLE_OPTIONS = [
        "method",
        "baseUrl",
        "url",
        "headers",
        "request",
        "query",
        "mediaType",
    ];
    const GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
    function graphql(request, query, options) {
        if (typeof query === "string" && options && "query" in options) {
            return Promise.reject(new Error(`[@octokit/graphql] "query" cannot be used as variable name`));
        }
        const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
        const requestOptions = Object.keys(parsedOptions).reduce((result, key) => {
            if (NON_VARIABLE_OPTIONS.includes(key)) {
                result[key] = parsedOptions[key];
                return result;
            }
            if (!result.variables) {
                result.variables = {};
            }
            result.variables[key] = parsedOptions[key];
            return result;
        }, {});
        // workaround for GitHub Enterprise baseUrl set with /api/v3 suffix
        // https://github.com/octokit/auth-app.js/issues/111#issuecomment-657610451
        const baseUrl = parsedOptions.baseUrl || request.endpoint.DEFAULTS.baseUrl;
        if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
            requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
        }
        return request(requestOptions).then((response) => {
            if (response.data.errors) {
                const headers = {};
                for (const key of Object.keys(response.headers)) {
                    headers[key] = response.headers[key];
                }
                throw new GraphqlError(requestOptions, {
                    headers,
                    data: response.data,
                });
            }
            return response.data.data;
        });
    }

    function withDefaults$2(request$1, newDefaults) {
        const newRequest = request$1.defaults(newDefaults);
        const newApi = (query, options) => {
            return graphql(newRequest, query, options);
        };
        return Object.assign(newApi, {
            defaults: withDefaults$2.bind(null, newRequest),
            endpoint: request.endpoint,
        });
    }

    withDefaults$2(request, {
        headers: {
            "user-agent": `octokit-graphql.js/${VERSION$2} ${getUserAgent()}`,
        },
        method: "POST",
        url: "/graphql",
    });
    function withCustomRequest(customRequest) {
        return withDefaults$2(customRequest, {
            method: "POST",
            url: "/graphql",
        });
    }

    async function auth(token) {
        const tokenType = token.split(/\./).length === 3
            ? "app"
            : /^v\d+\./.test(token)
                ? "installation"
                : "oauth";
        return {
            type: "token",
            token: token,
            tokenType
        };
    }

    /**
     * Prefix token for usage in the Authorization header
     *
     * @param token OAuth token or JSON Web Token
     */
    function withAuthorizationPrefix(token) {
        if (token.split(/\./).length === 3) {
            return `bearer ${token}`;
        }
        return `token ${token}`;
    }

    async function hook(token, request, route, parameters) {
        const endpoint = request.endpoint.merge(route, parameters);
        endpoint.headers.authorization = withAuthorizationPrefix(token);
        return request(endpoint);
    }

    const createTokenAuth = function createTokenAuth(token) {
        if (!token) {
            throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
        }
        if (typeof token !== "string") {
            throw new Error("[@octokit/auth-token] Token passed to createTokenAuth is not a string");
        }
        token = token.replace(/^(token|bearer) +/i, "");
        return Object.assign(auth.bind(null, token), {
            hook: hook.bind(null, token)
        });
    };

    const VERSION$3 = "3.2.4";

    class Octokit {
        constructor(options = {}) {
            const hook = new Collection();
            const requestDefaults = {
                baseUrl: request.endpoint.DEFAULTS.baseUrl,
                headers: {},
                request: Object.assign({}, options.request, {
                    hook: hook.bind(null, "request"),
                }),
                mediaType: {
                    previews: [],
                    format: "",
                },
            };
            // prepend default user agent with `options.userAgent` if set
            requestDefaults.headers["user-agent"] = [
                options.userAgent,
                `octokit-core.js/${VERSION$3} ${getUserAgent()}`,
            ]
                .filter(Boolean)
                .join(" ");
            if (options.baseUrl) {
                requestDefaults.baseUrl = options.baseUrl;
            }
            if (options.previews) {
                requestDefaults.mediaType.previews = options.previews;
            }
            if (options.timeZone) {
                requestDefaults.headers["time-zone"] = options.timeZone;
            }
            this.request = request.defaults(requestDefaults);
            this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
            this.log = Object.assign({
                debug: () => { },
                info: () => { },
                warn: console.warn.bind(console),
                error: console.error.bind(console),
            }, options.log);
            this.hook = hook;
            // (1) If neither `options.authStrategy` nor `options.auth` are set, the `octokit` instance
            //     is unauthenticated. The `this.auth()` method is a no-op and no request hook is registered.
            // (2) If only `options.auth` is set, use the default token authentication strategy.
            // (3) If `options.authStrategy` is set then use it and pass in `options.auth`. Always pass own request as many strategies accept a custom request instance.
            // TODO: type `options.auth` based on `options.authStrategy`.
            if (!options.authStrategy) {
                if (!options.auth) {
                    // (1)
                    this.auth = async () => ({
                        type: "unauthenticated",
                    });
                }
                else {
                    // (2)
                    const auth = createTokenAuth(options.auth);
                    // @ts-ignore  ¯\_(ツ)_/¯
                    hook.wrap("request", auth.hook);
                    this.auth = auth;
                }
            }
            else {
                const { authStrategy, ...otherOptions } = options;
                const auth = authStrategy(Object.assign({
                    request: this.request,
                    log: this.log,
                    // we pass the current octokit instance as well as its constructor options
                    // to allow for authentication strategies that return a new octokit instance
                    // that shares the same internal state as the current one. The original
                    // requirement for this was the "event-octokit" authentication strategy
                    // of https://github.com/probot/octokit-auth-probot.
                    octokit: this,
                    octokitOptions: otherOptions,
                }, options.auth));
                // @ts-ignore  ¯\_(ツ)_/¯
                hook.wrap("request", auth.hook);
                this.auth = auth;
            }
            // apply plugins
            // https://stackoverflow.com/a/16345172
            const classConstructor = this.constructor;
            classConstructor.plugins.forEach((plugin) => {
                Object.assign(this, plugin(this, options));
            });
        }
        static defaults(defaults) {
            const OctokitWithDefaults = class extends this {
                constructor(...args) {
                    const options = args[0] || {};
                    if (typeof defaults === "function") {
                        super(defaults(options));
                        return;
                    }
                    super(Object.assign({}, defaults, options, options.userAgent && defaults.userAgent
                        ? {
                            userAgent: `${options.userAgent} ${defaults.userAgent}`,
                        }
                        : null));
                }
            };
            return OctokitWithDefaults;
        }
        /**
         * Attach a plugin (or many) to your Octokit instance.
         *
         * @example
         * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
         */
        static plugin(...newPlugins) {
            var _a;
            const currentPlugins = this.plugins;
            const NewOctokit = (_a = class extends this {
                },
                _a.plugins = currentPlugins.concat(newPlugins.filter((plugin) => !currentPlugins.includes(plugin))),
                _a);
            return NewOctokit;
        }
    }
    Octokit.VERSION = VERSION$3;
    Octokit.plugins = [];

    const VERSION$4 = "1.0.2";

    /**
     * @param octokit Octokit instance
     * @param options Options passed to Octokit constructor
     */
    function requestLog(octokit) {
        octokit.hook.wrap("request", (request, options) => {
            octokit.log.debug("request", options);
            const start = Date.now();
            const requestOptions = octokit.request.endpoint.parse(options);
            const path = requestOptions.url.replace(options.baseUrl, "");
            return request(options)
                .then((response) => {
                octokit.log.info(`${requestOptions.method} ${path} - ${response.status} in ${Date.now() - start}ms`);
                return response;
            })
                .catch((error) => {
                octokit.log.info(`${requestOptions.method} ${path} - ${error.status} in ${Date.now() - start}ms`);
                throw error;
            });
        });
    }
    requestLog.VERSION = VERSION$4;

    const VERSION$5 = "2.8.0";

    /**
     * Some “list” response that can be paginated have a different response structure
     *
     * They have a `total_count` key in the response (search also has `incomplete_results`,
     * /installation/repositories also has `repository_selection`), as well as a key with
     * the list of the items which name varies from endpoint to endpoint.
     *
     * Octokit normalizes these responses so that paginated results are always returned following
     * the same structure. One challenge is that if the list response has only one page, no Link
     * header is provided, so this header alone is not sufficient to check wether a response is
     * paginated or not.
     *
     * We check if a "total_count" key is present in the response data, but also make sure that
     * a "url" property is not, as the "Get the combined status for a specific ref" endpoint would
     * otherwise match: https://developer.github.com/v3/repos/statuses/#get-the-combined-status-for-a-specific-ref
     */
    function normalizePaginatedListResponse(response) {
        const responseNeedsNormalization = "total_count" in response.data && !("url" in response.data);
        if (!responseNeedsNormalization)
            return response;
        // keep the additional properties intact as there is currently no other way
        // to retrieve the same information.
        const incompleteResults = response.data.incomplete_results;
        const repositorySelection = response.data.repository_selection;
        const totalCount = response.data.total_count;
        delete response.data.incomplete_results;
        delete response.data.repository_selection;
        delete response.data.total_count;
        const namespaceKey = Object.keys(response.data)[0];
        const data = response.data[namespaceKey];
        response.data = data;
        if (typeof incompleteResults !== "undefined") {
            response.data.incomplete_results = incompleteResults;
        }
        if (typeof repositorySelection !== "undefined") {
            response.data.repository_selection = repositorySelection;
        }
        response.data.total_count = totalCount;
        return response;
    }

    function iterator(octokit, route, parameters) {
        const options = typeof route === "function"
            ? route.endpoint(parameters)
            : octokit.request.endpoint(route, parameters);
        const requestMethod = typeof route === "function" ? route : octokit.request;
        const method = options.method;
        const headers = options.headers;
        let url = options.url;
        return {
            [Symbol.asyncIterator]: () => ({
                async next() {
                    if (!url)
                        return { done: true };
                    const response = await requestMethod({ method, url, headers });
                    const normalizedResponse = normalizePaginatedListResponse(response);
                    // `response.headers.link` format:
                    // '<https://api.github.com/users/aseemk/followers?page=2>; rel="next", <https://api.github.com/users/aseemk/followers?page=2>; rel="last"'
                    // sets `url` to undefined if "next" URL is not present or `link` header is not set
                    url = ((normalizedResponse.headers.link || "").match(/<([^>]+)>;\s*rel="next"/) || [])[1];
                    return { value: normalizedResponse };
                },
            }),
        };
    }

    function paginate(octokit, route, parameters, mapFn) {
        if (typeof parameters === "function") {
            mapFn = parameters;
            parameters = undefined;
        }
        return gather(octokit, [], iterator(octokit, route, parameters)[Symbol.asyncIterator](), mapFn);
    }
    function gather(octokit, results, iterator, mapFn) {
        return iterator.next().then((result) => {
            if (result.done) {
                return results;
            }
            let earlyExit = false;
            function done() {
                earlyExit = true;
            }
            results = results.concat(mapFn ? mapFn(result.value, done) : result.value.data);
            if (earlyExit) {
                return results;
            }
            return gather(octokit, results, iterator, mapFn);
        });
    }

    Object.assign(paginate, {
        iterator,
    });

    /**
     * @param octokit Octokit instance
     * @param options Options passed to Octokit constructor
     */
    function paginateRest(octokit) {
        return {
            paginate: Object.assign(paginate.bind(null, octokit), {
                iterator: iterator.bind(null, octokit),
            }),
        };
    }
    paginateRest.VERSION = VERSION$5;

    const Endpoints = {
        actions: {
            addSelectedRepoToOrgSecret: [
                "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}",
            ],
            cancelWorkflowRun: [
                "POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel",
            ],
            createOrUpdateOrgSecret: ["PUT /orgs/{org}/actions/secrets/{secret_name}"],
            createOrUpdateRepoSecret: [
                "PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}",
            ],
            createRegistrationTokenForOrg: [
                "POST /orgs/{org}/actions/runners/registration-token",
            ],
            createRegistrationTokenForRepo: [
                "POST /repos/{owner}/{repo}/actions/runners/registration-token",
            ],
            createRemoveTokenForOrg: ["POST /orgs/{org}/actions/runners/remove-token"],
            createRemoveTokenForRepo: [
                "POST /repos/{owner}/{repo}/actions/runners/remove-token",
            ],
            createWorkflowDispatch: [
                "POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches",
            ],
            deleteArtifact: [
                "DELETE /repos/{owner}/{repo}/actions/artifacts/{artifact_id}",
            ],
            deleteOrgSecret: ["DELETE /orgs/{org}/actions/secrets/{secret_name}"],
            deleteRepoSecret: [
                "DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}",
            ],
            deleteSelfHostedRunnerFromOrg: [
                "DELETE /orgs/{org}/actions/runners/{runner_id}",
            ],
            deleteSelfHostedRunnerFromRepo: [
                "DELETE /repos/{owner}/{repo}/actions/runners/{runner_id}",
            ],
            deleteWorkflowRun: ["DELETE /repos/{owner}/{repo}/actions/runs/{run_id}"],
            deleteWorkflowRunLogs: [
                "DELETE /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
            ],
            disableSelectedRepositoryGithubActionsOrganization: [
                "DELETE /orgs/{org}/actions/permissions/repositories/{repository_id}",
            ],
            disableWorkflow: [
                "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/disable",
            ],
            downloadArtifact: [
                "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/{archive_format}",
            ],
            downloadJobLogsForWorkflowRun: [
                "GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs",
            ],
            downloadWorkflowRunLogs: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
            ],
            enableSelectedRepositoryGithubActionsOrganization: [
                "PUT /orgs/{org}/actions/permissions/repositories/{repository_id}",
            ],
            enableWorkflow: [
                "PUT /repos/{owner}/{repo}/actions/workflows/{workflow_id}/enable",
            ],
            getAllowedActionsOrganization: [
                "GET /orgs/{org}/actions/permissions/selected-actions",
            ],
            getAllowedActionsRepository: [
                "GET /repos/{owner}/{repo}/actions/permissions/selected-actions",
            ],
            getArtifact: ["GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}"],
            getGithubActionsPermissionsOrganization: [
                "GET /orgs/{org}/actions/permissions",
            ],
            getGithubActionsPermissionsRepository: [
                "GET /repos/{owner}/{repo}/actions/permissions",
            ],
            getJobForWorkflowRun: ["GET /repos/{owner}/{repo}/actions/jobs/{job_id}"],
            getOrgPublicKey: ["GET /orgs/{org}/actions/secrets/public-key"],
            getOrgSecret: ["GET /orgs/{org}/actions/secrets/{secret_name}"],
            getRepoPermissions: [
                "GET /repos/{owner}/{repo}/actions/permissions",
                {},
                { renamed: ["actions", "getGithubActionsPermissionsRepository"] },
            ],
            getRepoPublicKey: ["GET /repos/{owner}/{repo}/actions/secrets/public-key"],
            getRepoSecret: ["GET /repos/{owner}/{repo}/actions/secrets/{secret_name}"],
            getSelfHostedRunnerForOrg: ["GET /orgs/{org}/actions/runners/{runner_id}"],
            getSelfHostedRunnerForRepo: [
                "GET /repos/{owner}/{repo}/actions/runners/{runner_id}",
            ],
            getWorkflow: ["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}"],
            getWorkflowRun: ["GET /repos/{owner}/{repo}/actions/runs/{run_id}"],
            getWorkflowRunUsage: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/timing",
            ],
            getWorkflowUsage: [
                "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/timing",
            ],
            listArtifactsForRepo: ["GET /repos/{owner}/{repo}/actions/artifacts"],
            listJobsForWorkflowRun: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
            ],
            listOrgSecrets: ["GET /orgs/{org}/actions/secrets"],
            listRepoSecrets: ["GET /repos/{owner}/{repo}/actions/secrets"],
            listRepoWorkflows: ["GET /repos/{owner}/{repo}/actions/workflows"],
            listRunnerApplicationsForOrg: ["GET /orgs/{org}/actions/runners/downloads"],
            listRunnerApplicationsForRepo: [
                "GET /repos/{owner}/{repo}/actions/runners/downloads",
            ],
            listSelectedReposForOrgSecret: [
                "GET /orgs/{org}/actions/secrets/{secret_name}/repositories",
            ],
            listSelectedRepositoriesEnabledGithubActionsOrganization: [
                "GET /orgs/{org}/actions/permissions/repositories",
            ],
            listSelfHostedRunnersForOrg: ["GET /orgs/{org}/actions/runners"],
            listSelfHostedRunnersForRepo: ["GET /repos/{owner}/{repo}/actions/runners"],
            listWorkflowRunArtifacts: [
                "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
            ],
            listWorkflowRuns: [
                "GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs",
            ],
            listWorkflowRunsForRepo: ["GET /repos/{owner}/{repo}/actions/runs"],
            reRunWorkflow: ["POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun"],
            removeSelectedRepoFromOrgSecret: [
                "DELETE /orgs/{org}/actions/secrets/{secret_name}/repositories/{repository_id}",
            ],
            setAllowedActionsOrganization: [
                "PUT /orgs/{org}/actions/permissions/selected-actions",
            ],
            setAllowedActionsRepository: [
                "PUT /repos/{owner}/{repo}/actions/permissions/selected-actions",
            ],
            setGithubActionsPermissionsOrganization: [
                "PUT /orgs/{org}/actions/permissions",
            ],
            setGithubActionsPermissionsRepository: [
                "PUT /repos/{owner}/{repo}/actions/permissions",
            ],
            setSelectedReposForOrgSecret: [
                "PUT /orgs/{org}/actions/secrets/{secret_name}/repositories",
            ],
            setSelectedRepositoriesEnabledGithubActionsOrganization: [
                "PUT /orgs/{org}/actions/permissions/repositories",
            ],
        },
        activity: {
            checkRepoIsStarredByAuthenticatedUser: ["GET /user/starred/{owner}/{repo}"],
            deleteRepoSubscription: ["DELETE /repos/{owner}/{repo}/subscription"],
            deleteThreadSubscription: [
                "DELETE /notifications/threads/{thread_id}/subscription",
            ],
            getFeeds: ["GET /feeds"],
            getRepoSubscription: ["GET /repos/{owner}/{repo}/subscription"],
            getThread: ["GET /notifications/threads/{thread_id}"],
            getThreadSubscriptionForAuthenticatedUser: [
                "GET /notifications/threads/{thread_id}/subscription",
            ],
            listEventsForAuthenticatedUser: ["GET /users/{username}/events"],
            listNotificationsForAuthenticatedUser: ["GET /notifications"],
            listOrgEventsForAuthenticatedUser: [
                "GET /users/{username}/events/orgs/{org}",
            ],
            listPublicEvents: ["GET /events"],
            listPublicEventsForRepoNetwork: ["GET /networks/{owner}/{repo}/events"],
            listPublicEventsForUser: ["GET /users/{username}/events/public"],
            listPublicOrgEvents: ["GET /orgs/{org}/events"],
            listReceivedEventsForUser: ["GET /users/{username}/received_events"],
            listReceivedPublicEventsForUser: [
                "GET /users/{username}/received_events/public",
            ],
            listRepoEvents: ["GET /repos/{owner}/{repo}/events"],
            listRepoNotificationsForAuthenticatedUser: [
                "GET /repos/{owner}/{repo}/notifications",
            ],
            listReposStarredByAuthenticatedUser: ["GET /user/starred"],
            listReposStarredByUser: ["GET /users/{username}/starred"],
            listReposWatchedByUser: ["GET /users/{username}/subscriptions"],
            listStargazersForRepo: ["GET /repos/{owner}/{repo}/stargazers"],
            listWatchedReposForAuthenticatedUser: ["GET /user/subscriptions"],
            listWatchersForRepo: ["GET /repos/{owner}/{repo}/subscribers"],
            markNotificationsAsRead: ["PUT /notifications"],
            markRepoNotificationsAsRead: ["PUT /repos/{owner}/{repo}/notifications"],
            markThreadAsRead: ["PATCH /notifications/threads/{thread_id}"],
            setRepoSubscription: ["PUT /repos/{owner}/{repo}/subscription"],
            setThreadSubscription: [
                "PUT /notifications/threads/{thread_id}/subscription",
            ],
            starRepoForAuthenticatedUser: ["PUT /user/starred/{owner}/{repo}"],
            unstarRepoForAuthenticatedUser: ["DELETE /user/starred/{owner}/{repo}"],
        },
        apps: {
            addRepoToInstallation: [
                "PUT /user/installations/{installation_id}/repositories/{repository_id}",
            ],
            checkToken: ["POST /applications/{client_id}/token"],
            createContentAttachment: [
                "POST /content_references/{content_reference_id}/attachments",
                { mediaType: { previews: ["corsair"] } },
            ],
            createFromManifest: ["POST /app-manifests/{code}/conversions"],
            createInstallationAccessToken: [
                "POST /app/installations/{installation_id}/access_tokens",
            ],
            deleteAuthorization: ["DELETE /applications/{client_id}/grant"],
            deleteInstallation: ["DELETE /app/installations/{installation_id}"],
            deleteToken: ["DELETE /applications/{client_id}/token"],
            getAuthenticated: ["GET /app"],
            getBySlug: ["GET /apps/{app_slug}"],
            getInstallation: ["GET /app/installations/{installation_id}"],
            getOrgInstallation: ["GET /orgs/{org}/installation"],
            getRepoInstallation: ["GET /repos/{owner}/{repo}/installation"],
            getSubscriptionPlanForAccount: [
                "GET /marketplace_listing/accounts/{account_id}",
            ],
            getSubscriptionPlanForAccountStubbed: [
                "GET /marketplace_listing/stubbed/accounts/{account_id}",
            ],
            getUserInstallation: ["GET /users/{username}/installation"],
            getWebhookConfigForApp: ["GET /app/hook/config"],
            listAccountsForPlan: ["GET /marketplace_listing/plans/{plan_id}/accounts"],
            listAccountsForPlanStubbed: [
                "GET /marketplace_listing/stubbed/plans/{plan_id}/accounts",
            ],
            listInstallationReposForAuthenticatedUser: [
                "GET /user/installations/{installation_id}/repositories",
            ],
            listInstallations: ["GET /app/installations"],
            listInstallationsForAuthenticatedUser: ["GET /user/installations"],
            listPlans: ["GET /marketplace_listing/plans"],
            listPlansStubbed: ["GET /marketplace_listing/stubbed/plans"],
            listReposAccessibleToInstallation: ["GET /installation/repositories"],
            listSubscriptionsForAuthenticatedUser: ["GET /user/marketplace_purchases"],
            listSubscriptionsForAuthenticatedUserStubbed: [
                "GET /user/marketplace_purchases/stubbed",
            ],
            removeRepoFromInstallation: [
                "DELETE /user/installations/{installation_id}/repositories/{repository_id}",
            ],
            resetToken: ["PATCH /applications/{client_id}/token"],
            revokeInstallationAccessToken: ["DELETE /installation/token"],
            scopeToken: ["POST /applications/{client_id}/token/scoped"],
            suspendInstallation: ["PUT /app/installations/{installation_id}/suspended"],
            unsuspendInstallation: [
                "DELETE /app/installations/{installation_id}/suspended",
            ],
            updateWebhookConfigForApp: ["PATCH /app/hook/config"],
        },
        billing: {
            getGithubActionsBillingOrg: ["GET /orgs/{org}/settings/billing/actions"],
            getGithubActionsBillingUser: [
                "GET /users/{username}/settings/billing/actions",
            ],
            getGithubPackagesBillingOrg: ["GET /orgs/{org}/settings/billing/packages"],
            getGithubPackagesBillingUser: [
                "GET /users/{username}/settings/billing/packages",
            ],
            getSharedStorageBillingOrg: [
                "GET /orgs/{org}/settings/billing/shared-storage",
            ],
            getSharedStorageBillingUser: [
                "GET /users/{username}/settings/billing/shared-storage",
            ],
        },
        checks: {
            create: ["POST /repos/{owner}/{repo}/check-runs"],
            createSuite: ["POST /repos/{owner}/{repo}/check-suites"],
            get: ["GET /repos/{owner}/{repo}/check-runs/{check_run_id}"],
            getSuite: ["GET /repos/{owner}/{repo}/check-suites/{check_suite_id}"],
            listAnnotations: [
                "GET /repos/{owner}/{repo}/check-runs/{check_run_id}/annotations",
            ],
            listForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-runs"],
            listForSuite: [
                "GET /repos/{owner}/{repo}/check-suites/{check_suite_id}/check-runs",
            ],
            listSuitesForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/check-suites"],
            rerequestSuite: [
                "POST /repos/{owner}/{repo}/check-suites/{check_suite_id}/rerequest",
            ],
            setSuitesPreferences: [
                "PATCH /repos/{owner}/{repo}/check-suites/preferences",
            ],
            update: ["PATCH /repos/{owner}/{repo}/check-runs/{check_run_id}"],
        },
        codeScanning: {
            getAlert: [
                "GET /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
                {},
                { renamedParameters: { alert_id: "alert_number" } },
            ],
            listAlertsForRepo: ["GET /repos/{owner}/{repo}/code-scanning/alerts"],
            listRecentAnalyses: ["GET /repos/{owner}/{repo}/code-scanning/analyses"],
            updateAlert: [
                "PATCH /repos/{owner}/{repo}/code-scanning/alerts/{alert_number}",
            ],
            uploadSarif: ["POST /repos/{owner}/{repo}/code-scanning/sarifs"],
        },
        codesOfConduct: {
            getAllCodesOfConduct: [
                "GET /codes_of_conduct",
                { mediaType: { previews: ["scarlet-witch"] } },
            ],
            getConductCode: [
                "GET /codes_of_conduct/{key}",
                { mediaType: { previews: ["scarlet-witch"] } },
            ],
            getForRepo: [
                "GET /repos/{owner}/{repo}/community/code_of_conduct",
                { mediaType: { previews: ["scarlet-witch"] } },
            ],
        },
        emojis: { get: ["GET /emojis"] },
        enterpriseAdmin: {
            disableSelectedOrganizationGithubActionsEnterprise: [
                "DELETE /enterprises/{enterprise}/actions/permissions/organizations/{org_id}",
            ],
            enableSelectedOrganizationGithubActionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions/organizations/{org_id}",
            ],
            getAllowedActionsEnterprise: [
                "GET /enterprises/{enterprise}/actions/permissions/selected-actions",
            ],
            getGithubActionsPermissionsEnterprise: [
                "GET /enterprises/{enterprise}/actions/permissions",
            ],
            listSelectedOrganizationsEnabledGithubActionsEnterprise: [
                "GET /enterprises/{enterprise}/actions/permissions/organizations",
            ],
            setAllowedActionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions/selected-actions",
            ],
            setGithubActionsPermissionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions",
            ],
            setSelectedOrganizationsEnabledGithubActionsEnterprise: [
                "PUT /enterprises/{enterprise}/actions/permissions/organizations",
            ],
        },
        gists: {
            checkIsStarred: ["GET /gists/{gist_id}/star"],
            create: ["POST /gists"],
            createComment: ["POST /gists/{gist_id}/comments"],
            delete: ["DELETE /gists/{gist_id}"],
            deleteComment: ["DELETE /gists/{gist_id}/comments/{comment_id}"],
            fork: ["POST /gists/{gist_id}/forks"],
            get: ["GET /gists/{gist_id}"],
            getComment: ["GET /gists/{gist_id}/comments/{comment_id}"],
            getRevision: ["GET /gists/{gist_id}/{sha}"],
            list: ["GET /gists"],
            listComments: ["GET /gists/{gist_id}/comments"],
            listCommits: ["GET /gists/{gist_id}/commits"],
            listForUser: ["GET /users/{username}/gists"],
            listForks: ["GET /gists/{gist_id}/forks"],
            listPublic: ["GET /gists/public"],
            listStarred: ["GET /gists/starred"],
            star: ["PUT /gists/{gist_id}/star"],
            unstar: ["DELETE /gists/{gist_id}/star"],
            update: ["PATCH /gists/{gist_id}"],
            updateComment: ["PATCH /gists/{gist_id}/comments/{comment_id}"],
        },
        git: {
            createBlob: ["POST /repos/{owner}/{repo}/git/blobs"],
            createCommit: ["POST /repos/{owner}/{repo}/git/commits"],
            createRef: ["POST /repos/{owner}/{repo}/git/refs"],
            createTag: ["POST /repos/{owner}/{repo}/git/tags"],
            createTree: ["POST /repos/{owner}/{repo}/git/trees"],
            deleteRef: ["DELETE /repos/{owner}/{repo}/git/refs/{ref}"],
            getBlob: ["GET /repos/{owner}/{repo}/git/blobs/{file_sha}"],
            getCommit: ["GET /repos/{owner}/{repo}/git/commits/{commit_sha}"],
            getRef: ["GET /repos/{owner}/{repo}/git/ref/{ref}"],
            getTag: ["GET /repos/{owner}/{repo}/git/tags/{tag_sha}"],
            getTree: ["GET /repos/{owner}/{repo}/git/trees/{tree_sha}"],
            listMatchingRefs: ["GET /repos/{owner}/{repo}/git/matching-refs/{ref}"],
            updateRef: ["PATCH /repos/{owner}/{repo}/git/refs/{ref}"],
        },
        gitignore: {
            getAllTemplates: ["GET /gitignore/templates"],
            getTemplate: ["GET /gitignore/templates/{name}"],
        },
        interactions: {
            getRestrictionsForOrg: ["GET /orgs/{org}/interaction-limits"],
            getRestrictionsForRepo: ["GET /repos/{owner}/{repo}/interaction-limits"],
            getRestrictionsForYourPublicRepos: ["GET /user/interaction-limits"],
            removeRestrictionsForOrg: ["DELETE /orgs/{org}/interaction-limits"],
            removeRestrictionsForRepo: [
                "DELETE /repos/{owner}/{repo}/interaction-limits",
            ],
            removeRestrictionsForYourPublicRepos: ["DELETE /user/interaction-limits"],
            setRestrictionsForOrg: ["PUT /orgs/{org}/interaction-limits"],
            setRestrictionsForRepo: ["PUT /repos/{owner}/{repo}/interaction-limits"],
            setRestrictionsForYourPublicRepos: ["PUT /user/interaction-limits"],
        },
        issues: {
            addAssignees: [
                "POST /repos/{owner}/{repo}/issues/{issue_number}/assignees",
            ],
            addLabels: ["POST /repos/{owner}/{repo}/issues/{issue_number}/labels"],
            checkUserCanBeAssigned: ["GET /repos/{owner}/{repo}/assignees/{assignee}"],
            create: ["POST /repos/{owner}/{repo}/issues"],
            createComment: [
                "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
            ],
            createLabel: ["POST /repos/{owner}/{repo}/labels"],
            createMilestone: ["POST /repos/{owner}/{repo}/milestones"],
            deleteComment: [
                "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}",
            ],
            deleteLabel: ["DELETE /repos/{owner}/{repo}/labels/{name}"],
            deleteMilestone: [
                "DELETE /repos/{owner}/{repo}/milestones/{milestone_number}",
            ],
            get: ["GET /repos/{owner}/{repo}/issues/{issue_number}"],
            getComment: ["GET /repos/{owner}/{repo}/issues/comments/{comment_id}"],
            getEvent: ["GET /repos/{owner}/{repo}/issues/events/{event_id}"],
            getLabel: ["GET /repos/{owner}/{repo}/labels/{name}"],
            getMilestone: ["GET /repos/{owner}/{repo}/milestones/{milestone_number}"],
            list: ["GET /issues"],
            listAssignees: ["GET /repos/{owner}/{repo}/assignees"],
            listComments: ["GET /repos/{owner}/{repo}/issues/{issue_number}/comments"],
            listCommentsForRepo: ["GET /repos/{owner}/{repo}/issues/comments"],
            listEvents: ["GET /repos/{owner}/{repo}/issues/{issue_number}/events"],
            listEventsForRepo: ["GET /repos/{owner}/{repo}/issues/events"],
            listEventsForTimeline: [
                "GET /repos/{owner}/{repo}/issues/{issue_number}/timeline",
                { mediaType: { previews: ["mockingbird"] } },
            ],
            listForAuthenticatedUser: ["GET /user/issues"],
            listForOrg: ["GET /orgs/{org}/issues"],
            listForRepo: ["GET /repos/{owner}/{repo}/issues"],
            listLabelsForMilestone: [
                "GET /repos/{owner}/{repo}/milestones/{milestone_number}/labels",
            ],
            listLabelsForRepo: ["GET /repos/{owner}/{repo}/labels"],
            listLabelsOnIssue: [
                "GET /repos/{owner}/{repo}/issues/{issue_number}/labels",
            ],
            listMilestones: ["GET /repos/{owner}/{repo}/milestones"],
            lock: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/lock"],
            removeAllLabels: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels",
            ],
            removeAssignees: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/assignees",
            ],
            removeLabel: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}",
            ],
            setLabels: ["PUT /repos/{owner}/{repo}/issues/{issue_number}/labels"],
            unlock: ["DELETE /repos/{owner}/{repo}/issues/{issue_number}/lock"],
            update: ["PATCH /repos/{owner}/{repo}/issues/{issue_number}"],
            updateComment: ["PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}"],
            updateLabel: ["PATCH /repos/{owner}/{repo}/labels/{name}"],
            updateMilestone: [
                "PATCH /repos/{owner}/{repo}/milestones/{milestone_number}",
            ],
        },
        licenses: {
            get: ["GET /licenses/{license}"],
            getAllCommonlyUsed: ["GET /licenses"],
            getForRepo: ["GET /repos/{owner}/{repo}/license"],
        },
        markdown: {
            render: ["POST /markdown"],
            renderRaw: [
                "POST /markdown/raw",
                { headers: { "content-type": "text/plain; charset=utf-8" } },
            ],
        },
        meta: {
            get: ["GET /meta"],
            getOctocat: ["GET /octocat"],
            getZen: ["GET /zen"],
            root: ["GET /"],
        },
        migrations: {
            cancelImport: ["DELETE /repos/{owner}/{repo}/import"],
            deleteArchiveForAuthenticatedUser: [
                "DELETE /user/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            deleteArchiveForOrg: [
                "DELETE /orgs/{org}/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            downloadArchiveForOrg: [
                "GET /orgs/{org}/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            getArchiveForAuthenticatedUser: [
                "GET /user/migrations/{migration_id}/archive",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            getCommitAuthors: ["GET /repos/{owner}/{repo}/import/authors"],
            getImportStatus: ["GET /repos/{owner}/{repo}/import"],
            getLargeFiles: ["GET /repos/{owner}/{repo}/import/large_files"],
            getStatusForAuthenticatedUser: [
                "GET /user/migrations/{migration_id}",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            getStatusForOrg: [
                "GET /orgs/{org}/migrations/{migration_id}",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listForAuthenticatedUser: [
                "GET /user/migrations",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listForOrg: [
                "GET /orgs/{org}/migrations",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listReposForOrg: [
                "GET /orgs/{org}/migrations/{migration_id}/repositories",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            listReposForUser: [
                "GET /user/migrations/{migration_id}/repositories",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            mapCommitAuthor: ["PATCH /repos/{owner}/{repo}/import/authors/{author_id}"],
            setLfsPreference: ["PATCH /repos/{owner}/{repo}/import/lfs"],
            startForAuthenticatedUser: ["POST /user/migrations"],
            startForOrg: ["POST /orgs/{org}/migrations"],
            startImport: ["PUT /repos/{owner}/{repo}/import"],
            unlockRepoForAuthenticatedUser: [
                "DELETE /user/migrations/{migration_id}/repos/{repo_name}/lock",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            unlockRepoForOrg: [
                "DELETE /orgs/{org}/migrations/{migration_id}/repos/{repo_name}/lock",
                { mediaType: { previews: ["wyandotte"] } },
            ],
            updateImport: ["PATCH /repos/{owner}/{repo}/import"],
        },
        orgs: {
            blockUser: ["PUT /orgs/{org}/blocks/{username}"],
            cancelInvitation: ["DELETE /orgs/{org}/invitations/{invitation_id}"],
            checkBlockedUser: ["GET /orgs/{org}/blocks/{username}"],
            checkMembershipForUser: ["GET /orgs/{org}/members/{username}"],
            checkPublicMembershipForUser: ["GET /orgs/{org}/public_members/{username}"],
            convertMemberToOutsideCollaborator: [
                "PUT /orgs/{org}/outside_collaborators/{username}",
            ],
            createInvitation: ["POST /orgs/{org}/invitations"],
            createWebhook: ["POST /orgs/{org}/hooks"],
            deleteWebhook: ["DELETE /orgs/{org}/hooks/{hook_id}"],
            get: ["GET /orgs/{org}"],
            getMembershipForAuthenticatedUser: ["GET /user/memberships/orgs/{org}"],
            getMembershipForUser: ["GET /orgs/{org}/memberships/{username}"],
            getWebhook: ["GET /orgs/{org}/hooks/{hook_id}"],
            getWebhookConfigForOrg: ["GET /orgs/{org}/hooks/{hook_id}/config"],
            list: ["GET /organizations"],
            listAppInstallations: ["GET /orgs/{org}/installations"],
            listBlockedUsers: ["GET /orgs/{org}/blocks"],
            listFailedInvitations: ["GET /orgs/{org}/failed_invitations"],
            listForAuthenticatedUser: ["GET /user/orgs"],
            listForUser: ["GET /users/{username}/orgs"],
            listInvitationTeams: ["GET /orgs/{org}/invitations/{invitation_id}/teams"],
            listMembers: ["GET /orgs/{org}/members"],
            listMembershipsForAuthenticatedUser: ["GET /user/memberships/orgs"],
            listOutsideCollaborators: ["GET /orgs/{org}/outside_collaborators"],
            listPendingInvitations: ["GET /orgs/{org}/invitations"],
            listPublicMembers: ["GET /orgs/{org}/public_members"],
            listWebhooks: ["GET /orgs/{org}/hooks"],
            pingWebhook: ["POST /orgs/{org}/hooks/{hook_id}/pings"],
            removeMember: ["DELETE /orgs/{org}/members/{username}"],
            removeMembershipForUser: ["DELETE /orgs/{org}/memberships/{username}"],
            removeOutsideCollaborator: [
                "DELETE /orgs/{org}/outside_collaborators/{username}",
            ],
            removePublicMembershipForAuthenticatedUser: [
                "DELETE /orgs/{org}/public_members/{username}",
            ],
            setMembershipForUser: ["PUT /orgs/{org}/memberships/{username}"],
            setPublicMembershipForAuthenticatedUser: [
                "PUT /orgs/{org}/public_members/{username}",
            ],
            unblockUser: ["DELETE /orgs/{org}/blocks/{username}"],
            update: ["PATCH /orgs/{org}"],
            updateMembershipForAuthenticatedUser: [
                "PATCH /user/memberships/orgs/{org}",
            ],
            updateWebhook: ["PATCH /orgs/{org}/hooks/{hook_id}"],
            updateWebhookConfigForOrg: ["PATCH /orgs/{org}/hooks/{hook_id}/config"],
        },
        projects: {
            addCollaborator: [
                "PUT /projects/{project_id}/collaborators/{username}",
                { mediaType: { previews: ["inertia"] } },
            ],
            createCard: [
                "POST /projects/columns/{column_id}/cards",
                { mediaType: { previews: ["inertia"] } },
            ],
            createColumn: [
                "POST /projects/{project_id}/columns",
                { mediaType: { previews: ["inertia"] } },
            ],
            createForAuthenticatedUser: [
                "POST /user/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            createForOrg: [
                "POST /orgs/{org}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            createForRepo: [
                "POST /repos/{owner}/{repo}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            delete: [
                "DELETE /projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            deleteCard: [
                "DELETE /projects/columns/cards/{card_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            deleteColumn: [
                "DELETE /projects/columns/{column_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            get: [
                "GET /projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            getCard: [
                "GET /projects/columns/cards/{card_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            getColumn: [
                "GET /projects/columns/{column_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            getPermissionForUser: [
                "GET /projects/{project_id}/collaborators/{username}/permission",
                { mediaType: { previews: ["inertia"] } },
            ],
            listCards: [
                "GET /projects/columns/{column_id}/cards",
                { mediaType: { previews: ["inertia"] } },
            ],
            listCollaborators: [
                "GET /projects/{project_id}/collaborators",
                { mediaType: { previews: ["inertia"] } },
            ],
            listColumns: [
                "GET /projects/{project_id}/columns",
                { mediaType: { previews: ["inertia"] } },
            ],
            listForOrg: [
                "GET /orgs/{org}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            listForRepo: [
                "GET /repos/{owner}/{repo}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            listForUser: [
                "GET /users/{username}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            moveCard: [
                "POST /projects/columns/cards/{card_id}/moves",
                { mediaType: { previews: ["inertia"] } },
            ],
            moveColumn: [
                "POST /projects/columns/{column_id}/moves",
                { mediaType: { previews: ["inertia"] } },
            ],
            removeCollaborator: [
                "DELETE /projects/{project_id}/collaborators/{username}",
                { mediaType: { previews: ["inertia"] } },
            ],
            update: [
                "PATCH /projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            updateCard: [
                "PATCH /projects/columns/cards/{card_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            updateColumn: [
                "PATCH /projects/columns/{column_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
        },
        pulls: {
            checkIfMerged: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
            create: ["POST /repos/{owner}/{repo}/pulls"],
            createReplyForReviewComment: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
            ],
            createReview: ["POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
            createReviewComment: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments",
            ],
            deletePendingReview: [
                "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
            ],
            deleteReviewComment: [
                "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}",
            ],
            dismissReview: [
                "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/dismissals",
            ],
            get: ["GET /repos/{owner}/{repo}/pulls/{pull_number}"],
            getReview: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
            ],
            getReviewComment: ["GET /repos/{owner}/{repo}/pulls/comments/{comment_id}"],
            list: ["GET /repos/{owner}/{repo}/pulls"],
            listCommentsForReview: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/comments",
            ],
            listCommits: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/commits"],
            listFiles: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/files"],
            listRequestedReviewers: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
            ],
            listReviewComments: [
                "GET /repos/{owner}/{repo}/pulls/{pull_number}/comments",
            ],
            listReviewCommentsForRepo: ["GET /repos/{owner}/{repo}/pulls/comments"],
            listReviews: ["GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews"],
            merge: ["PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge"],
            removeRequestedReviewers: [
                "DELETE /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
            ],
            requestReviewers: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers",
            ],
            submitReview: [
                "POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}/events",
            ],
            update: ["PATCH /repos/{owner}/{repo}/pulls/{pull_number}"],
            updateBranch: [
                "PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch",
                { mediaType: { previews: ["lydian"] } },
            ],
            updateReview: [
                "PUT /repos/{owner}/{repo}/pulls/{pull_number}/reviews/{review_id}",
            ],
            updateReviewComment: [
                "PATCH /repos/{owner}/{repo}/pulls/comments/{comment_id}",
            ],
        },
        rateLimit: { get: ["GET /rate_limit"] },
        reactions: {
            createForCommitComment: [
                "POST /repos/{owner}/{repo}/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForIssue: [
                "POST /repos/{owner}/{repo}/issues/{issue_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForIssueComment: [
                "POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForPullRequestReviewComment: [
                "POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForTeamDiscussionCommentInOrg: [
                "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            createForTeamDiscussionInOrg: [
                "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForCommitComment: [
                "DELETE /repos/{owner}/{repo}/comments/{comment_id}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForIssue: [
                "DELETE /repos/{owner}/{repo}/issues/{issue_number}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForIssueComment: [
                "DELETE /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForPullRequestComment: [
                "DELETE /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForTeamDiscussion: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteForTeamDiscussionComment: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            deleteLegacy: [
                "DELETE /reactions/{reaction_id}",
                { mediaType: { previews: ["squirrel-girl"] } },
                {
                    deprecated: "octokit.reactions.deleteLegacy() is deprecated, see https://docs.github.com/v3/reactions/#delete-a-reaction-legacy",
                },
            ],
            listForCommitComment: [
                "GET /repos/{owner}/{repo}/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForIssue: [
                "GET /repos/{owner}/{repo}/issues/{issue_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForIssueComment: [
                "GET /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForPullRequestReviewComment: [
                "GET /repos/{owner}/{repo}/pulls/comments/{comment_id}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForTeamDiscussionCommentInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
            listForTeamDiscussionInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/reactions",
                { mediaType: { previews: ["squirrel-girl"] } },
            ],
        },
        repos: {
            acceptInvitation: ["PATCH /user/repository_invitations/{invitation_id}"],
            addAppAccessRestrictions: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
                {},
                { mapToData: "apps" },
            ],
            addCollaborator: ["PUT /repos/{owner}/{repo}/collaborators/{username}"],
            addStatusCheckContexts: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
                {},
                { mapToData: "contexts" },
            ],
            addTeamAccessRestrictions: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
                {},
                { mapToData: "teams" },
            ],
            addUserAccessRestrictions: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
                {},
                { mapToData: "users" },
            ],
            checkCollaborator: ["GET /repos/{owner}/{repo}/collaborators/{username}"],
            checkVulnerabilityAlerts: [
                "GET /repos/{owner}/{repo}/vulnerability-alerts",
                { mediaType: { previews: ["dorian"] } },
            ],
            compareCommits: ["GET /repos/{owner}/{repo}/compare/{base}...{head}"],
            createCommitComment: [
                "POST /repos/{owner}/{repo}/commits/{commit_sha}/comments",
            ],
            createCommitSignatureProtection: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
                { mediaType: { previews: ["zzzax"] } },
            ],
            createCommitStatus: ["POST /repos/{owner}/{repo}/statuses/{sha}"],
            createDeployKey: ["POST /repos/{owner}/{repo}/keys"],
            createDeployment: ["POST /repos/{owner}/{repo}/deployments"],
            createDeploymentStatus: [
                "POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
            ],
            createDispatchEvent: ["POST /repos/{owner}/{repo}/dispatches"],
            createForAuthenticatedUser: ["POST /user/repos"],
            createFork: ["POST /repos/{owner}/{repo}/forks"],
            createInOrg: ["POST /orgs/{org}/repos"],
            createOrUpdateFileContents: ["PUT /repos/{owner}/{repo}/contents/{path}"],
            createPagesSite: [
                "POST /repos/{owner}/{repo}/pages",
                { mediaType: { previews: ["switcheroo"] } },
            ],
            createRelease: ["POST /repos/{owner}/{repo}/releases"],
            createUsingTemplate: [
                "POST /repos/{template_owner}/{template_repo}/generate",
                { mediaType: { previews: ["baptiste"] } },
            ],
            createWebhook: ["POST /repos/{owner}/{repo}/hooks"],
            declineInvitation: ["DELETE /user/repository_invitations/{invitation_id}"],
            delete: ["DELETE /repos/{owner}/{repo}"],
            deleteAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions",
            ],
            deleteAdminBranchProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
            ],
            deleteBranchProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection",
            ],
            deleteCommitComment: ["DELETE /repos/{owner}/{repo}/comments/{comment_id}"],
            deleteCommitSignatureProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
                { mediaType: { previews: ["zzzax"] } },
            ],
            deleteDeployKey: ["DELETE /repos/{owner}/{repo}/keys/{key_id}"],
            deleteDeployment: [
                "DELETE /repos/{owner}/{repo}/deployments/{deployment_id}",
            ],
            deleteFile: ["DELETE /repos/{owner}/{repo}/contents/{path}"],
            deleteInvitation: [
                "DELETE /repos/{owner}/{repo}/invitations/{invitation_id}",
            ],
            deletePagesSite: [
                "DELETE /repos/{owner}/{repo}/pages",
                { mediaType: { previews: ["switcheroo"] } },
            ],
            deletePullRequestReviewProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
            ],
            deleteRelease: ["DELETE /repos/{owner}/{repo}/releases/{release_id}"],
            deleteReleaseAsset: [
                "DELETE /repos/{owner}/{repo}/releases/assets/{asset_id}",
            ],
            deleteWebhook: ["DELETE /repos/{owner}/{repo}/hooks/{hook_id}"],
            disableAutomatedSecurityFixes: [
                "DELETE /repos/{owner}/{repo}/automated-security-fixes",
                { mediaType: { previews: ["london"] } },
            ],
            disableVulnerabilityAlerts: [
                "DELETE /repos/{owner}/{repo}/vulnerability-alerts",
                { mediaType: { previews: ["dorian"] } },
            ],
            downloadArchive: [
                "GET /repos/{owner}/{repo}/zipball/{ref}",
                {},
                { renamed: ["repos", "downloadZipballArchive"] },
            ],
            downloadTarballArchive: ["GET /repos/{owner}/{repo}/tarball/{ref}"],
            downloadZipballArchive: ["GET /repos/{owner}/{repo}/zipball/{ref}"],
            enableAutomatedSecurityFixes: [
                "PUT /repos/{owner}/{repo}/automated-security-fixes",
                { mediaType: { previews: ["london"] } },
            ],
            enableVulnerabilityAlerts: [
                "PUT /repos/{owner}/{repo}/vulnerability-alerts",
                { mediaType: { previews: ["dorian"] } },
            ],
            get: ["GET /repos/{owner}/{repo}"],
            getAccessRestrictions: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions",
            ],
            getAdminBranchProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
            ],
            getAllStatusCheckContexts: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
            ],
            getAllTopics: [
                "GET /repos/{owner}/{repo}/topics",
                { mediaType: { previews: ["mercy"] } },
            ],
            getAppsWithAccessToProtectedBranch: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
            ],
            getBranch: ["GET /repos/{owner}/{repo}/branches/{branch}"],
            getBranchProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection",
            ],
            getClones: ["GET /repos/{owner}/{repo}/traffic/clones"],
            getCodeFrequencyStats: ["GET /repos/{owner}/{repo}/stats/code_frequency"],
            getCollaboratorPermissionLevel: [
                "GET /repos/{owner}/{repo}/collaborators/{username}/permission",
            ],
            getCombinedStatusForRef: ["GET /repos/{owner}/{repo}/commits/{ref}/status"],
            getCommit: ["GET /repos/{owner}/{repo}/commits/{ref}"],
            getCommitActivityStats: ["GET /repos/{owner}/{repo}/stats/commit_activity"],
            getCommitComment: ["GET /repos/{owner}/{repo}/comments/{comment_id}"],
            getCommitSignatureProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_signatures",
                { mediaType: { previews: ["zzzax"] } },
            ],
            getCommunityProfileMetrics: ["GET /repos/{owner}/{repo}/community/profile"],
            getContent: ["GET /repos/{owner}/{repo}/contents/{path}"],
            getContributorsStats: ["GET /repos/{owner}/{repo}/stats/contributors"],
            getDeployKey: ["GET /repos/{owner}/{repo}/keys/{key_id}"],
            getDeployment: ["GET /repos/{owner}/{repo}/deployments/{deployment_id}"],
            getDeploymentStatus: [
                "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses/{status_id}",
            ],
            getLatestPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/latest"],
            getLatestRelease: ["GET /repos/{owner}/{repo}/releases/latest"],
            getPages: ["GET /repos/{owner}/{repo}/pages"],
            getPagesBuild: ["GET /repos/{owner}/{repo}/pages/builds/{build_id}"],
            getParticipationStats: ["GET /repos/{owner}/{repo}/stats/participation"],
            getPullRequestReviewProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
            ],
            getPunchCardStats: ["GET /repos/{owner}/{repo}/stats/punch_card"],
            getReadme: ["GET /repos/{owner}/{repo}/readme"],
            getRelease: ["GET /repos/{owner}/{repo}/releases/{release_id}"],
            getReleaseAsset: ["GET /repos/{owner}/{repo}/releases/assets/{asset_id}"],
            getReleaseByTag: ["GET /repos/{owner}/{repo}/releases/tags/{tag}"],
            getStatusChecksProtection: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
            ],
            getTeamsWithAccessToProtectedBranch: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
            ],
            getTopPaths: ["GET /repos/{owner}/{repo}/traffic/popular/paths"],
            getTopReferrers: ["GET /repos/{owner}/{repo}/traffic/popular/referrers"],
            getUsersWithAccessToProtectedBranch: [
                "GET /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
            ],
            getViews: ["GET /repos/{owner}/{repo}/traffic/views"],
            getWebhook: ["GET /repos/{owner}/{repo}/hooks/{hook_id}"],
            getWebhookConfigForRepo: [
                "GET /repos/{owner}/{repo}/hooks/{hook_id}/config",
            ],
            listBranches: ["GET /repos/{owner}/{repo}/branches"],
            listBranchesForHeadCommit: [
                "GET /repos/{owner}/{repo}/commits/{commit_sha}/branches-where-head",
                { mediaType: { previews: ["groot"] } },
            ],
            listCollaborators: ["GET /repos/{owner}/{repo}/collaborators"],
            listCommentsForCommit: [
                "GET /repos/{owner}/{repo}/commits/{commit_sha}/comments",
            ],
            listCommitCommentsForRepo: ["GET /repos/{owner}/{repo}/comments"],
            listCommitStatusesForRef: [
                "GET /repos/{owner}/{repo}/commits/{ref}/statuses",
            ],
            listCommits: ["GET /repos/{owner}/{repo}/commits"],
            listContributors: ["GET /repos/{owner}/{repo}/contributors"],
            listDeployKeys: ["GET /repos/{owner}/{repo}/keys"],
            listDeploymentStatuses: [
                "GET /repos/{owner}/{repo}/deployments/{deployment_id}/statuses",
            ],
            listDeployments: ["GET /repos/{owner}/{repo}/deployments"],
            listForAuthenticatedUser: ["GET /user/repos"],
            listForOrg: ["GET /orgs/{org}/repos"],
            listForUser: ["GET /users/{username}/repos"],
            listForks: ["GET /repos/{owner}/{repo}/forks"],
            listInvitations: ["GET /repos/{owner}/{repo}/invitations"],
            listInvitationsForAuthenticatedUser: ["GET /user/repository_invitations"],
            listLanguages: ["GET /repos/{owner}/{repo}/languages"],
            listPagesBuilds: ["GET /repos/{owner}/{repo}/pages/builds"],
            listPublic: ["GET /repositories"],
            listPullRequestsAssociatedWithCommit: [
                "GET /repos/{owner}/{repo}/commits/{commit_sha}/pulls",
                { mediaType: { previews: ["groot"] } },
            ],
            listReleaseAssets: [
                "GET /repos/{owner}/{repo}/releases/{release_id}/assets",
            ],
            listReleases: ["GET /repos/{owner}/{repo}/releases"],
            listTags: ["GET /repos/{owner}/{repo}/tags"],
            listTeams: ["GET /repos/{owner}/{repo}/teams"],
            listWebhooks: ["GET /repos/{owner}/{repo}/hooks"],
            merge: ["POST /repos/{owner}/{repo}/merges"],
            pingWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/pings"],
            removeAppAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
                {},
                { mapToData: "apps" },
            ],
            removeCollaborator: [
                "DELETE /repos/{owner}/{repo}/collaborators/{username}",
            ],
            removeStatusCheckContexts: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
                {},
                { mapToData: "contexts" },
            ],
            removeStatusCheckProtection: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
            ],
            removeTeamAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
                {},
                { mapToData: "teams" },
            ],
            removeUserAccessRestrictions: [
                "DELETE /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
                {},
                { mapToData: "users" },
            ],
            renameBranch: ["POST /repos/{owner}/{repo}/branches/{branch}/rename"],
            replaceAllTopics: [
                "PUT /repos/{owner}/{repo}/topics",
                { mediaType: { previews: ["mercy"] } },
            ],
            requestPagesBuild: ["POST /repos/{owner}/{repo}/pages/builds"],
            setAdminBranchProtection: [
                "POST /repos/{owner}/{repo}/branches/{branch}/protection/enforce_admins",
            ],
            setAppAccessRestrictions: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/apps",
                {},
                { mapToData: "apps" },
            ],
            setStatusCheckContexts: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks/contexts",
                {},
                { mapToData: "contexts" },
            ],
            setTeamAccessRestrictions: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/teams",
                {},
                { mapToData: "teams" },
            ],
            setUserAccessRestrictions: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection/restrictions/users",
                {},
                { mapToData: "users" },
            ],
            testPushWebhook: ["POST /repos/{owner}/{repo}/hooks/{hook_id}/tests"],
            transfer: ["POST /repos/{owner}/{repo}/transfer"],
            update: ["PATCH /repos/{owner}/{repo}"],
            updateBranchProtection: [
                "PUT /repos/{owner}/{repo}/branches/{branch}/protection",
            ],
            updateCommitComment: ["PATCH /repos/{owner}/{repo}/comments/{comment_id}"],
            updateInformationAboutPagesSite: ["PUT /repos/{owner}/{repo}/pages"],
            updateInvitation: [
                "PATCH /repos/{owner}/{repo}/invitations/{invitation_id}",
            ],
            updatePullRequestReviewProtection: [
                "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_pull_request_reviews",
            ],
            updateRelease: ["PATCH /repos/{owner}/{repo}/releases/{release_id}"],
            updateReleaseAsset: [
                "PATCH /repos/{owner}/{repo}/releases/assets/{asset_id}",
            ],
            updateStatusCheckPotection: [
                "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
                {},
                { renamed: ["repos", "updateStatusCheckProtection"] },
            ],
            updateStatusCheckProtection: [
                "PATCH /repos/{owner}/{repo}/branches/{branch}/protection/required_status_checks",
            ],
            updateWebhook: ["PATCH /repos/{owner}/{repo}/hooks/{hook_id}"],
            updateWebhookConfigForRepo: [
                "PATCH /repos/{owner}/{repo}/hooks/{hook_id}/config",
            ],
            uploadReleaseAsset: [
                "POST /repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}",
                { baseUrl: "https://uploads.github.com" },
            ],
        },
        search: {
            code: ["GET /search/code"],
            commits: ["GET /search/commits", { mediaType: { previews: ["cloak"] } }],
            issuesAndPullRequests: ["GET /search/issues"],
            labels: ["GET /search/labels"],
            repos: ["GET /search/repositories"],
            topics: ["GET /search/topics", { mediaType: { previews: ["mercy"] } }],
            users: ["GET /search/users"],
        },
        secretScanning: {
            getAlert: [
                "GET /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
            ],
            listAlertsForRepo: ["GET /repos/{owner}/{repo}/secret-scanning/alerts"],
            updateAlert: [
                "PATCH /repos/{owner}/{repo}/secret-scanning/alerts/{alert_number}",
            ],
        },
        teams: {
            addOrUpdateMembershipForUserInOrg: [
                "PUT /orgs/{org}/teams/{team_slug}/memberships/{username}",
            ],
            addOrUpdateProjectPermissionsInOrg: [
                "PUT /orgs/{org}/teams/{team_slug}/projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            addOrUpdateRepoPermissionsInOrg: [
                "PUT /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
            ],
            checkPermissionsForProjectInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/projects/{project_id}",
                { mediaType: { previews: ["inertia"] } },
            ],
            checkPermissionsForRepoInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
            ],
            create: ["POST /orgs/{org}/teams"],
            createDiscussionCommentInOrg: [
                "POST /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
            ],
            createDiscussionInOrg: ["POST /orgs/{org}/teams/{team_slug}/discussions"],
            deleteDiscussionCommentInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
            ],
            deleteDiscussionInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
            ],
            deleteInOrg: ["DELETE /orgs/{org}/teams/{team_slug}"],
            getByName: ["GET /orgs/{org}/teams/{team_slug}"],
            getDiscussionCommentInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
            ],
            getDiscussionInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
            ],
            getMembershipForUserInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/memberships/{username}",
            ],
            list: ["GET /orgs/{org}/teams"],
            listChildInOrg: ["GET /orgs/{org}/teams/{team_slug}/teams"],
            listDiscussionCommentsInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments",
            ],
            listDiscussionsInOrg: ["GET /orgs/{org}/teams/{team_slug}/discussions"],
            listForAuthenticatedUser: ["GET /user/teams"],
            listMembersInOrg: ["GET /orgs/{org}/teams/{team_slug}/members"],
            listPendingInvitationsInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/invitations",
            ],
            listProjectsInOrg: [
                "GET /orgs/{org}/teams/{team_slug}/projects",
                { mediaType: { previews: ["inertia"] } },
            ],
            listReposInOrg: ["GET /orgs/{org}/teams/{team_slug}/repos"],
            removeMembershipForUserInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/memberships/{username}",
            ],
            removeProjectInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/projects/{project_id}",
            ],
            removeRepoInOrg: [
                "DELETE /orgs/{org}/teams/{team_slug}/repos/{owner}/{repo}",
            ],
            updateDiscussionCommentInOrg: [
                "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}/comments/{comment_number}",
            ],
            updateDiscussionInOrg: [
                "PATCH /orgs/{org}/teams/{team_slug}/discussions/{discussion_number}",
            ],
            updateInOrg: ["PATCH /orgs/{org}/teams/{team_slug}"],
        },
        users: {
            addEmailForAuthenticated: ["POST /user/emails"],
            block: ["PUT /user/blocks/{username}"],
            checkBlocked: ["GET /user/blocks/{username}"],
            checkFollowingForUser: ["GET /users/{username}/following/{target_user}"],
            checkPersonIsFollowedByAuthenticated: ["GET /user/following/{username}"],
            createGpgKeyForAuthenticated: ["POST /user/gpg_keys"],
            createPublicSshKeyForAuthenticated: ["POST /user/keys"],
            deleteEmailForAuthenticated: ["DELETE /user/emails"],
            deleteGpgKeyForAuthenticated: ["DELETE /user/gpg_keys/{gpg_key_id}"],
            deletePublicSshKeyForAuthenticated: ["DELETE /user/keys/{key_id}"],
            follow: ["PUT /user/following/{username}"],
            getAuthenticated: ["GET /user"],
            getByUsername: ["GET /users/{username}"],
            getContextForUser: ["GET /users/{username}/hovercard"],
            getGpgKeyForAuthenticated: ["GET /user/gpg_keys/{gpg_key_id}"],
            getPublicSshKeyForAuthenticated: ["GET /user/keys/{key_id}"],
            list: ["GET /users"],
            listBlockedByAuthenticated: ["GET /user/blocks"],
            listEmailsForAuthenticated: ["GET /user/emails"],
            listFollowedByAuthenticated: ["GET /user/following"],
            listFollowersForAuthenticatedUser: ["GET /user/followers"],
            listFollowersForUser: ["GET /users/{username}/followers"],
            listFollowingForUser: ["GET /users/{username}/following"],
            listGpgKeysForAuthenticated: ["GET /user/gpg_keys"],
            listGpgKeysForUser: ["GET /users/{username}/gpg_keys"],
            listPublicEmailsForAuthenticated: ["GET /user/public_emails"],
            listPublicKeysForUser: ["GET /users/{username}/keys"],
            listPublicSshKeysForAuthenticated: ["GET /user/keys"],
            setPrimaryEmailVisibilityForAuthenticated: ["PATCH /user/email/visibility"],
            unblock: ["DELETE /user/blocks/{username}"],
            unfollow: ["DELETE /user/following/{username}"],
            updateAuthenticated: ["PATCH /user"],
        },
    };

    const VERSION$6 = "4.8.0";

    function endpointsToMethods(octokit, endpointsMap) {
        const newMethods = {};
        for (const [scope, endpoints] of Object.entries(endpointsMap)) {
            for (const [methodName, endpoint] of Object.entries(endpoints)) {
                const [route, defaults, decorations] = endpoint;
                const [method, url] = route.split(/ /);
                const endpointDefaults = Object.assign({ method, url }, defaults);
                if (!newMethods[scope]) {
                    newMethods[scope] = {};
                }
                const scopeMethods = newMethods[scope];
                if (decorations) {
                    scopeMethods[methodName] = decorate(octokit, scope, methodName, endpointDefaults, decorations);
                    continue;
                }
                scopeMethods[methodName] = octokit.request.defaults(endpointDefaults);
            }
        }
        return newMethods;
    }
    function decorate(octokit, scope, methodName, defaults, decorations) {
        const requestWithDefaults = octokit.request.defaults(defaults);
        /* istanbul ignore next */
        function withDecorations(...args) {
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
            let options = requestWithDefaults.endpoint.merge(...args);
            // There are currently no other decorations than `.mapToData`
            if (decorations.mapToData) {
                options = Object.assign({}, options, {
                    data: options[decorations.mapToData],
                    [decorations.mapToData]: undefined,
                });
                return requestWithDefaults(options);
            }
            if (decorations.renamed) {
                const [newScope, newMethodName] = decorations.renamed;
                octokit.log.warn(`octokit.${scope}.${methodName}() has been renamed to octokit.${newScope}.${newMethodName}()`);
            }
            if (decorations.deprecated) {
                octokit.log.warn(decorations.deprecated);
            }
            if (decorations.renamedParameters) {
                // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
                const options = requestWithDefaults.endpoint.merge(...args);
                for (const [name, alias] of Object.entries(decorations.renamedParameters)) {
                    if (name in options) {
                        octokit.log.warn(`"${name}" parameter is deprecated for "octokit.${scope}.${methodName}()". Use "${alias}" instead`);
                        if (!(alias in options)) {
                            options[alias] = options[name];
                        }
                        delete options[name];
                    }
                }
                return requestWithDefaults(options);
            }
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/25488
            return requestWithDefaults(...args);
        }
        return Object.assign(withDecorations, requestWithDefaults);
    }

    /**
     * This plugin is a 1:1 copy of internal @octokit/rest plugins. The primary
     * goal is to rebuild @octokit/rest on top of @octokit/core. Once that is
     * done, we will remove the registerEndpoints methods and return the methods
     * directly as with the other plugins. At that point we will also remove the
     * legacy workarounds and deprecations.
     *
     * See the plan at
     * https://github.com/octokit/plugin-rest-endpoint-methods.js/pull/1
     */
    function restEndpointMethods(octokit) {
        return endpointsToMethods(octokit, Endpoints);
    }
    restEndpointMethods.VERSION = VERSION$6;

    const VERSION$7 = "18.0.14";

    const Octokit$1 = Octokit.plugin(requestLog, restEndpointMethods, paginateRest).defaults({
        userAgent: `octokit-rest.js/${VERSION$7}`,
    });

    const octokit = new Octokit$1({});
    async function asyncFunc() {
        const { data } = await octokit.request("/users/Adam-Alani/repos");
        console.log(data);
        return data;
    }

    /* src\components\Projects.svelte generated by Svelte v3.31.2 */
    const file$3 = "src\\components\\Projects.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    // (1:0)   <script lang="ts">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0)   <script lang=\\\"ts\\\">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }",
    		ctx
    	});

    	return block;
    }

    // (17:38)                   <div class="grid grid-cols-1 lg:grid-cols-2  xl:grid-cols-3 ">                      {#each data as repo, i}
    function create_then_block(ctx) {
    	let div;
    	let each_value = /*data*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "grid grid-cols-1 lg:grid-cols-2  xl:grid-cols-3 ");
    			add_location(div, file$3, 17, 16, 611);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*asyncFunc*/ 0) {
    				each_value = /*data*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(17:38)                   <div class=\\\"grid grid-cols-1 lg:grid-cols-2  xl:grid-cols-3 \\\">                      {#each data as repo, i}",
    		ctx
    	});

    	return block;
    }

    // (20:24) {#if (i > 0 && repo.language !== null)}
    function create_if_block$1(ctx) {
    	let div4;
    	let div3;
    	let div1;
    	let div0;
    	let h1;
    	let t0_value = /*data*/ ctx[0][/*i*/ ctx[3]].name + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*repo*/ ctx[1].description + "";
    	let t2;
    	let t3;
    	let div2;
    	let t4;

    	function select_block_type(ctx, dirty) {
    		if (/*repo*/ ctx[1].language !== "C#") return create_if_block_1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			if_block.c();
    			t4 = space();
    			attr_dev(h1, "class", "font-semibold mt-4 mx-8 text-2xl ");
    			add_location(h1, file$3, 24, 40, 1106);
    			attr_dev(p, "class", "font-medium px-8 mt-4  text-base");
    			add_location(p, file$3, 25, 40, 1215);
    			attr_dev(div0, "class", "");
    			add_location(div0, file$3, 23, 36, 1050);
    			attr_dev(div1, "class", "flex-grow");
    			add_location(div1, file$3, 22, 32, 989);
    			attr_dev(div2, "class", "flex-none mb-2");
    			add_location(div2, file$3, 28, 32, 1401);
    			attr_dev(div3, "class", "w-96 h-48 shadow-md rounded-3xl bg-buttonblue flex flex-col flex-1 mx-4 my-4 flex-wrap ");
    			add_location(div3, file$3, 21, 28, 853);
    			attr_dev(div4, "class", "");
    			add_location(div4, file$3, 20, 24, 809);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(p, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			if_block.m(div2, null);
    			append_dev(div4, t4);
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(20:24) {#if (i > 0 && repo.language !== null)}",
    		ctx
    	});

    	return block;
    }

    // (37:36) {:else}
    function create_else_block(ctx) {
    	let div;
    	let h1;
    	let t0_value = /*repo*/ ctx[1].language + "";
    	let t0;
    	let t1;
    	let a;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			a = element("a");
    			img = element("img");
    			attr_dev(h1, "class", "mx-4 my-1 ");
    			add_location(h1, file$3, 38, 44, 2181);
    			attr_dev(div, "class", "mx-8 bg-green-600 inline-block rounded ");
    			add_location(div, file$3, 37, 40, 2082);
    			if (img.src !== (img_src_value = "images/logos/github.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "float-right mr-5");
    			attr_dev(img, "width", "28px");
    			attr_dev(img, "height", "auto");
    			add_location(img, file$3, 41, 44, 2400);
    			attr_dev(a, "href", /*repo*/ ctx[1].html_url);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$3, 40, 40, 2314);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a, anchor);
    			append_dev(a, img);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(37:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (30:36) {#if ( repo.language !== "C#")}
    function create_if_block_1(ctx) {
    	let div;
    	let h1;
    	let t0_value = /*repo*/ ctx[1].language + "";
    	let t0;
    	let t1;
    	let a;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text(t0_value);
    			t1 = space();
    			a = element("a");
    			img = element("img");
    			attr_dev(h1, "class", "mx-4 my-1  ");
    			add_location(h1, file$3, 31, 44, 1645);
    			attr_dev(div, "class", "mx-8 bg-" + /*repo*/ ctx[1].language + " inline-block rounded ");
    			add_location(div, file$3, 30, 40, 1540);
    			if (img.src !== (img_src_value = "images/logos/github.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "float-right mr-5");
    			attr_dev(img, "width", "28px");
    			attr_dev(img, "height", "auto");
    			add_location(img, file$3, 34, 40, 1861);
    			attr_dev(a, "href", /*repo*/ ctx[1].html_url);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$3, 33, 40, 1779);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a, anchor);
    			append_dev(a, img);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(30:36) {#if ( repo.language !== \\\"C#\\\")}",
    		ctx
    	});

    	return block;
    }

    // (19:20) {#each data as repo, i}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*i*/ ctx[3] > 0 && /*repo*/ ctx[1].language !== null && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*i*/ ctx[3] > 0 && /*repo*/ ctx[1].language !== null) if_block.p(ctx, dirty);
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(19:20) {#each data as repo, i}",
    		ctx
    	});

    	return block;
    }

    // (1:0)   <script lang="ts">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }
    function create_pending_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0)   <script lang=\\\"ts\\\">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let div0;
    	let h1;
    	let t3;
    	let div1;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	modeswitcher = new ModeSwitcher({ $$inline: true });

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 0
    	};

    	handle_promise(asyncFunc(), info);

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			create_component(modeswitcher.$$.fragment);
    			t1 = space();
    			main = element("main");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Github Projects";
    			t3 = space();
    			div1 = element("div");
    			info.block.c();
    			attr_dev(h1, "class", "");
    			add_location(h1, file$3, 13, 8, 439);
    			attr_dev(div0, "class", "py-16 mb-12  text-bgblue font-extrabold text-4xl md:text-5xl lg:text-6xl flex justify-center items-center");
    			add_location(div0, file$3, 12, 4, 310);
    			attr_dev(div1, "class", "flex-col flex flex-1 items-center justify-center ");
    			add_location(div1, file$3, 15, 4, 490);
    			attr_dev(main, "class", " flex flex-1 flex-col justify-center bg-white   ");
    			add_location(main, file$3, 11, 0, 241);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modeswitcher, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, h1);
    			append_dev(main, t3);
    			append_dev(main, div1);
    			info.block.m(div1, info.anchor = null);
    			info.mount = () => div1;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[0] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(modeswitcher.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(modeswitcher.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modeswitcher, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Projects", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Projects> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ModeSwitcher, Tailwindcss, asyncFunc });
    	return [];
    }

    class Projects extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\Footer.svelte generated by Svelte v3.31.2 */
    const file$4 = "src\\components\\Footer.svelte";

    function create_fragment$6(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let div10;
    	let div4;
    	let div1;
    	let div0;
    	let h10;
    	let t3;
    	let div3;
    	let div2;
    	let a0;
    	let t5;
    	let div9;
    	let div6;
    	let div5;
    	let h11;
    	let t7;
    	let div8;
    	let div7;
    	let a1;
    	let svg0;
    	let path0;
    	let path1;
    	let t8;
    	let span0;
    	let t10;
    	let a2;
    	let svg1;
    	let path2;
    	let t11;
    	let span1;
    	let t13;
    	let a3;
    	let svg2;
    	let path3;
    	let path4;
    	let t14;
    	let span2;
    	let t16;
    	let a4;
    	let svg3;
    	let path5;
    	let t17;
    	let span3;
    	let t19;
    	let a5;
    	let svg4;
    	let path6;
    	let t20;
    	let span4;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	modeswitcher = new ModeSwitcher({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			create_component(modeswitcher.$$.fragment);
    			t1 = space();
    			main = element("main");
    			div10 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Email me";
    			t3 = space();
    			div3 = element("div");
    			div2 = element("div");
    			a0 = element("a");
    			a0.textContent = "Click Here!";
    			t5 = space();
    			div9 = element("div");
    			div6 = element("div");
    			div5 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Get in touch";
    			t7 = space();
    			div8 = element("div");
    			div7 = element("div");
    			a1 = element("a");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			t8 = space();
    			span0 = element("span");
    			span0.textContent = "adamalany@gmail.com";
    			t10 = space();
    			a2 = element("a");
    			svg1 = svg_element("svg");
    			path2 = svg_element("path");
    			t11 = space();
    			span1 = element("span");
    			span1.textContent = "@unebrossadam";
    			t13 = space();
    			a3 = element("a");
    			svg2 = svg_element("svg");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			t14 = space();
    			span2 = element("span");
    			span2.textContent = "Adam#2080";
    			t16 = space();
    			a4 = element("a");
    			svg3 = svg_element("svg");
    			path5 = svg_element("path");
    			t17 = space();
    			span3 = element("span");
    			span3.textContent = "adam-alani";
    			t19 = space();
    			a5 = element("a");
    			svg4 = svg_element("svg");
    			path6 = svg_element("path");
    			t20 = space();
    			span4 = element("span");
    			span4.textContent = "Adam-Alani";
    			attr_dev(h10, "class", "z-20");
    			add_location(h10, file$4, 37, 20, 772);
    			attr_dev(div0, "class", "py-8 mb-12  text-whiteblue font-extrabold text-3xl md:text-4xl lg:text-5xl");
    			add_location(div0, file$4, 36, 16, 662);
    			attr_dev(div1, "class", "flex justify-center items-center");
    			add_location(div1, file$4, 35, 12, 598);
    			attr_dev(a0, "href", "mailto:adamalany@gmail.com");
    			attr_dev(a0, "class", "mx-5 bg-green-600 rounded-3xl py-2 px-6 text-3xl");
    			add_location(a0, file$4, 43, 24, 1034);
    			attr_dev(div2, "class", "flex-1 flex justify-center items-center");
    			add_location(div2, file$4, 42, 16, 955);
    			attr_dev(div3, "class", "flex-1 flex items-center justify-around z-30 text-2xl pb-24  ");
    			add_location(div3, file$4, 41, 12, 862);
    			attr_dev(div4, "class", "flex-1 mt-8");
    			add_location(div4, file$4, 34, 8, 559);
    			attr_dev(h11, "class", "z-20");
    			add_location(h11, file$4, 53, 20, 1484);
    			attr_dev(div5, "class", "py-8 mb-12  text-whiteblue font-extrabold text-3xl md:text-4xl lg:text-5xl");
    			add_location(div5, file$4, 52, 16, 1374);
    			attr_dev(div6, "class", "flex justify-center items-center");
    			add_location(div6, file$4, 51, 12, 1310);
    			attr_dev(path0, "d", "M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z");
    			add_location(path0, file$4, 63, 28, 2004);
    			attr_dev(path1, "d", "M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z");
    			add_location(path1, file$4, 64, 28, 2116);
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "viewBox", "0 0 20 20");
    			attr_dev(svg0, "fill", "currentColor");
    			attr_dev(svg0, "width", "24");
    			attr_dev(svg0, "height", "auto");
    			attr_dev(svg0, "class", "inline-block mr-4");
    			add_location(svg0, file$4, 62, 24, 1843);
    			attr_dev(span0, "class", "inline-block");
    			add_location(span0, file$4, 66, 24, 2241);
    			attr_dev(a1, "href", "mailto:adamalany@gmail.com");
    			attr_dev(a1, "class", "mx-5 py-2 text-2xl");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file$4, 61, 20, 1737);
    			attr_dev(path2, "d", "M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z");
    			add_location(path2, file$4, 73, 167, 2606);
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "width", "24");
    			attr_dev(svg1, "height", "24");
    			attr_dev(svg1, "fill", "currentColor");
    			attr_dev(svg1, "class", "bi bi-twitter inline-block mr-4");
    			attr_dev(svg1, "viewBox", "0 0 16 16");
    			add_location(svg1, file$4, 73, 24, 2463);
    			attr_dev(span1, "class", "inline-block");
    			add_location(span1, file$4, 74, 24, 3143);
    			attr_dev(a2, "href", "https://twitter.com/unebrosseadam");
    			attr_dev(a2, "class", "mx-5 py-2 text-2xl");
    			attr_dev(a2, "target", "_blank");
    			add_location(a2, file$4, 72, 20, 2350);
    			attr_dev(path3, "d", "M6.552 6.712c-.456 0-.816.4-.816.888s.368.888.816.888c.456 0 .816-.4.816-.888.008-.488-.36-.888-.816-.888zm2.92 0c-.456 0-.816.4-.816.888s.368.888.816.888c.456 0 .816-.4.816-.888s-.36-.888-.816-.888z");
    			add_location(path3, file$4, 79, 167, 3466);
    			attr_dev(path4, "d", "M13.36 0H2.64C1.736 0 1 .736 1 1.648v10.816c0 .912.736 1.648 1.64 1.648h9.072l-.424-1.48 1.024.952.968.896L15 16V1.648C15 .736 14.264 0 13.36 0zm-3.088 10.448s-.288-.344-.528-.648c1.048-.296 1.448-.952 1.448-.952-.328.216-.64.368-.92.472-.4.168-.784.28-1.16.344a5.604 5.604 0 0 1-2.072-.008 6.716 6.716 0 0 1-1.176-.344 4.688 4.688 0 0 1-.584-.272c-.024-.016-.048-.024-.072-.04-.016-.008-.024-.016-.032-.024-.144-.08-.224-.136-.224-.136s.384.64 1.4.944c-.24.304-.536.664-.536.664-1.768-.056-2.44-1.216-2.44-1.216 0-2.576 1.152-4.664 1.152-4.664 1.152-.864 2.248-.84 2.248-.84l.08.096c-1.44.416-2.104 1.048-2.104 1.048s.176-.096.472-.232c.856-.376 1.536-.48 1.816-.504.048-.008.088-.016.136-.016a6.521 6.521 0 0 1 4.024.752s-.632-.6-1.992-1.016l.112-.128s1.096-.024 2.248.84c0 0 1.152 2.088 1.152 4.664 0 0-.68 1.16-2.448 1.216z");
    			add_location(path4, file$4, 79, 378, 3677);
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "width", "24");
    			attr_dev(svg2, "height", "24");
    			attr_dev(svg2, "fill", "currentColor");
    			attr_dev(svg2, "class", "bi bi-discord inline-block mr-4");
    			attr_dev(svg2, "viewBox", "0 0 16 16");
    			add_location(svg2, file$4, 79, 24, 3323);
    			attr_dev(span2, "class", "inline-block");
    			add_location(span2, file$4, 80, 24, 4548);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "mx-5 py-2 text-2xl");
    			attr_dev(a3, "target", "_blank");
    			add_location(a3, file$4, 78, 20, 3242);
    			attr_dev(path5, "d", "M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z");
    			add_location(path5, file$4, 84, 168, 4914);
    			attr_dev(svg3, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg3, "width", "24");
    			attr_dev(svg3, "height", "24");
    			attr_dev(svg3, "fill", "currentColor");
    			attr_dev(svg3, "class", "bi bi-linkedin inline-block mr-4");
    			attr_dev(svg3, "viewBox", "0 0 16 16");
    			add_location(svg3, file$4, 84, 24, 4770);
    			attr_dev(span3, "class", "inline-block");
    			add_location(span3, file$4, 85, 24, 5521);
    			attr_dev(a4, "href", "https://www.linkedin.com/in/adam-alani-8a164b1b0/");
    			attr_dev(a4, "class", "mx-5 py-2 text-2xl");
    			attr_dev(a4, "target", "_blank");
    			add_location(a4, file$4, 83, 20, 4641);
    			attr_dev(path6, "d", "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z");
    			add_location(path6, file$4, 89, 166, 5866);
    			attr_dev(svg4, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg4, "width", "24");
    			attr_dev(svg4, "height", "24");
    			attr_dev(svg4, "fill", "currentColor");
    			attr_dev(svg4, "class", "bi bi-github inline-block mr-4");
    			attr_dev(svg4, "viewBox", "0 0 16 16");
    			add_location(svg4, file$4, 89, 24, 5724);
    			attr_dev(span4, "class", "inline-block");
    			add_location(span4, file$4, 90, 25, 6481);
    			attr_dev(a5, "href", "https://github.com/Adam-Alani");
    			attr_dev(a5, "class", "mx-5 py-2 text-2xl");
    			attr_dev(a5, "target", "_blank");
    			add_location(a5, file$4, 88, 20, 5615);
    			attr_dev(div7, "class", "flex-initial flex flex-col");
    			add_location(div7, file$4, 58, 16, 1671);
    			attr_dev(div8, "class", "flex-1 flex items-center justify-around z-30 text-2xl pb-24  ");
    			add_location(div8, file$4, 57, 12, 1578);
    			attr_dev(div9, "class", "flex-1 mt-8");
    			add_location(div9, file$4, 50, 8, 1271);
    			attr_dev(div10, "class", "flex flex-row justify-around");
    			add_location(div10, file$4, 33, 4, 507);
    			attr_dev(main, "class", " bg-bgblue text-white mt-16 ");
    			add_location(main, file$4, 31, 0, 456);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modeswitcher, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div4);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h10);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, a0);
    			append_dev(div10, t5);
    			append_dev(div10, div9);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h11);
    			append_dev(div9, t7);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, a1);
    			append_dev(a1, svg0);
    			append_dev(svg0, path0);
    			append_dev(svg0, path1);
    			append_dev(a1, t8);
    			append_dev(a1, span0);
    			append_dev(div7, t10);
    			append_dev(div7, a2);
    			append_dev(a2, svg1);
    			append_dev(svg1, path2);
    			append_dev(a2, t11);
    			append_dev(a2, span1);
    			append_dev(div7, t13);
    			append_dev(div7, a3);
    			append_dev(a3, svg2);
    			append_dev(svg2, path3);
    			append_dev(svg2, path4);
    			append_dev(a3, t14);
    			append_dev(a3, span2);
    			append_dev(div7, t16);
    			append_dev(div7, a4);
    			append_dev(a4, svg3);
    			append_dev(svg3, path5);
    			append_dev(a4, t17);
    			append_dev(a4, span3);
    			append_dev(div7, t19);
    			append_dev(div7, a5);
    			append_dev(a5, svg4);
    			append_dev(svg4, path6);
    			append_dev(a5, t20);
    			append_dev(a5, span4);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(modeswitcher.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(modeswitcher.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modeswitcher, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ModeSwitcher, Tailwindcss });
    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.31.2 */
    const file$5 = "src\\App.svelte";

    function create_fragment$7(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let div11;
    	let nav;
    	let div10;
    	let div2;
    	let div1;
    	let div0;
    	let a0;
    	let t3;
    	let div8;
    	let div7;
    	let div3;
    	let a1;
    	let t5;
    	let div4;
    	let a2;
    	let t7;
    	let div5;
    	let a3;
    	let t9;
    	let div6;
    	let a4;
    	let t11;
    	let div9;
    	let a5;
    	let t13;
    	let home;
    	let t14;
    	let div12;
    	let about;
    	let t15;
    	let div13;
    	let recent;
    	let t16;
    	let div14;
    	let projects;
    	let t17;
    	let footer;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	modeswitcher = new ModeSwitcher({ $$inline: true });
    	home = new Home({ $$inline: true });
    	about = new About({ $$inline: true });
    	recent = new Recent({ $$inline: true });
    	projects = new Projects({ $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			create_component(modeswitcher.$$.fragment);
    			t1 = space();
    			main = element("main");
    			div11 = element("div");
    			nav = element("nav");
    			div10 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			a0.textContent = "Adam";
    			t3 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div3 = element("div");
    			a1 = element("a");
    			a1.textContent = "Home";
    			t5 = space();
    			div4 = element("div");
    			a2 = element("a");
    			a2.textContent = "About";
    			t7 = space();
    			div5 = element("div");
    			a3 = element("a");
    			a3.textContent = "Recent";
    			t9 = space();
    			div6 = element("div");
    			a4 = element("a");
    			a4.textContent = "Projects";
    			t11 = space();
    			div9 = element("div");
    			a5 = element("a");
    			a5.textContent = "Contact";
    			t13 = space();
    			create_component(home.$$.fragment);
    			t14 = space();
    			div12 = element("div");
    			create_component(about.$$.fragment);
    			t15 = space();
    			div13 = element("div");
    			create_component(recent.$$.fragment);
    			t16 = space();
    			div14 = element("div");
    			create_component(projects.$$.fragment);
    			t17 = space();
    			create_component(footer.$$.fragment);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", " font-bold text-2xl  hover:text-highlightblue");
    			add_location(a0, file$5, 20, 34, 809);
    			attr_dev(div0, "class", "");
    			add_location(div0, file$5, 20, 20, 795);
    			attr_dev(div1, "class", "ml-6 leading-none");
    			add_location(div1, file$5, 19, 16, 743);
    			attr_dev(div2, "class", "flex items-center hidden sm:flex flex-1 items-center justify-center  ");
    			add_location(div2, file$5, 18, 12, 643);
    			attr_dev(a1, "href", "#home");
    			add_location(a1, file$5, 26, 55, 1166);
    			attr_dev(div3, "class", "mx-3 hover:text-white");
    			add_location(div3, file$5, 26, 20, 1131);
    			attr_dev(a2, "href", "#about");
    			add_location(a2, file$5, 27, 55, 1251);
    			attr_dev(div4, "class", "mx-3 hover:text-white");
    			add_location(div4, file$5, 27, 20, 1216);
    			attr_dev(a3, "href", "#recent");
    			add_location(a3, file$5, 28, 55, 1339);
    			attr_dev(div5, "class", "mx-3 hover:text-white");
    			add_location(div5, file$5, 28, 20, 1304);
    			attr_dev(a4, "href", "#project");
    			add_location(a4, file$5, 29, 55, 1429);
    			attr_dev(div6, "class", "mx-3 hover:text-white");
    			add_location(div6, file$5, 29, 20, 1394);
    			attr_dev(div7, "class", "flex flex-1 items-center justify-center max-w-full text-bgblue");
    			add_location(div7, file$5, 25, 16, 1034);
    			attr_dev(div8, "class", "flex flex-1 flex-col justify-center  items-center text-2xl");
    			add_location(div8, file$5, 24, 12, 945);
    			attr_dev(a5, "href", "mailto:adamalany@gmail.com");
    			attr_dev(a5, "class", "mx-2 text-xl bg-gradient-to-b from-darkgblue to-bgblue font-semibold rounded-full py-2 px-10 shadow text-white");
    			add_location(a5, file$5, 34, 16, 1606);
    			attr_dev(div9, "class", " hidden sm:flex  flex-1 items-center justify-center  ");
    			add_location(div9, file$5, 33, 12, 1522);
    			attr_dev(div10, "class", "flex-none h-22 px-5 flex items-center justify-around pt-5  ");
    			add_location(div10, file$5, 17, 8, 557);
    			attr_dev(nav, "class", "flex-initial");
    			add_location(nav, file$5, 15, 4, 521);
    			attr_dev(div11, "class", "bg-gradient-to-tl from-gradienttop to-whiteblue ");
    			add_location(div11, file$5, 14, 4, 454);
    			attr_dev(div12, "id", "about");
    			add_location(div12, file$5, 44, 4, 1886);
    			attr_dev(div13, "id", "recent");
    			add_location(div13, file$5, 48, 4, 1932);
    			attr_dev(div14, "id", "project");
    			add_location(div14, file$5, 51, 4, 1979);
    			attr_dev(main, "id", "home");
    			add_location(main, file$5, 12, 0, 432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(tailwindcss, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(modeswitcher, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div11);
    			append_dev(div11, nav);
    			append_dev(nav, div10);
    			append_dev(div10, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(div10, t3);
    			append_dev(div10, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div3);
    			append_dev(div3, a1);
    			append_dev(div7, t5);
    			append_dev(div7, div4);
    			append_dev(div4, a2);
    			append_dev(div7, t7);
    			append_dev(div7, div5);
    			append_dev(div5, a3);
    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			append_dev(div6, a4);
    			append_dev(div10, t11);
    			append_dev(div10, div9);
    			append_dev(div9, a5);
    			append_dev(div11, t13);
    			mount_component(home, div11, null);
    			append_dev(main, t14);
    			append_dev(main, div12);
    			mount_component(about, div12, null);
    			append_dev(main, t15);
    			append_dev(main, div13);
    			mount_component(recent, div13, null);
    			append_dev(main, t16);
    			append_dev(main, div14);
    			mount_component(projects, div14, null);
    			append_dev(main, t17);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tailwindcss.$$.fragment, local);
    			transition_in(modeswitcher.$$.fragment, local);
    			transition_in(home.$$.fragment, local);
    			transition_in(about.$$.fragment, local);
    			transition_in(recent.$$.fragment, local);
    			transition_in(projects.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(modeswitcher.$$.fragment, local);
    			transition_out(home.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			transition_out(recent.$$.fragment, local);
    			transition_out(projects.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tailwindcss, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(modeswitcher, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(main);
    			destroy_component(home);
    			destroy_component(about);
    			destroy_component(recent);
    			destroy_component(projects);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let { menu = 1 } = $$props;
    	const writable_props = ["menu"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("menu" in $$props) $$invalidate(0, menu = $$props.menu);
    	};

    	$$self.$capture_state = () => ({
    		ModeSwitcher,
    		Tailwindcss,
    		Home,
    		About,
    		Recent,
    		Projects,
    		Footer,
    		menu
    	});

    	$$self.$inject_state = $$props => {
    		if ("menu" in $$props) $$invalidate(0, menu = $$props.menu);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [menu];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$7, safe_not_equal, { menu: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get menu() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set menu(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: 'world'
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
