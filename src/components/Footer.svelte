<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';


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

    .pos3a {
        top: 520%;
        left: 70%;
    }

    .pos1a {
        top: 505%;
        left: 45%;
    }

    .pos2a {
        top: 542%;
        left: 10%;
    }
</style>


<main class=" bg-bgblue text-white mt-16 ">

    <div class="flex flex-row justify-around">
        <div class="flex-1 mt-8">
            <div class="flex justify-center items-center">
                <div class="py-8 mb-12  text-whiteblue font-extrabold text-3xl md:text-4xl lg:text-5xl">
                    <h1 class="z-20">Email me</h1>
                </div>
            </div>

            <div class="flex-1 flex items-center justify-around z-30 text-2xl pb-24  ">
                <div class="flex-1 flex justify-center items-center">
                        <a href="mailto:adamalany@gmail.com" class="mx-5 bg-green-600 rounded-3xl py-2 px-6 text-xl md:text-2xl lg:text-3xl">
                            Click Here!
                        </a>
                </div>
            </div>
        </div>

        <div class="flex-1 mt-8">
            <div class="flex justify-center items-center">
                <div class="py-8 mb-12  text-whiteblue font-extrabold text-3xl md:text-4xl lg:text-5xl">
                    <h1 class="z-20">Get in touch</h1>
                </div>
            </div>

            <div class="flex-1 flex items-center justify-around z-30 text-base md:text-xl lg:text-2xl pb-24  ">
                <div class="flex-initial flex flex-col">


                    <a href="mailto:adamalany@gmail.com" class="mx-5 py-2 " target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="24" height="auto" class="inline-block mr-4">
                            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                        </svg>
                        <span class="inline-block">adamalany@gmail.com</span>
                    </a>




                    <a href="https://twitter.com/unebrosseadam" class="mx-5 py-2 " target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-twitter inline-block mr-4" viewBox="0 0 16 16"><path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/></svg>
                        <span class="inline-block">@unebrossadam</span>
                    </a>


                    <a href="#" class="mx-5 py-2 " target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-discord inline-block mr-4" viewBox="0 0 16 16"><path d="M6.552 6.712c-.456 0-.816.4-.816.888s.368.888.816.888c.456 0 .816-.4.816-.888.008-.488-.36-.888-.816-.888zm2.92 0c-.456 0-.816.4-.816.888s.368.888.816.888c.456 0 .816-.4.816-.888s-.36-.888-.816-.888z"/><path d="M13.36 0H2.64C1.736 0 1 .736 1 1.648v10.816c0 .912.736 1.648 1.64 1.648h9.072l-.424-1.48 1.024.952.968.896L15 16V1.648C15 .736 14.264 0 13.36 0zm-3.088 10.448s-.288-.344-.528-.648c1.048-.296 1.448-.952 1.448-.952-.328.216-.64.368-.92.472-.4.168-.784.28-1.16.344a5.604 5.604 0 0 1-2.072-.008 6.716 6.716 0 0 1-1.176-.344 4.688 4.688 0 0 1-.584-.272c-.024-.016-.048-.024-.072-.04-.016-.008-.024-.016-.032-.024-.144-.08-.224-.136-.224-.136s.384.64 1.4.944c-.24.304-.536.664-.536.664-1.768-.056-2.44-1.216-2.44-1.216 0-2.576 1.152-4.664 1.152-4.664 1.152-.864 2.248-.84 2.248-.84l.08.096c-1.44.416-2.104 1.048-2.104 1.048s.176-.096.472-.232c.856-.376 1.536-.48 1.816-.504.048-.008.088-.016.136-.016a6.521 6.521 0 0 1 4.024.752s-.632-.6-1.992-1.016l.112-.128s1.096-.024 2.248.84c0 0 1.152 2.088 1.152 4.664 0 0-.68 1.16-2.448 1.216z"/></svg>
                        <span class="inline-block">Adam#2080</span>
                    </a>

                    <a href="https://www.linkedin.com/in/adam-alani-8a164b1b0/" class="mx-5 py-2 " target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-linkedin inline-block mr-4" viewBox="0 0 16 16"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/></svg>
                        <span class="inline-block">adam-alani</span>
                    </a>

                    <a href="https://github.com/Adam-Alani" class="mx-5 py-2 " target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-github inline-block mr-4" viewBox="0 0 16 16"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
                         <span class="inline-block">Adam-Alani</span>
                    </a>
                </div>
            </div>
        </div>




    </div>





</main>
