<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';
    import {asyncFunc} from "../utils/github_api";



</script>

<Tailwindcss />

<style>
</style>


<main class=" flex flex-1 flex-col justify-center bg-white ">
    <div class="py-16 mb-12  text-bgblue font-extrabold text-4xl md:text-5xl lg:text-6xl flex justify-center items-center ">
        <h1 class="select-none  ">Featured</h1>
    </div>

    <div class="flex flex-1 flex-col items-center px-16 lg:hidden">

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox">
            <div class="flex flex-col text-center justify-center  items-center  lg:items-baseline pb-8">
                <div>
                    <a href="https://parcourstup.live/" target="_blank" class="hover:text-white text-highlightblue font-bold text-4xl  transition duration-300 ease-out" >parcourstup.live</a>
                </div>
                <h4 class="text-gblue text-xl select-none">Online platform to predict, calculate, and visualize grades and admissions based of off Parcoursups 2020 data </h4>
            </div>
            <div class="ml-12">
                <img src="images/parcourstup.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox">
            <div class="flex flex-col text-center justify-center  items-center  lg:items-baseline pb-8">
                <div>
                    <a href="https://epiclass.vercel.app/" target="_blank" class="hover:text-white text-highlightblue font-bold text-4xl  transition duration-300 ease-out" >epiclass.vercel.app</a>
                </div>
                <h4 class="text-gblue text-xl select-none">Calendar web app that uses school calend API/system to keep track of courses for all grades. </h4>
            </div>
            <div class="ml-12">
                <img src="images/parcourstup.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox">
            <div class="flex flex-col text-center justify-center  items-center  lg:items-baseline pb-8">
                <div>
                    <a href="https://shit-tetris.glitch.me" target="_blank" class="hover:text-white text-highlightblue font-bold text-4xl  transition duration-300 ease-out" >shit-tetris.glitch.me</a>
                </div>
                <h4 class="text-gblue text-xl select-none">Tetris implemented with javascript and svelte for fun (also included: Minesweeper and Snake game)</h4>
            </div>
            <div class="ml-12">
                <img src="images/parcourstup.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
            </div>
        </div>
    </div>


    <div class="flex flex-1 flex-col items-center px-16 hidden lg:flex ">

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox">
            <div class="mx-12 flex justify-end ">
                <a href="https://parcourstup.live/" target="_blank" >
                <img src="images/parcourstup.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
                </a>
            </div>
            <div class="  lg:items-baseline pb-8  flex-col justify-start text-right items-center mr-36 ">
                <div class="  px-4 py-4 ">
                    <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl   transition duration-300 ease-out ">parcourstup.live</a>
                </div>
                <div class="mb-2 flex  ">

                </div>
                <div class=" bg-bgblue px-4 py-4 rounded-xl shadow-2xl ">
                    <h4 class="text-white text-xl select-none">Online platform to predict, calculate, and visualize grades and admissions based of off Parcoursups 2020 data </h4>
                    <h4 class=" text-whiteblue font-light text select-none mt-10">Typescript // Svelte // Golang</h4>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox">

            <div class="  lg:items-baseline pb-8  flex-col justify-start  items-center ml-36 ">
                <div class="  px-4 py-4 ">
                    <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl   transition duration-300 ease-out ">epiclass.vercel.app</a>
                </div>
                <div class="mb-2 flex  ">

                </div>
                <div class=" bg-bgblue px-4 py-4 rounded-xl shadow-2xl ">
                    <h4 class="text-white text-xl select-none">Calendar web app that uses school calend API/system to keep track of courses for all grades. </h4>
                    <h4 class=" text-whiteblue font-light text select-none mt-10">Javascript // Svelte // Golang</h4>
                </div>
            </div>
            <div class="mx-12 flex justify-end ">
                <a href="https://epiclass.vercel.app/" target="_blank" >
                    <img src="images/epiclass.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
                </a>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 items-center pb-12 gridbox">
            <div class="mx-12 flex justify-end ">
                <a href="https://shit-tetris.glitch.me/" target="_blank" >
                    <img src="images/tetris.png" width="650px" height="auto" class="rounded-xl shadow-md transition duration-500 ease-in-out transform  hover:scale-110">
                </a>
            </div>
            <div class="  lg:items-baseline pb-8  flex-col justify-start text-right items-center mr-36 ">
                <div class="  px-4 py-4 ">
                    <a href="#" class="hover:text-white text-highlightblue font-bold text-4xl   transition duration-300 ease-out ">shit-tetris.glitch.me/</a>
                </div>
                <div class="mb-2 flex  ">

                </div>
                <div class=" bg-bgblue px-4 py-4 rounded-xl shadow-2xl ">
                    <h4 class="text-white text-xl select-none">Tetris implemented with javascript and svelte for fun (also included: Minesweeper and Snake game)</h4>
                    <h4 class=" text-whiteblue font-light text select-none mt-10">Javascript // Svelte </h4>
                </div>
            </div>
        </div>
    </div>

</main>

