<script lang="ts">
	import ModeSwitcher from './ModeSwitcher.svelte';
	import Tailwindcss from './Tailwindcss.svelte';
	import Home from './components/Home.svelte';
    import About from './components/About.svelte';
    import Recent from './components/Recent.svelte';
    import Projects from './components/Projects.svelte';
</script>

<Tailwindcss />
<ModeSwitcher />
<main class="bg-gradient-to-tl from-gradienttop to-whiteblue h-screen">
    <Home/>
    <About/>
    <Recent/>
    <Projects/>






</main>
