<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';

    import ScrollReveal from 'scrollreveal';
    import { onMount} from 'svelte';
    let visible = false;
    onMount(()=> {
        visible = true;


        const proj = ScrollReveal({
            scale: 0.8,
            opacity: 0,
            duration: 1000,
            reset: false,

        });

        ScrollReveal().reveal('.lreveal', {});

        proj.reveal('.gridbox' , {interval: 200} );
    })

</script>
<Tailwindcss />
<style>

</style>


<main class=" flex flex-grow flex-col justify-center  text-whiteblue  bg-gradient-to-tl to-lgrayblue from-white  ">

    <div class="py-16 mb-12  text-bgblue font-extrabold text-4xl md:text-5xl lg:text-6xl flex justify-center items-center">
    <h1 class="lreveal select-none">Recent Projects</h1>
    </div>

    <div class="flex flex-1 flex-col items-center px-16 ">

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox">
            <div class="flex flex-col text-center justify-center  items-center  lg:items-baseline pb-8">
                <div>
                <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl  transition duration-300 ease-out">getmoney.com</a>
                </div>
                <h4 class="text-bgblue text-xl select-none">Cryptocurrency platform</h4>
            </div>
            <div class="ml-12">
                <img src="images/crypto.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center py-12 gridbox ">
            <div class="flex flex-col justify-center text-center  items-center  lg:items-baseline pb-8">
                <div>
                <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl  transition duration-300 ease-out">miramar.qa</a>
                </div>
                <h4 class="text-bgblue text-xl select-none">Architecture and Consulting platform for thousands of plans.</h4>
            </div>
            <div  class="ml-12">
                <img src="images/miramar.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center py-12 gridbox">
            <div class="flex flex-col justify-around  items-center  lg:items-baseline pb-8 text-center  lg:text-left">
                <div>
                <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl transition duration-300 ease-out">codemetoafterlife.game</a>
                </div>
                <h4 class="text-bgblue text-xs text-xl select-none ">Frontend for Code Me To Afterlife, isometric pixel-art  programming   <br>game,   for beginners and advanced coders.</h4>
            </div>
            <div  class="ml-12">
                <img src="images/afterlife.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
            </div>
        </div>




    </div>




</main>
