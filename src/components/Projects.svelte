
<script lang="ts">
    import ModeSwitcher from '../ModeSwitcher.svelte';
    import Tailwindcss from '../Tailwindcss.svelte';
    import {asyncFunc} from "../utils/github_api";



</script>

<Tailwindcss />
<ModeSwitcher />
<style>

</style>


<main class=" flex flex-1 flex-col justify-center bg-white   ">
    <div class="py-16 mb-12  text-bgblue font-extrabold text-4xl md:text-5xl lg:text-6xl flex justify-center items-center">
        <h1 class="">Github Projects</h1>
    </div>
    <div class="flex-col flex flex-1 items-center justify-center ">
        {#await asyncFunc() then data}
                <div class="grid grid-cols-1 lg:grid-cols-2  xl:grid-cols-3 ">
                    {#each data as repo, i}
                        {#if (i > 0 && repo.language !== null)}
                        <div class="">
                            <div class="w-96 h-48 shadow-md rounded-3xl bg-buttonblue flex flex-col flex-1 mx-4 my-4 flex-wrap " >
                                <div class="flex-grow">
                                    <div class="">
                                        <h1 class="font-semibold mt-4 mx-8 text-2xl ">{(data[i].name)}</h1>
                                        <p class="font-medium px-8 mt-4  text-base">{(repo.description)}</p>
                                    </div>
                                </div>
                                <div class="flex-none mb-2">
                                    {#if ( repo.language !== "C#")}
                                        <div class="mx-8 bg-{repo.language} inline-block rounded ">
                                            <h1 class="mx-4 my-1  ">{repo.language}</h1>
                                        </div>
                                        <a href={repo.html_url} target="_blank">
                                        <img src="images/logos/github.png" class="float-right mr-5" width="28px" height="auto"/>
                                        </a>
                                    {:else}
                                        <div class="mx-8 bg-green-600 inline-block rounded ">
                                            <h1 class="mx-4 my-1 ">{repo.language}</h1>
                                        </div>
                                        <a href={repo.html_url} target="_blank">
                                            <img src="images/logos/github.png" class="float-right mr-5" width="28px" height="auto"/>
                                        </a>
                                    {/if}

                                </div>
                            </div>
                        </div>
                        {/if}
                    {/each}
                </div>
        {/await}
    </div>

</main>

