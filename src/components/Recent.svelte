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
    <h1 class="lreveal select-none">Design</h1>
    </div>

    <div class="flex flex-1 flex-col items-center px-16 ">

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 items-center pb-12 gridbox">
            <img src="images/crypto.png" width="950px" height="auto" class="rounded-xl my-3  shadow-md ">
            <img src="images/afterlife.png" width="950px" height="auto" class="rounded-xl my-3   shadow-md">
            <img src="images/miramar.png" width="950px" height="auto" class="rounded-xl my-3   shadow-md ">
            <img src="images/stack.png" width="950px" height="auto" class="rounded-xl my-3   shadow-md">
        </div>
    </div>







</main>
