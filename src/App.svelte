<script lang="ts">
	import ModeSwitcher from './ModeSwitcher.svelte';
	import Tailwindcss from './Tailwindcss.svelte';
	import Home from './components/Home.svelte';
    import About from './components/About.svelte';
    import Recent from './components/Recent.svelte';
    import Projects from './components/Projects.svelte';
    import Featured from './components/Featured.svelte'
    import Footer from './components/Footer.svelte';


    export let menu = 1;
</script>

<Tailwindcss />
<ModeSwitcher />
<main id="home">

    <div class="bg-gradient-to-tl from-gradienttop to-whiteblue ">
    <nav class="flex-initial">

        <div class="flex-none h-22 px-5 flex items-center justify-around pt-5  ">
            <div class="flex items-center hidden sm:flex flex-1 items-center justify-center  ">
                <div class="ml-6 leading-none">
                    <div class=""><a href="https://github.com/Adam-Alani" target=”_blank” class=" font-bold text-2xl  hover:text-highlightblue transition duration-500 ease-in-out transform  hover:scale-110  ">Adam</a></div>
                </div>
            </div>

            <div class="flex flex-1 flex-col justify-center  items-center text-2xl">
                <div class="flex flex-1 items-center justify-center max-w-full text-bgblue">
                    <div class="mx-3 hover:text-white transition duration-300 ease-in-out transform  hover:scale-110"><a href=#home >Home</a></div>
                    <div class="mx-3 hover:text-white transition duration-300 ease-in-out transform  hover:scale-110"><a href="#about">About</a></div>
                    <div class="mx-3 hover:text-white transition duration-300 ease-in-out transform  hover:scale-110"><a href="#recent">Recent</a></div>
                    <div class="mx-3 hover:text-white transition duration-300 ease-in-out transform  hover:scale-110 "><a href="#project " class="">Projects</a></div>
                </div>
            </div>

            <div class=" hidden sm:flex  flex-1 items-center justify-center  ">
                <a href="mailto:adamalany@gmail.com" class="mx-2 text-xl bg-gradient-to-b from-darkgblue to-bgblue font-semibold rounded-full py-2 px-10 shadow text-white transition duration-500 ease-in-out transform  hover:scale-110">
                    Contact
                </a>
            </div>
        </div>
    </nav>

    <Home/>

    </div>
    <div id="about">
    <About/>
    </div>

    <div id="featured">
        <Featured/>
    </div>

    <div id="recent">
    <Recent/>
    </div>
    <div id="project">
    <Projects/>
    </div>
    <Footer/>




</main>
