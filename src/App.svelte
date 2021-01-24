<script lang="ts">
	import ModeSwitcher from './ModeSwitcher.svelte';
	import Tailwindcss from './Tailwindcss.svelte';
	import Home from './components/Home.svelte';
    import About from './components/About.svelte';
    import Recent from './components/Recent.svelte';
    import Projects from './components/Projects.svelte';
    import Footer from './components/Footer.svelte';



</script>

<Tailwindcss />
<ModeSwitcher />
<main class="">

    <div class="bg-gradient-to-tl from-gradienttop to-whiteblue ">
    <nav class="flex-initial">
        <div class="flex-none h-22 px-5 flex items-center justify-around pt-5 ">
            <div class="flex items-center hidden sm:flex ">
                <div class="ml-6 leading-none">
                    <div class=""><a href="#" class=" font-bold text-2xl  hover:text-highlightblue">Adam</a></div>
                </div>
            </div>

            <div class="flex flex-col justify-center text-2xl">
                <div class="flex items-center justify-center max-w-full text-bgblue">
                    <div class="mx-3 hover:text-white"><a href="#" class="">Home</a></div>
                    <div class="mx-3 hover:text-white"><a href="#">About</a></div>
                    <div class="mx-3 hover:text-white"><a href="#">Services</a></div>
                    <div class="mx-3 hover:text-white"><a href="#">Projects</a></div>
                </div>
            </div>

            <div class=" items-center justify-center hidden sm:flex ">
                <a href="mailto:adamalany@gmail.com" class="mx-2 text-xl bg-gradient-to-b from-darkgblue to-bgblue font-semibold rounded-full py-2 px-10 shadow text-white">
                    Contact
                </a>
            </div>
        </div>
    </nav>

    <Home/>

    </div>
    <About/>
    <Recent/>
    <Projects/>
    <Footer/>




</main>
