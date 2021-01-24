<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';
</script>
<Tailwindcss />
<ModeSwitcher />
<style>
</style>


<main class=" flex flex-1 flex-col justify-center  text-whiteblue  bg-gradient-to-tl to-lgrayblue from-white">

    <div class="py-16 mb-12  text-bgblue font-extrabold text-6xl flex justify-center items-center">
    <h1>Recent Projects</h1>
    </div>

    <div class="flex flex-1 flex-col items-center px-16">

        <div class="grid grid-cols-2 items-center py-12">
            <div class="flex flex-col">
                <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl">getmoney.com</a>
                <h4 class="text-bgblue text-xl">Cryptocurrency platform</h4>
            </div>
            <div class="ml-12">
                <img src="images/crypto.png" width="650px" height="auto" class="rounded-xl shadow-md">
            </div>
        </div>

        <div class="grid grid-cols-2 items-center py-12">
            <div class="flex flex-col">
                <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl">miramar.qa</a>
                <h4 class="text-bgblue text-xl">Architecture and Consulting platform for thousands of plans.</h4>
            </div>
            <div  class="ml-12">
                <img src="images/miramar.png" width="650px" height="auto" class="rounded-xl shadow-md">
            </div>
        </div>

        <div class="grid grid-cols-2 items-center py-12">
            <div class="flex flex-col">
                <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl">codemetoafterlife.game</a>
                <h4 class="text-bgblue text-xl">Frontend for Code Me To Afterlife, isometric pixel-art  programming   <br>game,   for beginners and advanced coders.</h4>
            </div>
            <div  class="ml-12">
                <img src="images/afterlife.png" width="650px" height="auto" class="rounded-xl shadow-md">
            </div>
        </div>




    </div>




</main>
