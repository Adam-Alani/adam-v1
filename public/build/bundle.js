
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
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
    const file = "src\\ModeSwitcher.svelte";

    // (25:2) {:else}
    function create_else_block(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M494.2 221.9l-59.8-40.5 13.7-71c2.6-13.2-1.6-26.8-11.1-36.4-9.6-9.5-23.2-13.7-36.2-11.1l-70.9 13.7-40.4-59.9c-15.1-22.3-51.9-22.3-67 0l-40.4 59.9-70.8-13.7C98 60.4 84.5 64.5 75 74.1c-9.5 9.6-13.7 23.1-11.1 36.3l13.7 71-59.8 40.5C6.6 229.5 0 242 0 255.5s6.7 26 17.8 33.5l59.8 40.5-13.7 71c-2.6 13.2 1.6 26.8 11.1 36.3 9.5 9.5 22.9 13.7 36.3 11.1l70.8-13.7 40.4 59.9C230 505.3 242.6 512 256 512s26-6.7 33.5-17.8l40.4-59.9 70.9 13.7c13.4 2.7 26.8-1.6 36.3-11.1 9.5-9.5 13.6-23.1 11.1-36.3l-13.7-71 59.8-40.5c11.1-7.5 17.8-20.1 17.8-33.5-.1-13.6-6.7-26.1-17.9-33.7zm-112.9 85.6l17.6 91.2-91-17.6L256 458l-51.9-77-90.9 17.6 17.6-91.2-76.8-52 76.8-52-17.6-91.2 91 17.6L256 53l51.9 76.9 91-17.6-17.6 91.1 76.8 52-76.8 52.1zM256 152c-57.3 0-104 46.7-104 104s46.7 104 104 104 104-46.7 104-104-46.7-104-104-104zm0 160c-30.9 0-56-25.1-56-56s25.1-56 56-56 56 25.1 56 56-25.1 56-56 56z");
    			add_location(path, file, 25, 184, 1684);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "focusable", "false");
    			attr_dev(svg, "data-prefix", "far");
    			attr_dev(svg, "data-icon", "sun");
    			attr_dev(svg, "class", "svg-inline--fa fa-sun fa-w-16");
    			attr_dev(svg, "role", "img");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file, 25, 2, 1502);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(25:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (23:2) {#if darkMode}
    function create_if_block(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "fill", "currentColor");
    			attr_dev(path, "d", "M279.135 512c78.756 0 150.982-35.804 198.844-94.775 28.27-34.831-2.558-85.722-46.249-77.401-82.348 15.683-158.272-47.268-158.272-130.792 0-48.424 26.06-92.292 67.434-115.836 38.745-22.05 28.999-80.788-15.022-88.919A257.936 257.936 0 0 0 279.135 0c-141.36 0-256 114.575-256 256 0 141.36 114.576 256 256 256zm0-464c12.985 0 25.689 1.201 38.016 3.478-54.76 31.163-91.693 90.042-91.693 157.554 0 113.848 103.641 199.2 215.252 177.944C402.574 433.964 344.366 464 279.135 464c-114.875 0-208-93.125-208-208s93.125-208 208-208z");
    			add_location(path, file, 23, 186, 926);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "focusable", "false");
    			attr_dev(svg, "data-prefix", "far");
    			attr_dev(svg, "data-icon", "moon");
    			attr_dev(svg, "class", "svg-inline--fa fa-moon fa-w-16");
    			attr_dev(svg, "role", "img");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 512 512");
    			add_location(svg, file, 23, 2, 742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(23:2) {#if darkMode}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*darkMode*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "absolute top-0 right-0 w-8 h-8 p-2");
    			add_location(div, file, 21, 0, 652);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*toggleMode*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
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
    		$$invalidate(0, darkMode = dark);
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
    		if ("darkMode" in $$props) $$invalidate(0, darkMode = $$props.darkMode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [darkMode, toggleMode];
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

    /* src\components\Home.svelte generated by Svelte v3.31.2 */
    const file$1 = "src\\components\\Home.svelte";

    function create_fragment$2(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
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
    	let button;
    	let p;
    	let t13;
    	let div16;
    	let div12;
    	let div11;
    	let h10;
    	let t14;
    	let br;
    	let t15;
    	let span;
    	let t17;
    	let h2;
    	let t19;
    	let div15;
    	let img;
    	let img_src_value;
    	let t20;
    	let div14;
    	let div13;
    	let h11;
    	let t22;
    	let h12;
    	let t24;
    	let h13;
    	let t26;
    	let div19;
    	let div18;
    	let svg0;
    	let path0;
    	let t27;
    	let div17;
    	let h14;
    	let t29;
    	let div22;
    	let div21;
    	let svg1;
    	let path1;
    	let div20;
    	let h15;
    	let t31;
    	let h3;
    	let t33;
    	let div25;
    	let div24;
    	let svg2;
    	let path2;
    	let t34;
    	let div23;
    	let h16;
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
    			a3.textContent = "Services";
    			t9 = space();
    			div6 = element("div");
    			a4 = element("a");
    			a4.textContent = "Projects";
    			t11 = space();
    			div9 = element("div");
    			button = element("button");
    			p = element("p");
    			p.textContent = "Contact";
    			t13 = space();
    			div16 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			h10 = element("h1");
    			t14 = text("Hello, ");
    			br = element("br");
    			t15 = text(" I'm ");
    			span = element("span");
    			span.textContent = "Adam.";
    			t17 = space();
    			h2 = element("h2");
    			h2.textContent = "Developer, Designer and Student";
    			t19 = space();
    			div15 = element("div");
    			img = element("img");
    			t20 = space();
    			div14 = element("div");
    			div13 = element("div");
    			h11 = element("h1");
    			h11.textContent = "UI/UX";
    			t22 = space();
    			h12 = element("h1");
    			h12.textContent = "Development";
    			t24 = space();
    			h13 = element("h1");
    			h13.textContent = "Design";
    			t26 = space();
    			div19 = element("div");
    			div18 = element("div");
    			svg0 = svg_element("svg");
    			path0 = svg_element("path");
    			t27 = space();
    			div17 = element("div");
    			h14 = element("h1");
    			h14.textContent = "Design";
    			t29 = space();
    			div22 = element("div");
    			div21 = element("div");
    			svg1 = svg_element("svg");
    			path1 = svg_element("path");
    			div20 = element("div");
    			h15 = element("h1");
    			h15.textContent = "Development";
    			t31 = space();
    			h3 = element("h3");
    			h3.textContent = "Full Stack";
    			t33 = space();
    			div25 = element("div");
    			div24 = element("div");
    			svg2 = svg_element("svg");
    			path2 = svg_element("path");
    			t34 = space();
    			div23 = element("div");
    			h16 = element("h1");
    			h16.textContent = "UI/UX";
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", " font-bold text-2xl  hover:text-highlightblue");
    			add_location(a0, file$1, 13, 34, 481);
    			attr_dev(div0, "class", "");
    			add_location(div0, file$1, 13, 20, 467);
    			attr_dev(div1, "class", "ml-6 leading-none");
    			add_location(div1, file$1, 12, 16, 414);
    			attr_dev(div2, "class", "flex items-center hidden sm:flex ");
    			add_location(div2, file$1, 11, 12, 349);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "");
    			add_location(a1, file$1, 19, 55, 816);
    			attr_dev(div3, "class", "mx-3 hover:text-white");
    			add_location(div3, file$1, 19, 20, 781);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$1, 20, 55, 908);
    			attr_dev(div4, "class", "mx-3 hover:text-white");
    			add_location(div4, file$1, 20, 20, 873);
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$1, 21, 55, 992);
    			attr_dev(div5, "class", "mx-3 hover:text-white");
    			add_location(div5, file$1, 21, 20, 957);
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$1, 22, 55, 1079);
    			attr_dev(div6, "class", "mx-3 hover:text-white");
    			add_location(div6, file$1, 22, 20, 1044);
    			attr_dev(div7, "class", "flex items-center justify-center max-w-full text-bgblue");
    			add_location(div7, file$1, 18, 16, 690);
    			attr_dev(div8, "class", "flex flex-col justify-center text-2xl");
    			add_location(div8, file$1, 17, 12, 621);
    			attr_dev(p, "class", "mx-2 text-xl ");
    			add_location(p, file$1, 28, 20, 1381);
    			attr_dev(button, "class", "bg-gradient-to-b from-darkgblue to-bgblue text-white font-semibold py-2 px-8 rounded-full shadow ");
    			add_location(button, file$1, 27, 16, 1245);
    			attr_dev(div9, "class", " items-center justify-center hidden sm:flex ");
    			add_location(div9, file$1, 26, 12, 1169);
    			attr_dev(div10, "class", "flex-none h-22 px-5 flex items-center justify-around pt-5 ");
    			add_location(div10, file$1, 10, 8, 263);
    			attr_dev(nav, "class", "flex-initial");
    			add_location(nav, file$1, 9, 4, 227);
    			add_location(br, file$1, 37, 95, 1727);
    			attr_dev(span, "class", "text-highlightblue");
    			add_location(span, file$1, 37, 104, 1736);
    			attr_dev(h10, "class", " invisible md:visible   text-5xl lg:text-7xl font-extrabold");
    			add_location(h10, file$1, 37, 16, 1648);
    			attr_dev(h2, "class", "invisible md:visible text-xl lg:text-2xl");
    			add_location(h2, file$1, 38, 16, 1804);
    			attr_dev(div11, "class", "ml-auto my-auto order-2");
    			add_location(div11, file$1, 36, 12, 1593);
    			attr_dev(div12, "class", " flex  pl-8 ");
    			add_location(div12, file$1, 35, 8, 1553);
    			if (img.src !== (img_src_value = "images/Black.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "300px");
    			attr_dev(img, "height", "auto");
    			add_location(img, file$1, 43, 12, 2012);
    			attr_dev(h11, "class", "font-bold text-xl mx-2");
    			add_location(h11, file$1, 46, 24, 2241);
    			attr_dev(h12, "class", "font-bold text-xl mx-2");
    			add_location(h12, file$1, 47, 24, 2312);
    			attr_dev(h13, "class", "font-bold text-xl mx-2");
    			add_location(h13, file$1, 48, 24, 2389);
    			attr_dev(div13, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div13, file$1, 45, 16, 2155);
    			attr_dev(div14, "class", "flex flex-none lg:hidden  justify-center");
    			add_location(div14, file$1, 44, 12, 2082);
    			attr_dev(div15, "class", " items-center justify-center flex flex-col ");
    			add_location(div15, file$1, 42, 8, 1941);
    			attr_dev(div16, "class", "grid grid-cols-3 flex-1 pb-12");
    			add_location(div16, file$1, 34, 4, 1500);
    			attr_dev(path0, "d", "M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z");
    			add_location(path0, file$1, 57, 142, 2824);
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "width", "36");
    			attr_dev(svg0, "height", "36");
    			attr_dev(svg0, "fill", "currentColor");
    			attr_dev(svg0, "class", "bi bi-pencil mx-4");
    			attr_dev(svg0, "viewBox", "0 0 16 16");
    			add_location(svg0, file$1, 57, 12, 2694);
    			attr_dev(h14, "class", "font-bold text-xl");
    			add_location(h14, file$1, 59, 16, 3310);
    			attr_dev(div17, "class", "flex flex-col mr-8 ");
    			add_location(div17, file$1, 58, 12, 3259);
    			attr_dev(div18, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div18, file$1, 56, 8, 2620);
    			attr_dev(div19, "class", "hidden lg:flex absolute pos1 shadow rounded-2xl backdrop-blur cc justify-center svelte-1xkytkd");
    			add_location(div19, file$1, 55, 4, 2517);
    			attr_dev(path1, "stroke-linecap", "round");
    			attr_dev(path1, "stroke-linejoin", "round");
    			attr_dev(path1, "stroke-width", "1");
    			attr_dev(path1, "d", "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z");
    			add_location(path1, file$1, 66, 132, 3704);
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "fill", "none");
    			attr_dev(svg1, "stroke", "currentColor");
    			attr_dev(svg1, "width", "120");
    			attr_dev(svg1, "height", "120");
    			attr_dev(svg1, "viewBox", "0 0 24 24");
    			add_location(svg1, file$1, 66, 12, 3584);
    			attr_dev(h15, "class", "font-bold text-xl");
    			add_location(h15, file$1, 67, 16, 3942);
    			attr_dev(h3, "class", "");
    			add_location(h3, file$1, 68, 16, 4006);
    			attr_dev(div20, "class", "flex flex-col mr-8 ");
    			add_location(div20, file$1, 66, 319, 3891);
    			attr_dev(div21, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div21, file$1, 65, 8, 3510);
    			attr_dev(div22, "class", "hidden lg:flex absolute pos2 shadow rounded-2xl backdrop-blur cc justify-center svelte-1xkytkd");
    			add_location(div22, file$1, 64, 4, 3407);
    			attr_dev(path2, "d", "M2 10h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm9-9h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 9a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-3zm0-10a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-3zM2 9a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H2zm7 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3zM0 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5.354.854a.5.5 0 1 0-.708-.708L3 3.793l-.646-.647a.5.5 0 1 0-.708.708l1 1a.5.5 0 0 0 .708 0l2-2z");
    			add_location(path2, file$1, 75, 149, 4404);
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "width", "48");
    			attr_dev(svg2, "height", "48");
    			attr_dev(svg2, "fill", "currentColor");
    			attr_dev(svg2, "class", "bi bi-ui-checks-grid mx-4");
    			attr_dev(svg2, "viewBox", "0 0 16 16");
    			add_location(svg2, file$1, 75, 12, 4267);
    			attr_dev(h16, "class", "font-bold text-xl");
    			add_location(h16, file$1, 77, 16, 5077);
    			attr_dev(div23, "class", "flex flex-col mr-8 ");
    			add_location(div23, file$1, 76, 12, 5026);
    			attr_dev(div24, "class", "flex flex-row justify-center items-center my-2");
    			add_location(div24, file$1, 74, 8, 4193);
    			attr_dev(div25, "class", "hidden lg:flex absolute pos3 shadow rounded-2xl backdrop-blur cc justify-center svelte-1xkytkd");
    			add_location(div25, file$1, 73, 4, 4090);
    			attr_dev(main, "class", "h-screen flex flex-col text-bgblue");
    			add_location(main, file$1, 7, 0, 170);
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
    			append_dev(main, nav);
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
    			append_dev(div9, button);
    			append_dev(button, p);
    			append_dev(main, t13);
    			append_dev(main, div16);
    			append_dev(div16, div12);
    			append_dev(div12, div11);
    			append_dev(div11, h10);
    			append_dev(h10, t14);
    			append_dev(h10, br);
    			append_dev(h10, t15);
    			append_dev(h10, span);
    			append_dev(div11, t17);
    			append_dev(div11, h2);
    			append_dev(div16, t19);
    			append_dev(div16, div15);
    			append_dev(div15, img);
    			append_dev(div15, t20);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, h11);
    			append_dev(div13, t22);
    			append_dev(div13, h12);
    			append_dev(div13, t24);
    			append_dev(div13, h13);
    			append_dev(main, t26);
    			append_dev(main, div19);
    			append_dev(div19, div18);
    			append_dev(div18, svg0);
    			append_dev(svg0, path0);
    			append_dev(div18, t27);
    			append_dev(div18, div17);
    			append_dev(div17, h14);
    			append_dev(main, t29);
    			append_dev(main, div22);
    			append_dev(div22, div21);
    			append_dev(div21, svg1);
    			append_dev(svg1, path1);
    			append_dev(div21, div20);
    			append_dev(div20, h15);
    			append_dev(div20, t31);
    			append_dev(div20, h3);
    			append_dev(main, t33);
    			append_dev(main, div25);
    			append_dev(div25, div24);
    			append_dev(div24, svg2);
    			append_dev(svg2, path2);
    			append_dev(div24, t34);
    			append_dev(div24, div23);
    			append_dev(div23, h16);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ModeSwitcher, Tailwindcss });
    	return [];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\components\About.svelte generated by Svelte v3.31.2 */
    const file$2 = "src\\components\\About.svelte";

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
    			attr_dev(div0, "class", "absolute h-72 w-72 pos1 text-gray-500  bg-blue-900 rounded-full blurred svelte-1xb9nag");
    			add_location(div0, file$2, 34, 4, 521);
    			attr_dev(div1, "class", "absolute h-96 w-96 pos2 text-gray-500  bg-green-200 opacity-30 rounded-full blurred svelte-1xb9nag");
    			add_location(div1, file$2, 36, 4, 624);
    			attr_dev(div2, "class", "absolute h-96 w-96 pos3 text-gray-500  bg-purple-700 opacity-10  rounded-full blurred svelte-1xb9nag");
    			add_location(div2, file$2, 38, 4, 739);
    			add_location(br, file$2, 44, 88, 1122);
    			attr_dev(h10, "class", "text-3xl md:text-5xl lg:text-7xl font-extrabold");
    			add_location(h10, file$2, 44, 16, 1050);
    			attr_dev(div3, "class", "flex pl-8");
    			add_location(div3, file$2, 43, 12, 1009);
    			attr_dev(div4, "class", "hidden xl:flex flex-1 justify-center ");
    			add_location(div4, file$2, 42, 8, 944);
    			attr_dev(h11, "class", "text-3xl md:text-5xl lg:text-7xl font-extrabold mb-5");
    			add_location(h11, file$2, 50, 16, 1347);
    			attr_dev(div5, "class", "flex xl:hidden  flex-1 justify-center items-center ");
    			add_location(div5, file$2, 49, 12, 1264);
    			if (img0.src !== (img0_src_value = "images/logos/js.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "height", "auto");
    			attr_dev(img0, "width", "56px");
    			attr_dev(img0, "class", "rounded-xl mx-4");
    			add_location(img0, file$2, 55, 20, 1649);
    			attr_dev(h12, "class", "font-bold text-xl ml-4");
    			add_location(h12, file$2, 56, 20, 1754);
    			attr_dev(div6, "class", " w-56 h-16 lg:w-64 lg:h-24     shadow rounded-xl backdrop-blur cc  flex items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div6, file$2, 54, 16, 1519);
    			if (img1.src !== (img1_src_value = "images/logos/html5.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "height", "auto");
    			attr_dev(img1, "width", "56px");
    			attr_dev(img1, "class", "rounded-xl mx-4");
    			add_location(img1, file$2, 61, 24, 1980);
    			attr_dev(h13, "class", "font-bold text-xl mx-4");
    			add_location(h13, file$2, 62, 24, 2092);
    			attr_dev(div7, "class", " w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div7, file$2, 60, 16, 1850);
    			if (img2.src !== (img2_src_value = "images/logos/ps.webp")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "height", "auto");
    			attr_dev(img2, "width", "56px");
    			attr_dev(img2, "class", "rounded-xl mx-4");
    			add_location(img2, file$2, 66, 20, 2322);
    			attr_dev(h14, "class", "font-bold text-xl mx-4");
    			add_location(h14, file$2, 67, 20, 2428);
    			attr_dev(div8, "class", "hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div8, file$2, 65, 16, 2181);
    			attr_dev(div9, "class", "flex-row flex");
    			add_location(div9, file$2, 52, 12, 1472);
    			if (img3.src !== (img3_src_value = "images/logos/gopher.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "height", "auto");
    			attr_dev(img3, "width", "56px");
    			attr_dev(img3, "class", "rounded-xl mx-4");
    			add_location(img3, file$2, 75, 20, 2711);
    			attr_dev(h15, "class", "font-bold text-xl ml-4");
    			add_location(h15, file$2, 76, 20, 2820);
    			attr_dev(div10, "class", "w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div10, file$2, 74, 16, 2586);
    			if (img4.src !== (img4_src_value = "images/logos/svelte.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "height", "auto");
    			attr_dev(img4, "width", "56px");
    			attr_dev(img4, "class", "rounded-xl mx-4");
    			add_location(img4, file$2, 81, 20, 3033);
    			attr_dev(h16, "class", "font-bold text-xl mx-4");
    			add_location(h16, file$2, 82, 20, 3142);
    			attr_dev(div11, "class", "w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div11, file$2, 80, 16, 2908);
    			if (img5.src !== (img5_src_value = "images/logos/xd.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "height", "auto");
    			attr_dev(img5, "width", "56px");
    			attr_dev(img5, "class", "rounded-xl mx-4");
    			add_location(img5, file$2, 86, 20, 3373);
    			attr_dev(h17, "class", "font-bold text-xl mx-4");
    			add_location(h17, file$2, 87, 20, 3478);
    			attr_dev(div12, "class", "hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div12, file$2, 85, 16, 3232);
    			attr_dev(div13, "class", "flex-row flex");
    			add_location(div13, file$2, 72, 12, 2539);
    			if (img6.src !== (img6_src_value = "images/logos/tailwind.png")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "height", "auto");
    			attr_dev(img6, "width", "56px");
    			attr_dev(img6, "class", "rounded-xl mx-4");
    			add_location(img6, file$2, 95, 20, 3754);
    			attr_dev(h18, "class", "font-bold text-xl ml-4");
    			add_location(h18, file$2, 96, 20, 3865);
    			attr_dev(div14, "class", "w-56 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div14, file$2, 94, 16, 3629);
    			if (img7.src !== (img7_src_value = "images/logos/python.png")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "height", "auto");
    			attr_dev(img7, "width", "56px");
    			attr_dev(img7, "class", "rounded-xl mx-4");
    			add_location(img7, file$2, 101, 20, 4085);
    			attr_dev(h19, "class", "font-bold text-xl mx-4");
    			add_location(h19, file$2, 102, 20, 4194);
    			attr_dev(div15, "class", "w-56 h-16 lg:w-64 lg:h-24  shadow rounded-xl backdrop-blur cc  flex items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div15, file$2, 100, 16, 3959);
    			if (img8.src !== (img8_src_value = "images/logos/git.png")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "height", "auto");
    			attr_dev(img8, "width", "56px");
    			attr_dev(img8, "class", "rounded-xl mx-4");
    			add_location(img8, file$2, 106, 20, 4425);
    			attr_dev(h110, "class", "font-bold text-xl mx-4");
    			add_location(h110, file$2, 107, 20, 4531);
    			attr_dev(div16, "class", "hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center mx-4 my-4 svelte-1xb9nag");
    			add_location(div16, file$2, 105, 16, 4284);
    			attr_dev(div17, "class", "flex-row flex");
    			add_location(div17, file$2, 92, 12, 3582);
    			attr_dev(div18, "class", "flex-col flex flex-1 items-center justify-center");
    			add_location(div18, file$2, 48, 8, 1188);
    			attr_dev(div19, "class", " flex flex-1 flex-row min-h-full justify-around items-center z");
    			add_location(div19, file$2, 41, 4, 858);
    			attr_dev(main, "class", "h-screen bg-bgblue flex-col text-whiteblue ");
    			add_location(main, file$2, 31, 0, 453);
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ModeSwitcher, Tailwindcss });
    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\components\Recent.svelte generated by Svelte v3.31.2 */
    const file$3 = "src\\components\\Recent.svelte";

    function create_fragment$4(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let div0;
    	let h1;
    	let t3;
    	let div10;
    	let div3;
    	let div1;
    	let a0;
    	let t5;
    	let h40;
    	let t7;
    	let div2;
    	let img0;
    	let img0_src_value;
    	let t8;
    	let div6;
    	let div4;
    	let a1;
    	let t10;
    	let h41;
    	let t12;
    	let div5;
    	let img1;
    	let img1_src_value;
    	let t13;
    	let div9;
    	let div7;
    	let a2;
    	let t15;
    	let h42;
    	let t16;
    	let br;
    	let t17;
    	let t18;
    	let div8;
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
    			div10 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "getmoney.com";
    			t5 = space();
    			h40 = element("h4");
    			h40.textContent = "Cryptocurrency platform";
    			t7 = space();
    			div2 = element("div");
    			img0 = element("img");
    			t8 = space();
    			div6 = element("div");
    			div4 = element("div");
    			a1 = element("a");
    			a1.textContent = "miramar.qa";
    			t10 = space();
    			h41 = element("h4");
    			h41.textContent = "Architecture and Consulting platform for thousands of plans.";
    			t12 = space();
    			div5 = element("div");
    			img1 = element("img");
    			t13 = space();
    			div9 = element("div");
    			div7 = element("div");
    			a2 = element("a");
    			a2.textContent = "codemetoafterlife.game";
    			t15 = space();
    			h42 = element("h4");
    			t16 = text("Frontend for Code Me To Afterlife, isometric pixel-art  programming   ");
    			br = element("br");
    			t17 = text("game,   for beginners and advanced coders.");
    			t18 = space();
    			div8 = element("div");
    			img2 = element("img");
    			add_location(h1, file$3, 11, 4, 406);
    			attr_dev(div0, "class", "py-16 mb-12  text-bgblue font-extrabold text-6xl flex justify-center items-center");
    			add_location(div0, file$3, 10, 4, 305);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "hover:text-white text-highlightblue font-bold text-4xl");
    			add_location(a0, file$3, 18, 16, 623);
    			attr_dev(h40, "class", "text-bgblue text-xl");
    			add_location(h40, file$3, 19, 16, 732);
    			attr_dev(div1, "class", "flex flex-col");
    			add_location(div1, file$3, 17, 12, 578);
    			if (img0.src !== (img0_src_value = "images/crypto.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "width", "650px");
    			attr_dev(img0, "height", "auto");
    			attr_dev(img0, "class", "rounded-xl shadow-md");
    			add_location(img0, file$3, 22, 16, 863);
    			attr_dev(div2, "class", "ml-12");
    			add_location(div2, file$3, 21, 12, 826);
    			attr_dev(div3, "class", "grid grid-cols-2 items-center py-12");
    			add_location(div3, file$3, 16, 8, 515);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "hover:text-white text-highlightblue font-bold text-4xl");
    			add_location(a1, file$3, 28, 16, 1105);
    			attr_dev(h41, "class", "text-bgblue text-xl");
    			add_location(h41, file$3, 29, 16, 1212);
    			attr_dev(div4, "class", "flex flex-col");
    			add_location(div4, file$3, 27, 12, 1060);
    			if (img1.src !== (img1_src_value = "images/miramar.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "width", "650px");
    			attr_dev(img1, "height", "auto");
    			attr_dev(img1, "class", "rounded-xl shadow-md");
    			add_location(img1, file$3, 32, 16, 1381);
    			attr_dev(div5, "class", "ml-12");
    			add_location(div5, file$3, 31, 12, 1343);
    			attr_dev(div6, "class", "grid grid-cols-2 items-center py-12");
    			add_location(div6, file$3, 26, 8, 997);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "hover:text-white text-highlightblue font-bold text-4xl");
    			add_location(a2, file$3, 38, 16, 1624);
    			add_location(br, file$3, 39, 118, 1845);
    			attr_dev(h42, "class", "text-bgblue text-xl");
    			add_location(h42, file$3, 39, 16, 1743);
    			attr_dev(div7, "class", "flex flex-col");
    			add_location(div7, file$3, 37, 12, 1579);
    			if (img2.src !== (img2_src_value = "images/afterlife.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "width", "650px");
    			attr_dev(img2, "height", "auto");
    			attr_dev(img2, "class", "rounded-xl shadow-md");
    			add_location(img2, file$3, 42, 16, 1968);
    			attr_dev(div8, "class", "ml-12");
    			add_location(div8, file$3, 41, 12, 1930);
    			attr_dev(div9, "class", "grid grid-cols-2 items-center py-12");
    			add_location(div9, file$3, 36, 8, 1516);
    			attr_dev(div10, "class", "flex flex-1 flex-col items-center px-16");
    			add_location(div10, file$3, 14, 4, 450);
    			attr_dev(main, "class", " flex flex-1 flex-col justify-center  text-whiteblue  bg-gradient-to-tl to-lgrayblue from-white");
    			add_location(main, file$3, 8, 0, 187);
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
    			append_dev(main, div10);
    			append_dev(div10, div3);
    			append_dev(div3, div1);
    			append_dev(div1, a0);
    			append_dev(div1, t5);
    			append_dev(div1, h40);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, img0);
    			append_dev(div10, t8);
    			append_dev(div10, div6);
    			append_dev(div6, div4);
    			append_dev(div4, a1);
    			append_dev(div4, t10);
    			append_dev(div4, h41);
    			append_dev(div6, t12);
    			append_dev(div6, div5);
    			append_dev(div5, img1);
    			append_dev(div10, t13);
    			append_dev(div10, div9);
    			append_dev(div9, div7);
    			append_dev(div7, a2);
    			append_dev(div7, t15);
    			append_dev(div7, h42);
    			append_dev(h42, t16);
    			append_dev(h42, br);
    			append_dev(h42, t17);
    			append_dev(div9, t18);
    			append_dev(div9, div8);
    			append_dev(div8, img2);
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

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Recent", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Recent> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ModeSwitcher, Tailwindcss });
    	return [];
    }

    class Recent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

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

    function isObject(o) {
      return Object.prototype.toString.call(o) === '[object Object]';
    }

    function isPlainObject(o) {
      var ctor,prot;

      if (isObject(o) === false) return false;

      // If has modified constructor
      ctor = o.constructor;
      if (ctor === undefined) return true;

      // If has modified prototype
      prot = ctor.prototype;
      if (isObject(prot) === false) return false;

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

    function parse(options) {
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
        return parse(merge(defaults, route, options));
    }

    function withDefaults(oldDefaults, newDefaults) {
        const DEFAULTS = merge(oldDefaults, newDefaults);
        const endpoint = endpointWithDefaults.bind(null, DEFAULTS);
        return Object.assign(endpoint, {
            DEFAULTS,
            defaults: withDefaults.bind(null, DEFAULTS),
            merge: merge.bind(null, DEFAULTS),
            parse,
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

    const octokit = new Octokit$1({
        auth: "8f397710a1cbd288eddbad95492d091b57ee9959",
    });
    async function asyncFunc() {
        const { data } = await octokit.request("/users/Adam-Alani/repos");
        console.log(data);
        return data;
    }

    /* src\components\Projects.svelte generated by Svelte v3.31.2 */
    const file$4 = "src\\components\\Projects.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	child_ctx[3] = i;
    	return child_ctx;
    }

    // (1:0) <script lang="ts">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script lang=\\\"ts\\\">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }",
    		ctx
    	});

    	return block;
    }

    // (15:38)                     <div class="grid grid-cols-3 ">                      {#each data as repo, i}
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

    			attr_dev(div, "class", "grid grid-cols-3 ");
    			add_location(div, file$4, 16, 16, 560);
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
    		source: "(15:38)                     <div class=\\\"grid grid-cols-3 \\\">                      {#each data as repo, i}",
    		ctx
    	});

    	return block;
    }

    // (19:24) {#if (i > 0 && repo.language !== null)}
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
    		return create_else_block$1;
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
    			attr_dev(h1, "class", "font-semibold text-2xl ml-8 mt-4");
    			add_location(h1, file$4, 23, 40, 995);
    			attr_dev(p, "class", "font-medium px-8");
    			add_location(p, file$4, 24, 40, 1103);
    			add_location(div0, file$4, 22, 36, 948);
    			attr_dev(div1, "class", "flex-grow");
    			add_location(div1, file$4, 21, 32, 887);
    			attr_dev(div2, "class", "flex-none mb-2");
    			add_location(div2, file$4, 27, 32, 1273);
    			attr_dev(div3, "class", " w-96 h-48 shadow-md rounded-3xl bg-buttonblue flex flex-col flex-1 mx-4 my-4");
    			add_location(div3, file$4, 20, 28, 762);
    			add_location(div4, file$4, 19, 24, 727);
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
    		source: "(19:24) {#if (i > 0 && repo.language !== null)}",
    		ctx
    	});

    	return block;
    }

    // (36:36) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let h1;
    	let t_value = /*repo*/ ctx[1].language + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			t = text(t_value);
    			attr_dev(h1, "class", "mx-4 my-1 ");
    			add_location(h1, file$4, 37, 44, 2052);
    			attr_dev(div, "class", "mx-8 bg-green-600 inline-block rounded ");
    			add_location(div, file$4, 36, 40, 1953);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(36:36) {:else}",
    		ctx
    	});

    	return block;
    }

    // (29:36) {#if ( repo.language !== "C#")}
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
    			attr_dev(h1, "class", "mx-4 my-1 ");
    			add_location(h1, file$4, 30, 44, 1517);
    			attr_dev(div, "class", "mx-8 bg-" + /*repo*/ ctx[1].language + " inline-block rounded ");
    			add_location(div, file$4, 29, 40, 1412);
    			if (img.src !== (img_src_value = "images/logos/github.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "float-right mr-5");
    			attr_dev(img, "width", "28px");
    			attr_dev(img, "height", "auto");
    			add_location(img, file$4, 33, 40, 1732);
    			attr_dev(a, "href", /*repo*/ ctx[1].html_url);
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$4, 32, 40, 1650);
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
    		source: "(29:36) {#if ( repo.language !== \\\"C#\\\")}",
    		ctx
    	});

    	return block;
    }

    // (18:20) {#each data as repo, i}
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
    		source: "(18:20) {#each data as repo, i}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script lang="ts">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }
    function create_pending_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0) <script lang=\\\"ts\\\">import ModeSwitcher from '../ModeSwitcher.svelte';  import Tailwindcss from '../Tailwindcss.svelte';  import { asyncFunc }",
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
    			add_location(h1, file$4, 11, 8, 396);
    			attr_dev(div0, "class", "py-16 mb-12  text-bgblue font-extrabold text-6xl flex justify-center items-center");
    			add_location(div0, file$4, 10, 4, 291);
    			attr_dev(div1, "class", "flex-col flex flex-1 items-center justify-center");
    			add_location(div1, file$4, 13, 4, 438);
    			attr_dev(main, "class", " flex flex-1 flex-col justify-center   bg-white ");
    			add_location(main, file$4, 8, 0, 220);
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

    function instance$5($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Projects",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.31.2 */
    const file$5 = "src\\App.svelte";

    function create_fragment$6(ctx) {
    	let tailwindcss;
    	let t0;
    	let modeswitcher;
    	let t1;
    	let main;
    	let home;
    	let t2;
    	let about;
    	let t3;
    	let recent;
    	let t4;
    	let projects;
    	let current;
    	tailwindcss = new Tailwindcss({ $$inline: true });
    	modeswitcher = new ModeSwitcher({ $$inline: true });
    	home = new Home({ $$inline: true });
    	about = new About({ $$inline: true });
    	recent = new Recent({ $$inline: true });
    	projects = new Projects({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tailwindcss.$$.fragment);
    			t0 = space();
    			create_component(modeswitcher.$$.fragment);
    			t1 = space();
    			main = element("main");
    			create_component(home.$$.fragment);
    			t2 = space();
    			create_component(about.$$.fragment);
    			t3 = space();
    			create_component(recent.$$.fragment);
    			t4 = space();
    			create_component(projects.$$.fragment);
    			attr_dev(main, "class", "bg-gradient-to-tl from-gradienttop to-whiteblue h-screen");
    			add_location(main, file$5, 10, 0, 360);
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
    			mount_component(home, main, null);
    			append_dev(main, t2);
    			mount_component(about, main, null);
    			append_dev(main, t3);
    			mount_component(recent, main, null);
    			append_dev(main, t4);
    			mount_component(projects, main, null);
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
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tailwindcss.$$.fragment, local);
    			transition_out(modeswitcher.$$.fragment, local);
    			transition_out(home.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			transition_out(recent.$$.fragment, local);
    			transition_out(projects.$$.fragment, local);
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

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ModeSwitcher,
    		Tailwindcss,
    		Home,
    		About,
    		Recent,
    		Projects
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});
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
