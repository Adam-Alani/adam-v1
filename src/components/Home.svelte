<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';
    import ScrollReveal from 'scrollreveal';
    import { onMount} from 'svelte';
    import { fade} from "svelte/transition";
    let visible = false;
    onMount(()=> {
        visible = true;


        const logoreveal = ScrollReveal({
            scale: 0.5,
            opacity: 1,
            duration: 750,
            reset: true,
        });

        logoreveal.reveal('.lreveal', {});

        ScrollReveal().reveal('.pos1' , {delay: 100})
        ScrollReveal().reveal('.pos2' , {delay: 200})
        ScrollReveal().reveal('.pos3' , {delay: 300})
    })


</script>
<Tailwindcss />



<main class="h-screen flex flex-col text-bgblue select-none">



    <div class="grid grid-cols-3 flex-1 pb-12">
        <div class=" flex  pl-8 ">
            <div class="ml-auto my-auto order-2 ">
                {#if (visible)}
                    <h1 transition:fade class=" invisible md:visible   text-5xl lg:text-7xl font-extrabold  "  >Hello, <br> I'm <span class="text-highlightblue ">Adam.</span></h1>
                    <h2 transition:fade={{duration:1000}} class="invisible md:visible text-xl lg:text-2xl"><span class="hover:text-whiteblue transition duration-300 ease-out">Developer</span>, <span class="hover:text-whiteblue transition duration-300 ease-out">Designer</span> and <span class="hover:text-whiteblue transition duration-300 ease-out">Student</span></h2>
                {/if}
            </div>
        </div>

        <div class=" items-center justify-center flex flex-col ">
            <img src="images/Black.png" width="300px" height="auto" class="lreveal ">
            <div class="flex flex-none lg:hidden  justify-center" >
                <div class="flex flex-row justify-center items-center my-2">
                        <h1 class="font-bold text-xl mx-2">UI/UX</h1>
                        <h1 class="font-bold text-xl mx-2">Development</h1>
                        <h1 class="font-bold text-xl mx-2">Design</h1>
                </div>
            </div>
        </div>
    </div>


    <div class="hidden lg:flex absolute pos1 shadow rounded-2xl backdrop-blur cc justify-center ">
        <div class="flex flex-row justify-center items-center my-2 ">
            <svg  xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" class="bi bi-pencil mx-4" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>
            <div class="flex flex-col mr-8 ">
                <h1 class="font-bold text-xl">Design</h1>
            </div>
        </div>
    </div>

    <div class="hidden lg:flex absolute pos2 shadow rounded-2xl backdrop-blur cc justify-center ">
        <div class="flex flex-row justify-center items-center my-2  ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" width="120" height="120"  viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg><div class="flex flex-col mr-8 ">
                <h1 class="font-bold text-xl">Development</h1>
                <h3 class="">Full Stack</h3>
            </div>
        </div>
    </div>


    <div class="hidden lg:flex absolute pos3 shadow rounded-2xl backdrop-blur cc justify-center ">
        <div class="flex flex-row justify-center items-center my-2 ">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-ui-checks-grid mx-4" viewBox="0 0 16 16"><path d="M2 10h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1zm9-9h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm0 9a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-3zm0-10a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2h-3zM2 9a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H2zm7 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2v-3zM0 2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5.354.854a.5.5 0 1 0-.708-.708L3 3.793l-.646-.647a.5.5 0 1 0-.708.708l1 1a.5.5 0 0 0 .708 0l2-2z"/></svg>
            <div class="flex flex-col mr-8 ">
                <h1 class="font-bold text-xl">UI/UX</h1>
            </div>
        </div>
    </div>
    <div class="flex justify-center items-center pb-12 mb-12">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-12 h-12 animate-bounce">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
    </svg>
    </div>

</main>

<style>
    .cc {
        border-width: 1px;
        background-color: rgba(255, 255, 255, 0.45);
    }

    .pos1 {
        top: 40%;
        left: 56%;
    }

    .pos2 {
        top: 55%;
        left: 59%;
    }

    .pos3 {
        top: 66%;
        left: 47%;
    }
</style>
