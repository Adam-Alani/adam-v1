<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';

    import ScrollReveal from 'scrollreveal';
    import { onMount} from 'svelte';
    import { fade} from "svelte/transition";
    let visible = false;
    onMount(()=> {
        visible = true;


        const sr = ScrollReveal({
            scale: 0.5,
            opacity:0,
            reset: true,
        });

        sr.reveal('.textreveal');

        sr.reveal('.boxreveal' , {duration: 1000 });




    })

</script>
<Tailwindcss />

<style>
    .cc {
        border-width: 1px;
        border-color: rgba(255, 255, 255, 0.15) ;
        background-color: rgba(255, 255, 255, 0.15);
    }


    .blurred {
        filter: blur(60px);
    }

    .pos1 {
        top: 150%;

        right: 30%;
    }

    .pos2 {
        top: 105%;

        right: 75%;
    }

    .pos3 {
        top: 132%;

        right:90%;
    }
</style>


<main class="h-screen bg-bgblue flex-col text-whiteblue w-full h-full select-none ">


    <div class="absolute h-72 w-72 pos1 text-gray-500  bg-blue-900 rounded-full blurred ">
    </div>
    <div class="absolute h-96 w-96 pos2 text-gray-500  bg-green-200 opacity-30 rounded-full blurred  ">
    </div>
    <div class="absolute h-96 w-96 pos3 text-gray-500  bg-purple-700 opacity-10  rounded-full blurred  ">
    </div>

    <div class=" flex flex-1 flex-row min-h-full justify-around items-center z">
        <div class="hidden xl:flex flex-1 justify-center ">
            <div class="flex pl-8">
                <h1 class="text-3xl md:text-5xl lg:text-7xl font-extrabold textreveal ">Here's what <br>I can do.</h1>
            </div>
        </div>

        <div class="flex-col flex flex-1 items-center justify-center">
            <div class="flex xl:hidden  flex-1 justify-center items-center  ">
                <h1 class="text-3xl md:text-5xl lg:text-7xl font-extrabold mb-5 textreveal">Here's what I can do.</h1>
            </div>
            <div class="flex-row flex ">

                <div class=" w-48 h-16 lg:w-64 lg:h-24   shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal  ">
                    <img src="images/logos/js.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-4">Javascript</h1>
                </div>


                <div class=" w-48 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal">
                        <img src="images/logos/html5.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                        <h1 class="font-bold text-xl ml-2">HTML5</h1>
                </div>

                <div class="hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center ml-2 my-4 boxreveal">
                    <img src="images/logos/ps.webp" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-2">Photoshop</h1>
                </div>

            </div>

            <div class="flex-row flex">

                <div class="w-48 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal">
                    <img src="images/logos/gopher.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-4">Go</h1>
                </div>


                <div class="w-48 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal">
                    <img src="images/logos/svelte.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-2">Svelte</h1>
                </div>

                <div class="hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center ml-2 my-4 boxreveal">
                    <img src="images/logos/xd.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-2">XD</h1>
                </div>

            </div>

            <div class="flex-row flex">

                <div class="w-48 h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal">
                    <img src="images/logos/tailwind.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-4">Tailwind</h1>
                </div>


                <div class="w-48 h-16 lg:w-64 lg:h-24  shadow rounded-xl backdrop-blur cc  flex items-center ml-2 my-4 boxreveal">
                    <img src="images/logos/python.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-2">Python</h1>
                </div>

                <div class="hidden md:flex md:w-56 md:h-16 lg:w-64 lg:h-24 shadow rounded-xl backdrop-blur cc  items-center ml-2 my-4 boxreveal">
                    <img src="images/logos/git.png" height="auto" width="56px" class="rounded-xl ml-2"/>
                    <h1 class="font-bold text-xl ml-2">Git</h1>
                </div>

            </div>
        </div>
    </div>


</main>
